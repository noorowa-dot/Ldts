import { getCtx } from "@/lib/recipes";
import { QUOTAS } from "@/lib/kwop";
import { db } from "@/lib/supabase/admin";
import { liveProvider } from "@/lib/prices";
import { parseWeek, itemKey } from "@/lib/week";
import { err, json } from "@/lib/http";

export const maxDuration = 60;

/** Live store prices for this week's list (cached 24 h per store and item). */
export async function GET(req: Request) {
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  if (!QUOTAS[c.tier].priceCheck) return err("upgrade", "Price check comes with Pro.", 403, { feature: "prices" });
  const p = liveProvider();
  if (!p) return err("not_connected", "Live store prices are not connected yet.", 404);
  const week = parseWeek(new URL(req.url).searchParams.get("week"));
  const { data: prof } = await db().from("profiles").select("zip").eq("id", c.user.id).maybeSingle();
  const zip = (prof as { zip: string | null } | null)?.zip;
  if (!zip) return err("no_zip", "Add your ZIP code to see prices near you.", 400);
  const { data } = await db().from("shop_items").select("name,have_at_home").eq("user_id", c.user.id).eq("week_start", week);
  const names = Array.from(new Set(((data ?? []) as { name: string; have_at_home: boolean }[]).filter((i) => !i.have_at_home).map((i) => i.name))).slice(0, 40);
  try {
    const prices = await p.prices(names, zip);
    return json({ provider: p.id, store: p.store, zip, prices, keys: Object.fromEntries(names.map((n) => [n, itemKey(n)])) });
  } catch (e) {
    console.error("[prices/live]", e);
    return err("failed", `We couldn't reach ${p.store} right now. Try again in a minute.`, 502);
  }
}
