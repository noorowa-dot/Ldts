export type Diet = "vegetarian" | "vegan" | "keto" | "gluten-free" | "dairy-free" | "high-protein";
export const DIETS: { id: Diet; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "keto", label: "Keto" },
  { id: "gluten-free", label: "Gluten-free" },
  { id: "dairy-free", label: "Dairy-free" },
  { id: "high-protein", label: "High-protein" },
];

/** x/y in percent of the photo; -1 when the position is unknown (no pin on the photo). */
export type Heat = "mild" | "medium" | "hot" | "extra";
export const HEATS: { id: Heat; label: string; flames: number; hint: string }[] = [
  { id: "mild", label: "Mild", flames: 1, hint: "No chili heat. Kid-friendly." },
  { id: "medium", label: "Medium", flames: 2, hint: "A gentle warmth." },
  { id: "hot", label: "Hot", flames: 3, hint: "Clearly spicy." },
  { id: "extra", label: "Extra hot", flames: 4, hint: "Bring the fire." },
];

export type FoundItem = { name: string; x: number; y: number };

export type RecipeBody = {
  ingredients: { item: string; amount: string; from_fridge: boolean }[];
  steps: { title: string; text: string; minutes: number }[];
  shopping: { item: string; why: string }[];
  /** Kept for older recipes: the first tip. */
  tip: string;
  /** 3-5 substantial chef's tips (technique, swap, flavor boost, make-ahead, serving). */
  tips?: { title: string; text: string }[];
  macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
};

export type RecipeTeaser = {
  id: string;
  title: string;
  intro: string;
  time_minutes: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  found: FoundItem[];
  uses: string[];
  diet: Diet[];
  photo_url: string | null;
  heat: Heat | null;
  created_at: string;
  is_favorite: boolean;
  parent_id: string | null;
};

/** What the browser gets. Parts the plan does not cover are masked on the server. */
export type RecipeView = RecipeTeaser & {
  body: RecipeBody;
  access: {
    unlocked: boolean; // has any paid plan
    shopping: boolean;
    macros: boolean; // macros + chef tip
    planName: string | null;
    tier: "none" | "starter" | "pro" | "chef";
    /** Unlocked with the free account's weekly recipe (not a plan). */
    freeUnlocked: boolean;
    /** Free account: can this recipe be unlocked with this week's free recipe? When not, the date the next one is ready. */
    free: { available: boolean; next: string | null } | null;
  };
};

export type Generated = {
  found: FoundItem[];
  title: string;
  intro: string;
  time_minutes: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  uses: string[];
} & RecipeBody;
