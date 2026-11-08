# Platepal — project memory

Platepal: "Made for busy people trying to cook with what is at home."
Upload a quick photo of your fridge and AI writes a recipe from what is really in it.
Market: United States · Language: English · Currency: USD.
Built with the Kwop method (premium build / Kwop Builder). The owner is not a developer:
never ask product or design questions; decide like the best apps of the niche and write the choice here.

> The full owner brief lives in `KWOP-BUILD.md` (git-ignored: it contains the Kwop key).
> Secrets live only in `.env.local` and Vercel. Never commit them.

---

## RESULT

**RESULT = "your recipe"** (from the user's side: the recipe made from *their* fridge).

- Main button everywhere: **"Make my recipe"** (with an arrow).
- Creating screen: **"Making your recipe…"**.
- Paywall title: **"Your {Recipe name} is ready."** e.g. "Your Lemon-Garlic Chicken Skillet is ready."
- Unlock button: **"See my full recipe"**.
- Sign-up sheet title: **"Save your recipe"**.
- Notifications / toasts: "Your recipe is ready", "Saved to your cookbook".

---

## Step 0 — what already sells (research, Nov 2026)

Eat This Much and PlateJoy (named in the brief) are **meal planners**, not
"cook with what is in my fridge" apps. They stay as **price references**; the apps that really do
Platepal's job are SuperCook, ChefGPT (PantryChef) and FridgeChef.

| App | Landing / headline | Sections in order | Button | Sign-up | Steps to first result | Paywall | Plans |
|---|---|---|---|---|---|---|---|
| **Eat This Much** (meal planner) | "Put your diet on autopilot" | Hero with calorie + diet inputs → sample plan → how it works → features → plans | "Generate" | after the first plan, email or Google | 2 inputs (calories, diet) → plan in 1 tap, no account | after the 1-day plan: "a week of meals" is Premium | Free (1 day) · Premium ≈ $8.99–14.99/mo, ≈ $5/mo yearly |
| **PlateJoy** (meal planner) | "Healthy meal plans personalized for you" | Hero → long quiz → benefits → testimonials → pricing | "Get started" | after a ~50-question quiz | quiz (~5 min) → plan | after the quiz, before any plan (trial) | $12.99/mo · $69/6 mo · $99/yr |
| **SuperCook** | "Recipes by ingredient" | Pantry picker IS the page | — | optional | tick ingredients from 2,000 → list of matching web recipes | none (free, ads) | free |
| **ChefGPT / PantryChef** | "Your AI-powered personal chef" | Hero → modes (PantryChef, MealPlan, MacrosChef…) → testimonials → pricing | "Try for free" | email / Google before generating | sign up → type ingredients → recipe | after ~5–10 free generations | Free · Pro ≈ $2.99–12.99/mo, $29.99/yr |
| **FridgeChef** (iOS) | "Snap your fridge, get recipes" | App Store page | — | — | photo → ideas | hard paywall before use | $7.99/week · $24.99/yr |

Also seen: AI-Chef $5.99/mo or $69.99/yr; SideChef Premium $4.99/mo or $49.99/yr.

**Model picked: Eat This Much** for structure and flow. Its result comes before any account (2 inputs, then a real plan),
the paywall sits on top of the result ("unlock the full week"), and the landing page sells the plan, not the price.
Platepal swaps the inputs for one photo (photo-first like FridgeChef, but **without** a hard paywall up front), and adds the
Kwop rules: no prices on the landing page, a blurred result, a one-tap Google sign-up, then the paywall over their own recipe.

What we beat them on: nobody else gets from **one photo to a cookable recipe in ~10 seconds, with no typing and no account**.
SuperCook makes you tick ingredients from a list; ChefGPT makes you sign up and type; FridgeChef blocks you behind a paywall first.

---

## Step 0b — the blueprint

### Funnel type: TRY FIRST
Why: the core action (one photo) is a single tap, and the recipe can be made in about 10 seconds, so the hero IS the product.
No account is needed to see the teaser. Tries without an account: **3 a day per device and per IP** (server-side, `anon_tries` table).

### The hero (first 10 seconds)
- Dark, warm kitchen-at-night background (#17150F) with a cream dot grid and a soft tomato glow at the top.
- Mono label: `[ FRIDGE → DINNER ]`
- Title (8 words max): **"3 random ingredients. One 5-star dinner."**, with the second line in the gradient.
- Subline: "Snap your fridge. Platepal writes **a real recipe** from **what you already have**: ready in about 10 seconds."
- **The drop zone** right under it: a big recipe-card-shaped tile with a camera icon:
  "**Snap your fridge**" / "or drop a photo · JPG, PNG, HEIC". On phones it opens the camera (`capture="environment"`).
- Under it, the example chips: "No photo handy? **Try an example:** Half-empty fridge · Pantry shelf · Leftovers night"
  (3 illustrated example shelves drawn by us, sent to the real engine).
- True facts line (mono): `FREE TO TRY · NO CARD · READY IN ~10 SECONDS`
- Real proof under it: only once the DB holds 100+ recipes: "1,240 recipes made so far". Until then, nothing.

### The funnel, screen by screen (all in place on the landing page, the page never changes)
1. **Hero drop zone**: the photo is picked or the example tapped → the zone turns into the photo with a scan frame.
2. **Making your recipe…** (the work, 4–6 named steps over the user's own photo, a kitchen-timer progress ring 0 → 99 %):
   1. "Looking at your shelves"
   2. "Spotting ingredients" (dots pop onto the photo with labels)
   3. "Checking what goes together"
   4. "Picking tonight's dish"
   5. "Writing your steps"
   Holds at 99 % while Gemini works. Fails → retries once → "We couldn't read that photo. Try a brighter one?" + "Try again".
   Then: **"Your recipe is ready."** with a short stamp animation (a recipe-card stamp).
3. **The recipe, locked** (the teaser), as a recipe card:
   - CLEAR: their photo with the detected ingredient stickers; "We found 9 ingredients in your fridge"; the recipe name,
     the time, servings, difficulty; "Uses 6 of your 9 ingredients"; the first line of the intro.
   - BLURRED (real content, rendered blurred): the ingredient quantities, the step-by-step method, the Shopping Saver,
     the chef's tip, and the macros (Chef-only parts show "Unlock with Chef").
   - A lock and the button **"See my full recipe"**.
4. **Sign-up sheet** (no account yet): "**Save your recipe**" / "It's waiting for you. Create a free account to keep it."
   Continue with Google (big, white) · or · email + password · "Already have an account? Log in" · Terms / Privacy line.
   The anonymous try (local id `pp_anon` cookie) is attached to the new account.
5. **Paywall sheet** right away, the blurred recipe still behind it:
   - ✕ top left
   - **"Your Lemon-Garlic Chicken Skillet is ready."**
   - Personal line: "Made from your eggs, spinach and feta, in 20 minutes. Pick a plan to cook it tonight."
   - Plans (radio cards, per day big), Pro pre-selected with "Most popular".
   - "Continue with Pro" · "$9.00 due today, then every month · Cancel anytime"
   - "Secure payment, processed by Whop" · chips Whop · Card
   - "What you unlock with Pro" (checks)
   - 3 questions: "Will it work with my fridge?", "Can I cancel?", "What happens right after I pay?"
   - Small print: renews automatically until canceled · prices in USD.
6. **Checkout sheet** over the paywall: Whop embedded checkout (`#whop-checkout`), "Secure payment by Whop · Cancel in 1 click".
7. **Unlock film** (4–6 s, 3 scenes, skippable): "You're on Pro" → 3 icons (Full recipes · Dietary filters · Shopping Saver)
   → "Let's go". Then the recipe unblurs in place.
8. A returning visitor lands where they stopped: a locked recipe and no plan → `/r/[id]` with the paywall bar; paid → `/app`.

### Paywall copy
- Title: "Your {recipe.title} is ready."
- Personal line: "Made from your {3 detected items}, in {time} minutes. Pick a plan to cook it tonight."
- Sticky bar after ✕: "See my full recipe · {per day} / day".

### Plans (Kwop holds the prices; the app never hardcodes them). Owner chose "keep": Starter $5 · Pro $9 · Chef $15 a month (yearly −20 %: $48 · $86 · $144)
Quotas are counted on the server per billing period (`usage` table, period starting at the plan's `until` minus 1 period,
falling back to the calendar month).

| Plan (Kwop name) | Tag (who it is for) | Recipes a month | Saved recipes | Dietary filters | Shopping Saver | Macros + chef tips | Remix (other ideas) |
|---|---|---|---|---|---|---|---|
| **Starter** (Kwop 1552) | "For a few rescue dinners a week" | 20 | 25 | Vegetarian only | — | — | — |
| **Pro** (Kwop 1553, Most popular) | "For people who cook most nights" | 60 | Unlimited | All 6 (vegan, vegetarian, keto, gluten-free, dairy-free, high-protein) | ✓ | — | 3 per recipe |
| **Chef** (Kwop 1554) | "For food lovers who cook every day" | 150 | Unlimited | All 6 + calorie target | ✓ | ✓ (macros per serving, chef's tip) | 10 per recipe |

Without a plan: the teaser only (3 tries a day without an account, 3 a day with a free account).

### The magic moment on the landing page
The hero itself (the live product). Under it, the motion VSL; the "In action" section shows a CSS iPhone frame with the
app looping (photo → scan → recipe card).

### Landing page sections (after the hero)
1. VSL (motion design, 7 scenes, ~60 s, muted autoplay, replay) — `VSL.md` holds the voice-over.
2. `[ THE 6 PM PROBLEM ]` — "A full fridge. Nothing to make." 3 problem cards (food you toss, zero ideas, recipes that need 12 things you don't have).
3. `[ HOW IT WORKS ]` — 3 steps with animated device frames: Snap your fridge · Get your recipe · Cook and enjoy.
4. `[ IN ACTION ]` — feature loops: Snap & Scan, AI Chef, Dietary filters, Shopping Saver, Saved recipes.
5. `[ THE USUAL WAY VS PLATEPAL ]` — comparison table.
6. `[ QUESTIONS ]` — 6 real doubts.
7. Final block: "Tonight's dinner is already in your fridge." + "Make my recipe".
8. Footer: links in columns + giant faded "Platepal" wordmark.
No prices, no Pricing link anywhere on the landing page.

### Visual direction (food photography at night + recipe cards)
- Dark (hero, VSL, final block): `--ink #17150F` (warm near-black), dot grid in cream at 18 %.
- Light (alternate sections): `--cream #FBF6EC`, cards `#FFFDF8`, border `#EADFCB`.
- Tomato red `--tomato #E5482F` (primary actions, the main button), olive `--olive #6B7A2E` (secondary, success),
  brand lime `--lime #C8FF3D` kept as the **accent** (scan lines, highlights, "Most popular"): pure lime as the main color would
  fight the appetite direction (it reads as tech, not food).
- Butter `#F4C95D`, text `#1F1B14`, muted `#6F6656`.
- Fonts: **Fraunces** (headings, soft serif, opsz/SOFT axes) + **DM Sans** (body) + **DM Mono** (labels, same family).
- Radius 18 px cards, 999 px pills; soft 1 px borders, warm shadows.
- 3 signature elements:
  1. **The recipe card**: a rounded index card with a thin tomato top rule, a notch and ruled lines.
  2. **The scan frame**: corner brackets, a lime scan line sweeping over the photo, ingredient dots with sticker labels.
  3. **Produce stickers**: ingredient chips shaped like the oval stickers on fruit, in olive/butter/tomato.
  Plus: the kitchen-timer progress ring.
- Dark mode in the app (follows the system); the landing page keeps its fixed rhythm of dark and cream sections.

---

## Kwop API (server only, `lib/kwop.ts`)
`KWOP_API` (env, secret) = `https://kwop.io/api/v2/app/<key>`.
- `GET KWOP_API` → `{ name, checkout, plans: [{ id, name, price_cents, currency, interval, per_day, yearly }] }`
- `POST KWOP_API/checkout {plan, period, email, k?}` → `{ embed, ref, fallback_url }` · 409 `payments_off`
- `POST KWOP_API/confirm {ref}` → `{ ok, paid }`
- `GET KWOP_API/plan?email=` → `{ paid, plan, status, until }` — `getPlan(email)`, cached 60 s per email, `fresh` skips the cache.
- `POST KWOP_API/cancel {email, except_ref?}` → `{ message, manage_url? }`
- `POST KWOP_API/event {type, email, detail?}` — fire-and-forget: signup, onboarding_done, aha, paywall_view, feature_used
- `POST KWOP_API/connect {url}` once in production.
- `?k=` (≤12 alphanumerics) → cookie `kwop_k` (30 days, Lax) → `profiles.k` → sent as `k` on every checkout.
- `?plan=` and `utm_*` → cookie → `profiles.intended_plan`, `profiles.source`.
- Visit tracking on public pages only: `<script src="https://kwop.io/flow.js" data-site="s_9bce98191c" defer>`.
- Whop checkout: `https://cdn.whop.com/elements/amber/elements.js` → `WhopElements().checkout.create({...}).mount('#whop-checkout')`.

## Stack
Next.js (App Router, TS) · Tailwind · shadcn-style components · framer-motion · lucide-react · Supabase (Postgres + Auth, RLS on
every table, SQL in `supabase/migrations`) · Vercel (free) · Gemini through `lib/ai.ts` only.

## Verification loop (after every feature)
1. `npm run dev`, then `node scripts/shot.mjs <path>` → screenshots at 390×844 and 1440×900 in `shots/`.
2. Look at every screenshot; anything cut, overlapping, ugly, empty or in the wrong language is a bug.
3. Zero console errors, clean server logs.
4. Fix, check again (3 passes), commit.
5. `tests/e2e.spec.ts`: landing → photo → work → locked recipe → sign-up (new email) → paywall → checkout sheet opens (never pay)
   → close → account. 3 runs on phone + desktop before every deploy.

## Decisions log
- Competitor swap: Eat This Much / PlateJoy kept only as price references (they are meal planners).
- The lime brand color is the accent; tomato red is the action color (appetite direction).
- Example photos are illustrated shelves drawn by us (no stock photos), sent to the real engine.
- Photos are stored in a private Supabase Storage bucket (`fridge-photos`), visible only to their owner; deletable from
  Fridge → photo menu and removed with the account. Anonymous photos are deleted after 7 days if never claimed.

---

## Build state (what exists, where)

### Routes
- `/` landing (try-first hero = the product) · `/r/[id]` a recipe (locked or full) · `/s/[id]` public share teaser + OG image
- `/signup`, `/login`, `/forgot`, `/reset`, `/auth/callback` (Google + email links)
- `/app` Fridge · `/app/recipes` · `/app/saved` · `/app/settings` · `/app/account` (plan, billing, cancel, delete)
- `/pricing` the paywall as a page (logged-in only, never linked from the landing) · `/dashboard?paid=1&ref=` fallback return
- `/terms`, `/privacy`, `not-found`, `error`, `global-error`, `manifest.webmanifest`, icons, `robots.txt`, `sitemap.xml`
- API: `scan` (photo | example | list → recipe), `recipes/[id]` (GET masked view, PATCH favorite, DELETE), `recipes/[id]/remix`,
  `claim`, `plans`, `checkout`, `checkout/confirm`, `billing/cancel`, `event`, `profile`, `me`, `account/delete`

### Key files
- `lib/kwop.ts` all Kwop calls + quotas (`QUOTAS`, `tierOf`, `unlockLines`). `getPlan()` cached 60 s.
- `lib/ai.ts` the only Gemini code (`gemini-3.8-flash`, fallback `gemini-2.5-flash`, JSON schema output).
- `lib/recipes.ts` identity (`getCtx`), try limits/quotas (`allowance`), saving, **server-side masking** of locked parts
  (`mask()`: blurred parts are scrambled text of the same shape, so devtools never reveal a paid recipe).
- `components/funnel/*` try-first engine, recipe card, sign-up sheet, paywall, Whop checkout sheet, unlock film.
- `supabase/migrations/*` schema + RLS. `recipe_bodies` has RLS on and **no policies**: only the server reads bodies.

### Quotas (server-side; source of truth: `lib/plan-config.ts`, also rendered as the "Compare all plans" table)
| | No account | Free account | Starter | Pro | Chef |
|---|---|---|---|---|---|
| Recipe previews (photo → teaser) | 3 / day | 5 / day | ✓ | ✓ | ✓ |
| Full recipes | — | 1 / week (chosen on the paywall) | 20 / month | 60 / month | 150 / month |
| Step checklist + "Bon appétit" popup | — | on unlocked recipes | ✓ | ✓ | ✓ |
| Fix the ingredients & remake | ✓ | ✓ | ✓ | ✓ | ✓ |
| Saved recipes | — | 5 | 25 | unlimited | unlimited |
| Week planner | — | 3 dinners | every dinner (7) | lunch + dinner (14) | lunch + dinner (14) |
| Smart shopping list | — | 1 / month | unlimited (15 builds/day) | unlimited | unlimited |
| Dietary filters | — | — | vegetarian | all 6 | all 6 + calorie target |
| Remix | — | — | 1 / recipe | 3 / recipe | 10 / recipe |
| Shopping Saver | — | — | — | ✓ | ✓ |
| Price check | — | — | — | ✓ | ✓ |
| Macros + chef's tip | — | — | — | — | ✓ |
- Free weekly recipe: `free_unlocks` table, rolling 7 days, `POST /api/recipes/[id]/free`; the paywall offers it under
  "Continue" ("Not today? Use your free recipe of the week") or shows when the next one is ready. It unlocks amounts + steps;
  Shopping Saver / macros stay plan features.
- Cook mode: steps are tickable (`components/funnel/cook-steps.tsx`, remembered per device in localStorage); ticking the last
  step opens the celebration sheet (save / share / "Time to eat") and tracks `feature_used: cooked`.

### Local development
- `npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit,realtime,postgres-meta` (Docker)
- In the cloud sandbox, Node's fetch needs `NODE_USE_ENV_PROXY=1` (not needed on Vercel).
- `DEV_PLAN_OVERRIDE=<kwop plan id>` fakes a paid plan **only** with `next dev` + local Supabase (never in production).
- `node scripts/dev-fixture.mjs <anon-uuid>` inserts one local test recipe (refuses non-local databases).
- `node scripts/shot.mjs / /app ...` screenshots · `npm run test:e2e` funnel test (needs GEMINI_API_KEY) ·
  `node scripts/make-examples.mjs` / `make-icons.mjs` regenerate example shelves and icons.

### Design decisions log (cont.)
- Landing page rhythm: dark kitchen-at-night hero/VSL/how/compare/final, cream problem/features/questions.
- Tomato darkened to #D2402A so white text on buttons passes WCAG AA (4.66:1).
- Fraunces is loaded as a static 600 weight with `display: optional` (fast first paint, no font swap jump).
- Animations: framer-motion `m` + `LazyMotion` (features load after first paint); `prefers-reduced-motion` respected.
- The funnel sheets (auth, paywall, Whop, film) are code-split and preloaded when a recipe appears.
- Ingredient stickers on photos use collision-aware placement; all items are also listed as stickers under the photo.
- Share links (`/s/[id]`) show only the title, time and ingredient names: never the photo or the paid steps.

## Production
- Live: **https://platepal-2.vercel.app** (Vercel project `platepal-2`, framework preset set by `vercel.json`, region iad1).
- Kwop: connected (`POST KWOP_API/connect` → ok). `https://kwop.io/platepal-2/app` redirects to the app.
- Supabase project `platepal-2`, ref `ftqyrztnxzvvrcfdjkhh`, us-east-1. Auth: email confirmation OFF, site URL + redirect
  URLs set from `supabase/config.toml` (`npx supabase config push --yes` after `config diff`).
- Migrations: the cloud sandbox cannot open Postgres TCP, so they are applied with
  `npx supabase db query --remote --yes -f supabase/migrations/<file>.sql` and recorded in `supabase_migrations.schema_migrations`.
- Vercel env (production): KWOP_API, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (type config: public by design),
  SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, GEMINI_MODEL, IP_SALT, NEXT_PUBLIC_GOOGLE_ENABLED=0.
- Verified live: sign-up (new email) → app → paywall → Whop checkout inside the sheet; `?k=`/`?plan=`/`utm_` cookies;
  RLS cross-user test (no reads/updates/deletes of another user's rows, no client inserts, bodies server-only);
  Lighthouse mobile on `/`: 97 / 100 / 100 / 100.

## AI in production (Gemini)
- `GEMINI_API_KEY` is set in Vercel (Production). Models: `GEMINI_MODEL=gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite`.
- `lib/ai.ts` hedges: the newest Flash starts first; if it has not answered after 6 s (`GEMINI_HEDGE_MS`) or fails, Flash-Lite
  starts and the first good answer wins. One attempt per model (the SDK's default 5 retries outlasted the function).
  Thinking level LOW, dropped automatically for models without thinking. Functions: `maxDuration = 120`.
- Observed Nov 8: gemini-3.8-flash answered 503 "high demand", then 429 "quota exceeded" on the free key after a few calls;
  gemini-2.5-flash is closed to new keys (404); `gemini-flash-lite-latest` is not found. Flash-Lite answers in ~3 s.
  → For real traffic, turn on billing for the key (aistudio.google.com → Billing) so the newest model is not rate-limited.
- Measured live: photo → recipe in ~9 s. E2E against production: green 3× on phone + computer, including right after
  fresh deploys (cold start). A cold-start race (page switch after sign-up closing the checkout) was found and fixed:
  on the landing page, sign-up no longer navigates; the paywall opens in place.

## Week planner, smart shopping list, price comparison (added Nov 8)
- `/app/plan`: 7 days × lunch/dinner. Add from "My recipes" or type a dish (the chef writes it: `cookFromIdea`, saved with
  source `idea`, counts 1 recipe). Servings stepper, move to another day, remove. "Build my list" → `/app/shop`.
- `/app/shop`: `buildShoppingList` (lib/ai.ts) merges every planned meal's ingredients, scaled to the planned servings, into
  one list in US store packs, grouped by aisle. **"Already at home" is decided on the server**, never by the model:
  only items seen in the person's fridge photos (last 10 days; sources photo/example/list) or basic staples (salt,
  pepper, oil, water). Tick-off with progress, "I have it", manual items, edit, share/copy, clear ticked, rebuild
  (15/day cap). Re-builds keep manual items and ticks.
- Price check (Pro/Chef): the person's own price book per store (`price_book`), store totals, cheapest single store,
  "split your shop" savings, cheapest-store chip on each list item. Stores editable (max 5, default Kroger/Walmart/Aldi), ZIP.
- **Automatic shop cost**: the list builder also returns `est_price_usd` per item (typical price of that exact pack at a
  major US supermarket); stored as `shop_items.est_cents`. Manual items, edited items and older lists are estimated with
  `estimatePrices()` (action `estimate`). The shop shows "~$X estimated shop", a "~$" price on every item, and "in your
  cart so far". Labelled as AI estimates; never presented as a store's real price.
- **What you actually paid**: `shop_receipts` (one row per store trip, with the estimate at that time). The form appears by
  itself once everything is ticked ("Done shopping? What did you pay?"), then "X under / over the estimate" and a
  weekly "Your grocery spend" history.
- Live store prices: `lib/prices.ts` provider list. Kroger Products API is wired (client-credentials OAuth, location by
  ZIP, 24 h cache in `price_cache`) and turns on when `KROGER_CLIENT_ID` + `KROGER_CLIENT_SECRET` are set in Vercel.
  **Not yet verified against the real API** (no keys). Future store partners plug in as new providers.
- Plan gating: no plan = 3 dinners/week + **one free smart list** (value before price), then lists need a plan;
  Starter = 3 dinners + lists; Pro/Chef = lunch + dinner every day (14) + price check.
- Fridge capture: separate "Take a photo" (camera) and "Upload a photo" (library/files) buttons; drag-and-drop on desktop.
  "Something wrong? Fix the ingredients": remove/add detected items, then `POST /api/recipes/[id]/rework` remakes the
  recipe from the corrected list, keeping the photo and the pins of items that were already there.
- `profiles.answers` is server-only (column update revoked): it holds `free_list_used` and daily list-build counters.
- Tests: `tests/e2e.spec.ts` (funnel) + `tests/week.spec.ts` (plan → list → price check paywall), green on production.

## Chef's tips and heat level (added Nov 8)
- Recipes now carry `tips`: 3-5 substantial tips (technique + why, swap, flavor boost, make-ahead/storage, serving), each
  with a short title; `tip` keeps the first for older code. Shown in "Chef's tips & macros" (Chef plan; scrambled otherwise).
- Heat level `mild | medium | hot | extra` (`HEAT_RULES` in lib/ai.ts). It never changes which dish is chosen, only the
  heat sources (pepper flakes, cayenne, hot sauce, chilies), their amounts and the steps. A small jar of a common heat
  source can be assumed in the pantry.
  - Default for new recipes: Fridge page picker + Settings (`profiles.heat`); sent with each scan, used for remix, fix the
    ingredients and planned dishes. Stored per recipe in `recipes.heat` (shown as a chip).
  - On an unlocked recipe: "Heat level" row → `POST /api/recipes/[id]/heat` → `adjustHeat()` rewrites the same recipe in
    place (title, main ingredients, servings kept). Free (no recipe used), 20 changes/day/account. Live: ~5 s.
  - Available to every account (plan table row "Heat level"); changing an existing recipe needs it unlocked.

## Vouchers (free access without paying) + creator network
- Tables `vouchers` (code **hash** only, tier, optional email lock, max uses, optional months / expiry, note, `creator`,
  `k` = the creator's Kwop link code; RLS on, no policies), `voucher_redemptions` (one per account per voucher) and
  `comp_access` (user → tier, until). Atomic SQL function `redeem_voucher` (service role only, `#variable_conflict use_column`);
  it never downgrades existing free access.
- `getCtx()` takes the higher of the paid tier (Kwop) and the voucher tier; `planLabel()` shows e.g. "Chef · voucher".
  Voucher-only accounts see "Free access with a voucher" in Billing and no cancel button.
- **Where a code can be entered** (component `VoucherField`): sign-up sheet over the recipe, `/signup`, `/login`
  (mode "pending": kept in the `pp_voucher` cookie and redeemed by `/api/claim` / `/auth/callback` right after the account
  exists), the paywall (above "Continue", i.e. before any card), the upgrade sheet, `/pricing`, Account → "Have a voucher?"
  (mode "apply": `POST /api/voucher`, 8 tries/hour/account).
- A voucher that unlocks access skips the paywall and the card: the unlock film plays and the recipe unblurs in place.
  After `/signup` with a voucher the app opens with `?voucher=1` → `VoucherWelcome` film.
- Creator links: `https://platepal-2.vercel.app/signup?voucher=CODE` (any page works: the proxy stores `?voucher=` for 30 days
  and every voucher field shows it prefilled).
- Creator credit: when the voucher has `k` and the account has none, the account's `profiles.k` becomes the creator's code, so
  any later paid checkout is attributed to that creator in Kwop.
- Percent-off discounts on paid plans are **not** possible from the app: Kwop's checkout API takes no coupon. Vouchers give free
  months instead; a %-off code would need Kwop/Whop support.
- Create: `node scripts/make-voucher.mjs --tier chef|pro|starter [--code MARIA] [--email x] [--uses n] [--months n] [--expires YYYY-MM-DD] [--creator "…"] [--k kwopcode] [--note "…"] --remote`
  (random codes are printed once; never commit codes). Stats: `node scripts/voucher-stats.mjs --remote`.
- Tests: `tests/voucher.spec.ts` (needs `VOUCHER_TEST_CODE`), plus local flows A–F (sheet, paywall, link, reuse, /pricing, upgrade).
- Issued: owner account voucher (Chef, no end, 1 use, locked to the owner's email), Nov 8 2026.

## Still to do (owner action)
- **Google sign-in**: Google OAuth client → redirect URI `https://ftqyrztnxzvvrcfdjkhh.supabase.co/auth/v1/callback`;
  Client ID/secret entered in Supabase → Authentication → Providers → Google; then set NEXT_PUBLIC_GOOGLE_ENABLED=1 and redeploy.
  The Google button stays hidden until then (never a broken button).
- **Gemini billing** (recommended before promoting): see above.
- **Kroger live prices** (optional): free developer account at developer.kroger.com → create an app (Production,
  scope product.compact) → add KROGER_CLIENT_ID / KROGER_CLIENT_SECRET in Vercel → redeploy → verify with a ZIP code.
