import "server-only";
import { db } from "./supabase/admin";

/** Public share teaser: title, time and ingredient names only. Never the photo or the paid steps. */
export async function getShare(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  try {
    const { data } = await db().from("recipes").select("id,title,intro,time_minutes,servings,difficulty,found,uses").eq("id", id).maybeSingle();
    if (!data) return null;
    const r = data as { id: string; title: string; intro: string; time_minutes: number; servings: number; difficulty: string; found: { name: string }[]; uses: string[] };
    return { ...r, names: (r.uses?.length ? r.uses : r.found.map((f) => f.name)).slice(0, 8) };
  } catch {
    return null;
  }
}
