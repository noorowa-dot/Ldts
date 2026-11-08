import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { redeemVoucher } from "@/lib/vouchers";
import { track } from "@/lib/kwop";
import { err, json } from "@/lib/http";

const Body = z.object({ code: z.string().trim().min(3).max(64) });
const TRIES_PER_HOUR = 8;

/** Redeem a voucher: free access to a plan for this account (no card). */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("auth", "Create your free account first, then add the voucher.", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("invalid", "That code doesn't look right.");

  // Slow down guessing: a few tries an hour per account.
  const { data: prof } = await db().from("profiles").select("answers").eq("id", user.id).maybeSingle();
  const answers = ((prof as { answers: Record<string, unknown> } | null)?.answers ?? {}) as Record<string, unknown>;
  const hour = new Date().toISOString().slice(0, 13);
  const t = (answers.voucher_tries as { hour: string; n: number } | undefined) ?? { hour, n: 0 };
  const n = t.hour === hour ? t.n : 0;
  if (n >= TRIES_PER_HOUR) return err("too_many", "Too many tries. Wait an hour, then try again.", 429);
  await db().from("profiles").update({ answers: { ...answers, voucher_tries: { hour, n: n + 1 } } } as never).eq("id", user.id);

  const r = await redeemVoucher(user, parsed.data.code);
  if (!r.ok) return err(r.error, r.message, 400);
  track("feature_used", user.email, "voucher");
  return json(r);
}
