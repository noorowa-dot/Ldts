import { z } from "zod";
import { allowance, getCtx, getRow, saveRecipe } from "@/lib/recipes";
import { QUOTAS, track } from "@/lib/kwop";
import { db } from "@/lib/supabase/admin";
import { weekMeals } from "@/lib/plan";
import { parseWeek } from "@/lib/week";
import { AiError, aiConfigured, cookFromIdea } from "@/lib/ai";
import { err, json } from "@/lib/http";
import type { Diet } from "@/lib/types";

export const maxDuration = 120;

export async function GET(req: Request) {
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in to plan your week.", 401);
  const week = parseWeek(new URL(req.url).searchParams.get("week"));
  const [meals, recipes] = await Promise.all([
    weekMeals(c.user.id, week),
    db().from("recipes").select("id,title,time_minutes,is_favorite,created_at").eq("user_id", c.user.id).order("is_favorite", { ascending: false }).order("created_at", { ascending: false }).limit(60),
  ]);
  return json({ week, meals, recipes: recipes.data ?? [], limit: QUOTAS[c.tier].planMeals, tier: c.tier });
}

const Add = z.object({
  week: z.string(),
  day: z.number().int().min(0).max(6),
  slot: z.enum(["lunch", "dinner"]).default("dinner"),
  servings: z.number().int().min(1).max(12).default(2),
  recipe_id: z.string().uuid().optional(),
  dish: z.string().trim().min(2).max(80).optional(),
});

export async function POST(req: Request) {
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in to plan your week.", 401);
  const parsed = Add.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.recipe_id && !parsed.data.dish)) return err("bad_request", "Pick a recipe or type a dish.");
  const { day, slot, servings, dish } = parsed.data;
  const week = parseWeek(parsed.data.week);
  const q = QUOTAS[c.tier];
  if (slot === "lunch" && q.planMeals < 14) return err("upgrade", "Planning lunches comes with Pro.", 403, { feature: "plan" });

  const { count } = await db().from("plan_meals").select("id", { count: "exact", head: true }).eq("user_id", c.user.id).eq("week_start", week);
  if ((count ?? 0) >= q.planMeals) return err("plan_limit", `Your plan holds ${q.planMeals} meals a week.`, 403, { feature: "plan", limit: q.planMeals });

  let recipeId = parsed.data.recipe_id ?? null;
  if (recipeId) {
    const row = await getRow(recipeId);
    if (!row || row.user_id !== c.user.id) return err("not_found", "We couldn't find that recipe.", 404);
  } else if (dish) {
    // A dish they want this week: the chef writes it (counts as one recipe).
    if (!aiConfigured()) return err("ai_off", "The AI chef is warming up. Please try again in a minute.", 503);
    const allow = await allowance(c);
    if (!allow.ok) return err(allow.reason, "You've used the recipes included today. Pick a plan to cook more.", 429, { feature: "quota" });
    const { data: prof } = await db().from("profiles").select("diet").eq("id", c.user.id).maybeSingle();
    const diet = ((prof as { diet: Diet[] } | null)?.diet ?? []).filter((d) => q.diets === "all" || (q.diets === "vegetarian" && d === "vegetarian"));
    try {
      const g = await cookFromIdea(dish, { diet });
      recipeId = await saveRecipe(c, g, { source: "list", diet });
    } catch (e) {
      console.error("[plan] idea", e);
      return err(e instanceof AiError ? e.code : "failed", "Our chef dropped the spoon. Please try again.", 500);
    }
  }
  const { error } = await db().from("plan_meals").insert({ user_id: c.user.id, week_start: week, day, slot, servings, recipe_id: recipeId } as never);
  if (error) return err("failed", "Couldn't add that meal. Try again.", 500);
  track("feature_used", c.user.email, "plan_meal");
  return json({ meals: await weekMeals(c.user.id, week) });
}
