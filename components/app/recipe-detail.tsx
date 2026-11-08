"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { RecipeView } from "@/lib/types";
import { RecipeCard, type UpgradeFeature } from "@/components/funnel/recipe-card";
import { UnlockProvider, useUnlock, event } from "@/components/funnel/unlock-flow";
import { useMe } from "./me-context";

export function Toast({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8" role="status">
          <span className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-cream shadow-xl">
            <Check className="h-4 w-4 text-lime" /> {text}
          </span>
        </motion.div>
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
      <RecipeCard
        recipe={recipe}
        onUnlock={openUnlock}
        onUpgrade={openUpgrade}
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
