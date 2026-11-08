import { z } from "zod";
import { getCtx } from "@/lib/recipes";
import { QUOTAS, track } from "@/lib/kwop";
import { FREE_LISTS_MONTHLY } from "@/lib/plan-config";
import { db } from "@/lib/supabase/admin";
import { pantry, weekMeals } from "@/lib/plan";
import { shopState } from "@/lib/shop";
import { itemKey, parseWeek } from "@/lib/week";
import { AiError, aiConfigured, buildShoppingList } from "@/lib/ai";
import { err, json } from "@/lib/http";
import type { RecipeBody } from "@/lib/types";

export const maxDuration = 120;

export async function GET(req: Request) {
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in to see your shopping list.", 401);
  return json(await shopState(c, parseWeek(new URL(req.url).searchParams.get("week"))));
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("build"), week: z.string() }),
  z.object({ action: z.literal("add"), week: z.string(), name: z.string().trim().min(1).max(60), quantity: z.number().min(0).max(999).optional(), unit: z.string().trim().max(16).optional() }),
  z.object({ action: z.literal("clear_checked"), week: z.string() }),
]);

const BUILDS_PER_DAY = 15;

export async function POST(req: Request) {
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Invalid request.");
  const week = parseWeek(parsed.data.week);
  const uid = c.user.id;

  if (parsed.data.action === "add") {
    const { name, quantity, unit } = parsed.data;
    await db().from("shop_items").insert({ user_id: uid, week_start: week, name, quantity: quantity ?? 1, unit: unit || "count", buy: "", aisle: "Other", source: "manual" } as never);
    return json(await shopState(c, week));
  }
  if (parsed.data.action === "clear_checked") {
    await db().from("shop_items").delete().eq("user_id", uid).eq("week_start", week).eq("checked", true);
    return json(await shopState(c, week));
  }

  // build: the assistant turns the week's meals into one list, in store amounts.
  const { data: prof } = await db().from("profiles").select("answers").eq("id", uid).maybeSingle();
  const answers = ((prof as { answers: Record<string, unknown> } | null)?.answers ?? {}) as Record<string, unknown>;
  // Value before price: a free account gets FREE_LISTS_MONTHLY smart list(s) a month; more come with a plan.
  const month = new Date().toISOString().slice(0, 7);
  const freeUsed = answers.free_list_month === month ? Number(answers.free_list_count ?? 1) : 0;
  const freeList = !QUOTAS[c.tier].shopList && freeUsed < FREE_LISTS_MONTHLY;
  if (!QUOTAS[c.tier].shopList && !freeList) return err("upgrade", "You've used this month's free list. Unlimited lists come with a plan.", 403, { feature: "shop" });
  if (!aiConfigured()) return err("ai_off", "The assistant is warming up. Please try again in a minute.", 503);
  const meals = await weekMeals(uid, week);
  if (!meals.length) return err("no_meals", "Add a meal to your week first.", 400);
  const today = new Date().toISOString().slice(0, 10);
  const builds = (answers.list_builds as { day: string; n: number } | undefined) ?? { day: today, n: 0 };
  const n = builds.day === today ? builds.n : 0;
  if (n >= BUILDS_PER_DAY) return err("build_limit", "You've rebuilt your list a lot today. Edit it by hand, or try again tomorrow.", 429);

  const ids = Array.from(new Set(meals.map((m) => m.recipe.id)));
  const { data: bodies } = await db().from("recipe_bodies").select("recipe_id,body").in("recipe_id", ids);
  const byId = new Map(((bodies ?? []) as { recipe_id: string; body: RecipeBody }[]).map((b) => [b.recipe_id, b.body]));
  try {
    const home = await pantry(c);
    const lines = await buildShoppingList({
      meals: meals.map((m) => ({
        title: m.recipe.title,
        servings: m.servings,
        recipe_servings: m.recipe.servings,
        ingredients: (byId.get(m.recipe.id)?.ingredients ?? []).map((i) => ({ item: i.item, amount: i.amount })),
      })),
      pantry: home,
    });
    // "Already at home" is decided here, not by the model: only what was seen in their fridge photos, plus basic staples.
    const homeKeys = home.map(itemKey).filter((k) => k.length >= 3);
    const STAPLE = /^(salt|kosher salt|sea salt|pepper|black pepper|ground black pepper|water|oil|cooking oil|vegetable oil|olive oil|extra virgin olive oil|cooking spray)$/;
    // "brown rice" is covered by "rice" (same main word at the end); "rice vinegar" is not.
    const sameThing = (a: string, b: string) => a === b || (b.length >= 3 && a.endsWith(" " + b)) || (a.length >= 3 && b.endsWith(" " + a));
    for (const l of lines) {
      const k = itemKey(l.name);
      l.have_at_home = STAPLE.test(k) || homeKeys.some((h) => sameThing(k, h));
    }
    // Replace the assistant's items; keep what the person added by hand and what they already ticked.
    const { data: old } = await db().from("shop_items").select("name,checked").eq("user_id", uid).eq("week_start", week).eq("source", "plan");
    const ticked = new Set(((old ?? []) as { name: string; checked: boolean }[]).filter((o) => o.checked).map((o) => o.name.toLowerCase()));
    await db().from("shop_items").delete().eq("user_id", uid).eq("week_start", week).eq("source", "plan");
    await db()
      .from("shop_items")
      .insert(
        lines.map((l, i) => ({
          user_id: uid,
          week_start: week,
          name: l.name,
          quantity: l.quantity,
          unit: l.unit,
          buy: l.buy,
          aisle: l.aisle,
          for_meals: l.for_meals,
          have_at_home: l.have_at_home,
          checked: ticked.has(l.name.toLowerCase()),
          source: "plan",
          position: i,
        })) as never
      );
    await db()
      .from("profiles")
      .update({ answers: { ...answers, list_builds: { day: today, n: n + 1 }, ...(freeList ? { free_list_month: month, free_list_count: freeUsed + 1 } : {}) } } as never)
      .eq("id", uid);
    track("feature_used", c.user.email, "shopping_list");
    return json(await shopState(c, week));
  } catch (e) {
    console.error("[shop] build", e);
    return err(e instanceof AiError ? e.code : "failed", "The assistant couldn't build your list. Please try again.", 500);
  }
}
