import { cookies } from "next/headers";
import { claimAnon } from "@/lib/recipes";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { track } from "@/lib/kwop";
import { err, json } from "@/lib/http";

/** Called right after sign-up / log-in: attach anonymous tries and attribution to the account. */
export async function POST() {
  const user = await getUser();
  if (!user) return err("auth", "Not signed in.", 401);
  const jar = await cookies();
  const anonId = jar.get("pp_anon")?.value ?? null;
  const claimed = await claimAnon(user.id, anonId && /^[0-9a-f-]{36}$/.test(anonId) ? anonId : null);

  const { data: profile } = await db().from("profiles").select("k,intended_plan,source,created_at").eq("id", user.id).maybeSingle();
  const p = profile as { k: string | null; intended_plan: string | null; source: Record<string, string>; created_at: string } | null;
  const update: Record<string, unknown> = {};
  const k = jar.get("kwop_k")?.value;
  if (k && /^[A-Za-z0-9]{1,12}$/.test(k) && !p?.k) update.k = k;
  const plan = jar.get("pp_plan")?.value;
  if (plan && !p?.intended_plan) update.intended_plan = plan.slice(0, 40);
  try {
    const utm = JSON.parse(jar.get("pp_utm")?.value || "{}");
    if (utm && Object.keys(utm).length && (!p?.source || !Object.keys(p.source).length)) update.source = utm;
  } catch {}
  if (!p) await db().from("profiles").insert({ id: user.id, email: user.email, ...update } as never);
  else if (Object.keys(update).length) await db().from("profiles").update(update as never).eq("id", user.id);

  const isNew = !p || Date.now() - new Date(p.created_at).getTime() < 10 * 60_000;
  if (isNew) track("signup", user.email);

  const { data: latest } = await db().from("recipes").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
  return json({ ok: true, claimed, latest: (latest?.[0] as { id: string } | undefined)?.id ?? null });
}
