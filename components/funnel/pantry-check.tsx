"use client";
import * as React from "react";
import {
  Check,
  Loader2,
  Lightbulb,
  ListPlus,
  ScanSearch,
  X,
} from "lucide-react";
import type { PantryStatus, RecipeView } from "@/lib/types";
import { isStaple, pantryKey } from "@/lib/pantry-shared";
import { cn } from "@/lib/utils";

type Swap = { swap: string; text: string } | "loading" | "error";

/**
 * "Quick cupboard check": the photo shows the fridge, not the spice rack. Everything the recipe needs that wasn't
 * in the photo is listed here so the person can confirm it ("Got it") or flag it ("I'm out" → a swap idea, or the
 * shopping list). Answers are remembered on the account and used for the next recipes.
 */
export function PantryCheck({ recipe }: { recipe: RecipeView }) {
  const all = recipe.body.ingredients.filter((i) => !i.from_fridge);
  const items = all.filter((i) => !isStaple(i.item));
  const staples = all
    .filter((i) => isStaple(i.item))
    .map((i) => i.item.toLowerCase());
  const [status, setStatus] = React.useState<Record<string, PantryStatus>>({});
  const [remembered, setRemembered] = React.useState<Set<string>>(new Set());
  const [swaps, setSwaps] = React.useState<Record<string, Swap>>({});
  const [listed, setListed] = React.useState<
    "idle" | "busy" | "done" | "error"
  >("idle");

  React.useEffect(() => {
    let live = true;
    fetch("/api/pantry", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { status: {} }))
      .then((d: { status: Record<string, PantryStatus> }) => {
        if (!live) return;
        const mine: Record<string, PantryStatus> = {};
        for (const i of items) {
          const s = d.status?.[pantryKey(i.item)];
          if (s) mine[pantryKey(i.item)] = s;
        }
        setStatus(mine);
        setRemembered(new Set(Object.keys(mine)));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  if (!items.length) return null;

  const save = (list: { name: string; status: PantryStatus | null }[]) =>
    fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", items: list }),
    }).catch(() => {});

  function mark(name: string, s: PantryStatus) {
    const k = pantryKey(name);
    const next = status[k] === s ? null : s;
    setStatus((cur) => {
      const c = { ...cur };
      if (next) c[k] = next;
      else delete c[k];
      return c;
    });
    setRemembered((r) => {
      const n = new Set(r);
      n.delete(k);
      return n;
    });
    save([{ name, status: next }]);
    if (next === "out" && !swaps[k]) askSwap(name);
  }

  function allHave() {
    const c: Record<string, PantryStatus> = {};
    for (const i of items) c[pantryKey(i.item)] = "have";
    setStatus(c);
    save(items.map((i) => ({ name: i.item, status: "have" as const })));
  }

  async function askSwap(name: string) {
    const k = pantryKey(name);
    setSwaps((s) => ({ ...s, [k]: "loading" }));
    const r = await fetch(`/api/recipes/${recipe.id}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: name }),
    }).catch(() => null);
    const d = r?.ok ? await r.json() : null;
    setSwaps((s) => ({ ...s, [k]: d?.swap ? d : "error" }));
  }

  async function toList() {
    setListed("busy");
    const names = items
      .filter((i) => status[pantryKey(i.item)] === "out")
      .map((i) => i.item);
    const r = await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "to_list", items: names }),
    }).catch(() => null);
    setListed(r?.ok ? "done" : "error");
  }

  const answered = items.filter((i) => status[pantryKey(i.item)]).length;
  const out = items.filter((i) => status[pantryKey(i.item)] === "out");
  const done = answered === items.length;

  return (
    <section
      className="relative mt-6 rounded-[22px] border border-border bg-surface-2/70 p-4 sm:p-5 print:hidden"
      data-testid="pantry-check"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-butter text-ink">
          <ScanSearch className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[19px] font-semibold leading-tight">
            Quick peek in your spice cabinet
          </p>
          <p className="mt-0.5 text-[14px] leading-snug text-fg-muted">
            Your photo showed the fridge, not the cupboard. Got these? Tap to
            tell us, and we&apos;ll remember for next time.
          </p>
        </div>
      </div>

      <ul className="mt-3.5 space-y-2">
        {items.map((i) => {
          const k = pantryKey(i.item);
          const s = status[k];
          const sw = swaps[k];
          return (
            <li
              key={k}
              className={cn(
                "rounded-2xl border bg-surface px-3.5 py-2.5 transition",
                s === "have"
                  ? "border-olive/40"
                  : s === "out"
                    ? "border-tomato/35"
                    : "border-border",
              )}
              data-testid="pantry-item"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-[10rem] flex-1">
                  <p
                    className={cn(
                      "text-[15px] font-semibold leading-tight",
                      s === "have" && "text-olive",
                    )}
                  >
                    {i.item}
                  </p>
                  <p className="font-mono text-[12px] text-fg-muted">
                    {i.amount}
                    {remembered.has(k) && s === "have" && (
                      <span className="font-sans"> · you had it last time</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => mark(i.item, "have")}
                    aria-pressed={s === "have"}
                    className={cn(
                      "inline-flex h-9 cursor-pointer items-center gap-1 rounded-full border px-3 text-[13px] font-semibold transition active:scale-95",
                      s === "have"
                        ? "border-olive bg-olive text-white"
                        : "border-border bg-surface hover:bg-surface-2",
                    )}
                    data-testid="pantry-have"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} /> Got it
                  </button>
                  <button
                    type="button"
                    onClick={() => mark(i.item, "out")}
                    aria-pressed={s === "out"}
                    className={cn(
                      "inline-flex h-9 cursor-pointer items-center gap-1 rounded-full border px-3 text-[13px] font-semibold transition active:scale-95",
                      s === "out"
                        ? "border-tomato bg-tomato text-white"
                        : "border-border bg-surface text-fg-muted hover:bg-surface-2",
                    )}
                    data-testid="pantry-out"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={3} /> I&apos;m out
                  </button>
                </div>
              </div>
              {s === "out" && sw && (
                <div
                  className="mt-2 flex gap-2 rounded-xl bg-butter-soft px-3 py-2 text-[13px] text-[#5b430a]"
                  data-testid="pantry-swap"
                >
                  {sw === "loading" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding
                      you a swap…
                    </span>
                  ) : sw === "error" ? (
                    <button
                      type="button"
                      className="cursor-pointer font-semibold underline"
                      onClick={() => askSwap(i.item)}
                    >
                      Couldn&apos;t find a swap. Try again?
                    </button>
                  ) : (
                    <>
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <b>No problem: {sw.swap}.</b> {sw.text}
                      </span>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {staples.length > 0 && (
        <p className="mt-2.5 text-[13px] text-fg-muted">
          Plus the basics we assume every kitchen has:{" "}
          {Array.from(new Set(staples)).join(", ")}.
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {done && !out.length ? (
          <p
            className="flex items-center gap-2 rounded-full bg-olive-soft px-4 py-2 text-[14px] font-semibold text-olive"
            data-testid="pantry-done"
          >
            <Check className="h-4 w-4" strokeWidth={3} /> You&apos;re all set.
            Everything&apos;s in your kitchen, let&apos;s cook!
          </p>
        ) : (
          <>
            {answered < items.length && (
              <button
                type="button"
                onClick={allHave}
                className="h-10 cursor-pointer rounded-full border border-border bg-surface px-4 text-[14px] font-semibold hover:bg-surface-2 active:scale-95"
                data-testid="pantry-all"
              >
                I have all of these
              </button>
            )}
            {out.length > 0 && (
              <button
                type="button"
                onClick={toList}
                disabled={listed === "busy" || listed === "done"}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-tomato px-4 text-[14px] font-semibold text-white active:scale-95 disabled:opacity-70"
                data-testid="pantry-to-list"
              >
                {listed === "busy" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : listed === "done" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ListPlus className="h-4 w-4" />
                )}
                {listed === "done"
                  ? "Added to this week's shopping list"
                  : `Add ${out.length} to my shopping list`}
              </button>
            )}
            {listed === "done" && (
              <a
                href="/app/shop"
                className="text-[14px] font-semibold text-tomato-deep underline-offset-4 hover:underline"
              >
                Open my list
              </a>
            )}
            <span className="text-[13px] text-fg-muted">
              {answered} of {items.length} checked
            </span>
          </>
        )}
      </div>
      {listed === "error" && (
        <p className="mt-2 text-[13px] text-tomato-deep">
          Couldn&apos;t add them. Try again?
        </p>
      )}
    </section>
  );
}
