"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { CalendarDays, ChefHat, ChevronLeft, ChevronRight, Clock, Lock, Loader2, Minus, Plus, Search, ShoppingCart, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { UnlockProvider, useUnlock } from "@/components/funnel/unlock-flow";
import type { UpgradeFeature } from "@/components/funnel/recipe-card";
import { addDays, DAY_NAMES, mondayOf, weekLabel } from "@/lib/week";
import { cn } from "@/lib/utils";
import { useMe } from "./me-context";
import { PageTitle } from "./app-shell";
import { Toast, useToast } from "./recipe-detail";

type Meal = {
  id: string;
  day: number;
  slot: "lunch" | "dinner";
  servings: number;
  recipe: { id: string; title: string; time_minutes: number; servings: number; photo_url: string | null };
};
type MyRecipe = { id: string; title: string; time_minutes: number; is_favorite: boolean };

export function WeekSwitcher({ week, onChange }: { week: string; onChange: (w: string) => void }) {
  const thisWeek = mondayOf(new Date());
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Previous week" onClick={() => onChange(addDays(week, -7))} className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-border bg-surface hover:bg-surface-2 active:scale-95">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="min-w-[132px] text-center">
        <p className="text-[15px] font-semibold tabular-nums">{weekLabel(week)}</p>
        <p className="text-[12px] text-fg-muted">
          {week === thisWeek ? "This week" : week === addDays(thisWeek, 7) ? "Next week" : week < thisWeek ? "Past week" : "Coming up"}
        </p>
      </div>
      <button type="button" aria-label="Next week" onClick={() => onChange(addDays(week, 7))} className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-border bg-surface hover:bg-surface-2 active:scale-95">
        <ChevronRight className="h-5 w-5" />
      </button>
      {week !== thisWeek && (
        <button type="button" onClick={() => onChange(thisWeek)} className="ml-1 h-9 cursor-pointer rounded-full px-3 text-[13px] font-semibold text-tomato hover:bg-surface-2">
          Today
        </button>
      )}
    </div>
  );
}

export function Planner({ initialWeek }: { initialWeek: string }) {
  const me = useMe();
  return (
    <UnlockProvider recipe={null} signedIn tier={me.tier} currentPlanId={me.planId} returnPath="/app/plan" paywallTitle="Your week is ready to plan." paywallLine="Pick a plan to turn your week into one smart shopping list, with amounts that match what stores sell.">
      <PlannerInner initialWeek={initialWeek} />
    </UnlockProvider>
  );
}

