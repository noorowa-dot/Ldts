import "server-only";
import { db } from "./supabase/admin";
import { pantryKey } from "./pantry-shared";

/**
 * The fridge reader learns from people's corrections.
 * Every "Fix the ingredients" on a photo stores what the AI saw wrongly (removed) and what it missed (added).
 * Before reading a new photo, the most frequent lessons are added to the prompt:
 *  - global: mix-ups and misses seen in several different kitchens (one person can't skew everyone's results),
 *  - personal: this kitchen's own past corrections (e.g. their "milk" is always oat milk).
 * Hints only break ties: the prompt says they never allow listing something that is not visible.
 */

type Fb = { user_id: string | null; recipe_id: string | null; removed: string[]; added: string[] };

export async function recordCorrection(input: { userId: string | null; recipeId: string; detected: string[]; corrected: string[] }) {
  const det = new Map(input.detected.map((n) => [pantryKey(n), n]));
  const cor = new Map(input.corrected.map((n) => [pantryKey(n), n]));
  const removed = [...det].filter(([k]) => !cor.has(k)).map(([, n]) => n);
  const added = [...cor].filter(([k]) => !det.has(k)).map(([, n]) => n);
  const kept = [...det].filter(([k]) => cor.has(k)).map(([, n]) => n);
  if (!removed.length && !added.length) return;
  const { error } = await db().from("vision_feedback").insert({ user_id: input.userId, recipe_id: input.recipeId, removed, added, kept } as never);
  if (error) console.error("[vision] feedback", error.message);
}

type Lessons = { pairs: [string, string, number][]; wrong: [string, number][]; missed: [string, number][] };

/** Counts patterns; `minKitchens` = how many different kitchens (or photos, with `byPhoto`) must show the same pattern. */
function learn(rows: Fb[], minKitchens: number, byPhoto = false): Lessons {
  const pairs = new Map<string, { a: string; b: string; who: Set<string> }>();
  const wrong = new Map<string, { n: string; who: Set<string> }>();
  const missed = new Map<string, { n: string; who: Set<string> }>();
  for (const r of rows) {
    const who = (byPhoto ? r.recipe_id : r.user_id ?? r.recipe_id) ?? Math.random().toString();
    for (const n of r.removed) {
      const k = pantryKey(n);
      const e = wrong.get(k) ?? { n, who: new Set() };
      e.who.add(who);
      wrong.set(k, e);
    }
    for (const n of r.added) {
      const k = pantryKey(n);
      const e = missed.get(k) ?? { n, who: new Set() };
      e.who.add(who);
      missed.set(k, e);
    }
    // A swap (one or two wrong, one or two added in the same fix) is a mix-up: "sour cream" was really "Greek yogurt".
    if (r.removed.length && r.removed.length <= 2 && r.added.length && r.added.length <= 2)
      for (const a of r.removed)
        for (const b of r.added) {
          const k = pantryKey(a) + "→" + pantryKey(b);
          const e = pairs.get(k) ?? { a, b, who: new Set() };
          e.who.add(who);
          pairs.set(k, e);
        }
  }
  const top = <T extends { who: Set<string> }>(m: Map<string, T>, n: number) => [...m.values()].filter((e) => e.who.size >= minKitchens).sort((x, y) => y.who.size - x.who.size).slice(0, n);
  return {
    pairs: top(pairs, 8).map((e) => [e.a, e.b, e.who.size]),
    wrong: top(wrong, 5).map((e) => [e.n, e.who.size]),
    missed: top(missed, 6).map((e) => [e.n, e.who.size]),
  };
}

let globalCache: { at: number; v: Lessons } | null = null;

async function globalLessons(): Promise<Lessons> {
  if (globalCache && Date.now() - globalCache.at < 10 * 60_000) return globalCache.v;
  const { data, error } = await db().from("vision_feedback").select("user_id,recipe_id,removed,added").order("created_at", { ascending: false }).limit(1000);
  const v = learn(error ? [] : ((data ?? []) as Fb[]), 2);
  globalCache = { at: Date.now(), v };
  return v;
}

/** Lines for the photo prompt. Never throws: no lessons is fine. */
export async function visionHints(userId: string | null | undefined): Promise<string[]> {
  try {
    const [g, mine] = await Promise.all([
      globalLessons(),
      userId
        ? db().from("vision_feedback").select("user_id,recipe_id,removed,added").eq("user_id", userId).order("created_at", { ascending: false }).limit(40).then((r) => learn((r.data ?? []) as Fb[], 1, true))
        : Promise.resolve(null),
    ]);
    const out: string[] = [];
    if (mine) {
      for (const [a, b] of mine.pairs.slice(0, 5)) out.push(`In this kitchen, what looked like "${a}" was really "${b}" before.`);
      for (const [n, c] of mine.missed.slice(0, 5)) if (c >= 2) out.push(`This kitchen usually has "${n}" (missed before): look for it carefully.`);
    }
    for (const [a, b] of g.pairs) out.push(`A common mix-up: "${a}" is often really "${b}". Check the shape and the label.`);
    for (const [n] of g.wrong) out.push(`"${n}" is often listed by mistake: only list it when it is clearly visible.`);
    for (const [n] of g.missed) out.push(`"${n}" is often missed (door shelves, drawers, behind other items): look for it.`);
    return Array.from(new Set(out)).slice(0, 16);
  } catch (e) {
    console.error("[vision] hints", (e as Error).message);
    return [];
  }
}
