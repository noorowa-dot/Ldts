import "server-only";

/**
 * Kwop = payments, plans and the owner's dashboard. The app never talks to Whop directly.
 * KWOP_API is a secret: server only.
 */

export type KwopPlan = {
  id: number;
  name: string;
  price_cents: number;
  currency: string;
  interval: string;
  per_day: string;
  yearly: { price_cents: number; per_day: string } | null;
};

export type KwopApp = { name: string; checkout: "embedded" | "redirect" | null; plans: KwopPlan[] };
export type PlanState = { paid: boolean; plan: { id: number; name: string } | null; status: string | null; until: string | null };

const NO_PLAN: PlanState = { paid: false, plan: null, status: null, until: null };

function base() {
  const u = process.env.KWOP_API;
  if (!u) throw new Error("KWOP_API is not set");
  return u.replace(/\/$/, "");
}

async function call<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<{ status: number; data: T }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 10000);
  try {
    const res = await fetch(base() + path, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const text = await res.text();
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = { error: text.slice(0, 200) } as T;
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

// ---------- plans (cached 5 min) ----------
let appCache: { at: number; v: KwopApp } | null = null;
export async function getApp(): Promise<KwopApp> {
  if (appCache && Date.now() - appCache.at < 5 * 60_000) return appCache.v;
  try {
    const { status, data } = await call<KwopApp>("");
    if (status !== 200 || !Array.isArray(data.plans)) throw new Error(`Kwop GET ${status}`);
    const plans = [...data.plans].sort((a, b) => a.price_cents - b.price_cents);
    appCache = { at: Date.now(), v: { name: data.name, checkout: data.checkout, plans } };
    return appCache.v;
  } catch (e) {
    console.error("[kwop] plans", e);
    if (appCache) return appCache.v;
    return { name: "Platepal", checkout: null, plans: [] };
  }
}

// ---------- plan of a user (cached 60 s per email) ----------
const planCache = new Map<string, { at: number; v: PlanState }>();
const lastKnown = new Map<string, PlanState>();

/** Local testing only: `next dev` + local Supabase + DEV_PLAN_OVERRIDE=<kwop plan id>. Never active in production. */
function devOverride(): PlanState | null {
  const id = Number(process.env.DEV_PLAN_OVERRIDE);
  if (process.env.NODE_ENV !== "development" || !id) return null;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(process.env.NEXT_PUBLIC_SUPABASE_URL || "")) return null;
  const names: Record<number, string> = { 1552: "Platepal Starter", 1553: "Platepal Pro", 1554: "Platepal Chef" };
  return { paid: true, plan: { id, name: names[id] ?? "Platepal Pro" }, status: "active", until: new Date(Date.now() + 20 * 86400_000).toISOString() };
}

export async function getPlan(email: string | null | undefined, opts: { fresh?: boolean } = {}): Promise<PlanState> {
  if (!email) return NO_PLAN;
  const dev = devOverride();
  if (dev) return dev;
  const key = email.toLowerCase();
  const hit = planCache.get(key);
  if (!opts.fresh && hit && Date.now() - hit.at < 60_000) return hit.v;
  try {
    const { status, data } = await call<PlanState>(`/plan?email=${encodeURIComponent(key)}`);
    if (status !== 200) throw new Error(`Kwop plan ${status}`);
    const v: PlanState = {
      paid: Boolean(data.paid),
      plan: data.plan ? { id: Number(data.plan.id), name: String(data.plan.name) } : null,
      status: data.status ?? null,
      until: data.until ?? null,
    };
    planCache.set(key, { at: Date.now(), v });
    lastKnown.set(key, v);
    return v;
  } catch (e) {
    console.error("[kwop] getPlan", (e as Error).message);
    return lastKnown.get(key) ?? hit?.v ?? NO_PLAN;
  }
}

export function forgetPlan(email: string) {
  planCache.delete(email.toLowerCase());
}

// ---------- checkout ----------
export type CheckoutResult =
  | { ok: true; embed: string | null; ref: string; fallback_url: string | null }
  | { ok: false; error: string; status: number };

export async function createCheckout(input: { plan: number; period: "month" | "year"; email: string; k?: string | null }): Promise<CheckoutResult> {
  const body: Record<string, unknown> = { plan: input.plan, period: input.period, email: input.email };
  if (input.k) body.k = input.k;
  try {
    const { status, data } = await call<{ embed?: string | null; ref?: string; fallback_url?: string | null; error?: string }>("/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (status === 409) return { ok: false, error: data.error || "payments_off", status };
    if (status >= 300 || !data.ref) return { ok: false, error: data.error || `checkout_failed_${status}`, status };
    return { ok: true, embed: data.embed ?? null, ref: data.ref, fallback_url: data.fallback_url ?? null };
  } catch (e) {
    console.error("[kwop] checkout", e);
    return { ok: false, error: "kwop_unreachable", status: 502 };
  }
}

export async function confirmCheckout(ref: string): Promise<{ ok: boolean; paid: boolean }> {
  try {
    const { data } = await call<{ ok?: boolean; paid?: boolean }>("/confirm", { method: "POST", body: JSON.stringify({ ref }) });
    return { ok: Boolean(data.ok), paid: Boolean(data.paid) };
  } catch (e) {
    console.error("[kwop] confirm", e);
    return { ok: false, paid: false };
  }
}

export async function cancelPlan(email: string, exceptRef?: string): Promise<{ message: string; manage_url?: string }> {
  const body: Record<string, unknown> = { email };
  if (exceptRef) body.except_ref = exceptRef;
  try {
    const { data } = await call<{ message?: string; manage_url?: string; error?: string }>("/cancel", { method: "POST", body: JSON.stringify(body) });
    forgetPlan(email);
    return { message: data.message || data.error || "Your request was sent.", manage_url: data.manage_url };
  } catch (e) {
    console.error("[kwop] cancel", e);
    return { message: "We couldn't reach the billing service. Please try again in a minute." };
  }
}

export type KwopEvent = "signup" | "onboarding_done" | "aha" | "paywall_view" | "feature_used";

/** Fire-and-forget: never blocks, never throws. */
export function track(type: KwopEvent, email: string | null | undefined, detail?: string) {
  if (!email || !process.env.KWOP_API) return;
  const body: Record<string, unknown> = { type, email };
  if (detail) body.detail = detail;
  call("/event", { method: "POST", body: JSON.stringify(body), timeoutMs: 4000 }).catch(() => {});
}

export async function connect(url: string) {
  return call<{ ok?: boolean; error?: string }>("/connect", { method: "POST", body: JSON.stringify({ url }) });
}

// ---------- quotas, per plan (lib/plan-config.ts is the single source of truth) ----------
import { QUOTAS, TAGS, unlockLines, type Tier } from "./plan-config";
export { QUOTAS, TAGS, unlockLines };
export type { Tier };

/** Plans are matched by their rank in price order (cheapest = starter). Names/ids come from Kwop. */
export function tierOf(plan: PlanState["plan"], plans: KwopPlan[]): Tier {
  if (!plan) return "none";
  const sorted = [...plans].sort((a, b) => a.price_cents - b.price_cents);
  const idx = sorted.findIndex((p) => p.id === plan.id);
  if (idx < 0) {
    const n = plan.name.toLowerCase();
    if (n.includes("chef")) return "chef";
    if (n.includes("pro")) return "pro";
    return "starter";
  }
  const tiers: Tier[] = sorted.length >= 3 ? ["starter", "pro", "chef"] : sorted.length === 2 ? ["starter", "chef"] : ["pro"];
  return tiers[Math.min(idx, tiers.length - 1)] ?? "starter";
}
