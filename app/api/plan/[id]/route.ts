import { z } from "zod";
import { getCtx } from "@/lib/recipes";
import { QUOTAS } from "@/lib/kwop";
import { db } from "@/lib/supabase/admin";
import { weekMeals } from "@/lib/plan";
import { err, json } from "@/lib/http";

const Patch = z.object({ day: z.number().int().min(0).max(6).optional(), slot: z.enum(["lunch", "dinner"]).optional(), servings: z.number().int().min(1).max(12).optional() });

async function own(id: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await db().from("plan_meals").select("id,week_start").eq("id", id).eq("user_id", userId).maybeSingle();
  return data as { id: string; week_start: string } | null;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/plan/[id]">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const row = await own(id, c.user.id);
  if (!row) return err("not_found", "That meal is gone.", 404);
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Invalid change.");
  if (parsed.data.slot === "lunch" && QUOTAS[c.tier].planMeals < 14) return err("upgrade", "Planning lunches comes with Pro.", 403, { feature: "plan" });
  await db().from("plan_meals").update(parsed.data as never).eq("id", id).eq("user_id", c.user.id);
  return json({ meals: await weekMeals(c.user.id, row.week_start) });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/plan/[id]">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const row = await own(id, c.user.id);
  if (!row) return err("not_found", "That meal is gone.", 404);
  await db().from("plan_meals").delete().eq("id", id).eq("user_id", c.user.id);
  return json({ meals: await weekMeals(c.user.id, row.week_start) });
}
