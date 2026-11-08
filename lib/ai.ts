import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Diet, Generated } from "./types";

/**
 * The only place Platepal talks to an AI model (Google Gemini).
 * Quotas are checked by the caller (lib/quota.ts) before calling these.
 */

const MODELS = (process.env.GEMINI_MODEL || "gemini-3.8-flash,gemini-2.5-flash").split(",").map((s) => s.trim());

let client: GoogleGenAI | null = null;
function ai() {
  if (!process.env.GEMINI_API_KEY) throw new AiError("not_configured", "The AI chef is not configured yet.");
  // One attempt per model, capped: the SDK's default retries (up to 5, with long backoff) would outlast the function.
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 22_000, retryOptions: { attempts: 1 } } });
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
      description: "Every distinct food item you can see, most visible first (max 14). x/y = its center in the photo, 0-100 percent from the left/top.",
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

async function run(parts: object[], o: CookOptions): Promise<Generated> {
  let lastErr: unknown;
  for (const model of MODELS) {
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
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      console.log(`[ai] ${model} answered in ${Date.now() - t0} ms`);
      const data = JSON.parse(res.text ?? "{}");
      if (data.no_food || !data.found?.length) throw new AiError("no_food", "We couldn't spot any food in that photo.");
      return sanitize(data);
    } catch (e) {
      if (e instanceof AiError) throw e;
      lastErr = e;
      console.error(`[ai] ${model} failed after ${Date.now() - t0} ms:`, (e as Error)?.message?.slice(0, 400));
    }
  }
  throw new AiError("failed", (lastErr as Error)?.message || "The AI chef could not answer.");
}

function clamp(n: unknown, lo: number, hi: number, d: number) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : d;
}
function str(s: unknown, max: number) {
  return String(s ?? "").trim().slice(0, max);
}

function sanitize(d: Record<string, unknown>): Generated {
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    found: arr(d.found).slice(0, 14).map((f: Record<string, unknown>) => ({
      name: str(f.name, 40),
      x: clamp(f.x, 4, 96, 50),
      y: clamp(f.y, 6, 94, 50),
    })),
    title: str(d.title, 70) || "Fridge Rescue Skillet",
    intro: str(d.intro, 200),
    time_minutes: clamp(d.time_minutes, 5, 180, 25),
    servings: clamp(d.servings, 1, 8, 2),
    difficulty: (["Easy", "Medium", "Hard"].includes(d.difficulty as string) ? d.difficulty : "Easy") as Generated["difficulty"],
    uses: arr(d.uses).slice(0, 14).map((s) => str(s, 40)),
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
