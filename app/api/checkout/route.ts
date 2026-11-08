import { z } from "zod";
import { cookies } from "next/headers";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { createCheckout, getApp, getPlan } from "@/lib/kwop";
import { err, json } from "@/lib/http";

const Body = z.object({ plan: z.number().int().positive(), period: z.enum(["month", "year"]), upgrade: z.boolean().optional() });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("auth", "Create your free account first.", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "Pick a plan first.");
  const app = await getApp();
  const plan = app.plans.find((p) => p.id === parsed.data.plan);
  if (!plan) return err("bad_plan", "That plan is not available.", 400);
  if (parsed.data.period === "year" && !plan.yearly) return err("bad_period", "That plan has no yearly price.");

  const current = await getPlan(user.email);
  if (current.paid && current.plan?.id === plan.id) return err("same_plan", `You're already on ${plan.name.replace(/^Platepal\s+/i, "")}.`, 409);

  const { data: profile } = await db().from("profiles").select("k").eq("id", user.id).maybeSingle();
  const jar = await cookies();
  const cookieK = jar.get("kwop_k")?.value;
  const k = (profile as { k: string | null } | null)?.k || (cookieK && /^[A-Za-z0-9]{1,12}$/.test(cookieK) ? cookieK : null);

  const res = await createCheckout({ plan: plan.id, period: parsed.data.period, email: user.email, k });
  if (!res.ok) {
    if (res.status === 409) return err("payments_off", "Payments open in a moment. Your recipe is saved.", 409);
    return err("checkout_failed", "We couldn't open the secure checkout. Please try again.", 502);
  }
  await db().from("checkouts").insert({
    ref: res.ref,
    user_id: user.id,
    plan_id: plan.id,
    period: parsed.data.period,
    is_upgrade: Boolean(current.paid && current.plan),
  } as never);
  return json({ embed: res.embed, ref: res.ref, fallback_url: res.fallback_url });
}
