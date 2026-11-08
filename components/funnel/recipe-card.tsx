"use client";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChefHat, Clock, Flame, Heart, Lock, Shuffle, ShoppingBasket, Share2, Users, Sparkles, Trash2, Printer } from "lucide-react";
import type { RecipeView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sticker, toneCycle } from "@/components/ui/sticker";

export type UpgradeFeature = "shopping" | "macros" | "remix" | "saved" | "quota" | "diet";

type Props = {
  recipe: RecipeView;
  onUnlock?: () => void;
  onUpgrade?: (f: UpgradeFeature) => void;
  unlockLabel?: string;
  actions?: {
    onFavorite?: () => void;
    onShare?: () => void;
    onRemix?: () => void;
    onDelete?: () => void;
    remixing?: boolean;
  };
  justUnlocked?: boolean;
  className?: string;
};

type Placed = { i: number; side: "left" | "right" | null };

function placeLabels(found: { name: string; x: number; y: number }[], w: number, h: number): Placed[] {
  const boxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const fs = w < 500 ? 6.4 : 7;
  return found.map((f, i) => {
    const cx = (f.x / 100) * w;
    const cy = (f.y / 100) * h;
    const lw = Math.min(f.name.length * fs + 30, w * 0.45);
    const lh = 24;
    for (const side of [cx > w * 0.55 ? "left" : "right", cx > w * 0.55 ? "right" : "left"] as const) {
      const x1 = side === "right" ? cx + 10 : cx - 10 - lw;
      const box = { x1, y1: cy - lh / 2, x2: x1 + lw, y2: cy + lh / 2 };
      if (box.x1 < 4 || box.x2 > w - 4 || box.y1 < 4 || box.y2 > h - 4) continue;
      if (boxes.some((b) => !(box.x2 + 4 < b.x1 || box.x1 - 4 > b.x2 || box.y2 + 3 < b.y1 || box.y1 - 3 > b.y2))) continue;
      boxes.push(box);
      return { i, side };
    }
    return { i, side: null };
  });
}

export function PhotoWithStickers({ recipe, className, live = false }: { recipe: Pick<RecipeView, "photo_url" | "found" | "title">; className?: string; live?: boolean }) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const found = recipe.found.slice(0, 10);
  const placed = size ? placeLabels(found, size.w, size.h) : found.map((_, i) => ({ i, side: null }));
  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-ink-3", className)}>
      {recipe.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.photo_url} alt={`Your fridge photo for ${recipe.title}`} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,#3a3226,#17150f)]">
          <ChefHat className="h-12 w-12 text-cream/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
      {recipe.photo_url &&
        found.map((f, i) => {
          const side = placed[i]?.side;
          return (
            <motion.div
              key={f.name + i}
              className="absolute"
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
              initial={live && !reduce ? { opacity: 0, scale: 0.6 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: live ? 0.08 * i : 0, type: "spring", stiffness: 400, damping: 22 }}
            >
              <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-white bg-lime shadow" />
              {side && (
                <Sticker tone={toneCycle[i % 3]} className={cn("absolute top-0 -translate-y-1/2 text-[11px] sm:text-[12px]", side === "right" ? "left-2.5" : "right-2.5")}>
                  {f.name}
                </Sticker>
              )}
            </motion.div>
          );
        })}
    </div>
  );
}

function LockedOverlay({ label, onClick, sub }: { label: string; onClick?: () => void; sub?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center gap-2 bg-gradient-to-b from-surface/10 via-surface/60 to-surface/90 text-center"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-cream shadow-lg transition group-hover:scale-105">
        <Lock className="h-5 w-5" />
      </span>
      <span className="rounded-full bg-tomato px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgb(229_72_47/.8)] transition group-active:scale-95">
        {label}
      </span>
      {sub && <span className="text-xs text-fg-muted">{sub}</span>}
    </button>
  );
}

