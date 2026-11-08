import { z } from "zod";
import { getCtx } from "@/lib/recipes";
import { getPantry, setPantry } from "@/lib/pantry";
import { db } from "@/lib/supabase/admin";
import { mondayOf } from "@/lib/week";
import { track } from "@/lib/kwop";
import { err, json } from "@/lib/http";

/** The person's cupboard: what they have ("Got it") and what they ran out of ("I'm out"). */
export async function GET() {
  const c = await getCtx();
  if (!c.user) return json({ status: {} });
  return json({ status: (await getPantry(c.user.id)).status });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set"), items: z.array(z.object({ name: z.string().trim().min(1).max(60), status: z.enum(["have", "out"]).nullable() })).min(1).max(30) }),
  z.object({ action: z.literal("to_list"), items: z.array(z.string().trim().min(1).max(60)).min(1).max(20) }),
]);

export async function POST(req: Request) {
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in to remember your cupboard.", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Invalid request.");
  if (parsed.data.action === "set") {
    await setPantry(c.user.id, parsed.data.items);
    return json({ status: (await getPantry(c.user.id)).status });
  }
  // "Add to my shopping list": this week's list, skipping what is already on it.
  const week = mondayOf(new Date());
  const { data } = await db().from("shop_items").select("name").eq("user_id", c.user.id).eq("week_start", week);
  const have = new Set(((data ?? []) as { name: string }[]).map((r) => r.name.toLowerCase()));
  const rows = parsed.data.items
    .filter((n) => !have.has(n.toLowerCase()))
    .map((name) => ({ user_id: c.user!.id, week_start: week, name, quantity: 1, unit: "count", buy: "", aisle: "Spices & Sauces", source: "manual" }));
  if (rows.length) {
    const { error } = await db().from("shop_items").insert(rows as never);
    if (error) return err("failed", "Couldn't add them. Try again.", 500);
  }
  track("feature_used", c.user.email, "pantry_to_list");
  return json({ added: rows.length, week });
}
