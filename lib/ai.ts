import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Diet, Generated, Heat } from "./types";

/**
 * The only place Platepal talks to an AI model (Google Gemini).
 * Quotas are checked by the caller (lib/quota.ts) before calling these.
 */

const MODELS = (process.env.GEMINI_MODEL || "gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite").split(",").map((s) => s.trim()).filter(Boolean);

let client: GoogleGenAI | null = null;
function ai() {
  if (!process.env.GEMINI_API_KEY) throw new AiError("not_configured", "The AI chef is not configured yet.");
  // One attempt per model, capped: the SDK's default retries (up to 5, with long backoff) would outlast the function.
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { retryOptions: { attempts: 1 } } });
  return client;
}

export class AiError extends Error {
  constructor(public code: "not_configured" | "no_food" | "failed", message: string) {
    super(message);
  }
}

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

const schema = {
  type: "object",
  properties: {
    no_food: { type: "boolean", description: "true only if the photo shows no food or ingredients at all" },
    found: {
      type: "array",
      description: "Every distinct food item you can see, most visible first (max 14). x/y = the center of that item in the photo, on a 0-1000 scale (0,0 = top-left, 1000,1000 = bottom-right). Each item gets its own position.",
      items: {
        type: "object",
        properties: { name: { type: "string" }, x: { type: "number" }, y: { type: "number" } },
        required: ["name", "x", "y"],
      },
    },
    title: { type: "string", description: "Appetizing dish name, Title Case, max 6 words" },
    intro: { type: "string", description: "One warm sentence, max 22 words, why this works tonight" },
    time_minutes: { type: "integer" },
    servings: { type: "integer" },
    difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
    uses: { type: "array", items: { type: "string" }, description: "names from `found` that the recipe uses" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: { item: { type: "string" }, amount: { type: "string" }, from_fridge: { type: "boolean" } },
        required: ["item", "amount", "from_fridge"],
      },
    },
    steps: {
      type: "array",
      description: "4 to 8 steps a 12-year-old can follow",
      items: {
        type: "object",
        properties: { title: { type: "string" }, text: { type: "string" }, minutes: { type: "integer" } },
        required: ["title", "text", "minutes"],
      },
    },
    shopping: {
      type: "array",
      description: "0 to 3 missing items, ONLY if strictly necessary. Basic pantry staples (salt, pepper, oil, water) never go here.",
      items: { type: "object", properties: { item: { type: "string" }, why: { type: "string" } }, required: ["item", "why"] },
    },
    tips: {
      type: "array",
      description:
        "3 to 5 substantial chef's tips for THIS dish, each different in kind: a technique that makes it better (why it works), a swap or substitution, a flavor boost, make-ahead or leftovers/storage, and how to serve or plate it. Concrete, 20-45 words each.",
      items: {
        type: "object",
        properties: { title: { type: "string", description: "2-5 words, e.g. 'Dry the chicken first'" }, text: { type: "string" } },
        required: ["title", "text"],
      },
    },
    macros: {
      type: "object",
      description: "Estimated per serving",
      properties: { calories: { type: "integer" }, protein_g: { type: "integer" }, carbs_g: { type: "integer" }, fat_g: { type: "integer" } },
      required: ["calories", "protein_g", "carbs_g", "fat_g"],
    },
  },
  required: ["no_food", "found", "title", "intro", "time_minutes", "servings", "difficulty", "uses", "ingredients", "steps", "shopping", "tips", "macros"],
};

type CookOptions = {
  diet?: Diet[];
  calorieTarget?: number | null;
  avoidTitles?: string[];
  /** "fridge": only what is at home (default). "idea": a dish the person wants to cook this week (shopping allowed). */
  mode?: "fridge" | "idea";
  /** Spice level. Never changes which dish is chosen: only how much heat it carries. */
  heat?: Heat | null;
};

