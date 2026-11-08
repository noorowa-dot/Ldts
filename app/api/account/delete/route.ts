import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { cancelPlan, getPlan } from "@/lib/kwop";
import { err, json } from "@/lib/http";

/** Deletes the account and everything in it: recipes, photos, profile. */
export async function POST() {
  const user = await getUser();
  if (!user) return err("auth", "Log in first.", 401);
  const plan = await getPlan(user.email, { fresh: true });
  if (plan.paid) await cancelPlan(user.email);
  const { data: rows } = await db().from("recipes").select("photo_path").eq("user_id", user.id);
  const paths = Array.from(new Set((rows ?? []).map((r: { photo_path: string | null }) => r.photo_path).filter(Boolean))) as string[];
  const { data: folder } = await db().storage.from("fridge-photos").list(user.id, { limit: 1000 });
  for (const f of folder ?? []) paths.push(`${user.id}/${f.name}`);
  for (let i = 0; i < paths.length; i += 100) await db().storage.from("fridge-photos").remove(paths.slice(i, i + 100));
  const { error } = await db().auth.admin.deleteUser(user.id);
  if (error) return err("failed", "We couldn't delete your account. Please try again.", 500);
  return json({ ok: true });
}
