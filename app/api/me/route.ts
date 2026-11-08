import { allowance, getCtx, periodStart } from "@/lib/recipes";
import { QUOTAS } from "@/lib/kwop";
import { json } from "@/lib/http";

export async function GET() {
  const c = await getCtx();
  if (!c.user) return json({ user: null });
  const a = await allowance(c);
  return json({
    user: { email: c.user.email },
    tier: c.tier,
    plan: c.plan.plan ? { ...c.plan.plan, name: c.plan.plan.name.replace(/^Platepal\s+/i, "") } : null,
    status: c.plan.status,
    until: c.plan.until,
    usage: { used: a.used, limit: a.limit, period_start: periodStart(c.plan).toISOString() },
    quotas: QUOTAS[c.tier],
  });
}
