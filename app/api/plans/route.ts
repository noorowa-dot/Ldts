import { getApp, tierOf, TAGS, unlockLines, QUOTAS } from "@/lib/kwop";
import { json } from "@/lib/http";

/** Public plan info for the paywall (no secrets). */
export async function GET() {
  const app = await getApp();
  return json({
    checkout: app.checkout,
    plans: app.plans.map((p) => {
      const tier = tierOf({ id: p.id, name: p.name }, app.plans);
      const t = tier === "none" ? "starter" : tier;
      return {
        id: p.id,
        name: p.name.replace(/^Platepal\s+/i, ""),
        price_cents: p.price_cents,
        per_day: p.per_day,
        yearly: p.yearly,
        tier: t,
        tag: TAGS[t],
        recipes: QUOTAS[t].recipes,
        unlock: unlockLines(t),
        featured: t === "pro",
      };
    }),
  });
}
