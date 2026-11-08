import { getUser } from "@/lib/supabase/server";
import { cancelPlan } from "@/lib/kwop";
import { err, json } from "@/lib/http";

export async function POST() {
  const user = await getUser();
  if (!user) return err("auth", "Log in first.", 401);
  const r = await cancelPlan(user.email);
  return json(r);
}
