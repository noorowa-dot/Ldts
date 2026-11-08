import { z } from "zod";
import { getCtx, getRow, ownsRow, toView } from "@/lib/recipes";
import { QUOTAS, track } from "@/lib/kwop";
import { db } from "@/lib/supabase/admin";
import { err, json } from "@/lib/http";

export async function GET(_req: Request, ctx: RouteContext<"/api/recipes/[id]">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  const row = await getRow(id);
  if (!row || !ownsRow(c, row)) return err("not_found", "We couldn't find that recipe.", 404);
  return json({ recipe: await toView(c, row) });
}

const Patch = z.object({ is_favorite: z.boolean() });

export async function PATCH(req: Request, ctx: RouteContext<"/api/recipes/[id]">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in to save recipes.", 401);
  const row = await getRow(id);
  if (!row || row.user_id !== c.user.id) return err("not_found", "We couldn't find that recipe.", 404);
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Invalid request.");
  if (parsed.data.is_favorite) {
    const { count } = await db().from("recipes").select("id", { count: "exact", head: true }).eq("user_id", c.user.id).eq("is_favorite", true);
    const limit = QUOTAS[c.tier].saved;
    if ((count ?? 0) >= limit) return err("saved_limit", `Your plan keeps up to ${limit} saved recipes.`, 403, { limit });
  }
  await db().from("recipes").update({ is_favorite: parsed.data.is_favorite } as never).eq("id", id).eq("user_id", c.user.id);
  if (parsed.data.is_favorite) track("feature_used", c.user.email, "save_favorite");
  return json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/recipes/[id]">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  const row = await getRow(id);
  if (!row || !ownsRow(c, row)) return err("not_found", "We couldn't find that recipe.", 404);
  if (row.photo_path) {
    const { count } = await db().from("recipes").select("id", { count: "exact", head: true }).eq("photo_path", row.photo_path);
    if ((count ?? 0) <= 1) await db().storage.from("fridge-photos").remove([row.photo_path]);
  }
  await db().from("recipes").delete().eq("id", id);
  return json({ ok: true });
}
