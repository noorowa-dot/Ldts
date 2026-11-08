/**
 * What each level gets. One source of truth: enforced on the server (lib/kwop re-exports it)
 * and shown to people in the "Compare plans" table. Prices come from Kwop, never from here.
 */
export type Tier = "none" | "starter" | "pro" | "chef";

export type Quota = {
  recipes: number; // full recipes a month (paid); free accounts get FREE_WEEKLY instead
  saved: number;
  diets: "all" | "vegetarian" | "none";
  shopping: boolean; // Shopping Saver
  macros: boolean; // macros + chef's tip
  remix: number;
  calorieTarget: boolean;
  planMeals: number; // planned meals a week (14 = lunch + dinner every day)
  shopList: boolean; // unlimited smart lists (free accounts: FREE_LISTS_MONTHLY)
  priceCheck: boolean;
};

export const QUOTAS: Record<Tier, Quota> = {
  none: { recipes: 0, saved: 5, diets: "none", shopping: false, macros: false, remix: 0, calorieTarget: false, planMeals: 3, shopList: false, priceCheck: false },
  starter: { recipes: 20, saved: 25, diets: "vegetarian", shopping: false, macros: false, remix: 1, calorieTarget: false, planMeals: 7, shopList: true, priceCheck: false },
  pro: { recipes: 60, saved: 100000, diets: "all", shopping: true, macros: false, remix: 3, calorieTarget: false, planMeals: 14, shopList: true, priceCheck: true },
  chef: { recipes: 150, saved: 100000, diets: "all", shopping: true, macros: true, remix: 10, calorieTarget: true, planMeals: 14, shopList: true, priceCheck: true },
};

/** Visitors (no account) and free accounts. */
export const ANON_DAILY = 3; // recipe previews a day without an account
export const FREE_DAILY = 5; // recipe previews a day with a free account
export const FREE_WEEKLY = 1; // full recipes a week, free account
export const FREE_LISTS_MONTHLY = 1; // smart shopping lists a month, free account

export const TAGS: Record<Exclude<Tier, "none">, string> = {
  starter: "For a few rescue dinners a week",
  pro: "For people who cook most nights",
  chef: "For food lovers who cook every day",
};

/** "What you unlock" lines for a tier (paywall, unlock film). */
export function unlockLines(t: Tier): string[] {
  const q = QUOTAS[t];
  if (t === "none") return [];
  const lines = [`${q.recipes} full recipes a month: every amount, every step`];
  if (t === "starter") lines.push("Plan a dinner for every day + smart shopping lists", "Vegetarian filter · save 25 recipes · 1 remix per recipe");
  if (t === "pro")
    lines.push("Plan lunch + dinner all week, smart shopping lists", "Price check: see which store is cheapest for your list", "All 6 dietary filters + Shopping Saver", "3 remixes per recipe · unlimited favorites");
  if (t === "chef")
    lines.push("Macros per serving + a calorie target", "The chef's tip on every dish", "Everything in Pro: whole-week planner, price check, all filters", "10 remixes per recipe · unlimited favorites");
  return lines;
}

/** The comparison table, row by row. "Visitor" = no account. */
export type Cell = string | boolean;
export const FEATURE_ROWS: { label: string; hint?: string; cells: Record<"visitor" | Tier, Cell> }[] = [
  { label: "Recipe previews from a fridge photo", cells: { visitor: `${ANON_DAILY} a day`, none: `${FREE_DAILY} a day`, starter: true, pro: true, chef: true } },
  { label: "Full recipes (every amount + step)", cells: { visitor: false, none: `${FREE_WEEKLY} a week`, starter: `${QUOTAS.starter.recipes} a month`, pro: `${QUOTAS.pro.recipes} a month`, chef: `${QUOTAS.chef.recipes} a month` } },
  { label: "Step-by-step cooking checklist", cells: { visitor: false, none: true, starter: true, pro: true, chef: true } },
  { label: "Fix the ingredients & remake", cells: { visitor: true, none: true, starter: true, pro: true, chef: true } },
  { label: "Saved recipes", cells: { visitor: false, none: String(QUOTAS.none.saved), starter: String(QUOTAS.starter.saved), pro: "Unlimited", chef: "Unlimited" } },
  { label: "Week planner", cells: { visitor: false, none: `${QUOTAS.none.planMeals} dinners`, starter: "Every dinner", pro: "Lunch + dinner", chef: "Lunch + dinner" } },
  { label: "Smart shopping list", cells: { visitor: false, none: `${FREE_LISTS_MONTHLY} a month`, starter: "Unlimited", pro: "Unlimited", chef: "Unlimited" } },
  { label: "Dietary filters", cells: { visitor: false, none: false, starter: "Vegetarian", pro: "All 6", chef: "All 6" } },
  { label: "Remix: new dish, same fridge", cells: { visitor: false, none: false, starter: `${QUOTAS.starter.remix} per recipe`, pro: `${QUOTAS.pro.remix} per recipe`, chef: `${QUOTAS.chef.remix} per recipe` } },
  { label: "Shopping Saver (what's missing)", cells: { visitor: false, none: false, starter: false, pro: true, chef: true } },
  { label: "Price check across your stores", cells: { visitor: false, none: false, starter: false, pro: true, chef: true } },
  { label: "Macros, calorie target & chef's tips", cells: { visitor: false, none: false, starter: false, pro: false, chef: true } },
];
