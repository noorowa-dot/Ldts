"use client";
import * as React from "react";
import { m, useReducedMotion } from "framer-motion";
import { Check, ChefHat, Clock, Flame, Heart, Lock, Shuffle, ShoppingBasket, Share2, Users, Sparkles, Trash2, Printer, Pencil, X, Plus, RotateCcw } from "lucide-react";
import type { RecipeView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sticker, toneCycle } from "@/components/ui/sticker";
import { CookSteps } from "./cook-steps";
import { HeatPicker } from "./heat-picker";
import { HEATS, type Heat } from "@/lib/types";

export type UpgradeFeature = "shopping" | "macros" | "remix" | "saved" | "quota" | "diet" | "plan" | "shop" | "prices";

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
  /** Remake the recipe from a corrected ingredient list (when the photo was misread). */
  onEditIngredients?: (items: string[]) => void;
  /** Same dish, new heat level (unlocked recipes). */
  onHeat?: (h: Heat) => void;
  heatBusy?: Heat | null;
};

type Placed = { i: number; side: "left" | "right" | null };

function placeLabels(found: { name: string; x: number; y: number }[], w: number, h: number): Placed[] {
  const fs = w < 500 ? 6.4 : 7;
  // Every pin's dot is an obstacle too, so a label never covers another ingredient's dot.
  const dots = found.map((f) => {
    const cx = (f.x / 100) * w;
    const cy = (f.y / 100) * h;
    return { x1: cx - 8, y1: cy - 8, x2: cx + 8, y2: cy + 8 };
  });
  const boxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
  return found.map((f, i) => {
    const cx = (f.x / 100) * w;
    const cy = (f.y / 100) * h;
    const lw = Math.min(f.name.length * fs + 30, w * 0.45);
    const lh = 24;
    for (const side of [cx > w * 0.55 ? "left" : "right", cx > w * 0.55 ? "right" : "left"] as const) {
      const x1 = side === "right" ? cx + 10 : cx - 10 - lw;
      const box = { x1, y1: cy - lh / 2, x2: x1 + lw, y2: cy + lh / 2 };
      if (box.x1 < 4 || box.x2 > w - 4 || box.y1 < 4 || box.y2 > h - 4) continue;
      const hit = (b: { x1: number; y1: number; x2: number; y2: number }) => !(box.x2 + 4 < b.x1 || box.x1 - 4 > b.x2 || box.y2 + 3 < b.y1 || box.y1 - 3 > b.y2);
      if (boxes.some(hit) || dots.some((d, j) => j !== i && hit(d))) continue;
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
  const found = recipe.found.filter((f) => f.x >= 0 && f.y >= 0).slice(0, 10);
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
            <m.div
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
            </m.div>
          );
        })}
    </div>
  );
}

