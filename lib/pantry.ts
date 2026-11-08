import "server-only";
import { db } from "./supabase/admin";
import { pantryKey } from "./pantry-shared";
import type { PantryStatus } from "./types";

export type Pantry = { have: string[]; out: string[]; status: Record<string, PantryStatus> };
const EMPTY: Pantry = { have: [], out: [], status: {} };

/** What the person told us about their cupboard ("Got it" / "I'm out"), newest first. */
export async function getPantry(userId: string | null | undefined): Promise<Pantry> {
  if (!userId) return EMPTY;
  const { data } = await db().from("pantry_items").select("key,name,status").eq("user_id", userId).order("updated_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as { key: string; name: string; status: PantryStatus }[];
  const p: Pantry = { have: [], out: [], status: {} };
  for (const r of rows) {
    p.status[r.key] = r.status;
    (r.status === "have" ? p.have : p.out).push(r.name);
  }
  return p;
}

/** Remember one or more answers. `null` forgets the item. */
export async function setPantry(userId: string, items: { name: string; status: PantryStatus | null }[]) {
  const up = items.filter((i) => i.status).map((i) => ({ user_id: userId, key: pantryKey(i.name), name: i.name.slice(0, 60), status: i.status, updated_at: new Date().toISOString() }));
  const del = items.filter((i) => !i.status).map((i) => pantryKey(i.name));
  if (up.length) {
    const { error } = await db().from("pantry_items").upsert(up as never, { onConflict: "user_id,key" });
    if (error) throw new Error(error.message);
  }
  if (del.length) await db().from("pantry_items").delete().eq("user_id", userId).in("key", del);
}