export function RecipeCard({ recipe, onUnlock, onUpgrade, unlockLabel = "See my full recipe", actions, justUnlocked, className }: Props) {
  const reduce = useReducedMotion();
  const { unlocked } = recipe.access;
  const usesCount = recipe.uses.length || recipe.body.ingredients.filter((i) => i.from_fridge).length;
  const blurAnim = justUnlocked && !reduce ? { initial: { filter: "blur(8px)", opacity: 0.6 }, animate: { filter: "blur(0px)", opacity: 1 }, transition: { duration: 0.9, ease: [0.22, 0.8, 0.24, 1] as const } } : {};

  return (
    <article className={cn("recipe-card overflow-hidden text-fg", className)} data-testid="recipe-card">
      <PhotoWithStickers recipe={recipe} className="aspect-[4/3] sm:aspect-[16/9]" />

      <div className="px-5 pb-6 pt-5 sm:px-8 sm:pt-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-mono text-olive">
            We found {recipe.found.length} ingredient{recipe.found.length === 1 ? "" : "s"} in your fridge
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5" data-testid="found-list">
          {recipe.found.map((f, i) => (
            <Sticker key={f.name + i} tone={toneCycle[i % 3]} className="text-[12px]">
              {f.name}
            </Sticker>
          ))}
        </div>
        <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[40px]" data-testid="recipe-title">
          {recipe.title}
        </h2>
        {recipe.intro && <p className="mt-2 text-[16px] leading-relaxed text-fg-muted">{recipe.intro}</p>}

        <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-medium">
          <Meta icon={<Clock className="h-4 w-4" />}>{recipe.time_minutes} min</Meta>
          <Meta icon={<Users className="h-4 w-4" />}>Serves {recipe.servings}</Meta>
          <Meta icon={<ChefHat className="h-4 w-4" />}>{recipe.difficulty}</Meta>
          <Meta icon={<Check className="h-4 w-4" />} className="bg-olive-soft text-olive">
            Uses {usesCount} of your {recipe.found.length}
          </Meta>
          {recipe.diet.map((d) => (
            <Meta key={d} className="bg-butter-soft capitalize text-[#7a5a0a]">{d}</Meta>
          ))}
        </div>

        {/* Ingredients */}
        <Section title="Ingredients">
          <motion.ul {...blurAnim} className={cn("divide-y divide-border/80", !unlocked && "locked")}>
            {recipe.body.ingredients.map((i, idx) => (
              <li key={idx} className="flex items-baseline justify-between gap-4 py-2.5 text-[15px]">
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", i.from_fridge ? "bg-olive" : "bg-butter")} />
                  {i.item}
                </span>
                <span className="shrink-0 font-mono text-[13px] text-fg-muted">{i.amount}</span>
              </li>
            ))}
          </motion.ul>
          {!unlocked && <LockedOverlay label={unlockLabel} onClick={onUnlock} />}
        </Section>

        {/* Steps */}
        <Section title="Step by step">
          <motion.ol {...blurAnim} className={cn("space-y-4", !unlocked && "locked")}>
            {recipe.body.steps.map((s, idx) => (
              <li key={idx} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-sm text-cream">{idx + 1}</span>
                <div>
                  <p className="font-semibold">
                    {s.title}
                    {s.minutes > 0 && <span className="ml-2 font-mono text-xs font-normal text-fg-muted">{s.minutes} min</span>}
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-fg-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </motion.ol>
          {!unlocked && <LockedOverlay label={unlockLabel} onClick={onUnlock} sub={`${recipe.body.steps.length} easy steps · ${recipe.time_minutes} min`} />}
        </Section>

        {/* Shopping Saver */}
        {recipe.body.shopping.length > 0 && (
          <Section title="Shopping Saver" icon={<ShoppingBasket className="h-4 w-4" />}>
            <ul className={cn("space-y-2", !recipe.access.shopping && "locked")}>
              {recipe.body.shopping.map((s, idx) => (
                <li key={idx} className="rounded-xl bg-surface-2 px-4 py-3 text-[15px]">
                  <span className="font-semibold">{s.item}</span>
                  <span className="text-fg-muted"> · {s.why}</span>
                </li>
              ))}
            </ul>
            {!recipe.access.shopping && (
              <LockedOverlay label={unlocked ? "Unlock with Pro" : unlockLabel} onClick={() => (unlocked ? onUpgrade?.("shopping") : onUnlock?.())} />
            )}
          </Section>
        )}
        {recipe.body.shopping.length === 0 && unlocked && (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-olive-soft px-4 py-3 text-[14px] font-medium text-olive">
            <Sparkles className="h-4 w-4" /> Nothing to buy: everything is already in your kitchen.
          </p>
        )}

        {/* Chef's tip + macros */}
        <Section title="Chef's tip & macros" icon={<Flame className="h-4 w-4" />}>
          <div className={cn(!recipe.access.macros && "locked")}>
            <p className="rounded-xl bg-butter-soft px-4 py-3 text-[15px] leading-relaxed text-[#5b430a]">{recipe.body.tip || "Taste as you go and season at the end."}</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                ["Calories", recipe.body.macros.calories, ""],
                ["Protein", recipe.body.macros.protein_g, "g"],
                ["Carbs", recipe.body.macros.carbs_g, "g"],
                ["Fat", recipe.body.macros.fat_g, "g"],
              ].map(([l, v, u]) => (
                <div key={l as string} className="rounded-xl border border-border bg-surface px-2 py-3">
                  <div className="font-mono text-[17px] font-medium tabular-nums">
                    {v}
                    {u}
                  </div>
                  <div className="text-[11px] text-fg-muted">{l}</div>
                </div>
              ))}
            </div>
          </div>
          {!recipe.access.macros && (
            <LockedOverlay label={unlocked ? "Unlock with Chef" : unlockLabel} onClick={() => (unlocked ? onUpgrade?.("macros") : onUnlock?.())} />
          )}
        </Section>

        {actions && unlocked && (
          <div className="mt-7 flex flex-wrap gap-2 print:hidden">
            {actions.onFavorite && (
              <ActionBtn onClick={actions.onFavorite} active={recipe.is_favorite} testId="favorite">
                <Heart className={cn("h-4 w-4", recipe.is_favorite && "fill-current")} /> {recipe.is_favorite ? "Saved" : "Save"}
              </ActionBtn>
            )}
            {actions.onShare && (
              <ActionBtn onClick={actions.onShare} testId="share">
                <Share2 className="h-4 w-4" /> Share
              </ActionBtn>
            )}
            {actions.onRemix && (
              <ActionBtn onClick={actions.onRemix} disabled={actions.remixing} testId="remix">
                <Shuffle className={cn("h-4 w-4", actions.remixing && "animate-spin")} /> {actions.remixing ? "Remixing…" : "Remix"}
              </ActionBtn>
            )}
            <ActionBtn onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </ActionBtn>
            {actions.onDelete && (
              <ActionBtn onClick={actions.onDelete} className="ml-auto text-tomato-deep">
                <Trash2 className="h-4 w-4" /> Delete
              </ActionBtn>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Meta({ children, icon, className }: { children: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5", className)}>
      {icon}
      {children}
    </span>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="relative mt-7">
      <h3 className="mb-3 flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
        {icon}
        {title}
      </h3>
      <div className="relative">{children}</div>
    </section>
  );
}

function ActionBtn({ children, onClick, active, disabled, className, testId }: { children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean; className?: string; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold transition hover:bg-surface-2 active:scale-95 disabled:opacity-60",
        active && "border-tomato/40 bg-[#fde3dc] text-tomato-deep",
        className
      )}
    >
      {children}
    </button>
  );
}
