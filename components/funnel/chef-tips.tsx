"use client";
import * as React from "react";
import { ChefHat, Flame, Loader2, Repeat, Sparkles, Timer, UtensilsCrossed } from "lucide-react";
import { TIP_KINDS, type ChefTip, type RecipeView, type TipKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<TipKind, React.ComponentType<{ className?: string }>> = {
  technique: ChefHat,
  swap: Repeat,
  flavor: Sparkles,
  "make-ahead": Timer,
  serving: UtensilsCrossed,
  heat: Flame,
};

/** The chef's 4-5 tips for this exact dish: one card each, with its kind (technique, swap, flavor boost…). */
export function ChefTips({ recipe, onRecipe }: { recipe: RecipeView; onRecipe?: (r: RecipeView) => void }) {
  const tips = recipe.body.tips ?? [];
  const open = recipe.access.macros;
  // Recipes made before the full tips existed get theirs written once, the first time a Chef member opens them.
  const needsMore = open && tips.length < 3 && Boolean(onRecipe);
  const [writing, setWriting] = React.useState(false);
  const asked = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!needsMore || asked.current === recipe.id) return;
    asked.current = recipe.id;
    setWriting(true);
    fetch(`/api/recipes/${recipe.id}/tips`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.recipe && onRecipe?.(d.recipe))
      .catch(() => {})
      .finally(() => setWriting(false));
  }, [needsMore, recipe.id, onRecipe]);

  return (
    <div data-testid="chef-tips">
      {writing && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-butter-soft px-4 py-3 text-[14px] font-semibold text-[#5b430a]" data-testid="tips-writing">
          <Loader2 className="h-4 w-4 animate-spin" /> Your chef is writing more tips for this dish…
        </p>
      )}
      <ol className="grid gap-3 sm:grid-cols-2">
        {tips.map((t, i) => (
          <TipCard key={i} tip={t} n={i + 1} wide={tips.length % 2 === 1 && i === tips.length - 1} />
        ))}
      </ol>
    </div>
  );
}

function TipCard({ tip, n, wide }: { tip: ChefTip; n: number; wide?: boolean }) {
  const Icon = tip.kind ? ICONS[tip.kind] : ChefHat;
  return (
    <li className={cn("relative overflow-hidden rounded-2xl border border-[#ecd9a6] bg-butter-soft p-4 text-[#4d390a] sm:p-5", wide && "sm:col-span-2")} data-testid="chef-tip">
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-tomato/80" />
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7a5a0a] text-butter-soft">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7a5a0a]">
          Tip {n}
          {tip.kind ? ` · ${TIP_KINDS[tip.kind]}` : ""}
        </span>
      </div>
      <p className="mt-2.5 font-serif text-[18px] font-semibold leading-snug">{tip.title}</p>
      <p className="mt-1 text-[15px] leading-relaxed">{tip.text}</p>
    </li>
  );
}
