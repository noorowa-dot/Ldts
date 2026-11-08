import { z } from "zod";
import { getCtx } from "@/lib/recipes";
import { QUOTAS, track } from "@/lib/kwop";
import { db } from "@/lib/supabase/admin";
import { itemKey } from "@/lib/week";
import { err, json } from "@/lib/http";

/** The person's price book: what an item costs at each of their stores. */
const Put = z.object({
  item: z.string().trim().min(1).max(60),
  store: z.string().trim().min(1).max(30),
  price_cents: z.number().int().min(0).max(100000).nullable(),
});

export async function PUT(req: Request) {
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  if (!QUOTAS[c.tier].priceCheck) return err("upgrade", "Price check comes with Pro.", 403, { feature: "prices" });
  const parsed = Put.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Type a price like 3.49.");
  const key = itemKey(parsed.data.item);
  if (parsed.data.price_cents === null) {
    await db().from("price_book").delete().eq("user_id", c.user.id).eq("item_key", key).eq("store", parsed.data.store);
  } else {
    await db()
      .from("price_book")
      .upsert({ user_id: c.user.id, item_key: key, store: parsed.data.store, price_cents: parsed.data.price_cents, updated_at: new Date().toISOString() } as never);
    track("feature_used", c.user.email, "price_check");
  }
  return json({ ok: true, item_key: key });
}

const Stores = z.object({
  stores: z.array(z.string().trim().min(1).max(30)).min(1).max(5).optional(),
  zip: z.string().regex(/^\d{5}$/).nullable().optional(),
});

export async function PATCH(req: Request) {
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const parsed = Stores.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Use up to 5 store names and a 5-digit ZIP code.");
  const update: Record<string, unknown> = {};
  if (parsed.data.stores) update.stores = Array.from(new Set(parsed.data.stores));
  if (parsed.data.zip !== undefined) update.zip = parsed.data.zip;
  await db().from("profiles").update(update as never).eq("id", c.user.id);
  return json({ ok: true, ...update });
}
