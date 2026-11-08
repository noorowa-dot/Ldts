import "server-only";
import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "./supabase/admin";
import { getUser, type SessionUser } from "./supabase/server";
import { getApp, getPlan, QUOTAS, tierOf, type PlanState, type Tier, type KwopPlan } from "./kwop";
import type { Generated, RecipeBody, RecipeTeaser, RecipeView } from "./types";

export const ANON_DAILY = 3;
export const FREE_DAILY = 3;
const BUCKET = "fridge-photos";

export type Ctx = {
  user: SessionUser | null;
  anonId: string | null;
  ipHash: string;
  plan: PlanState;
  plans: KwopPlan[];
  tier: Tier;
};

export async function getCtx(opts: { freshPlan?: boolean } = {}): Promise<Ctx> {
  const [user, jar, h] = await Promise.all([getUser(), cookies(), headers()]);
  const anon = jar.get("pp_anon")?.value;
  const anonId = anon && /^[0-9a-f-]{36}$/.test(anon) ? anon : null;
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "0.0.0.0").split(",")[0].trim();
  const ipHash = createHash("sha256").update((process.env.IP_SALT || "platepal") + ip).digest("hex").slice(0, 32);
  const [plan, app] = await Promise.all([user ? getPlan(user.email, { fresh: opts.freshPlan }) : Promise.resolve({ paid: false, plan: null, status: null, until: null } as PlanState), getApp()]);
  const tier = plan.paid ? tierOf(plan.plan, app.plans) : "none";
  return { user, anonId, ipHash, plan, plans: app.plans, tier };
}

/** Start of the current billing period: the plan's renewal day-of-month, else the calendar month. */
export function periodStart(plan: PlanState, now = new Date()): Date {
  if (plan.until) {
    const until = new Date(plan.until);
    if (!Number.isNaN(until.getTime())) {
      const day = until.getUTCDate();
      let start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.min(day, 28)));
      if (start > now) start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, Math.min(day, 28)));
      return start;
    }
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export type Allowance =
  | { ok: true; used: number; limit: number; kind: "anon" | "free" | "plan" }
  | { ok: false; reason: "anon_limit" | "free_limit" | "quota"; used: number; limit: number };

export async function allowance(ctx: Ctx): Promise<Allowance> {
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  if (!ctx.user) {
    const [byDevice, byIp] = await Promise.all([
      ctx.anonId
        ? db().from("recipes").select("id", { count: "exact", head: true }).eq("anon_id", ctx.anonId).gte("created_at", dayAgo)
        : Promise.resolve({ count: 0 }),
      db().from("recipes").select("id", { count: "exact", head: true }).eq("ip_hash", ctx.ipHash).is("user_id", null).gte("created_at", dayAgo),
    ]);
    const used = Math.max(byDevice.count ?? 0, byIp.count ?? 0);
    return used >= ANON_DAILY ? { ok: false, reason: "anon_limit", used, limit: ANON_DAILY } : { ok: true, used, limit: ANON_DAILY, kind: "anon" };
  }
  if (ctx.tier === "none") {
    const { count } = await db().from("recipes").select("id", { count: "exact", head: true }).eq("user_id", ctx.user.id).gte("created_at", dayAgo);
    const used = count ?? 0;
    return used >= FREE_DAILY ? { ok: false, reason: "free_limit", used, limit: FREE_DAILY } : { ok: true, used, limit: FREE_DAILY, kind: "free" };
  }
  const used = await usedThisPeriod(ctx);
  const limit = QUOTAS[ctx.tier].recipes;
  return used >= limit ? { ok: false, reason: "quota", used, limit } : { ok: true, used, limit, kind: "plan" };
}

export async function usedThisPeriod(ctx: Ctx) {
  if (!ctx.user) return 0;
  const { count } = await db()
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.user.id)
    .gte("created_at", periodStart(ctx.plan).toISOString());
  return count ?? 0;
}

