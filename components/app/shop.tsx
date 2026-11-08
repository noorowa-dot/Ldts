"use client";
import * as React from "react";
import { AnimatePresence, m } from "framer-motion";
import { Check, ChevronDown, Home, Loader2, Lock, MapPin, Pencil, Plus, RefreshCw, Share2, ShoppingCart, Sparkles, Store, Trash2, TrendingDown, X, Zap } from "lucide-react";
import { UnlockProvider, useUnlock } from "@/components/funnel/unlock-flow";
import type { UpgradeFeature } from "@/components/funnel/recipe-card";
import { cn } from "@/lib/utils";
import { weekLabel } from "@/lib/week";
import { useMe } from "./me-context";
import { PageTitle } from "./app-shell";
import { WeekSwitcher } from "./planner";
import { Toast, useToast } from "./recipe-detail";

type Item = { id: string; name: string; key: string; quantity: number; unit: string; buy: string; aisle: string; for_meals: string[]; source: "plan" | "manual"; have_at_home: boolean; checked: boolean };
type State = {
  week: string;
  items: Item[];
  stores: string[];
  zip: string | null;
  book: { item_key: string; store: string; price_cents: number }[];
  live: { provider: string; store: string } | null;
  access: { shopList: boolean; priceCheck: boolean; tier: string };
};
type Live = { store: string; zip: string; prices: Record<string, { price_cents: number | null; size: string | null; product: string | null }> };

const AISLE_ORDER = ["Produce", "Meat & Fish", "Dairy & Eggs", "Bakery", "Pantry", "Frozen", "Spices & Sauces", "Other"];
const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
const qty = (i: Item) => {
  const n = Number.isInteger(i.quantity) ? String(i.quantity) : String(Math.round(i.quantity * 100) / 100);
  return i.unit === "count" ? n : `${n} ${i.unit}`;
};

export function Shop({ initialWeek }: { initialWeek: string }) {
  const me = useMe();
  return (
    <UnlockProvider recipe={null} signedIn tier={me.tier} currentPlanId={me.planId} returnPath="/app/shop" paywallTitle="Your shopping list is one tap away." paywallLine="Pick a plan: Platepal turns your week into one list in store amounts, and Pro shows which store is cheapest.">
      <ShopInner initialWeek={initialWeek} />
    </UnlockProvider>
  );
}