const HEAT_RULES: Record<Heat, string> = {
  mild: "MILD: no chili heat at all (no chili flakes, cayenne, hot sauce or hot peppers); black pepper is fine. Family and kid friendly.",
  medium: "MEDIUM: a gentle, warming heat (for example a pinch of red pepper flakes or a little hot sauce) that most people enjoy.",
  hot: "HOT: clearly spicy. Increase the heat with red pepper flakes, cayenne, hot sauce or fresh chilies (about 2-3x a normal amount), and say in the steps when to add it.",
  extra: "EXTRA HOT: fiery. Layer heat in two places (for example chilies in the cooking and hot sauce or chili oil to finish), clearly marked amounts, plus one line in the tips on how to tame it at the table.",
};

function heatLine(h?: Heat | null) {
  if (!h) return null;
  return `Heat level: ${HEAT_RULES[h]} Choose the dish exactly as you would without this preference; the heat level only changes the spices, their amounts and the steps where they go in. A small jar of a common heat source (red pepper flakes, cayenne or hot sauce) can be assumed in the pantry.`;
}

function instructions(o: CookOptions) {
  const lines =
    o.mode === "idea"
      ? [
          "You are Platepal's chef, planning a dinner for a busy person in the United States who will shop for it this week.",
          "Write in simple American English (cups, tablespoons, °F). Kind, short, concrete.",
          "Build ONE delicious, realistic recipe for the requested dish with ingredients any US grocery store sells.",
          "List every ingredient with a precise amount. `found` = the main ingredients (x and y can be any value). `shopping` stays empty.",
        ]
      : [
          "You are Platepal's chef, cooking for a busy person in the United States who wants dinner from what is already at home.",
          "Write in simple American English (cups, tablespoons, °F). Kind, short, concrete.",
          "Build ONE delicious, realistic recipe that relies on the visible ingredients. Assume only these staples exist: salt, pepper, cooking oil, water, butter is NOT assumed.",
          "Prefer recipes ready in 30 minutes or less. Never invent ingredients that are not visible or a staple; anything else goes in `shopping` and only if truly needed.",
        ];
  if (o.diet?.length) lines.push(`The recipe MUST be: ${o.diet.join(", ")}. Skip items that break this.`);
  if (o.calorieTarget) lines.push(`Aim for about ${o.calorieTarget} calories per serving.`);
  if (o.avoidTitles?.length) lines.push(`Make something clearly different from: ${o.avoidTitles.join("; ")}.`);
  const hl = heatLine(o.heat);
  if (hl) lines.push(hl);
  return lines.join("\n");
}

const HEDGE_MS = Number(process.env.GEMINI_HEDGE_MS || 6000);

type JsonCall = { system: string; schema: object; temperature: number };

async function callModel(model: string, parts: object[], c: JsonCall, timeout: number, signal: AbortSignal): Promise<Record<string, unknown>> {
  let thinking = true;
  for (;;) {
    const t0 = Date.now();
    try {
      const res = await ai().models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: c.system,
          responseMimeType: "application/json",
          responseJsonSchema: c.schema,
          temperature: c.temperature,
          ...(thinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          abortSignal: signal,
          httpOptions: { timeout, retryOptions: { attempts: 1 } },
        },
      });
      console.log(`[ai] ${model} answered in ${Date.now() - t0} ms`);
      return JSON.parse(res.text ?? "{}");
    } catch (e) {
      if (thinking && /thinking/i.test(String((e as Error)?.message))) {
        thinking = false; // this model has no thinking levels: ask again without it
        continue;
      }
      if (!signal.aborted) console.error(`[ai] ${model} failed after ${Date.now() - t0} ms:`, (e as Error)?.message?.slice(0, 300));
      throw e;
    }
  }
}

/**
 * The newest model answers first. If it is slow (Google "high demand"), a faster model starts after HEDGE_MS
 * and the first good answer wins; the other request is cancelled. Remaining models are a last resort.
 * `check` validates an answer (throwing an AiError stops everything, e.g. "no food in this photo").
 */
