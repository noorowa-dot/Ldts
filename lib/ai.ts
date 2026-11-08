import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Diet, Generated } from "./types";

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
    tip: { type: "string", description: "One pro chef tip for this exact dish, max 30 words" },
    macros: {
      type: "object",
      description: "Estimated per serving",
      properties: { calories: { type: "integer" }, protein_g: { type: "integer" }, carbs_g: { type: "integer" }, fat_g: { type: "integer" } },
      required: ["calories", "protein_g", "carbs_g", "fat_g"],
    },
  },
  required: ["no_food", "found", "title", "intro", "time_minutes", "servings", "difficulty", "uses", "ingredients", "steps", "shopping", "tip", "macros"],
};

type CookOptions = {
  diet?: Diet[];
  calorieTarget?: number | null;
  avoidTitles?: string[];
};

function instructions(o: CookOptions) {
  const lines = [
    "You are Platepal's chef, cooking for a busy person in the United States who wants dinner from what is already at home.",
    "Write in simple American English (cups, tablespoons, °F). Kind, short, concrete.",
    "Build ONE delicious, realistic recipe that relies on the visible ingredients. Assume only these staples exist: salt, pepper, cooking oil, water, butter is NOT assumed.",
    "Prefer recipes ready in 30 minutes or less. Never invent ingredients that are not visible or a staple; anything else goes in `shopping` and only if truly needed.",
  ];
  if (o.diet?.length) lines.push(`The recipe MUST be: ${o.diet.join(", ")}. Skip visible items that break this.`);
  if (o.calorieTarget) lines.push(`Aim for about ${o.calorieTarget} calories per serving.`);
  if (o.avoidTitles?.length) lines.push(`Make something clearly different from: ${o.avoidTitles.join("; ")}.`);
  return lines.join("\n");
}

const HEDGE_MS = Number(process.env.GEMINI_HEDGE_MS || 6000);

async function callModel(model: string, parts: object[], o: CookOptions, timeout: number, signal: AbortSignal): Promise<Generated> {
  let thinking = true;
  for (;;) {
    const t0 = Date.now();
    try {
      const res = await ai().models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: instructions(o),
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          temperature: o.avoidTitles?.length ? 1 : 0.7,
          ...(thinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          abortSignal: signal,
          httpOptions: { timeout, retryOptions: { attempts: 1 } },
        },
      });
      console.log(`[ai] ${model} answered in ${Date.now() - t0} ms`);
      const data = JSON.parse(res.text ?? "{}");
      if (data.no_food || !data.found?.length) throw new AiError("no_food", "We couldn't spot any food in that photo.");
      return sanitize(data);
    } catch (e) {
      if (e instanceof AiError) throw e;
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
 */
async function run(parts: object[], o: CookOptions): Promise<Generated> {
  const [first, second, ...rest] = MODELS;
  const ctrl = new AbortController();
  const attempts: Promise<Generated>[] = [callModel(first, parts, o, 30_000, ctrl.signal)];
  if (second) {
    attempts.push(
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, HEDGE_MS);
        // If the first model fails early, start the second right away.
        attempts[0].catch(() => {
          clearTimeout(t);
          resolve();
        });
      }).then(() => callModel(second, parts, o, 30_000, ctrl.signal))
    );
  }
  try {
    const out = await Promise.any(attempts);
    ctrl.abort();
    return out;
  } catch (agg) {
    const errs = (agg as AggregateError).errors ?? [agg];
    const noFood = errs.find((e) => e instanceof AiError && e.code === "no_food");
    if (noFood) throw noFood;
    for (const model of rest) {
      try {
        return await callModel(model, parts, o, 25_000, new AbortController().signal);
      } catch (e) {
        if (e instanceof AiError) throw e;
      }
    }
    throw new AiError("failed", (errs[0] as Error)?.message || "The AI chef could not answer.");
  }
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
    tip: str(d.tip, 240),
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
