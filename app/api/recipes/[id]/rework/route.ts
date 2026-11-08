import { z } from "zod";
import { AiError, aiConfigured, cookFromList } from "@/lib/ai";
import { allowance, getCtx, getRow, ownsRow, saveRecipe, toView } from "@/lib/recipes";
import { track } from "@/lib/kwop";
import { err, json } from "@/lib/http";

export const maxDuration = 120;

const Body = z.object({ items: z.array(z.string().trim().min(1).max(40)).min(2).max(20) });

/** "The AI got my fridge wrong": remake the recipe from the corrected ingredient list, same photo. */
export async function POST(req: Request, ctx: RouteContext<"/api/recipes/[id]/rework">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  const row = await getRow(id);
  if (!row || !ownsRow(c, row)) return err("not_found", "We couldn't find that recipe.", 404);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Keep at least 2 ingredients.");
  if (!aiConfigured()) return err("ai_off", "The AI chef is warming up. Please try again in a minute.", 503);
  const allow = await allowance(c);
  if (!allow.ok) return err(allow.reason, allow.reason === "anon_limit" ? "You've made 3 free recipes today. Create a free account to keep going." : "You've used the recipes included today. Pick a plan to cook more.", 429);
  const items = Array.from(new Set(parsed.data.items.map((s) => s.replace(/\s+/g, " "))));
  try {
    const g = await cookFromList(items, { diet: row.diet, heat: row.heat });
    // Keep the photo pins for items that were already there; new items are listed without a pin.
    const pos = new Map(row.found.map((f) => [f.name.toLowerCase(), f]));
    g.found = items.map((name) => {
      const p = pos.get(name.toLowerCase());
      return { name, x: p?.x ?? -1, y: p?.y ?? -1 };
    });
    const newId = await saveRecipe(c, g, { source: row.photo_path ? "photo" : "list", heat: row.heat, diet: row.diet, photoPath: row.photo_path, parentId: null });
    track("feature_used", c.user?.email, "edit_ingredients");
    return json({ recipe: await toView(c, (await getRow(newId))!) });
  } catch (e) {
    console.error("[rework]", e);
    return err(e instanceof AiError ? e.code : "failed", "Our chef dropped the spoon. Please try again.", 500);
  }
}
