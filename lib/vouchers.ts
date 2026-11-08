import "server-only";
import { createHash } from "node:crypto";
import { db } from "./supabase/admin";
import type { Tier } from "./kwop";

export type Comp = { tier: Exclude<Tier, "none">; until: string | null };

/** Codes are compared by hash only: "pp-abcd-efgh" and "PPABCDEFGH" are the same code. */
export function voucherHash(code: string) {
  return createHash("sha256").update(code.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");
}

export async function getComp(userId: string | null | undefined): Promise<Comp | null> {
  if (!userId) return null;
  try {
    const { data } = await db().from("comp_access").select("tier,until").eq("user_id", userId).maybeSingle();
    const c = data as Comp | null;
    if (!c) return null;
    if (c.until && new Date(c.until).getTime() < Date.now()) return null;
    return c;
  } catch {
    return null;
  }
}

const ORDER: Tier[] = ["none", "starter", "pro", "chef"];
export const higherTier = (a: Tier, b: Tier): Tier => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);
export const tierLabel = (t: Tier) => (t === "none" ? "Free" : t[0].toUpperCase() + t.slice(1));

export type RedeemResult =
  | { ok: true; tier: Exclude<Tier, "none">; label: string; until: string | null; unlock: string[] }
  | { ok: false; error: string; message: string };

const MESSAGES: Record<string, string> = {
  expired: "This voucher has expired.",
  used: "This voucher has reached its limit.",
  already_redeemed: "You've already used this voucher.",
  not_yours: "This voucher belongs to another account.",
  invalid: "That code doesn't match a voucher.",
};

/**
 * Redeem a voucher for a signed-in account. Gives free access to a plan (no card), and credits the creator:
 * if the voucher carries a Kwop link code and the account has none yet, it becomes the account's `k`.
 */
export async function redeemVoucher(user: { id: string; email: string }, code: string): Promise<RedeemResult> {
  const clean = code.trim();
  if (clean.replace(/[^A-Za-z0-9]/g, "").length < 3 || clean.length > 64) return { ok: false, error: "invalid", message: MESSAGES.invalid };
  const { data, error } = await db().rpc("redeem_voucher" as never, { p_hash: voucherHash(clean), p_user: user.id, p_email: user.email } as never);
  if (error) {
    const key = Object.keys(MESSAGES).find((k) => error.message.includes(k));
    if (!key) console.error("[voucher] redeem failed:", error.message);
    return { ok: false, error: key ?? "invalid", message: MESSAGES[key ?? "invalid"] };
  }
  const row = (Array.isArray(data) ? data[0] : data) as { tier: Exclude<Tier, "none">; until: string | null; k: string | null } | null;
  if (!row) return { ok: false, error: "invalid", message: MESSAGES.invalid };
  if (row.k) {
    const { data: p } = await db().from("profiles").select("k").eq("id", user.id).maybeSingle();
    if (!(p as { k: string | null } | null)?.k) await db().from("profiles").update({ k: row.k } as never).eq("id", user.id);
  }
  const { unlockLines } = await import("./kwop");
  return { ok: true, tier: row.tier, label: tierLabel(row.tier), until: row.until, unlock: unlockLines(row.tier) };
}
