// LOCAL TESTING ONLY: inserts one recipe for an anonymous device id into the LOCAL Supabase,
// so the screens after the AI step (locked recipe, sign-up, paywall, checkout) can be checked
// before the Gemini key is connected. Refuses to run against a non-local database.
// Usage: node scripts/dev-fixture.mjs <anon-uuid>          one anonymous recipe
//        node scripts/dev-fixture.mjs --user <email>        one recipe owned by that account
//        node scripts/dev-fixture.mjs --shop <email>        a sample shopping list for this week
//        add --old to write the recipe as an older one (a single tip), to test the tips backfill
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries((readFileSync(".env.local", "utf8") + "\n" + (() => { try { return readFileSync(".env.development.local", "utf8"); } catch { return ""; } })()).split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("dev-fixture only runs against the local Supabase");
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const [flag, arg] = process.argv.slice(2);
let anon = flag, userId = null;
if (flag === "--user" || flag === "--shop") {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  userId = data.users.find((u) => u.email === arg)?.id;
  if (!userId) throw new Error("no such user " + arg);
  anon = null;
}
if (flag === "--shop") {
  const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow);
  const week = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const items = [
    ["Chicken Thighs", 2, "lb", "2 lb family pack", "Meat & Fish", ["Lemon-Garlic Chicken Skillet", "Chicken Tacos"], false],
    ["Baby Spinach", 5, "oz", "1 bag (5 oz)", "Produce", ["Lemon-Garlic Chicken Skillet"], true],
    ["Yellow Onion", 2, "count", "2 onions", "Produce", ["Chicken Tacos"], false],
    ["Limes", 3, "count", "3 limes", "Produce", ["Chicken Tacos"], false],
    ["Cilantro", 1, "bunch", "1 bunch", "Produce", ["Chicken Tacos"], false],
    ["Corn Tortillas", 12, "count", "1 pack (12)", "Bakery", ["Chicken Tacos"], false],
    ["Feta", 4, "oz", "1 block (6 oz)", "Dairy & Eggs", ["Lemon-Garlic Chicken Skillet"], true],
    ["Sour Cream", 0.5, "cup", "1 tub (8 oz)", "Dairy & Eggs", ["Chicken Tacos"], false],
    ["Black Beans", 2, "can", "2 cans (15 oz)", "Pantry", ["Chicken Tacos"], false],
    ["Ground Cumin", 2, "tsp", "1 jar", "Spices & Sauces", ["Chicken Tacos"], false],
  ];
  await db.from("shop_items").delete().eq("user_id", userId).eq("week_start", week);
  const est = [699, 349, 198, 149, 99, 279, 499, 229, 178, 299];
  await db.from("shop_items").insert(items.map(([name, quantity, unit, buy, aisle, for_meals, have_at_home], i) => ({ user_id: userId, week_start: week, name, quantity, unit, buy, aisle, for_meals, have_at_home, est_cents: est[i], position: i, source: "plan" })));
  console.log("shop", week, items.length);
  process.exit(0);
}
const id = crypto.randomUUID();
const path = `${userId ?? "anon-" + anon}/${id}.jpg`;
await db.storage.from("fridge-photos").upload(path, readFileSync("public/examples/half-empty-fridge.jpg"), { contentType: "image/jpeg" });
const found = [["Eggs", 24, 20], ["Feta", 52, 24], ["Lemons", 74, 28], ["Baby spinach", 18, 52], ["Cherry tomatoes", 44, 56], ["Chicken thighs", 74, 58], ["Onion", 17, 86], ["Garlic", 31, 89], ["Milk", 78, 80]].map(([name, x, y]) => ({ name, x, y, ...(name === "Milk" ? { sure: false } : {}) }));
await db.from("recipes").insert({ id, user_id: userId, anon_id: anon, ip_hash: "fixture", photo_path: path, source: "example", title: "Lemon-Garlic Chicken Skillet", intro: "Crispy chicken thighs, wilted spinach and bursting tomatoes, finished with feta and lemon: one pan, 25 minutes.", time_minutes: 25, servings: 2, difficulty: "Easy", found, uses: ["Chicken thighs", "Baby spinach", "Cherry tomatoes", "Feta", "Lemons", "Garlic"], diet: [] });
await db.from("recipe_bodies").insert({ recipe_id: id, body: {
  ingredients: [
    { item: "Chicken thighs", amount: "4 pieces (about 1 lb)", from_fridge: true },
    { item: "Baby spinach", amount: "3 big handfuls", from_fridge: true },
    { item: "Cherry tomatoes", amount: "1 cup", from_fridge: true },
    { item: "Feta", amount: "1/3 cup, crumbled", from_fridge: true },
    { item: "Lemon", amount: "1", from_fridge: true },
    { item: "Garlic", amount: "3 cloves", from_fridge: true },
    { item: "Olive oil", amount: "1 tbsp", from_fridge: false },
    { item: "Smoked paprika", amount: "1 tsp", from_fridge: false },
    { item: "Dried oregano", amount: "1/2 tsp", from_fridge: false },
    { item: "Red pepper flakes", amount: "1 pinch", from_fridge: false },
    { item: "Salt and pepper", amount: "to taste", from_fridge: false },
  ],
  steps: [
    { title: "Season the chicken", text: "Pat the chicken dry. Season both sides with salt, pepper and the zest of half the lemon.", minutes: 2 },
    { title: "Sear until golden", text: "Heat the oil in a large skillet over medium-high heat. Cook the chicken skin-side down for 6 minutes, flip and cook 5 more, until it reaches 165°F inside. Move it to a plate.", minutes: 11 },
    { title: "Garlic and tomatoes", text: "Lower the heat to medium. Add the sliced garlic and the tomatoes; cook 3 minutes until the tomatoes start to burst.", minutes: 3 },
    { title: "Wilt the spinach", text: "Add the spinach a handful at a time, stirring until it wilts. Squeeze in the juice of the lemon.", minutes: 2 },
    { title: "Finish and serve", text: "Return the chicken to the pan, scatter the feta on top and serve right away.", minutes: 1 },
  ],
  shopping: [],
  tip: "Start the chicken in a pan that is fully hot and don't move it for 6 minutes: that is how you get crispy skin.",
  tips: process.argv.includes("--old") ? undefined : [
    { kind: "technique", title: "Dry the chicken first", text: "Pat the thighs completely dry and salt them 10 minutes ahead. Dry skin browns instead of steaming, so you get a crisp, golden crust." },
    { kind: "swap", title: "Swap the feta", text: "No feta? Goat cheese or a spoon of Greek yogurt with lemon zest gives the same tangy finish." },
    { kind: "flavor", title: "Scrape up the brown bits", text: "After searing, the browned bits in the pan are pure flavor. The lemon juice loosens them: scrape with a wooden spoon so they melt into the sauce." },
    { kind: "make-ahead", title: "Make it ahead", text: "Sear the chicken up to a day ahead and keep it in the fridge. Reheat in the pan for 5 minutes, then add the fresh spinach." },
    { kind: "serving", title: "Serve it with bread", text: "Put a warm, crusty baguette or pita on the table to mop up the lemony pan juices; a pot of rice works just as well." },
  ],
  macros: { calories: 520, protein_g: 42, carbs_g: 9, fat_g: 34 },
} });
console.log(id);
