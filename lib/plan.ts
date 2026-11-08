import "server-only";
import { db } from "./supabase/admin";
import type { Ctx } from "./recipes";

export type PlanMeal = {
  id: string;
  day: number;
  slot: "lunch" | "dinner";
  servings: number;
  recipe: { id: string; title: string; time_minutes: number; servings: number; photo_url: string | null; diet: string[] };
};

export async function weekMeals(userId: string, week: string): Promise<PlanMeal[]> {
  const { data } = await db()
    .from("plan_meals")
    .select("id,day,slot,servings,recipes(id,title,time_minutes,servings,photo_path,diet)")
    .eq("user_id", userId)
    .eq("week_start", week)
    .order("day")
    .order("slot");
  const rows = (data ?? []) as unknown as {
    id: string;
    day: number;
    slot: "lunch" | "dinner";
    servings: number;
    recipes: { id: string; title: string; time_minutes: number; servings: number; photo_path: string | null; diet: string[] } | null;
  }[];
  const paths = Array.from(new Set(rows.map((r) => r.recipes?.photo_path).filter(Boolean))) as string[];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await db().storage.from("fridge-photos").createSignedUrls(paths, 3600);
    (urls ?? []).forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }
  return rows
    .filter((r) => r.recipes)
    .map((r) => ({
      id: r.id,
      day: r.day,
      slot: r.slot,
      servings: r.servings,
      recipe: {
        id: r.recipes!.id,
        title: r.recipes!.title,
        time_minutes: r.recipes!.time_minutes,
        servings: r.recipes!.servings,
        diet: r.recipes!.diet ?? [],
        photo_url: r.recipes!.photo_path ? signed.get(r.recipes!.photo_path) ?? null : null,
      },
    }));
}

/** What is at home: ingredients seen in the person's fridge photos over the last 10 days. */
export async function pantry(ctx: Ctx): Promise<string[]> {
  if (!ctx.user) return [];
  const since = new Date(Date.now() - 10 * 24 * 3600_000).toISOString();
  const { data } = await db().from("recipes").select("found").eq("user_id", ctx.user.id).in("source", ["photo", "example", "list"]).gte("created_at", since).limit(30);
  const names = new Set<string>();
  for (const r of (data ?? []) as { found: { name: string }[] }[]) for (const f of r.found ?? []) names.add(f.name);
  return Array.from(names).slice(0, 60);
}
