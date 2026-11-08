export type Diet = "vegetarian" | "vegan" | "keto" | "gluten-free" | "dairy-free" | "high-protein";
export const DIETS: { id: Diet; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "keto", label: "Keto" },
  { id: "gluten-free", label: "Gluten-free" },
  { id: "dairy-free", label: "Dairy-free" },
  { id: "high-protein", label: "High-protein" },
];

export type FoundItem = { name: string; x: number; y: number };

export type RecipeBody = {
  ingredients: { item: string; amount: string; from_fridge: boolean }[];
  steps: { title: string; text: string; minutes: number }[];
  shopping: { item: string; why: string }[];
  tip: string;
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
