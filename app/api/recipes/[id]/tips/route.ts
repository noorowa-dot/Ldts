import { AiError, aiConfigured, writeTips } from "@/lib/ai";
import { getCtx, getRow, toView } from "@/lib/recipes";
import { db } from "@/lib/supabase/admin";
import { takeDaily } from "@/lib/fair-use";
import { err, json } from "@/lib/http";
import type { RecipeBody } from "@/lib/types";

export const maxDuration = 60;

/** Recipes made before Nov 8 have one short tip: write the full 4-5 chef's tips once, in place. Chef plan only. */
export async function POST(_req: Request, ctx: RouteContext<"/api/recipes/[id]/tips">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const row = await getRow(id);
  if (!row || row.user_id !== c.user.id) return err("not_found", "We couldn't find that recipe.", 404);
  const view = await toView(c, row);
  if (!view.access.macros) return err("upgrade", "Chef's tips come with Chef.", 403, { feature: "macros" });
  const { data } = await db().from("recipe_bodies").select("body").eq("recipe_id", id).maybeSingle();
  const body = (data as { body: RecipeBody } | null)?.body;
  if (!body) return err("not_found", "We couldn't find that recipe.", 404);
  if ((body.tips?.length ?? 0) >= 3) return json({ recipe: view });
  if (!aiConfigured()) return err("ai_off", "The AI chef is warming up. Please try again in a minute.", 503);
  if (!(await takeDaily(c.user.id, "tips_backfill", 40))) return err("too_many", "Try again tomorrow.", 429);
  try {
    const tips = await writeTips({ title: row.title, ingredients: body.ingredients, steps: body.steps, heat: row.heat });
    await db().from("recipe_bodies").update({ body: { ...body, tips, tip: tips[0].text } } as never).eq("recipe_id", id);
    return json({ recipe: await toView(c, row) });
  } catch (e) {
    console.error("[tips]", e);
    return err(e instanceof AiError ? e.code : "failed", "Our chef dropped the spoon. Please try again.", 500);
  }
}
