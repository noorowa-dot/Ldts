# Platepal: list of updates

Every change the owner asks for gets a line here, newest first. It's kept up to date with each change,
so it shows what exists today and where to find it. (The technical notes live in `CLAUDE.md`.)

Status: **Live** = on https://platepal-2.vercel.app · **Needs owner** = waiting for a key or setting from you.

---

## Nov 8, 2026 (evening): consistency pass, spice cabinet check, smarter fridge reading

| # | Update | Where you see it | Status |
|---|---|---|---|
| 31 | **Chef's tips are now their own big section** on every recipe: 4-5 tip cards per dish, each labeled (Technique · Swap · Flavor boost · Make ahead · To serve · Heat). The macros moved to their own "Macros per serving" section. | Recipe page, Fridge page, landing page result | Live |
| 32 | **Older recipes get their full tips too**: recipes made before the tips upgrade had one short tip; the first time a Chef member opens one, the chef writes its 4-5 tips and saves them. | Any older recipe | Live |
| 33 | Locked recipes always show a full set of 4-5 (blurred) tip cards, so free users see what Chef unlocks. | Locked recipes, paywall | Live |
| 34 | **"Quick peek in your spice cabinet"**: after a recipe is made, everything it needs that wasn't in the photo (spices, sauces, flour…) is listed with **Got it** / **I'm out**. "I have all of these" in one tap. Salt, pepper and oil are never asked about. | Every unlocked recipe, under Ingredients | Live |
| 35 | "I'm out" → the chef suggests a **swap** right there (e.g. "1 tsp sweet paprika + a pinch of cumin"). | Spice cabinet check | Live |
| 36 | "I'm out" items → **"Add to my shopping list"** in one tap (this week's list). | Spice cabinet check → Shop | Live |
| 37 | **Your cupboard is remembered**: answers are saved to the account, pre-filled on the next recipes ("you had it last time"), used by the chef to write recipes (it may use what you have, avoids what you're out of), and the shopping list marks those items "already at home". | Recipes, shopping list | Live |
| 38 | Ingredients list now has a legend: green dot = from your fridge, yellow dot = from your cupboard. | Recipe page | Live |
| 39 | **Smarter fridge reading for messy fridges**: the AI now sweeps every shelf, the door and the drawers, reads labels and brands, tells look-alikes apart (yogurt / sour cream / cream cheese, milk / oat milk…), skips unlabeled containers it can't see into, and finds up to 20 items. Photos are read at high resolution, and uploads are sharper (1600 px instead of 1280 px). | Every photo scan | Live |
| 40 | **Best guesses are marked**: items the AI isn't sure about show with a dashed outline and "Dashed = our best guess. Wrong? Fix it below." | Ingredient chips under the photo | Live |
| 41 | **The fridge reader learns**: every "Fix the ingredients" is saved (what it got wrong, what it missed). Before each new photo it gets the most common lessons: mix-ups seen in several kitchens (e.g. "sour cream is often really Greek yogurt") and the person's own past fixes ("this kitchen's milk is oat milk"). | Every photo scan | Live |
| 42 | Copy updated everywhere to match: landing features + FAQ, paywall FAQ, plan table ("4-5 chef's tips per dish", new row "Spice-cabinet check + swap ideas"), upgrade sheet, Chef plan perks. | Landing, paywall, pricing table | Live |
| 43 | This list of updates (`UPDATES.md`), kept current with every change. | This file | Live |

## Nov 8, 2026: chef's tips + heat level

| # | Update | Where | Status |
|---|---|---|---|
| 26 | Chef's tips: 3-5 substantial tips per dish instead of one line (Chef plan). | Recipe | Live (now 4-5, see #31) |
| 27 | Heat level: Mild · Medium · Hot · Extra hot. Same dish, only the spice changes. | Fridge page, Settings, every unlocked recipe | Live |
| 28 | Change the heat of a recipe you already have, in place (about 5 s, free, 20 a day). | Recipe → Heat level | Live |

## Nov 8, 2026: shop cost

| # | Update | Where | Status |
|---|---|---|---|
| 23 | Automatic estimated price on every shopping-list item and an estimated total for the shop. | Shop | Live |
| 24 | "Done shopping? What did you pay?": enter the real total, see over/under the estimate, weekly spend history. | Shop | Live |
| 25 | Live Kroger prices, ready to switch on. | Shop → price check | Needs owner (Kroger keys) |

## Nov 8, 2026: plans, free tier, cook mode

| # | Update | Where | Status |
|---|---|---|---|
| 18 | "Compare all plans" table: which plan has which feature. | Paywall, /pricing, upgrade sheet | Live |
| 19 | Better free account: 5 previews a day, 1 full recipe a week, 5 saved recipes, 3 planned dinners, 1 smart list a month. Paid plans add more at each level. | Everywhere | Live |
| 20 | Free recipe of the week ("Not today? Use your free recipe of the week"). | Paywall | Live |
| 21 | Tick off each cooking step; a "Bon appétit" celebration when the last one is done (save / share / time to eat). | Recipe steps | Live |

## Nov 8, 2026: vouchers and creator network

| # | Update | Where | Status |
|---|---|---|---|
| 14 | Vouchers: free plan access without a card (owner, creators, partners). | Sign-up popup, /signup, /login, paywall, upgrade sheet, /pricing, Account | Live |
| 15 | Creator links (`/signup?voucher=CODE`) and creator credit on later paid plans (Kwop link code). | Any page | Live |
| 16 | Owner voucher: Chef forever, locked to your email. | Your account | Live |
| 17 | A voucher that unlocks access skips the paywall and the card: the unlock film plays and the recipe opens. | Funnel | Live |

## Nov 8, 2026: week planner, shopping list, prices, capture

| # | Update | Where | Status |
|---|---|---|---|
| 8 | Week planner: 7 days × lunch/dinner; add your recipes or type a dish. | /app/plan | Live |
| 9 | Smart shopping list: every planned meal merged, scaled, in US store packs, grouped by aisle; "already at home" from your fridge photos. | /app/shop | Live |
| 10 | Price check: your own price book per store, cheapest store, "split your shop" savings. | /app/shop | Live (Pro/Chef) |
| 11 | "Take a photo" and "Upload a photo" buttons (camera or library), drag-and-drop on computers. | Fridge page | Live |
| 12 | "Something wrong? Fix the ingredients": remove/add items, remake the recipe. | Under the photo | Live |

## Nov 7-8, 2026: launch

| # | Update | Where | Status |
|---|---|---|---|
| 1 | Landing page: try-first hero (snap your fridge → recipe in ~10 s, no account), VSL, sections. | / | Live |
| 2 | Funnel: making-your-recipe screen, blurred recipe, sign-up sheet, paywall, Whop checkout inside the page, unlock film. | / and /r/… | Live |
| 3 | App: Fridge, My recipes, Saved, Settings, Account (plan, billing, cancel, delete). | /app | Live |
| 4 | Plans from Kwop: Starter $5 · Pro $9 · Chef $15 a month (yearly −20 %). | Paywall | Live |
| 5 | Share links with a preview image. | /s/… | Live |
| 6 | Connected to Kwop; deployed on Vercel; Supabase database with private photos. | — | Live |
| 7 | Google sign-in, ready to switch on. | Sign-up | Needs owner (Google client) |
| — | Gemini billing (so the newest model isn't rate-limited under real traffic). | — | Needs owner (recommended) |