async function runJson<T>(parts: object[], c: JsonCall, check: (d: Record<string, unknown>) => T): Promise<T> {
  const [first, second, ...rest] = MODELS;
  const ctrl = new AbortController();
  const one = (model: string, timeout: number, signal: AbortSignal) => callModel(model, parts, c, timeout, signal).then(check);
  const attempts: Promise<T>[] = [one(first, 30_000, ctrl.signal)];
  if (second) {
    attempts.push(
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, HEDGE_MS);
        // If the first model fails early, start the second right away.
        attempts[0].catch(() => {
          clearTimeout(t);
          resolve();
        });
      }).then(() => one(second, 30_000, ctrl.signal))
    );
  }
  try {
    const out = await Promise.any(attempts);
    ctrl.abort();
    return out;
  } catch (agg) {
    const errs = (agg as AggregateError).errors ?? [agg];
    const known = errs.find((e) => e instanceof AiError && e.code !== "failed");
    if (known) throw known;
    for (const model of rest) {
      try {
        return await one(model, 25_000, new AbortController().signal);
      } catch (e) {
        if (e instanceof AiError && e.code !== "failed") throw e;
      }
    }
    throw new AiError("failed", (errs[0] as Error)?.message || "The AI chef could not answer.");
  }
}

function run(parts: object[], o: CookOptions): Promise<Generated> {
  return runJson(parts, { system: instructions(o), schema, temperature: o.avoidTitles?.length ? 1 : 0.7 }, (data) => {
    if (data.no_food || !(data.found as unknown[])?.length) throw new AiError("no_food", "We couldn't spot any food in that photo.");
    return sanitize(data);
  });
}

function clamp(n: unknown, lo: number, hi: number, d: number) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : d;
}
function str(s: unknown, max: number) {
  return String(s ?? "").trim().slice(0, max);
}

/**
 * Positions come back on Gemini's 0-1000 scale (sometimes 0-100 or 0-1): normalize to percent.
 * When they are clearly unusable (all piled on one spot), they are dropped and the photo shows no pins.
 */
function placeFound(raw: Record<string, unknown>[]) {
  const pts = raw.map((f) => ({ name: nice(str(f.name, 40)), x: Number(f.x), y: Number(f.y) }));
  const max = Math.max(0, ...pts.flatMap((p) => [p.x, p.y]).filter(Number.isFinite));
  const k = max > 100 ? 0.1 : max <= 1 ? 100 : 1;
  const found = dedupe(
    pts.map((p) => ({ name: p.name, x: clamp(p.x * k, 4, 96, -1), y: clamp(p.y * k, 6, 94, -1) }))
  ).slice(0, 14);
  const distinct = new Set(found.map((f) => `${Math.round(f.x / 8)}:${Math.round(f.y / 8)}`)).size;
  const usable = found.length <= 1 || distinct >= Math.ceil(found.length * 0.6);
  return found.map((f) => (usable && f.x >= 0 && f.y >= 0 ? f : { name: f.name, x: -1, y: -1 }));
}

