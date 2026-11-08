"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CalendarPlus, Loader2 } from "lucide-react";
import { DAY_NAMES, mondayOf, addDays } from "@/lib/week";
import type { Heat } from "@/lib/types";
import { AnimatePresence, m } from "framer-motion";
import type { RecipeView } from "@/lib/types";
import { RecipeCard, type UpgradeFeature } from "@/components/funnel/recipe-card";
import { UnlockProvider, useUnlock, event } from "@/components/funnel/unlock-flow";
import { useMe } from "./me-context";

export function Toast({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <m.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8" role="status">
          <span className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-cream shadow-xl">
            <Check className="h-4 w-4 text-lime" /> {text}
          </span>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export function useToast() {
  const [t, setT] = React.useState<string | null>(null);
  const show = React.useCallback((s: string) => {
    setT(s);
    setTimeout(() => setT(null), 2200);
  }, []);
  return { toast: t, show };
}

export function RecipeDetail({ initial }: { initial: RecipeView }) {
  const me = useMe();
  const [recipe, setRecipe] = React.useState(initial);
  return (
    <UnlockProvider recipe={recipe} signedIn tier={me.tier} currentPlanId={me.planId} returnPath={`/r/${recipe.id}`} onUnlocked={async () => {
      const r = await fetch(`/api/recipes/${recipe.id}`, { cache: "no-store" });
      if (r.ok) setRecipe((await r.json()).recipe);
    }}>
      <Inner recipe={recipe} setRecipe={setRecipe} />
    </UnlockProvider>
  );
}

function Inner({ recipe, setRecipe }: { recipe: RecipeView; setRecipe: (r: RecipeView) => void }) {
  const router = useRouter();
  const { openUnlock, openUpgrade } = useUnlock();
  const { toast, show } = useToast();
  const [remixing, setRemixing] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [reworking, setReworking] = React.useState(false);
  const [planOpen, setPlanOpen] = React.useState(false);
  const [heatBusy, setHeatBusy] = React.useState<Heat | null>(null);

  async function changeHeat(h: Heat) {
    if (h === recipe.heat) return;
    setHeatBusy(h);
    const r = await fetch(`/api/recipes/${recipe.id}/heat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ heat: h }) });
    const d = await r.json().catch(() => ({}));
    setHeatBusy(null);
    if (!r.ok) return show(d.message || "Couldn't change the heat. Try again.");
    setRecipe(d.recipe);
    show(h === "mild" ? "Cooled down: no chili heat" : h === "extra" ? "Extra hot: bring water to the table" : `Heat set to ${h}`);
  }

  async function rework(items: string[]) {
    setReworking(true);
    const r = await fetch(`/api/recipes/${recipe.id}/rework`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const d = await r.json().catch(() => ({}));
    setReworking(false);
    if (r.status === 429) return openUpgrade("quota");
    if (!r.ok) return show(d.message || "Couldn't remake it. Try again.");
    router.push(`/r/${d.recipe.id}`);
  }

  async function plan(day: number, nextWeek: boolean) {
    const week = nextWeek ? addDays(mondayOf(new Date()), 7) : mondayOf(new Date());
    const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week, day, slot: "dinner", servings: recipe.servings, recipe_id: recipe.id }) });
    const d = await r.json().catch(() => ({}));
    setPlanOpen(false);
    if (r.status === 403 || r.status === 429) return openUpgrade(d.feature ?? "plan");
    if (!r.ok) return show(d.message || "Couldn't add it. Try again.");
    show(`Added to ${DAY_NAMES[day]}${nextWeek ? " next week" : ""}`);
  }

  async function favorite() {
    const next = !recipe.is_favorite;
    setRecipe({ ...recipe, is_favorite: next });
    const r = await fetch(`/api/recipes/${recipe.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_favorite: next }) });
    if (r.status === 403) {
      setRecipe({ ...recipe, is_favorite: false });
      return openUpgrade("saved");
    }
    if (!r.ok) {
      setRecipe({ ...recipe, is_favorite: !next });
      return show("Couldn't save. Try again.");
    }
    show(next ? "Saved to your cookbook" : "Removed from saved");
  }

  async function share() {
    const url = `${location.origin}/s/${recipe.id}`;
    event("feature_used", "share");
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, text: `I made ${recipe.title} from what was in my fridge, with Platepal.`, url });
      else {
        await navigator.clipboard.writeText(url);
        show("Link copied");
      }
    } catch {}
  }

  async function remix() {
    setRemixing(true);
    const r = await fetch(`/api/recipes/${recipe.id}/remix`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setRemixing(false);
    if (r.status === 403) return openUpgrade((d.feature as UpgradeFeature) ?? "remix");
    if (r.status === 429) return openUpgrade("quota");
    if (!r.ok) return show("Our chef dropped the spoon. Try again.");
    router.push(`/r/${d.recipe.id}`);
  }

  async function del() {
    const r = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    if (r.ok) router.replace("/app/recipes");
    else show("Couldn't delete. Try again.");
  }

  return (
    <div>
      <a href="/app/recipes" className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-fg-muted hover:text-fg print:hidden">
        <ArrowLeft className="h-4 w-4" /> All recipes
      </a>
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        <button type="button" onClick={() => setPlanOpen((o) => !o)} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-semibold text-cream dark:bg-cream dark:text-ink" data-testid="add-to-week">
          <CalendarPlus className="h-4 w-4" /> Add to my week
        </button>
        {planOpen && (
          <div className="flex flex-wrap gap-1.5">
            {DAY_NAMES.map((n, i) => (
              <button key={n} type="button" onClick={() => plan(i, false)} className="h-9 cursor-pointer rounded-full border border-border bg-surface px-3 text-[13px] font-semibold hover:bg-surface-2">
                {n.slice(0, 3)}
              </button>
            ))}
            <button type="button" onClick={() => plan(0, true)} className="h-9 cursor-pointer rounded-full border border-border bg-surface px-3 text-[13px] font-semibold hover:bg-surface-2">
              Next Mon
            </button>
          </div>
        )}
      </div>
      {reworking && (
        <p className="mb-3 flex items-center gap-2 rounded-2xl bg-butter-soft px-4 py-3 text-[14px] font-semibold text-[#5b430a]">
          <Loader2 className="h-4 w-4 animate-spin" /> Remaking your recipe with the right ingredients…
        </p>
      )}
      <RecipeCard
        recipe={recipe}
        onUnlock={openUnlock}
        onUpgrade={openUpgrade}
        onEditIngredients={reworking ? undefined : rework}
        onHeat={changeHeat}
        heatBusy={heatBusy}
        actions={{ onFavorite: favorite, onShare: share, onRemix: remix, onDelete: () => setConfirmDel(true), remixing }}
      />
      {confirmDel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4" role="dialog" aria-modal>
          <div className="w-full max-w-sm rounded-[24px] bg-bg p-6">
            <p className="font-serif text-[22px] font-semibold">Delete this recipe?</p>
            <p className="mt-1 text-[14px] text-fg-muted">Its photo is deleted too. This can&apos;t be undone.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmDel(false)} className="h-11 flex-1 cursor-pointer rounded-full border border-border font-semibold">Keep it</button>
              <button onClick={del} className="h-11 flex-1 cursor-pointer rounded-full bg-tomato font-semibold text-white" data-testid="confirm-delete">Delete</button>
            </div>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </div>
  );
}