function ShopInner({ initialWeek }: { initialWeek: string }) {
  const { openUpgrade } = useUnlock();
  const { toast, show } = useToast();
  const [week, setWeek] = React.useState(initialWeek);
  const [st, setSt] = React.useState<State | null>(null);
  const [error, setError] = React.useState(false);
  const [tab, setTab] = React.useState<"list" | "prices">("list");
  const [building, setBuilding] = React.useState(false);
  const [showHome, setShowHome] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const load = React.useCallback(async (w: string) => {
    setError(false);
    setSt(null);
    try {
      const r = await fetch(`/api/shop?week=${w}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      setSt(await r.json());
    } catch {
      setError(true);
    }
  }, []);
  React.useEffect(() => {
    // Fetch the selected week (data loading on week change).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(week);
    history.replaceState(null, "", `/app/shop?week=${week}`);
  }, [week, load]);

  const handleErr = (status: number, d: { feature?: UpgradeFeature; message?: string; error?: string }) => {
    if (status === 403) return openUpgrade(d.feature ?? "shop");
    if (d.error === "no_meals") return show("Add a meal to your week first");
    show(d.message || "Something went wrong. Try again.");
  };

  async function post(body: Record<string, unknown>) {
    const r = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week, ...body }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return handleErr(r.status, d);
    setSt(d);
    return d as State;
  }

  async function build() {
    setBuilding(true);
    const d = await post({ action: "build" });
    setBuilding(false);
    if (d) show("Your list is ready");
  }

  async function patch(item: Item, body: Partial<Item>) {
    setSt((s) => (s ? { ...s, items: s.items.map((x) => (x.id === item.id ? { ...x, ...body } : x)) } : s));
    const r = await fetch(`/api/shop/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) {
      show("Couldn't save. Try again.");
      load(week);
    }
  }

  async function remove(item: Item) {
    setSt((s) => (s ? { ...s, items: s.items.filter((x) => x.id !== item.id) } : s));
    const r = await fetch(`/api/shop/${item.id}`, { method: "DELETE" });
    if (!r.ok) load(week);
  }

  async function share() {
    if (!st) return;
    const toBuy = st.items.filter((i) => !i.have_at_home);
    const text = [
      `Platepal shopping list · ${weekLabel(st.week)}`,
      ...AISLE_ORDER.flatMap((a) => {
        const xs = toBuy.filter((i) => (AISLE_ORDER.includes(i.aisle) ? i.aisle : "Other") === a);
        return xs.length ? ["", a.toUpperCase(), ...xs.map((i) => `${i.checked ? "☑" : "☐"} ${i.name}${i.buy ? ` · ${i.buy}` : ` · ${qty(i)}`}`)] : [];
      }),
    ].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: "Shopping list", text });
      else {
        await navigator.clipboard.writeText(text);
        show("List copied: paste it anywhere");
      }
    } catch {}
  }

  const items = st?.items ?? [];
  const aisleIdx = (a: string) => (AISLE_ORDER.includes(a) ? AISLE_ORDER.indexOf(a) : AISLE_ORDER.length);
  const toBuy = items.filter((i) => !i.have_at_home).sort((a, b) => aisleIdx(a.aisle) - aisleIdx(b.aisle));
  const atHome = items.filter((i) => i.have_at_home);
  const done = toBuy.filter((i) => i.checked).length;

  return (
    <div>
      <PageTitle title="Your shop" sub="Everything your week needs, in the amounts stores sell." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <WeekSwitcher week={week} onChange={setWeek} />
        <a href={`/app/plan?week=${week}`} className="text-[14px] font-semibold text-tomato hover:underline">
          Edit my week →
        </a>
      </div>

      {error && (
        <div className="recipe-card p-6 text-center">
          <p className="font-semibold">We couldn&apos;t load your list.</p>
          <button onClick={() => load(week)} className="mt-3 h-10 cursor-pointer rounded-full border border-border px-4 font-semibold">Try again</button>
        </div>
      )}
      {!st && !error && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      )}

      {st && !items.length && (
        <div className="recipe-card flex flex-col items-center px-6 py-12 text-center" data-testid="shop-empty">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-butter-soft text-[#7a5a0a]">
            <ShoppingCart className="h-7 w-7" />
          </span>
          <p className="mt-4 max-w-sm text-[17px] font-semibold">Plan a few meals, then Platepal builds your list: every ingredient, combined, in store amounts.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <a href={`/app/plan?week=${week}`} className="inline-flex h-12 items-center rounded-full border border-border px-5 font-semibold">Plan my week</a>
            <button type="button" onClick={build} disabled={building} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-tomato px-5 font-semibold text-white disabled:opacity-60" data-testid="build-from-shop">
              {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Build my list
            </button>
          </div>
        </div>
      )}

      {st && items.length > 0 && (
        <>
          {/* Progress + actions */}
          <div className="recipe-card mb-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold" data-testid="shop-progress">
                  {done} of {toBuy.length} in the cart
                </p>
                <p className="text-[12px] text-fg-muted">{atHome.length ? `${atHome.length} already at home` : "Built from your planned meals"}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={build} disabled={building} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold hover:bg-surface-2 disabled:opacity-60" data-testid="rebuild">
                  {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Rebuild
                </button>
                <button type="button" onClick={share} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold hover:bg-surface-2">
                  <Share2 className="h-4 w-4" /> Share
                </button>
                {done > 0 && (
                  <button type="button" onClick={() => post({ action: "clear_checked" })} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold hover:bg-surface-2">
                    <Check className="h-4 w-4" /> Clear ticked
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <m.div className="h-full rounded-full bg-olive" initial={false} animate={{ width: `${toBuy.length ? (done / toBuy.length) * 100 : 0}%` }} transition={{ type: "spring", damping: 24, stiffness: 200 }} />
            </div>
          </div>

          <div className="mb-4 inline-flex rounded-full bg-surface-2 p-1 text-[14px] font-semibold" role="tablist">
            <button role="tab" aria-selected={tab === "list"} onClick={() => setTab("list")} className={cn("cursor-pointer rounded-full px-4 py-1.5 transition", tab === "list" ? "bg-surface shadow-sm" : "text-fg-muted")}>
              List
            </button>
            <button role="tab" aria-selected={tab === "prices"} onClick={() => setTab("prices")} className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 transition", tab === "prices" ? "bg-surface shadow-sm" : "text-fg-muted")} data-testid="tab-prices">
              {!st.access.priceCheck && <Lock className="h-3.5 w-3.5" />} Price check
            </button>
          </div>

          {tab === "list" ? (
            <div>
              <form
                className="mb-4 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const v = draft.trim();
                  if (!v) return;
                  setDraft("");
                  await post({ action: "add", name: v[0].toUpperCase() + v.slice(1) });
                }}
              >
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={60} placeholder="Add an item" className="h-12 min-w-0 flex-1 rounded-full border border-border bg-surface px-5 text-[16px] outline-none focus:border-tomato" data-testid="add-item" />
                <button type="submit" disabled={!draft.trim()} className="inline-flex h-12 cursor-pointer items-center gap-1 rounded-full bg-ink px-5 font-semibold text-cream disabled:opacity-40 dark:bg-cream dark:text-ink">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </form>

              {AISLE_ORDER.map((a) => {
                const xs = toBuy.filter((i) => (AISLE_ORDER.includes(i.aisle) ? i.aisle : "Other") === a);
                if (!xs.length) return null;
                return (
                  <section key={a} className="mb-5">
                    <h2 className="mb-2 flex items-center justify-between font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                      {a} <span className="font-mono normal-case tracking-normal">{xs.filter((x) => x.checked).length}/{xs.length}</span>
                    </h2>
                    <ul className="recipe-card divide-y divide-border overflow-hidden">
                      <AnimatePresence initial={false}>
                        {xs.map((i) => (
                          <ItemRow key={i.id} item={i} st={st} onToggle={() => patch(i, { checked: !i.checked })} onHome={() => patch(i, { have_at_home: true, checked: false })} onRemove={() => remove(i)} onSave={(b) => patch(i, b)} />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </section>
                );
              })}

              {atHome.length > 0 && (
                <section className="mb-6">
                  <button type="button" onClick={() => setShowHome(!showHome)} className="flex w-full cursor-pointer items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-left text-[14px] font-semibold" aria-expanded={showHome}>
                    <span className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-olive" /> Already at home ({atHome.length})
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showHome && "rotate-180")} />
                  </button>
                  {showHome && (
                    <ul className="mt-2 space-y-1.5">
                      {atHome.map((i) => (
                        <li key={i.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px]">
                          <span>
                            {i.name} <span className="text-fg-muted">· {qty(i)}</span>
                          </span>
                          <button type="button" onClick={() => patch(i, { have_at_home: false })} className="cursor-pointer text-[13px] font-semibold text-tomato hover:underline">
                            I need to buy it
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          ) : st.access.priceCheck ? (
            <PriceCheck st={st} setSt={setSt} toBuy={toBuy} show={show} onErr={handleErr} week={week} />
          ) : (
            <div className="relative overflow-hidden rounded-[18px]">
              <div className="locked">
                <PriceCheckPreview items={toBuy} stores={st.stores} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-bg/20 to-bg/90 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-cream">
                  <Lock className="h-5 w-5" />
                </span>
                <p className="max-w-xs text-[15px] font-semibold">See which store is cheapest for your list.</p>
                <button type="button" onClick={() => openUpgrade("prices")} className="h-11 cursor-pointer rounded-full bg-tomato px-5 font-semibold text-white" data-testid="unlock-prices">
                  Unlock with Pro
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <Toast text={toast} />
    </div>
  );
}

function ItemRow({ item, st, onToggle, onHome, onRemove, onSave }: { item: Item; st: State; onToggle: () => void; onHome: () => void; onRemove: () => void; onSave: (b: Partial<Item>) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(item.name);
  const [buy, setBuy] = React.useState(item.buy || qty(item));
  const cheapest = React.useMemo(() => {
    if (!st.access.priceCheck) return null;
    const ps = st.book.filter((b) => b.item_key === item.key && st.stores.includes(b.store)).sort((a, b) => a.price_cents - b.price_cents);
    return ps[0] ?? null;
  }, [st, item.key]);
  return (
    <m.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="bg-surface" data-testid="shop-item">
      {!editing ? (
        <div className="flex items-start gap-3 px-3 py-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={item.checked}
            aria-label={`${item.name}: in the cart`}
            onClick={onToggle}
            className={cn("mt-0.5 grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-lg border-2 transition active:scale-90", item.checked ? "border-olive bg-olive text-white" : "border-fg/25 hover:border-olive")}
            data-testid="tick"
          >
            {item.checked && <Check className="h-4 w-4" strokeWidth={3} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[15px] font-semibold transition", item.checked && "text-fg-muted line-through decoration-olive/60")}>
              {item.name} {item.buy && <span className="font-normal text-fg-muted">· {item.buy}</span>}
            </p>
            <p className="text-[12px] text-fg-muted">
              {item.source === "manual" ? "Added by you" : `Needs ${qty(item)}${item.for_meals.length ? ` · ${item.for_meals.slice(0, 3).join(", ")}` : ""}`}
            </p>
          </div>
          {cheapest && (
            <span className="shrink-0 rounded-full bg-lime/70 px-2 py-0.5 font-mono text-[11px] font-medium text-ink" title={`Cheapest at ${cheapest.store}`}>
              {fmt(cheapest.price_cents)} · {cheapest.store}
            </span>
          )}
          <div className="flex shrink-0 items-center">
            <button type="button" aria-label="Edit" onClick={() => setEditing(true)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="I already have it" title="I already have it" onClick={onHome} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-olive">
              <Home className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Remove" onClick={onRemove} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-tomato-deep">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2 px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ name: name.trim() || item.name, buy: buy.trim() });
            setEditing(false);
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Item" className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 text-[15px] outline-none focus:border-tomato" />
          <input value={buy} onChange={(e) => setBuy(e.target.value)} maxLength={60} aria-label="Amount to buy" placeholder="Amount, e.g. 2 cans" className="h-10 w-36 rounded-xl border border-border bg-bg px-3 text-[15px] outline-none focus:border-tomato" />
          <button type="submit" className="h-10 cursor-pointer rounded-full bg-ink px-4 text-[14px] font-semibold text-cream dark:bg-cream dark:text-ink">Save</button>
          <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="grid h-10 w-10 cursor-pointer place-items-center rounded-full hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </form>
      )}
    </m.li>
  );
}

/* ---------------- Price check ---------------- */

function useTotals(toBuy: Item[], stores: string[], priceOf: (i: Item, s: string) => number | null) {
  return React.useMemo(() => {
    const per = stores.map((s) => {
      let total = 0;
      let priced = 0;
      for (const i of toBuy) {
        const p = priceOf(i, s);
        if (p != null) {
          total += p;
          priced++;
        }
      }
      return { store: s, total, priced };
    });
    let split = 0;
    let splitPriced = 0;
    const bestStore: Record<string, string> = {};
    for (const i of toBuy) {
      let best: { s: string; p: number } | null = null;
      for (const s of stores) {
        const p = priceOf(i, s);
        if (p != null && (!best || p < best.p)) best = { s, p };
      }
      if (best) {
        split += best.p;
        splitPriced++;
        bestStore[i.id] = best.s;
      }
    }
    const complete = per.filter((x) => x.priced === toBuy.length && toBuy.length > 0).sort((a, b) => a.total - b.total);
    return { per, split, splitPriced, bestStore, cheapest: complete[0] ?? null };
  }, [toBuy, stores, priceOf]);
}

function PriceCheck({ st, setSt, toBuy, show, onErr, week }: { st: State; setSt: React.Dispatch<React.SetStateAction<State | null>>; toBuy: Item[]; show: (s: string) => void; onErr: (status: number, d: { feature?: UpgradeFeature; message?: string }) => void; week: string }) {
  const [live, setLive] = React.useState<Live | null>(null);
  const [liveBusy, setLiveBusy] = React.useState(false);
  const [zip, setZip] = React.useState(st.zip ?? "");
  const [newStore, setNewStore] = React.useState("");
  const book = React.useMemo(() => new Map(st.book.map((b) => [`${b.item_key}|${b.store}`, b.price_cents])), [st.book]);

  const priceOf = React.useCallback(
    (i: Item, s: string): number | null => {
      const own = book.get(`${i.key}|${s}`);
      if (own != null) return own;
      if (live && live.store === s) return live.prices[i.key]?.price_cents ?? null;
      return null;
    },
    [book, live]
  );
  const t = useTotals(toBuy, st.stores, priceOf);
  const savings = t.cheapest && t.splitPriced === toBuy.length ? t.cheapest.total - t.split : 0;

  async function setPrice(i: Item, store: string, cents: number | null) {
    setSt((s) => {
      if (!s) return s;
      const rest = s.book.filter((b) => !(b.item_key === i.key && b.store === store));
      return { ...s, book: cents == null ? rest : [...rest, { item_key: i.key, store, price_cents: cents }] };
    });
    const r = await fetch("/api/prices", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item: i.name, store, price_cents: cents }) });
    if (!r.ok) onErr(r.status, await r.json().catch(() => ({})));
  }

  async function saveStores(stores: string[], zipCode?: string | null) {
    const body: Record<string, unknown> = { stores };
    if (zipCode !== undefined) body.zip = zipCode;
    const r = await fetch("/api/prices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return show(d.message || "Couldn't save. Try again.");
    setSt((s) => (s ? { ...s, stores, zip: zipCode !== undefined ? zipCode : s.zip } : s));
  }

  async function getLive() {
    if (!/^\d{5}$/.test(zip)) return show("Type your 5-digit ZIP code");
    if (zip !== st.zip) await saveStores(st.stores, zip);
    setLiveBusy(true);
    const r = await fetch(`/api/prices/live?week=${week}`, { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    setLiveBusy(false);
    if (!r.ok) return show(d.message || "Couldn't load store prices.");
    setLive(d);
    if (!st.stores.includes(d.store)) saveStores([d.store, ...st.stores].slice(0, 5));
    show(`Live ${d.store} prices loaded`);
  }

  return (
    <div data-testid="price-check">
      {/* Summary */}
      <div className="recipe-card mb-4 p-4">
        <p className="label-mono text-olive">[ Your basket ]</p>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2">
          {t.per.map((x) => {
            const best = t.cheapest?.store === x.store;
            return (
              <div key={x.store} className={cn("min-w-0 rounded-2xl border p-2.5 sm:p-3", best ? "border-olive bg-olive-soft" : "border-border bg-surface")} data-testid="store-total">
                <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
                  <Store className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{x.store}</span>
                  {live?.store === x.store && <Zap className="h-3.5 w-3.5 text-[#7a5a0a]" aria-label="Live prices" />}
                </p>
                <p className="mt-1 font-serif text-[20px] font-semibold tabular-nums sm:text-[24px]">{x.priced ? fmt(x.total) : "–"}</p>
                <p className="text-[11px] text-fg-muted">
                  {x.priced}/{toBuy.length} priced{best ? " · cheapest" : ""}
                </p>
              </div>
            );
          })}
        </div>
        {t.splitPriced > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-butter-soft px-3 py-2.5 text-[14px] text-[#5b430a]">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0" />
            {savings > 0 && t.cheapest
              ? `Split your shop: ${fmt(t.split)} by buying each item where it's cheapest. That's ${fmt(savings)} less than ${t.cheapest.store} alone.`
              : t.cheapest
                ? `${t.cheapest.store} is the cheapest single store for this list: ${fmt(t.cheapest.total)}.`
                : `Add prices for each store to compare. ${t.splitPriced} of ${toBuy.length} items have a price so far.`}
          </p>
        )}
        {!t.splitPriced && <p className="mt-3 text-[13px] text-fg-muted">Type the prices you see (in store, on the app, or on your receipt). Platepal remembers them for next week and finds the cheapest store.</p>}
      </div>

      {/* Stores + live prices */}
      <div className="recipe-card mb-4 p-4">
        <p className="text-[14px] font-semibold">Your stores</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {st.stores.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1 text-[13px] font-semibold">
              {s}
              {st.stores.length > 1 && (
                <button type="button" aria-label={`Remove ${s}`} onClick={() => saveStores(st.stores.filter((x) => x !== s))} className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
          {st.stores.length < 5 && (
            <form
              className="inline-flex"
              onSubmit={(e) => {
                e.preventDefault();
                const v = newStore.trim();
                if (v && !st.stores.includes(v)) saveStores([...st.stores, v]);
                setNewStore("");
              }}
            >
              <input value={newStore} onChange={(e) => setNewStore(e.target.value)} maxLength={30} placeholder="+ Add a store" className="h-8 w-32 rounded-full border border-dashed border-border bg-transparent px-3 text-[13px] outline-none focus:border-tomato" />
            </form>
          )}
        </div>
        {st.live && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <MapPin className="h-4 w-4 text-fg-muted" />
            <input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" placeholder="ZIP code" aria-label="ZIP code" className="h-9 w-24 rounded-full border border-border bg-surface px-3 text-[14px] outline-none focus:border-tomato" />
            <button type="button" onClick={getLive} disabled={liveBusy} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-cream disabled:opacity-60 dark:bg-cream dark:text-ink" data-testid="live-prices">
              {liveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Live {st.live.store} prices near me
            </button>
          </div>
        )}
      </div>

      {/* Item prices */}
      <ul className="space-y-2">
        {toBuy.map((i) => (
          <li key={i.id} className="recipe-card p-3" data-testid="price-row">
            <p className="text-[15px] font-semibold">
              {i.name} <span className="font-normal text-fg-muted">· {i.buy || qty(i)}</span>
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {st.stores.map((s) => {
                const own = book.get(`${i.key}|${s}`);
                const lv = live && live.store === s ? live.prices[i.key] : undefined;
                const best = t.bestStore[i.id] === s;
                return (
                  <PriceInput
                    key={s}
                    store={s}
                    value={own ?? null}
                    placeholder={lv?.price_cents != null ? fmt(lv.price_cents).slice(1) : "0.00"}
                    hint={own == null && lv?.price_cents != null ? `Live${lv.size ? ` · ${lv.size}` : ""}` : undefined}
                    best={best}
                    onSave={(c) => setPrice(i, s, c)}
                  />
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[12px] text-fg-muted">
        {st.live ? `Live prices come from ${st.live.store} for the store nearest your ZIP code and can change in store.` : "Prices are the ones you type. They stay private to your account."}
      </p>
    </div>
  );
}

function PriceInput({ store, value, placeholder, hint, best, onSave }: { store: string; value: number | null; placeholder: string; hint?: string; best: boolean; onSave: (cents: number | null) => void }) {
  const [v, setV] = React.useState(value != null ? (value / 100).toFixed(2) : "");
  React.useEffect(() => {
    // Keep in sync when the saved price changes elsewhere (another tab or a refresh).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setV(value != null ? (value / 100).toFixed(2) : "");
  }, [value]);
  const commit = () => {
    const t = v.replace(/[^0-9.]/g, "");
    if (!t) return value != null && onSave(null);
    const n = Math.round(parseFloat(t) * 100);
    if (Number.isFinite(n) && n !== value && n >= 0 && n <= 100000) onSave(n);
    if (Number.isFinite(n)) setV((n / 100).toFixed(2));
  };
  return (
    <label className={cn("block rounded-xl border px-2 py-1.5 transition", best ? "border-olive bg-olive-soft" : "border-border bg-surface")}>
      <span className="flex items-center justify-between text-[11px] font-semibold text-fg-muted">
        <span className="truncate">{store}</span>
        {best && <Check className="h-3 w-3 text-olive" strokeWidth={3} />}
      </span>
      <span className="flex items-baseline gap-0.5">
        <span className="text-[14px] text-fg-muted">$</span>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          inputMode="decimal"
          placeholder={placeholder}
          aria-label={`Price at ${store}`}
          className="w-full min-w-0 bg-transparent font-mono text-[16px] tabular-nums outline-none placeholder:text-fg-muted/50"
          data-testid="price-input"
        />
      </span>
      {hint && <span className="block truncate text-[10px] text-[#7a5a0a]">{hint}</span>}
    </label>
  );
}

/** What the locked Price check looks like (real list, stores, no prices). */
function PriceCheckPreview({ items, stores }: { items: Item[]; stores: string[] }) {
  return (
    <div className="space-y-2 p-1">
      <div className="recipe-card grid grid-cols-3 gap-2 p-4">
        {stores.slice(0, 3).map((s) => (
          <div key={s} className="rounded-2xl border border-border p-3">
            <p className="text-[13px] font-semibold">{s}</p>
            <p className="font-serif text-[24px]">$—</p>
          </div>
        ))}
      </div>
      {items.slice(0, 4).map((i) => (
        <div key={i.id} className="recipe-card p-3">
          <p className="font-semibold">{i.name}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {stores.slice(0, 3).map((s) => (
              <div key={s} className="h-10 rounded-xl border border-border" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
