import { z } from "zod";
import { getCtx } from "@/lib/recipes";
import { db } from "@/lib/supabase/admin";
import { shopState } from "@/lib/shop";
import { err, json } from "@/lib/http";

const Patch = z.object({
  checked: z.boolean().optional(),
  have_at_home: z.boolean().optional(),
  name: z.string().trim().min(1).max(60).optional(),
  quantity: z.number().min(0).max(999).optional(),
  unit: z.string().trim().max(16).optional(),
  buy: z.string().trim().max(60).optional(),
});

async function own(id: string, uid: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await db().from("shop_items").select("id,week_start").eq("id", id).eq("user_id", uid).maybeSingle();
  return data as { id: string; week_start: string } | null;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/shop/[id]">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const row = await own(id, c.user.id);
  if (!row) return err("not_found", "That item is gone.", 404);
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Invalid change.");
  const changedPack = parsed.data.name !== undefined || parsed.data.buy !== undefined;
  await db().from("shop_items").update({ ...parsed.data, ...(changedPack ? { est_cents: null } : {}) } as never).eq("id", id).eq("user_id", c.user.id);
  return json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/shop/[id]">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const row = await own(id, c.user.id);
  if (!row) return err("not_found", "That item is gone.", 404);
  await db().from("shop_items").delete().eq("id", id).eq("user_id", c.user.id);
  return json(await shopState(c, row.week_start));
}
