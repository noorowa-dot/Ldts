import { z } from "zod";
import { AiError, aiConfigured, suggestSwap } from "@/lib/ai";
import { getCtx, getRow, toView } from "@/lib/recipes";
import { getPantry } from "@/lib/pantry";
import { takeDaily } from "@/lib/fair-use";
import { track } from "@/lib/kwop";
import { err, json } from "@/lib/http";
import { db } from "@/lib/supabase/admin";
import type { RecipeBody } from "@/lib/types";

export const maxDuration = 60;

const Body = z.object({ item: z.string().trim().min(1).max(60) });

/** "I'm out of it": the chef's best swap for one cupboard item of an unlocked recipe. */
export async function POST(req: Request, ctx: RouteContext<"/api/recipes/[id]/swap">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const row = await getRow(id);
  if (!row || row.user_id !== c.user.id) return err("not_found", "We couldn't find that recipe.", 404);
  const view = await toView(c, row);
  if (!view.access.unlocked) return err("locked", "Unlock the recipe first.", 403, { feature: "quota" });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Which ingredient?");
  if (!aiConfigured()) return err("ai_off", "The AI chef is warming up. Please try again in a minute.", 503);
  if (!(await takeDaily(c.user.id, "swaps", 40))) return err("too_many", "You've asked for a lot of swaps today. Try again tomorrow.", 429);
  const { data } = await db().from("recipe_bodies").select("body").eq("recipe_id", id).maybeSingle();
  const body = (data as { body: RecipeBody } | null)?.body;
  if (!body) return err("not_found", "We couldn't find that recipe.", 404);
  try {
    const p = await getPantry(c.user.id);
    const s = await suggestSwap({ title: row.title, ingredients: body.ingredients }, parsed.data.item, [...row.found.map((f) => f.name), ...p.have]);
    track("feature_used", c.user.email, "pantry_swap");
    return json(s);
  } catch (e) {
    console.error("[swap]", e);
    return err(e instanceof AiError ? e.code : "failed", "Our chef dropped the spoon. Please try again.", 500);
  }
}
