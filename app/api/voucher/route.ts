import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { voucherHash, tierLabel } from "@/lib/vouchers";
import { track } from "@/lib/kwop";
import { err, json } from "@/lib/http";

const Body = z.object({ code: z.string().trim().min(6).max(64) });
const TRIES_PER_HOUR = 8;

/** Redeem a voucher: free access to a plan for this account. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("auth", "Log in to use a voucher.", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_code", "That code doesn't look right.");

  // Slow down guessing: a few tries an hour per account.
  const { data: prof } = await db().from("profiles").select("answers").eq("id", user.id).maybeSingle();
  const answers = ((prof as { answers: Record<string, unknown> } | null)?.answers ?? {}) as Record<string, unknown>;
  const hour = new Date().toISOString().slice(0, 13);
  const t = (answers.voucher_tries as { hour: string; n: number } | undefined) ?? { hour, n: 0 };
  const n = t.hour === hour ? t.n : 0;
  if (n >= TRIES_PER_HOUR) return err("too_many", "Too many tries. Wait an hour, then try again.", 429);
  await db().from("profiles").update({ answers: { ...answers, voucher_tries: { hour, n: n + 1 } } } as never).eq("id", user.id);

  const { data, error } = await db().rpc("redeem_voucher" as never, { p_hash: voucherHash(parsed.data.code), p_user: user.id, p_email: user.email } as never);
  if (error) {
    const m = error.message;
    const msg = m.includes("expired")
      ? "This voucher has expired."
      : m.includes("used")
        ? "This voucher has already been used."
        : m.includes("not_yours")
          ? "This voucher belongs to another account."
          : "That code doesn't match a voucher.";
    return err("invalid", msg, 400);
  }
  const row = (Array.isArray(data) ? data[0] : data) as { tier: string; until: string | null } | null;
  track("feature_used", user.email, "voucher");
  return json({ ok: true, tier: row?.tier, label: tierLabel((row?.tier ?? "none") as never), until: row?.until ?? null });
}
