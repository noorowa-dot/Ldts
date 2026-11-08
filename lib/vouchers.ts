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
