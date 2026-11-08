import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { claimAnon } from "@/lib/recipes";
import { db } from "@/lib/supabase/admin";
import { track } from "@/lib/kwop";
import { redeemVoucher } from "@/lib/vouchers";

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/app";
}

/** Google / email-link return: create the session, attach the anonymous tries, go back where they were. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      const jar = await cookies();
      const anon = jar.get("pp_anon")?.value ?? null;
      await claimAnon(data.user.id, anon && /^[0-9a-f-]{36}$/.test(anon) ? anon : null);
      const update: Record<string, unknown> = {};
      const k = jar.get("kwop_k")?.value;
      if (k && /^[A-Za-z0-9]{1,12}$/.test(k)) update.k = k;
      const plan = jar.get("pp_plan")?.value;
      if (plan) update.intended_plan = plan.slice(0, 40);
      try {
        const utm = JSON.parse(jar.get("pp_utm")?.value || "{}");
        if (Object.keys(utm).length) update.source = utm;
      } catch {}
      const { data: p } = await db().from("profiles").select("k,created_at").eq("id", data.user.id).maybeSingle();
      const prof = p as { k: string | null; created_at: string } | null;
      if (prof?.k) delete update.k;
      if (Object.keys(update).length) await db().from("profiles").update(update as never).eq("id", data.user.id);
      if (!prof || Date.now() - new Date(prof.created_at).getTime() < 10 * 60_000) track("signup", data.user.email);
      const pending = jar.get("pp_voucher")?.value;
      let unlocked = false;
      if (pending) unlocked = (await redeemVoucher({ id: data.user.id, email: data.user.email.toLowerCase() }, decodeURIComponent(pending))).ok;
      const res = NextResponse.redirect(new URL(next + (unlocked ? (next.includes("?") ? "&" : "?") + "voucher=1" : ""), url.origin));
      if (pending) res.cookies.delete("pp_voucher");
      return res;
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