/** "dozen eggs" → "Eggs", "lemon" → "Lemon". */
function nice(name: string) {
  const n = name.replace(/^(a |an |some |dozen |half (a )?|one |two |three )/i, "").trim();
  return n ? n[0].toUpperCase() + n.slice(1) : name;
}
function dedupe<T extends { name: string }>(xs: T[]) {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = x.name.toLowerCase().replace(/e?s$/, "");
    if (!x.name || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function tipsOf(d: Record<string, unknown>): { tip: string; tips: { title: string; text: string }[] } {
  const raw = Array.isArray(d.tips) ? (d.tips as Record<string, unknown>[]) : [];
  const tips = raw
    .map((t) => ({ title: str(t?.title, 60), text: str(t?.text, 420) }))
    .filter((t) => t.text)
    .slice(0, 5);
  if (!tips.length && d.tip) tips.push({ title: "Chef's tip", text: str(d.tip, 420) });
  return { tip: tips[0]?.text ?? "", tips };
}

function sanitize(d: Record<string, unknown>): Generated {
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    found: placeFound(arr(d.found)),
    title: str(d.title, 70) || "Fridge Rescue Skillet",
    intro: str(d.intro, 200),
    time_minutes: clamp(d.time_minutes, 5, 180, 25),
    servings: clamp(d.servings, 1, 8, 2),
    difficulty: (["Easy", "Medium", "Hard"].includes(d.difficulty as string) ? d.difficulty : "Easy") as Generated["difficulty"],
    uses: Array.from(new Set(arr(d.uses).map((s) => nice(str(s, 40))))).slice(0, 14),
    ingredients: arr(d.ingredients).slice(0, 20).map((i: Record<string, unknown>) => ({
      item: str(i.item, 60),
      amount: str(i.amount, 40),
      from_fridge: Boolean(i.from_fridge),
    })),
    steps: arr(d.steps).slice(0, 10).map((s: Record<string, unknown>) => ({
      title: str(s.title, 60),
      text: str(s.text, 500),
      minutes: clamp(s.minutes, 0, 120, 5),
    })),
    shopping: arr(d.shopping).slice(0, 3).map((s: Record<string, unknown>) => ({ item: str(s.item, 50), why: str(s.why, 120) })),
    ...tipsOf(d),
    macros: {
      calories: clamp((d.macros as Record<string, unknown>)?.calories, 0, 3000, 0),
      protein_g: clamp((d.macros as Record<string, unknown>)?.protein_g, 0, 300, 0),
      carbs_g: clamp((d.macros as Record<string, unknown>)?.carbs_g, 0, 400, 0),
      fat_g: clamp((d.macros as Record<string, unknown>)?.fat_g, 0, 300, 0),
    },
  };
}

/** Snap & Scan: one photo in, one full recipe out. */
export function cookFromPhoto(image: { data: string; mimeType: string }, o: CookOptions = {}) {
  return run(
    [
      { inlineData: image },
      { text: "Here is a photo of my fridge, pantry or counter. List what you see and make tonight's recipe from it." },
    ],
    o
  );
}

/** Remix / typed list: the same ingredients, a different dish. */
export function cookFromList(items: string[], o: CookOptions = {}) {
  return run(
    [
      {
        text: `My ingredients: ${items.join(", ")}. There is no photo: put them all in \`found\` with x/y spread evenly (any values). Make tonight's recipe from them.`,
      },
    ],
    o
  );
}

/** Plan a dish the person wants this week ("chicken tacos"). */
export function cookFromIdea(dish: string, o: CookOptions = {}) {
  return run([{ text: `Dish I want to cook this week: ${dish}` }], { ...o, mode: "idea" });
}

/* ---------------- Weekly shopping list ---------------- */

/** A sane price in cents, or null (rejects 0, negatives and absurd values). */
function cents(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0.05 || n > 200) return null;
  return Math.round(n * 100);
}

/** Estimated prices for items (manual additions, older lists). Same scale as the list builder. */
export function estimatePrices(items: { name: string; buy: string }[]): Promise<(number | null)[]> {
  const schema = {
    type: "object",
    properties: { prices: { type: "array", items: { type: "number", description: PRICE_HINT } } },
    required: ["prices"],
  };
  const text = ["Estimate the price of each item, in the same order:", ...items.map((i, n) => `${n + 1}. ${i.name}${i.buy ? ` (${i.buy})` : ""}`)].join("\n");
  const system = "You estimate US grocery prices for a shopping list. One number per item, same order, US dollars. If a pack size is missing, assume the most common pack.";
  return runJson([{ text }], { system, schema, temperature: 0.1 }, (d) => {
    const arr = Array.isArray(d.prices) ? d.prices : [];
    if (!arr.length) throw new AiError("failed", "No prices");
    return items.map((_, i) => cents(arr[i]));
  });
}

export const AISLES = ["Produce", "Meat & Fish", "Dairy & Eggs", "Bakery", "Pantry", "Frozen", "Spices & Sauces", "Other"] as const;
export type Aisle = (typeof AISLES)[number];

export type ShopLine = {
  name: string;
  quantity: number;
  unit: string;
  buy: string;
  aisle: Aisle;
  for_meals: string[];
  have_at_home: boolean;
  /** Estimated price of what `buy` says, in cents, at a major US supermarket. Null when unknown. */
  est_cents: number | null;
};

const PRICE_HINT =
  "Typical current shelf price in US dollars at a major US supermarket chain (Kroger / Walmart level, store brand when common) for exactly the pack in `buy`. Realistic, not a guess of 0. Number only, e.g. 3.49";

const shopSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Plain grocery name as a store sells it, singular, Title Case (e.g. 'Chicken Thighs', 'Yellow Onion')" },
          quantity: { type: "number", description: "Total needed across all meals, in `unit`" },
          unit: { type: "string", description: "lb, oz, count, cup, tbsp, tsp, bunch, can, clove, head, dozen…" },
          buy: { type: "string", description: "What to put in the cart in US store packs, e.g. '1 lb pack', '1 bag (5 oz)', '2 cans (15 oz)', '1 head'" },
          aisle: { type: "string", enum: [...AISLES] },
          for_meals: { type: "array", items: { type: "string" }, description: "Titles of the meals that use it" },
          have_at_home: { type: "boolean", description: "true when the pantry list already covers it" },
          est_price_usd: { type: "number", description: PRICE_HINT },
        },
        required: ["name", "quantity", "unit", "buy", "aisle", "for_meals", "have_at_home", "est_price_usd"],
      },
    },
  },
  required: ["items"],
};

/**
 * The assistant's shop: merges every meal's ingredients (scaled to the planned servings), combines duplicates,
 * converts to what US stores sell, and flags what is already at home.
 */
export function buildShoppingList(input: {
  meals: { title: string; servings: number; recipe_servings: number; ingredients: { item: string; amount: string }[] }[];
  pantry: string[];
}): Promise<ShopLine[]> {
  const text = [
    "Meals planned this week (scale each recipe from its servings to the planned servings):",
    ...input.meals.map(
      (m) => `- ${m.title} (recipe serves ${m.recipe_servings}, planned for ${m.servings}): ${m.ingredients.map((i) => `${i.amount} ${i.item}`).join("; ")}`
    ),
    "",
    `Already at home (from their fridge photos and their own notes): ${input.pantry.length ? input.pantry.join(", ") : "nothing known"}.`,
  ].join("\n");
  const system = [
    "You are Platepal's shopping assistant for a busy person in the United States.",
    "Make ONE shopping list for the whole week: combine the same ingredient across meals (e.g. 2 cloves + 3 cloves garlic = 5 cloves → buy 1 head),",
    "scale amounts to the planned servings, round up to real US store pack sizes, and never forget an ingredient.",
    "Salt, pepper, water and cooking oil are assumed at home: mark them have_at_home=true.",
    "Mark have_at_home=true only when the pantry list clearly covers it. Keep names short and plain.",
    "For each item also give est_price_usd: the typical price of that exact pack at a major US supermarket.",
  ].join("\n");
  return runJson([{ text }], { system, schema: shopSchema, temperature: 0.2 }, (d) => {
    const items = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
    if (!items.length) throw new AiError("failed", "Empty shopping list");
    const seen = new Set<string>();
    return items
      .map((i) => ({
        name: nice(str(i.name, 60)),
        quantity: Math.max(0, Math.round(Number(i.quantity) * 100) / 100) || 1,
        unit: str(i.unit, 16) || "count",
        buy: str(i.buy, 60),
        aisle: ((AISLES as readonly string[]).includes(String(i.aisle)) ? i.aisle : "Other") as Aisle,
        for_meals: (Array.isArray(i.for_meals) ? i.for_meals : []).map((x) => str(x, 70)).slice(0, 7),
        have_at_home: Boolean(i.have_at_home),
        est_cents: cents(i.est_price_usd),
      }))
      .filter((i) => {
        const k = i.name.toLowerCase();
        if (!i.name || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 80);
  });
}

/**
 * Same dish, different heat: rewrites the spices, amounts and steps of an existing recipe for the chosen heat level.
 * The dish, its main ingredients and its title stay the same.
 */
export function adjustHeat(
  current: { title: string; intro: string; time_minutes: number; servings: number; difficulty: string; ingredients: { item: string; amount: string; from_fridge: boolean }[]; steps: { title: string; text: string; minutes: number }[]; uses: string[] },
  heat: Heat,
  o: CookOptions = {}
) {
  const text = [
    "Here is a recipe. Keep the SAME dish, the same title, the same main ingredients and the same number of servings.",
    "Only change its heat: the spicy ingredients and their amounts, the steps where they go in, and the tips about heat.",
    "Return the whole recipe. `found` and `uses` = these ingredient names (x and y can be any value).",
    "",
    JSON.stringify(current),
  ].join("\n");
  return run([{ text }], { ...o, heat, mode: "idea" });
}