/** The detected ingredients, editable: remove what the photo got wrong, add what it missed, remake the recipe. */
function IngredientEditor({ names, onSubmit }: { names: string[]; onSubmit: (items: string[]) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [items, setItems] = React.useState(names);
  const [draft, setDraft] = React.useState("");
  const changed = items.join("|") !== names.join("|");
  const add = () => {
    const v = draft.trim().replace(/\s+/g, " ");
    if (v && !items.some((x) => x.toLowerCase() === v.toLowerCase())) setItems([...items, v[0].toUpperCase() + v.slice(1)]);
    setDraft("");
  };
  if (!editing)
    return (
      <div className="mt-2.5" data-testid="found-list">
        <div className="flex flex-wrap gap-1.5">
          {names.map((n, i) => (
            <Sticker key={n + i} tone={toneCycle[i % 3]} className="text-[12px]">
              {n}
            </Sticker>
          ))}
        </div>
        <button type="button" onClick={() => setEditing(true)} className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline print:hidden" data-testid="edit-ingredients">
          <Pencil className="h-3.5 w-3.5" /> Something wrong? Fix the ingredients
        </button>
      </div>
    );
  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface-2 p-3.5" data-testid="ingredient-editor">
      <p className="text-[13px] font-semibold">What&apos;s really in your fridge?</p>
      <p className="text-[12px] text-fg-muted">Tap × to remove what we got wrong, add what we missed.</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {items.map((n, i) => (
          <span key={n + i} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1 text-[13px] font-semibold">
            {n}
            <button type="button" aria-label={`Remove ${n}`} onClick={() => setItems(items.filter((_, j) => j !== i))} className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-tomato-deep">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} placeholder="Add an ingredient" className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-[15px] outline-none focus:border-tomato" data-testid="add-ingredient" />
        <button type="submit" disabled={!draft.trim()} className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full border border-border bg-surface px-3.5 text-[14px] font-semibold disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!changed || items.length < 2}
          onClick={() => onSubmit(items)}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-tomato px-4 text-[14px] font-semibold text-white active:scale-95 disabled:opacity-50"
          data-testid="remake-recipe"
        >
          <RotateCcw className="h-4 w-4" /> Remake my recipe
        </button>
        <button type="button" onClick={() => { setItems(names); setEditing(false); }} className="h-10 cursor-pointer rounded-full px-3 text-[14px] font-semibold text-fg-muted hover:text-fg">
          Cancel
        </button>
      </div>
      {items.length < 2 && <p className="mt-1.5 text-[12px] text-tomato-deep">Keep at least 2 ingredients.</p>}
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
      <span className="rounded-full bg-tomato px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgb(210_64_42/.8)] transition group-active:scale-95">
        {label}
      </span>
      {sub && <span className="text-xs text-fg-muted">{sub}</span>}
    </button>
  );
}

export function RecipeCard({ recipe, onUnlock, onUpgrade, unlockLabel = "See my full recipe", actions, justUnlocked, className, onEditIngredients, onHeat, heatBusy }: Props) {
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
        {onEditIngredients ? (
          <IngredientEditor names={recipe.found.map((f) => f.name)} onSubmit={onEditIngredients} />
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-1.5" data-testid="found-list">
            {recipe.found.map((f, i) => (
              <Sticker key={f.name + i} tone={toneCycle[i % 3]} className="text-[12px]">
                {f.name}
              </Sticker>
            ))}
          </div>
        )}
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
          {recipe.heat && (
            <Meta icon={<Flame className="h-4 w-4 text-tomato" />} className="bg-[#fde3dc] text-tomato-deep">
              {HEATS.find((h) => h.id === recipe.heat)?.label}
            </Meta>
          )}
          {recipe.diet.map((d) => (
            <Meta key={d} className="bg-butter-soft capitalize text-[#7a5a0a]">{d}</Meta>
          ))}
        </div>

        {onHeat && recipe.access.unlocked && (
          <div className="mt-5 rounded-2xl border border-border bg-surface-2/60 p-3 print:hidden" data-testid="heat-row">
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
              <Flame className="h-4 w-4 text-tomato" /> Heat level
              <span className="font-normal text-fg-muted">{heatBusy ? (HEATS.findIndex((h) => h.id === heatBusy) > HEATS.findIndex((h) => h.id === (recipe.heat ?? "medium")) ? "· Turning up the heat…" : "· Cooling it down…") : "· same dish, your spice"}</span>
            </p>
            <HeatPicker value={recipe.heat ?? null} onChange={onHeat} busy={heatBusy} size="sm" />
          </div>
        )}

        {/* Ingredients */}
        <Section title="Ingredients">
          <m.ul {...blurAnim} className={cn("divide-y divide-border/80", !unlocked && "locked")}>
            {recipe.body.ingredients.map((i, idx) => (
              <li key={idx} className="flex items-baseline justify-between gap-4 py-2.5 text-[15px]">
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", i.from_fridge ? "bg-olive" : "bg-butter")} />
                  {i.item}
                </span>
                <span className="shrink-0 font-mono text-[13px] text-fg-muted">{i.amount}</span>
              </li>
            ))}
          </m.ul>
          {!unlocked && <LockedOverlay label={unlockLabel} onClick={onUnlock} />}
        </Section>

        {/* Steps */}
        <Section title="Step by step">
          {unlocked ? (
            <m.div {...blurAnim}>
              <CookSteps recipe={recipe} onFavorite={actions?.onFavorite} onShare={actions?.onShare} />
            </m.div>
          ) : (
            <>
              <ol className="locked space-y-4">
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
              </ol>
              <LockedOverlay label={unlockLabel} onClick={onUnlock} sub={`${recipe.body.steps.length} easy steps · ${recipe.time_minutes} min`} />
            </>
          )}
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
        <Section title="Chef's tips & macros" icon={<ChefHat className="h-4 w-4" />}>
          <div className={cn(!recipe.access.macros && "locked")}>
            <ul className="space-y-2" data-testid="chef-tips">
              {(recipe.body.tips?.length ? recipe.body.tips : [{ title: "Chef's tip", text: recipe.body.tip || "Taste as you go and season at the end." }]).map((t, i) => (
                <li key={i} className="flex gap-3 rounded-xl bg-butter-soft px-4 py-3 text-[#5b430a]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#7a5a0a] font-mono text-[11px] text-butter-soft">{i + 1}</span>
                  <span>
                    <span className="block text-[14px] font-semibold">{t.title}</span>
                    <span className="block text-[14px] leading-relaxed">{t.text}</span>
                  </span>
                </li>
              ))}
            </ul>
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
