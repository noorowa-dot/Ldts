import { z } from "zod";
import { AiError, aiConfigured, adjustHeat } from "@/lib/ai";
import { getCtx, getRow, toView } from "@/lib/recipes";
import { track } from "@/lib/kwop";
import { db } from "@/lib/supabase/admin";
import { err, json } from "@/lib/http";
import type { RecipeBody } from "@/lib/types";

export const maxDuration = 120;

const Body = z.object({ heat: z.enum(["mild", "medium", "hot", "extra"]) });
const PER_DAY = 20;

/** Same dish, new heat level: rewrites spices, amounts and steps in place. Doesn't use a recipe from the plan. */
export async function POST(req: Request, ctx: RouteContext<"/api/recipes/[id]/heat">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const row = await getRow(id);
  if (!row || row.user_id !== c.user.id) return err("not_found", "We couldn't find that recipe.", 404);
  const view = await toView(c, row);
  if (!view.access.unlocked) return err("locked", "Unlock the recipe to change its heat.", 403, { feature: "quota" });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Pick a heat level.");
  if (row.heat === parsed.data.heat) return json({ recipe: view });
  if (!aiConfigured()) return err("ai_off", "The AI chef is warming up. Please try again in a minute.", 503);

  // Fair use: AI rewrites are cheap but not free.
  const { data: prof } = await db().from("profiles").select("answers").eq("id", c.user.id).maybeSingle();
  const answers = ((prof as { answers: Record<string, unknown> } | null)?.answers ?? {}) as Record<string, unknown>;
  const today = new Date().toISOString().slice(0, 10);
  const used = (answers.heat_changes as { day: string; n: number } | undefined)?.day === today ? (answers.heat_changes as { n: number }).n : 0;
  if (used >= PER_DAY) return err("too_many", "You've changed the heat a lot today. Try again tomorrow.", 429);

  const { data } = await db().from("recipe_bodies").select("body").eq("recipe_id", id).maybeSingle();
  const body = (data as { body: RecipeBody } | null)?.body;
  if (!body) return err("not_found", "We couldn't find that recipe.", 404);
  try {
    const g = await adjustHeat(
      { title: row.title, intro: row.intro, time_minutes: row.time_minutes, servings: row.servings, difficulty: row.difficulty, ingredients: body.ingredients, steps: body.steps, uses: row.uses },
      parsed.data.heat,
      { diet: row.diet }
    );
    const next: RecipeBody = { ingredients: g.ingredients, steps: g.steps, shopping: body.shopping, tip: g.tip, tips: g.tips?.length ? g.tips : body.tips, macros: g.macros?.calories ? g.macros : body.macros };
    await db().from("recipe_bodies").update({ body: next } as never).eq("recipe_id", id);
    await db().from("recipes").update({ heat: parsed.data.heat, time_minutes: g.time_minutes || row.time_minutes } as never).eq("id", id).eq("user_id", c.user.id);
    await db().from("profiles").update({ answers: { ...answers, heat_changes: { day: today, n: used + 1 } } } as never).eq("id", c.user.id);
    track("feature_used", c.user.email, "heat_" + parsed.data.heat);
    return json({ recipe: await toView(c, (await getRow(id))!) });
  } catch (e) {
    console.error("[heat]", e);
    return err(e instanceof AiError ? e.code : "failed", "Our chef dropped the spoon. Please try again.", 500);
  }
}