function PlannerInner({ initialWeek }: { initialWeek: string }) {
  const me = useMe();
  const router = useRouter();
  const { openUpgrade } = useUnlock();
  const { toast, show } = useToast();
  const [week, setWeek] = React.useState(initialWeek);
  const [meals, setMeals] = React.useState<Meal[] | null>(null);
  const [recipes, setRecipes] = React.useState<MyRecipe[]>([]);
  const [limit, setLimit] = React.useState(me.quotas.planMeals);
  const [error, setError] = React.useState(false);
  const [adding, setAdding] = React.useState<{ day: number; slot: "lunch" | "dinner" } | null>(null);
  const [building, setBuilding] = React.useState(false);
  const lunches = me.quotas.planMeals >= 14;

  const load = React.useCallback(async (w: string) => {
    setError(false);
    setMeals(null);
    try {
      const r = await fetch(`/api/plan?week=${w}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setMeals(d.meals);
      setRecipes(d.recipes);
      setLimit(d.limit);
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    // Fetch the selected week (data loading on week change).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(week);
    history.replaceState(null, "", `/app/plan?week=${week}`);
  }, [week, load]);

  const handleErr = (status: number, d: { feature?: UpgradeFeature; message?: string; error?: string }) => {
    if (status === 403 || status === 429) return openUpgrade(d.feature ?? (status === 429 ? "quota" : "plan"));
    show(d.message || "Something went wrong. Try again.");
  };

  async function patch(id: string, body: Partial<Pick<Meal, "day" | "servings" | "slot">>) {
    setMeals((ms) => ms?.map((x) => (x.id === id ? { ...x, ...body } : x)) ?? ms);
    const r = await fetch(`/api/plan/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      handleErr(r.status, d);
      load(week);
    } else setMeals(d.meals);
  }

  async function remove(id: string) {
    setMeals((ms) => ms?.filter((x) => x.id !== id) ?? ms);
    const r = await fetch(`/api/plan/${id}`, { method: "DELETE" });
    if (!r.ok) load(week);
  }

  async function build() {
    setBuilding(true);
    const r = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "build", week }) });
    const d = await r.json().catch(() => ({}));
    setBuilding(false);
    if (!r.ok) return handleErr(r.status, d);
    router.push(`/app/shop?week=${week}`);
  }

  const count = meals?.length ?? 0;
  const full = count >= limit;

  return (
    <div>
      <PageTitle title="Your week" sub="Pick what you'll eat. Platepal turns it into one shopping list." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <WeekSwitcher week={week} onChange={setWeek} />
        <span className="rounded-full bg-surface-2 px-3 py-1.5 font-mono text-[12px] text-fg-muted" data-testid="plan-count">
          {count} of {limit} meals planned
        </span>
      </div>

      {error && (
        <div className="recipe-card p-6 text-center">
          <p className="font-semibold">We couldn&apos;t load your week.</p>
          <button onClick={() => load(week)} className="mt-3 h-10 cursor-pointer rounded-full border border-border px-4 font-semibold">Try again</button>
        </div>
      )}

      {!meals && !error && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      )}

      {meals && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="week-grid">
          {DAY_NAMES.map((name, day) => {
            const date = new Date(addDays(week, day) + "T12:00:00Z");
            const isToday = addDays(week, day) === new Date().toISOString().slice(0, 10);
            return (
              <section key={day} className={cn("recipe-card p-3", isToday && "ring-2 ring-tomato/40")} aria-label={name}>
                <header className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="font-sans text-[15px] font-semibold tracking-normal">
                    {name}
                  </h2>
                  <span className="font-mono text-[11px] text-fg-muted">{date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
                </header>
                {(["lunch", "dinner"] as const).map((slot) => {
                  const here = meals.filter((x) => x.day === day && x.slot === slot);
                  if (slot === "lunch" && !lunches && !here.length)
                    return (
                      <button key={slot} type="button" onClick={() => openUpgrade("plan")} className="mb-1.5 flex w-full cursor-pointer items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-[12px] text-fg-muted hover:bg-surface-2">
                        <Lock className="h-3.5 w-3.5" /> Lunch · with Pro
                      </button>
                    );
                  return (
                    <div key={slot} className="mb-1.5">
                      {(here.length > 0 || slot === "dinner") && <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">{slot}</p>}
                      <AnimatePresence initial={false}>
                        {here.map((meal) => (
                          <MealCard key={meal.id} meal={meal} onServings={(n) => patch(meal.id, { servings: n })} onMove={(d) => patch(meal.id, { day: d })} onRemove={() => remove(meal.id)} />
                        ))}
                      </AnimatePresence>
                      {!here.length && (
                        <button
                          type="button"
                          onClick={() => (full ? openUpgrade("plan") : setAdding({ day, slot }))}
                          data-testid={`add-${day}-${slot}`}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-[13px] font-semibold text-fg-muted transition hover:border-tomato/50 hover:text-tomato active:scale-[0.98]",
                            slot === "lunch" ? "h-9" : "h-12"
                          )}
                        >
                          {full ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Add {slot}
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}

      {/* Build the list */}
      <div className="sticky bottom-[72px] z-20 mt-6 md:bottom-4">
        <div className="mx-auto flex max-w-xl items-center gap-3 rounded-full border border-border bg-surface/95 p-2 pl-5 shadow-[var(--shadow-lift)] backdrop-blur">
          <ShoppingCart className="h-5 w-5 shrink-0 text-tomato" />
          <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{count ? `${count} meal${count === 1 ? "" : "s"} planned` : "Add meals first"}</p>
          <button
            type="button"
            disabled={!count || building}
            onClick={build}
            data-testid="build-list"
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-tomato px-5 text-[15px] font-semibold text-white transition hover:bg-tomato-deep active:scale-95 disabled:opacity-50"
          >
            {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {building ? "Building…" : "Build my list"}
          </button>
        </div>
      </div>

      <AddMealSheet
        slot={adding}
        week={week}
        recipes={recipes}
        onClose={() => setAdding(null)}
        onAdded={(ms) => {
          setMeals(ms);
          setAdding(null);
          show("Added to your week");
        }}
        onError={handleErr}
      />
      <Toast text={toast} />
    </div>
  );
}

function MealCard({ meal, onServings, onMove, onRemove }: { meal: Meal; onServings: (n: number) => void; onMove: (day: number) => void; onRemove: () => void }) {
  return (
    <m.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }} className="mb-1.5 rounded-xl border border-border bg-surface p-2" data-testid="meal-card">
      <a href={`/r/${meal.recipe.id}`} className="flex items-center gap-2.5">
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-3">
          {meal.recipe.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meal.recipe.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ChefHat className="absolute inset-0 m-auto h-5 w-5 text-cream/50" />
          )}
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 text-[13px] font-semibold leading-tight">{meal.recipe.title}</span>
          <span className="flex items-center gap-1 text-[11px] text-fg-muted">
            <Clock className="h-3 w-3" /> {meal.recipe.time_minutes} min
          </span>
        </span>
      </a>
      <div className="mt-2 flex items-center justify-between gap-1">
        <div className="flex items-center rounded-full bg-surface-2" aria-label="Servings">
          <button type="button" aria-label="Fewer servings" disabled={meal.servings <= 1} onClick={() => onServings(meal.servings - 1)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-full disabled:opacity-40">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-12 text-center text-[12px] font-semibold tabular-nums">{meal.servings} ppl</span>
          <button type="button" aria-label="More servings" disabled={meal.servings >= 12} onClick={() => onServings(meal.servings + 1)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-full disabled:opacity-40" data-testid="more-servings">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center">
          <label className="relative grid h-7 w-7 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2" title="Move to another day">
            <CalendarDays className="h-3.5 w-3.5" />
            <select aria-label="Move to day" value={meal.day} onChange={(e) => onMove(Number(e.target.value))} className="absolute inset-0 cursor-pointer opacity-0">
              {DAY_NAMES.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button type="button" aria-label="Remove" onClick={onRemove} className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-tomato-deep">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </m.div>
  );
}

function AddMealSheet({
  slot,
  week,
  recipes,
  onClose,
  onAdded,
  onError,
}: {
  slot: { day: number; slot: "lunch" | "dinner" } | null;
  week: string;
  recipes: MyRecipe[];
  onClose: () => void;
  onAdded: (meals: Meal[]) => void;
  onError: (status: number, d: { feature?: UpgradeFeature; message?: string }) => void;
}) {
  const [tab, setTab] = React.useState<"mine" | "new">("mine");
  const [q, setQ] = React.useState("");
  const [dish, setDish] = React.useState("");
  const [servings, setServings] = React.useState(2);
  const [busy, setBusy] = React.useState<string | null>(null);
  const list = recipes.filter((r) => r.title.toLowerCase().includes(q.trim().toLowerCase()));

  React.useEffect(() => {
    if (slot) {
      // Each time the sheet opens: start on the person's recipes, or on "New dish" when they have none.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(recipes.length ? "mine" : "new");
      setDish("");
      setQ("");
    }
  }, [slot, recipes.length]);

  async function add(body: { recipe_id?: string; dish?: string }) {
    if (!slot) return;
    setBusy(body.recipe_id ?? "dish");
    const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week, day: slot.day, slot: slot.slot, servings, ...body }) });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return onError(r.status, d);
    onAdded(d.meals);
  }

  return (
    <Sheet open={!!slot} onClose={onClose} label="Add a meal" testId="add-meal-sheet" width={480}>
      {slot && (
        <div className="px-5 pb-7 pt-14">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em]">
            {slot.slot === "lunch" ? "Lunch" : "Dinner"} on {DAY_NAMES[slot.day]}
          </h2>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-surface-2 p-1 text-[14px] font-semibold">
              {(
                [
                  ["mine", "My recipes"],
                  ["new", "New dish"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={cn("cursor-pointer rounded-full px-4 py-1.5 transition", tab === k ? "bg-surface shadow-sm" : "text-fg-muted")}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-full bg-surface-2">
              <button type="button" aria-label="Fewer people" onClick={() => setServings(Math.max(1, servings - 1))} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-14 text-center text-[13px] font-semibold tabular-nums">{servings} ppl</span>
              <button type="button" aria-label="More people" onClick={() => setServings(Math.min(12, servings + 1))} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {tab === "mine" ? (
            <div className="mt-4">
              <label className="relative block">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my recipes" className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-[15px] outline-none focus:border-tomato" />
              </label>
              <ul className="mt-3 max-h-[46dvh] space-y-1.5 overflow-y-auto">
                {list.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => add({ recipe_id: r.id })}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition hover:border-tomato/40 active:scale-[0.99] disabled:opacity-60"
                      data-testid="pick-recipe"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{r.title}</span>
                        <span className="text-[12px] text-fg-muted">
                          {r.time_minutes} min{r.is_favorite ? " · Saved" : ""}
                        </span>
                      </span>
                      {busy === r.id ? <Loader2 className="h-5 w-5 animate-spin text-tomato" /> : <Plus className="h-5 w-5 text-tomato" />}
                    </button>
                  </li>
                ))}
                {!list.length && (
                  <li className="rounded-2xl bg-surface-2 px-4 py-6 text-center text-[14px] text-fg-muted">
                    {recipes.length ? "No recipe matches that." : "No recipes yet. Try \"New dish\", or snap your fridge."}
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (dish.trim().length >= 2) add({ dish: dish.trim() });
              }}
            >
              <p className="text-[14px] text-fg-muted">Type any dish. The chef writes the recipe, and its ingredients go on your list.</p>
              <input autoFocus value={dish} onChange={(e) => setDish(e.target.value)} maxLength={80} placeholder="e.g. chicken tacos, veggie lasagna" className="mt-3 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-[16px] outline-none focus:border-tomato" data-testid="dish-input" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["Chicken tacos", "Spaghetti bolognese", "Veggie stir-fry", "Salmon & rice", "Chili"].map((s) => (
                  <button key={s} type="button" onClick={() => setDish(s)} className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1 text-[13px] font-semibold hover:bg-surface-2">
                    {s}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={dish.trim().length < 2 || !!busy} className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-tomato font-semibold text-white active:scale-[0.98] disabled:opacity-50" data-testid="plan-dish">
                {busy === "dish" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                {busy === "dish" ? "Writing the recipe…" : "Add to my week"}
              </button>
              <p className="mt-2 text-center text-[12px] text-fg-muted">Uses 1 recipe from your plan.</p>
            </form>
          )}
        </div>
      )}
    </Sheet>
  );
}
