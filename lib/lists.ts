import "server-only";
import { createClient } from "./supabase/server";
import { db } from "./supabase/admin";

export type ListItem = { id: string; title: string; time_minutes: number; created_at: string; is_favorite: boolean; photo_url: string | null; found_count: number; diet: string[] };

/** Reads with the user's own session: Row Level Security returns only their rows. */
export async function listRecipes(opts: { favorites?: boolean } = {}): Promise<ListItem[]> {
  const supabase = await createClient();
  let q = supabase.from("recipes").select("id,title,time_minutes,created_at,is_favorite,photo_path,found,diet").order("created_at", { ascending: false }).limit(200);
  if (opts.favorites) q = q.eq("is_favorite", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; title: string; time_minutes: number; created_at: string; is_favorite: boolean; photo_path: string | null; found: unknown[]; diet: string[] }[];
  const paths = Array.from(new Set(rows.map((r) => r.photo_path).filter(Boolean))) as string[];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await db().storage.from("fridge-photos").createSignedUrls(paths, 3600);
    (urls ?? []).forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    time_minutes: r.time_minutes,
    created_at: r.created_at,
    is_favorite: r.is_favorite,
    photo_url: r.photo_path ? signed.get(r.photo_path) ?? null : null,
    found_count: Array.isArray(r.found) ? r.found.length : 0,
    diet: r.diet ?? [],
  }));
}
