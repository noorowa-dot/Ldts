import { AiError, cookFromList } from "@/lib/ai";
import { getPantry } from "@/lib/pantry";
import { allowance, getCtx, getRow, saveRecipe, toView } from "@/lib/recipes";
import { QUOTAS, track } from "@/lib/kwop";
import { db } from "@/lib/supabase/admin";
import { err, json } from "@/lib/http";

export const maxDuration = 120;

/** Remix: the same fridge, a different dish. Counts as one recipe of the plan. */
export async function POST(_req: Request, ctx: RouteContext<"/api/recipes/[id]/remix">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const row = await getRow(id);
  if (!row || row.user_id !== c.user.id) return err("not_found", "We couldn't find that recipe.", 404);
  const q = QUOTAS[c.tier];
  if (q.remix === 0) return err("upgrade", "Remixes come with Pro.", 403, { feature: "remix" });
  const rootId = row.parent_id ?? row.id;
  const { data: family } = await db().from("recipes").select("id,title").or(`id.eq.${rootId},parent_id.eq.${rootId}`);
  const remixes = (family?.length ?? 1) - 1;
  if (remixes >= q.remix) return err("remix_limit", `You've used the ${q.remix} remixes of this fridge.`, 403, { feature: "remix" });
  const allow = await allowance(c);
  if (!allow.ok) return err(allow.reason, `You've used all ${allow.limit} recipes of your plan this month.`, 429);
  try {
    const g = await cookFromList(row.found.map((f) => f.name), {
      diet: row.diet,
      heat: row.heat,
      pantry: await getPantry(c.user.id),
      avoidTitles: (family ?? []).map((f: { title: string }) => f.title),
    });
    g.found = row.found;
    const newId = await saveRecipe(c, g, { source: "remix", heat: row.heat, diet: row.diet, parentId: rootId, photoPath: row.photo_path });
    track("feature_used", c.user.email, "remix");
    return json({ recipe: await toView(c, (await getRow(newId))!) });
  } catch (e) {
    console.error("[remix]", e);
    return err(e instanceof AiError ? e.code : "failed", "Our chef dropped the spoon. Please try again.", 500);
  }
}
