import "server-only";
import { db } from "./supabase/admin";

/**
 * Daily fair-use counters for small AI helpers, kept in `profiles.answers` (server-only column).
 * Returns false when today's limit is reached; otherwise counts one use.
 */
export async function takeDaily(userId: string, key: string, perDay: number): Promise<boolean> {
  const { data } = await db().from("profiles").select("answers").eq("id", userId).maybeSingle();
  const answers = ((data as { answers: Record<string, unknown> } | null)?.answers ?? {}) as Record<string, unknown>;
  const today = new Date().toISOString().slice(0, 10);
  const cur = answers[key] as { day: string; n: number } | undefined;
  const used = cur?.day === today ? cur.n : 0;
  if (used >= perDay) return false;
  await db().from("profiles").update({ answers: { ...answers, [key]: { day: today, n: used + 1 } } } as never).eq("id", userId);
  return true;
}
