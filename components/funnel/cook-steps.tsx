"use client";
import * as React from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Check, ChefHat, Heart, RotateCcw, Share2 } from "lucide-react";
import type { RecipeView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";

const key = (id: string) => `pp_steps_${id}`;

function load(id: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(key(id)) || "[]");
  } catch {
    return [];
  }
}

/** Cook mode: tick each step as you go; when the last one is ticked, a little celebration. */
export function CookSteps({
  recipe,
  onFavorite,
  onShare,
}: {
  recipe: RecipeView;
  onFavorite?: () => void;
  onShare?: () => void;
}) {
  const steps = recipe.body.steps;
  const [done, setDone] = React.useState<number[]>([]);
  const [party, setParty] = React.useState(false);

  React.useEffect(() => {
    // Ticks are remembered on this device, per recipe (read after mount: browser storage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(load(recipe.id).filter((i) => i < steps.length));
  }, [recipe.id, steps.length]);

  function toggle(i: number) {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(key(recipe.id), JSON.stringify(next));
    } catch {}
    if (next.length === steps.length && done.length < steps.length) {
      setTimeout(() => setParty(true), 350);
      fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "feature_used", detail: "cooked" }), keepalive: true }).catch(() => {});
    }
  }

  function reset() {
    setDone([]);
    try {
      localStorage.removeItem(key(recipe.id));
    } catch {}
  }

  const pct = steps.length ? (done.length / steps.length) * 100 : 0;
  return (
    <div data-testid="cook-steps">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <m.div className="h-full rounded-full bg-olive" initial={false} animate={{ width: `${pct}%` }} transition={{ type: "spring", damping: 24, stiffness: 200 }} />
        </div>
        <span className="shrink-0 font-mono text-[12px] text-fg-muted" data-testid="steps-progress">
          {done.length} of {steps.length} done
        </span>
        {done.length > 0 && (
          <button type="button" onClick={reset} aria-label="Start over" className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2 print:hidden">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <ol className="space-y-2">
        {steps.map((s, idx) => {
          const on = done.includes(idx);
          return (
            <li key={idx}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(idx)}
                className={cn("flex w-full cursor-pointer gap-4 rounded-2xl p-2 text-left transition hover:bg-surface-2/70 active:scale-[0.99]", on && "opacity-70")}
                data-testid="step-check"
              >
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-sm transition", on ? "bg-olive text-white" : "bg-ink text-cream")}>
                  {on ? <Check className="h-4 w-4" strokeWidth={3} /> : idx + 1}
                </span>
                <span>
                  <span className={cn("block font-semibold", on && "line-through decoration-olive/60")}>
                    {s.title}
                    {s.minutes > 0 && <span className="ml-2 font-mono text-xs font-normal text-fg-muted no-underline">{s.minutes} min</span>}
                  </span>
                  <span className="mt-1 block text-[15px] leading-relaxed text-fg-muted">{s.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {done.length === 0 && <p className="mt-2 px-2 text-[12px] text-fg-muted print:hidden">Tap each step as you finish it.</p>}

      <Sheet open={party} onClose={() => setParty(false)} label="Enjoy your meal" testId="cooked-popup" width={420} closeSide="right">
        <Celebration recipe={recipe} onFavorite={onFavorite} onShare={onShare} onClose={() => setParty(false)} />
      </Sheet>
    </div>
  );
}

const MESSAGES = [
  "Look at you! You turned what was in your fridge into a real dinner.",
  "From random fridge bits to a proper meal. Nicely done, chef.",
  "That's dinner, made by you, from what you already had. Dig in!",
];

function Celebration({ recipe, onFavorite, onShare, onClose }: { recipe: RecipeView; onFavorite?: () => void; onShare?: () => void; onClose: () => void }) {
  const reduce = useReducedMotion();
  const msg = MESSAGES[recipe.id.charCodeAt(0) % MESSAGES.length];
  return (
    <div className="relative overflow-hidden px-6 pb-8 pt-14 text-center">
      {!reduce && <Confetti />}
      <m.div
        initial={reduce ? false : { scale: 0.4, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-lime text-ink shadow-[0_12px_30px_-10px_rgb(107_122_46/.6)]"
      >
        <ChefHat className="h-10 w-10" />
      </m.div>
      <h2 className="relative mt-5 text-[30px] font-semibold leading-tight tracking-[-0.03em]">Bon appétit, chef!</h2>
      <p className="relative mt-2 text-[16px] leading-relaxed text-fg-muted">{msg}</p>
      <p className="relative mt-3 font-serif text-[18px] font-semibold">Enjoy every bite of your {recipe.title}.</p>
      <div className="relative mt-6 flex flex-col gap-2">
        {onFavorite && !recipe.is_favorite && (
          <button type="button" onClick={() => { onFavorite(); onClose(); }} className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-tomato font-semibold text-white active:scale-[0.98]">
            <Heart className="h-5 w-5" /> Loved it? Save it for next time
          </button>
        )}
        {onShare && (
          <button type="button" onClick={() => { onShare(); onClose(); }} className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface font-semibold active:scale-[0.98]">
            <Share2 className="h-5 w-5" /> Share my dish
          </button>
        )}
        <button type="button" onClick={onClose} className="h-12 cursor-pointer rounded-full font-semibold text-fg-muted hover:text-fg" data-testid="cooked-close">
          Time to eat
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ["#D2402A", "#C8FF3D", "#6B7A2E", "#F4C95D", "#FBF6EC"];
  const bits = Array.from({ length: 28 }, (_, i) => i);
  return (
    <AnimatePresence>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {bits.map((i) => {
          const x = (i * 37) % 100;
          const delay = (i % 7) * 0.06;
          return (
            <m.span
              key={i}
              className="absolute top-0 block h-2.5 w-1.5 rounded-sm"
              style={{ left: `${x}%`, background: colors[i % colors.length] }}
              initial={{ y: -20, opacity: 0, rotate: 0 }}
              animate={{ y: 360, opacity: [0, 1, 1, 0], rotate: (i % 2 ? 1 : -1) * 280 }}
              transition={{ duration: 1.8 + (i % 5) * 0.2, delay, ease: "easeOut" }}
            />
          );
        })}
      </div>
    </AnimatePresence>
  );
}
