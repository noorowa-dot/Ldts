import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { cancelPlan, confirmCheckout, getApp, getPlan, tierOf, track, unlockLines } from "@/lib/kwop";
import { err, json } from "@/lib/http";

const Body = z.object({ ref: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("auth", "Log in first.", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Missing payment reference.");
  const { data } = await db().from("checkouts").select("*").eq("ref", parsed.data.ref).eq("user_id", user.id).maybeSingle();
  const row = data as { ref: string; is_upgrade: boolean; confirmed_at: string | null } | null;
  if (!row) return err("not_found", "We couldn't find that payment.", 404);

  let paid = false;
  for (let i = 0; i < 4 && !paid; i++) {
    const c = await confirmCheckout(row.ref);
    paid = c.paid;
    if (!paid) await new Promise((r) => setTimeout(r, 1200));
  }
  const plan = await getPlan(user.email, { fresh: true });
  if (paid && !row.confirmed_at) {
    await db().from("checkouts").update({ confirmed_at: new Date().toISOString() } as never).eq("ref", row.ref);
    // An upgrade: the old plan stops at the end of its period, never two plans billed.
    if (row.is_upgrade) await cancelPlan(user.email, row.ref);
    track("aha", user.email);
  }
  const app = await getApp();
  const tier = plan.paid ? tierOf(plan.plan, app.plans) : "none";
  return json({
    paid: paid || plan.paid,
    plan: plan.plan ? { ...plan.plan, name: plan.plan.name.replace(/^Platepal\s+/i, "") } : null,
    tier,
    unlock: tier === "none" ? [] : unlockLines(tier),
  });
}