export async function saveRecipe(
  ctx: Ctx,
  g: Generated,
  opts: { source: "photo" | "example" | "list" | "remix"; diet: string[]; photo?: { bytes: Buffer; mime: string } | null; parentId?: string | null; photoPath?: string | null }
): Promise<string> {
  const id = crypto.randomUUID();
  let photoPath: string | null = opts.photoPath ?? null;
  if (opts.photo) {
    const folder = ctx.user ? ctx.user.id : `anon-${ctx.anonId ?? "x"}`;
    const ext = opts.photo.mime === "image/png" ? "png" : opts.photo.mime === "image/webp" ? "webp" : "jpg";
    const path = `${folder}/${id}.${ext}`;
    const up = await db().storage.from(BUCKET).upload(path, opts.photo.bytes, { contentType: opts.photo.mime, upsert: false });
    if (up.error) console.error("[recipes] photo upload", up.error.message);
    else photoPath = path;
  }
  const { error } = await db().from("recipes").insert({
    id,
    user_id: ctx.user?.id ?? null,
    anon_id: ctx.user ? null : ctx.anonId,
    ip_hash: ctx.ipHash,
    photo_path: photoPath,
    source: opts.source,
    title: g.title,
    intro: g.intro,
    time_minutes: g.time_minutes,
    servings: g.servings,
    difficulty: g.difficulty,
    found: g.found,
    uses: g.uses,
    diet: opts.diet,
    parent_id: opts.parentId ?? null,
  } as never);
  if (error) throw new Error("Could not save the recipe: " + error.message);
  const body: RecipeBody = { ingredients: g.ingredients, steps: g.steps, shopping: g.shopping, tip: g.tip, macros: g.macros };
  const b = await db().from("recipe_bodies").insert({ recipe_id: id, body } as never);
  if (b.error) throw new Error("Could not save the recipe body: " + b.error.message);
  return id;
}

type Row = {
  id: string;
  user_id: string | null;
  anon_id: string | null;
  photo_path: string | null;
  title: string;
  intro: string;
  time_minutes: number;
  servings: number;
  difficulty: RecipeTeaser["difficulty"];
  found: RecipeTeaser["found"];
  uses: string[];
  diet: RecipeTeaser["diet"];
  is_favorite: boolean;
  parent_id: string | null;
  created_at: string;
  source: string;
};

export function ownsRow(ctx: Ctx, row: Pick<Row, "user_id" | "anon_id">) {
  if (row.user_id) return ctx.user?.id === row.user_id;
  return Boolean(ctx.anonId && row.anon_id === ctx.anonId);
}

export async function getRow(id: string): Promise<Row | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await db().from("recipes").select("*").eq("id", id).maybeSingle();
  return (data as unknown as Row | null) ?? null;
}

async function signedPhoto(path: string | null) {
  if (!path) return null;
  const { data } = await db().storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Scramble text so locked parts keep their real shape but cannot be read in the browser. */
export function mask(s: string, seed = 7): string {
  let x = seed;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const lower = "etaoinshrdlucmfwypvbgk";
  return s.replace(/[A-Za-z0-9]/g, (ch) => {
    if (/[0-9]/.test(ch)) return String(Math.floor(rnd() * 10));
    const c = lower[Math.floor(rnd() * lower.length)];
    return ch === ch.toUpperCase() ? c.toUpperCase() : c;
  });
}

export async function toView(ctx: Ctx, row: Row): Promise<RecipeView> {
  const { data } = await db().from("recipe_bodies").select("body").eq("recipe_id", row.id).maybeSingle();
  const body = ((data as { body: RecipeBody } | null)?.body ?? { ingredients: [], steps: [], shopping: [], tip: "", macros: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } }) as RecipeBody;
  const q = QUOTAS[ctx.tier];
  const unlocked = ctx.tier !== "none" && Boolean(ctx.user && row.user_id === ctx.user.id);
  const access = { unlocked, shopping: unlocked && q.shopping, macros: unlocked && q.macros, planName: ctx.plan.plan?.name ?? null };
  const seed = parseInt(row.id.slice(0, 6), 16) % 1000;
  const view: RecipeBody = {
    ingredients: body.ingredients.map((i) =>
      unlocked ? i : { item: i.from_fridge ? i.item : mask(i.item, seed), amount: mask(i.amount, seed + 1), from_fridge: i.from_fridge }
    ),
    steps: body.steps.map((s, idx) => (unlocked ? s : { title: idx === 0 ? s.title : mask(s.title, seed + idx), text: mask(s.text, seed + idx), minutes: s.minutes })),
    shopping: access.shopping ? body.shopping : body.shopping.map((s) => ({ item: mask(s.item, seed), why: mask(s.why, seed) })),
    tip: access.macros ? body.tip : mask(body.tip, seed),
    macros: access.macros ? body.macros : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  };
  return {
    id: row.id,
    title: row.title,
    intro: row.intro,
    time_minutes: row.time_minutes,
    servings: row.servings,
    difficulty: row.difficulty,
    found: row.found,
    uses: row.uses,
    diet: row.diet,
    photo_url: await signedPhoto(row.photo_path),
    created_at: row.created_at,
    is_favorite: row.is_favorite,
    parent_id: row.parent_id,
    body: view,
    access,
  };
}

/** Attach this device's anonymous tries to the account (at sign-up / log-in). */
export async function claimAnon(userId: string, anonId: string | null) {
  if (!anonId) return 0;
  const { data } = await db().from("recipes").update({ user_id: userId, anon_id: null } as never).eq("anon_id", anonId).is("user_id", null).select("id");
  return data?.length ?? 0;
}

export async function publicRecipeCount(): Promise<number> {
  try {
    const { count } = await db().from("recipes").select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}
