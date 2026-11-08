import { freeStatus, getCtx, getRow, toView } from "@/lib/recipes";
import { track } from "@/lib/kwop";
import { db } from "@/lib/supabase/admin";
import { err, json } from "@/lib/http";

/** A free account unlocks one full recipe a week (its own choice, from the paywall). */
export async function POST(_req: Request, ctx: RouteContext<"/api/recipes/[id]/free">) {
  const { id } = await ctx.params;
  const c = await getCtx();
  if (!c.user) return err("auth", "Create your free account first.", 401);
  const row = await getRow(id);
  if (!row || row.user_id !== c.user.id) return err("not_found", "We couldn't find that recipe.", 404);
  if (c.tier !== "none") return json({ recipe: await toView(c, row) });
  const st = await freeStatus(c.user.id, id);
  if (!st.thisOne) {
    if (!st.available) {
      const when = st.next ? new Date(st.next).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "next week";
      return err("free_used", `You've used this week's free recipe. Your next one is ready ${when}.`, 403, { next: st.next });
    }
    await db().from("free_unlocks").insert({ user_id: c.user.id, recipe_id: id } as never);
    track("aha", c.user.email, "free_weekly_recipe");
  }
  return json({ recipe: await toView(c, row) });
}
