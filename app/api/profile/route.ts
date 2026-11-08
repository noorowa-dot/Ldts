import { z } from "zod";
import { getCtx } from "@/lib/recipes";
import { db } from "@/lib/supabase/admin";
import { QUOTAS } from "@/lib/kwop";
import { err, json } from "@/lib/http";

const Body = z.object({
  diet: z.array(z.enum(["vegetarian", "vegan", "keto", "gluten-free", "dairy-free", "high-protein"])).max(6).optional(),
  calorie_target: z.number().int().min(200).max(2000).nullable().optional(),
});

export async function PATCH(req: Request) {
  const c = await getCtx();
  if (!c.user) return err("auth", "Log in first.", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Invalid settings.");
  const q = QUOTAS[c.tier];
  const update: Record<string, unknown> = {};
  if (parsed.data.diet) update.diet = q.diets === "all" ? parsed.data.diet : q.diets === "vegetarian" ? parsed.data.diet.filter((d) => d === "vegetarian") : [];
  if (parsed.data.calorie_target !== undefined) {
    if (!q.calorieTarget && parsed.data.calorie_target !== null) return err("upgrade", "Calorie targets come with Chef.", 403);
    update.calorie_target = parsed.data.calorie_target;
  }
  await db().from("profiles").update(update as never).eq("id", c.user.id);
  return json({ ok: true, ...update });
}
