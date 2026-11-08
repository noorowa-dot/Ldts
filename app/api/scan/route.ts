import { z } from "zod";
import { AiError, aiConfigured, cookFromList, cookFromPhoto } from "@/lib/ai";
import { allowance, getCtx, saveRecipe, toView, getRow } from "@/lib/recipes";
import { QUOTAS, track } from "@/lib/kwop";
import { err, json } from "@/lib/http";
import { supabaseConfigured } from "@/lib/supabase/config";
import { db } from "@/lib/supabase/admin";
import type { Diet, Heat } from "@/lib/types";

const HEATS = ["mild", "medium", "hot", "extra"] as const;

export const maxDuration = 120;

const EXAMPLES = ["half-empty-fridge", "pantry-shelf", "leftovers-night"] as const;
const DietSchema = z.array(z.enum(["vegetarian", "vegan", "keto", "gluten-free", "dairy-free", "high-protein"])).max(6);
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request) {
  if (!supabaseConfigured) return err("not_ready", "Platepal is getting set up. Please try again in a minute.", 503);
  if (!aiConfigured()) return err("ai_off", "The AI chef is warming up. Please try again in a minute.", 503);

  const ctx = await getCtx();
  const allow = await allowance(ctx);
  if (!allow.ok) {
    const msg =
      allow.reason === "anon_limit"
        ? "You've made 3 free recipes today. Create a free account to keep going."
        : allow.reason === "free_limit"
          ? "You've made your 3 free recipes today. Pick a plan to cook more."
          : `You've used all ${allow.limit} recipes of your plan this month.`;
    return err(allow.reason, msg, 429, { used: allow.used, limit: allow.limit });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("bad_request", "We couldn't read that upload. Try again?");
  }

  // Dietary filters: only what the plan includes (the hero sends none).
  let diet: Diet[] = [];
  const rawDiet = form.get("diet");
  if (typeof rawDiet === "string" && rawDiet) {
    const parsed = DietSchema.safeParse(rawDiet.split(",").filter(Boolean));
    if (!parsed.success) return err("bad_diet", "Unknown dietary filter.");
    const q = QUOTAS[ctx.tier];
    diet = q.diets === "all" ? parsed.data : q.diets === "vegetarian" ? parsed.data.filter((d) => d === "vegetarian") : [];
  }
  // Heat level: from the Fridge picker, else the person's saved default. Changes spice, never the dish.
  const rawHeat = form.get("heat");
  let heat: Heat | null = typeof rawHeat === "string" && (HEATS as readonly string[]).includes(rawHeat) ? (rawHeat as Heat) : null;
  if (!heat && ctx.user) {
    const { data } = await db().from("profiles").select("heat").eq("id", ctx.user.id).maybeSingle();
    heat = ((data as { heat: Heat | null } | null)?.heat ?? null) as Heat | null;
  }
  let calorieTarget: number | null = null;
  if (QUOTAS[ctx.tier].calorieTarget && ctx.user) {
    const { data } = await db().from("profiles").select("calorie_target").eq("id", ctx.user.id).maybeSingle();
    calorieTarget = (data as { calorie_target: number | null } | null)?.calorie_target ?? null;
  }

  const photo = form.get("photo");
  const example = form.get("example");
  const list = form.get("list");

  try {
    let id: string;
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > MAX_BYTES) return err("too_big", "That photo is too big. Try one under 6 MB.");
      const mime = photo.type || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return err("bad_type", "Please use a JPG, PNG or WebP photo.");
      const bytes = Buffer.from(await photo.arrayBuffer());
      const g = await withRetry(() => cookFromPhoto({ data: bytes.toString("base64"), mimeType: mime }, { diet, calorieTarget, heat }));
      id = await saveRecipe(ctx, g, { source: "photo", heat, diet, photo: { bytes, mime } });
    } else if (typeof example === "string" && (EXAMPLES as readonly string[]).includes(example)) {
      const origin = new URL(req.url).origin;
      const res = await fetch(`${origin}/examples/${example}.jpg`);
      if (!res.ok) return err("example_missing", "That example is not available right now.", 500);
      const bytes = Buffer.from(await res.arrayBuffer());
      const g = await withRetry(() => cookFromPhoto({ data: bytes.toString("base64"), mimeType: "image/jpeg" }, { diet, calorieTarget, heat }));
      id = await saveRecipe(ctx, g, { source: "example", heat, diet, photo: { bytes, mime: "image/jpeg" } });
    } else if (typeof list === "string" && list.trim()) {
      const items = list.split(",").map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 20);
      if (items.length < 2) return err("short_list", "Add at least 2 ingredients.");
      const g = await withRetry(() => cookFromList(items, { diet, calorieTarget, heat }));
      id = await saveRecipe(ctx, g, { source: "list", heat, diet });
    } else {
      return err("no_input", "Add a photo of your fridge first.");
    }
    track(ctx.tier === "none" ? "onboarding_done" : "feature_used", ctx.user?.email, ctx.tier === "none" ? undefined : "snap_and_scan");
    const row = await getRow(id);
    return json({ recipe: await toView(ctx, row!) });
  } catch (e) {
    if (e instanceof AiError && e.code === "no_food")
      return err("no_food", "We couldn't spot any food in that photo. Try a brighter one, with the fridge door open?", 422);
    console.error("[scan]", e);
    return err("failed", "Our chef dropped the spoon. Please try again.", 500);
  }
}

/** One server attempt (lib/ai.ts already falls back to a second model); the page retries once on failure. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
