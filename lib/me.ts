import "server-only";
import { redirect } from "next/navigation";
import { allowance, getCtx, periodStart, planLabel } from "./recipes";
import { QUOTAS, type Tier } from "./kwop";
import { db } from "./supabase/admin";

export type Me = {
  email: string;
  tier: Tier;
  planName: string | null;
  /** True when access comes from a voucher, not a payment (nothing to cancel). */
  voucher: boolean;
  planId: number | null;
  status: string | null;
  until: string | null;
  used: number;
  limit: number;
  periodStart: string;
  diet: string[];
  calorieTarget: number | null;
  quotas: (typeof QUOTAS)[Tier];
};

export async function requireMe(next = "/app"): Promise<Me> {
  const ctx = await getCtx();
  if (!ctx.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const [a, prof] = await Promise.all([allowance(ctx), db().from("profiles").select("diet,calorie_target").eq("id", ctx.user.id).maybeSingle()]);
  const p = prof.data as { diet: string[]; calorie_target: number | null } | null;
  return {
    email: ctx.user.email,
    tier: ctx.tier,
    planName: planLabel(ctx),
    voucher: Boolean(ctx.comp) && !(ctx.plan.paid && ctx.plan.plan),
    planId: ctx.plan.plan?.id ?? null,
    status: ctx.plan.status,
    until: ctx.plan.until,
    used: a.used,
    limit: a.limit,
    periodStart: periodStart(ctx.plan).toISOString(),
    diet: p?.diet ?? [],
    calorieTarget: p?.calorie_target ?? null,
    quotas: QUOTAS[ctx.tier],
  };
}
