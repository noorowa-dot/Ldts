import "server-only";
import { db } from "./supabase/admin";
import { itemKey } from "./week";
import type { Ctx } from "./recipes";
import { QUOTAS } from "./kwop";
import { liveProvider } from "./prices";

export type ShopItem = {
  id: string;
  name: string;
  key: string;
  quantity: number;
  unit: string;
  buy: string;
  aisle: string;
  for_meals: string[];
  source: "plan" | "manual";
  have_at_home: boolean;
  checked: boolean;
};

export async function shopState(c: Ctx, week: string) {
  const uid = c.user!.id;
  const [items, prof] = await Promise.all([
    db().from("shop_items").select("*").eq("user_id", uid).eq("week_start", week).order("aisle").order("position").order("created_at"),
    db().from("profiles").select("stores,zip").eq("id", uid).maybeSingle(),
  ]);
  const list: ShopItem[] = ((items.data ?? []) as (Omit<ShopItem, "key"> & { quantity: string | number })[]).map((r) => ({
    id: r.id,
    name: r.name,
    key: itemKey(r.name),
    quantity: Number(r.quantity),
    unit: r.unit,
    buy: r.buy,
    aisle: r.aisle,
    for_meals: r.for_meals ?? [],
    source: r.source,
    have_at_home: r.have_at_home,
    checked: r.checked,
  }));
  const p = prof.data as { stores: string[]; zip: string | null } | null;
  const q = QUOTAS[c.tier];
  let book: { item_key: string; store: string; price_cents: number }[] = [];
  if (q.priceCheck && list.length) {
    const { data } = await db().from("price_book").select("item_key,store,price_cents").eq("user_id", uid).in("item_key", Array.from(new Set(list.map((i) => i.key))));
    book = (data ?? []) as typeof book;
  }
  const live = liveProvider();
  return {
    week,
    items: list,
    stores: p?.stores?.length ? p.stores : ["Kroger", "Walmart", "Aldi"],
    zip: p?.zip ?? null,
    book,
    live: live ? { provider: live.id, store: live.store } : null,
    access: { shopList: q.shopList, priceCheck: q.priceCheck, tier: c.tier },
  };
}
