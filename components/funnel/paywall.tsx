"use client";
import * as React from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, CreditCard, Loader2, ShieldCheck, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

import { usePlans } from "./plans";
export { usePlans };
import type { PublicPlan } from "./plans";
export type { PublicPlan };



export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const perDay = (p: PublicPlan, period: "month" | "year") => (period === "year" && p.yearly ? p.yearly.per_day : p.per_day);
const splitDay = (s: string) => s.replace(/\s*\/\s*day/i, "");

const FAQ = [
  { q: "Will it work with my fridge?", a: "Yes. Platepal reads any normal photo: a messy fridge, one pantry shelf, a few things on the counter. If a photo is too dark, it tells you and you can retake it. You already saw your own recipe being made." },
  { q: "Can I cancel?", a: "Anytime, in 2 taps: Account → Billing → Cancel my subscription. You keep your plan until the end of the period you paid for. No calls, no emails." },
  { q: "What happens right after I pay?", a: "Your recipe unlocks on this screen, right away: every amount, every step. No email to check, no reload. Then you can snap your next fridge." },
];

type ContentProps = {
  plans: PublicPlan[] | null;
  title: React.ReactNode;
  personal?: React.ReactNode;
  onContinue: (plan: PublicPlan, period: "month" | "year") => void;
  busy?: boolean;
  notice?: string | null;
  excludeId?: number | null;
  scrollRoot?: React.RefObject<HTMLDivElement | null>;
  sticky?: boolean;
};

/** The paywall body, shared by the sheet over the recipe and the /pricing page. */
export function PaywallContent({ plans, title, personal, onContinue, busy, notice, excludeId, scrollRoot, sticky = true }: ContentProps) {
  const [period, setPeriod] = React.useState<"month" | "year">("month");
  const list = React.useMemo(() => (plans ?? []).filter((p) => p.id !== excludeId), [plans, excludeId]);
  const [selected, setSelected] = React.useState<number | null>(null);
  const sel = list.find((p) => p.id === selected) ?? list.find((p) => p.featured) ?? list[Math.floor(list.length / 2)];
  const hasYearly = list.some((p) => p.yearly);
  const ctaRef = React.useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = React.useState(true);
  const [faqOpen, setFaqOpen] = React.useState<number | null>(null);

  React.useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), { root: scrollRoot?.current ?? null, threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [scrollRoot, plans]);

  const due = sel ? (period === "year" && sel.yearly ? `${money(sel.yearly.price_cents)} due today, then every year` : `${money(sel.price_cents)} due today, then every month`) : "";
  const cta = sel ? `Continue with ${sel.name}` : "Continue";

  const renderPlans = (testPrefix: string) => (
    <div className="space-y-3" role="radiogroup" aria-label="Plans">
      {list.map((p) => {
        const active = sel?.id === p.id;
        const yearlyOn = period === "year" && p.yearly;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setSelected(p.id)}
            data-testid={`${testPrefix}-${p.tier}`}
            className={cn(
              "relative flex w-full cursor-pointer items-center gap-3 rounded-[18px] border-2 bg-surface px-4 py-4 text-left transition active:scale-[0.985]",
              active ? "border-tomato shadow-[0_10px_30px_-14px_rgb(210_64_42/.6)]" : "border-border hover:border-fg/20"
            )}
          >
            {p.featured && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-lime px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink">Most popular</span>
            )}
            <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", active ? "border-tomato" : "border-fg/25")}>
              {active && <span className="h-2.5 w-2.5 rounded-full bg-tomato" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold">{p.name}</span>
              <span className="block text-[13px] text-fg-muted">
                {yearlyOn ? `${money(p.yearly!.price_cents)} / year` : `${money(p.price_cents)} / month`} · {p.recipes} recipes a month
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-fg-muted/90">{p.tag}</span>
            </span>
            <span className="text-right">
              <span className="block font-serif text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{splitDay(perDay(p, period))}</span>
              <span className="text-[12px] text-fg-muted">/ day</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  if (!plans) {
    return (
      <div className="space-y-3 px-5 pb-8 pt-16">
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-5 w-1/2" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-20 w-full" />
        ))}
      </div>
    );
  }
  if (!list.length) {
    return (
      <div className="px-6 pb-10 pt-16 text-center">
        <p className="font-serif text-2xl font-semibold">Plans are loading slowly.</p>
        <p className="mt-2 text-fg-muted">Your recipe is saved. Try again in a moment.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 pt-14 sm:px-7" data-testid="paywall">
      <h2 className="text-[30px] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[34px]" data-testid="paywall-title">
        {title}
      </h2>
      {personal && <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{personal}</p>}

      <div className="mt-7 flex items-center justify-between">
        <p className="text-[17px] font-semibold">Choose your plan.</p>
        {hasYearly && (
          <div className="flex rounded-full bg-surface-2 p-1 text-[13px] font-semibold" role="tablist">
            {(["month", "year"] as const).map((pr) => (
              <button
                key={pr}
                role="tab"
                aria-selected={period === pr}
                onClick={() => setPeriod(pr)}
                className={cn("cursor-pointer rounded-full px-3 py-1.5 transition", period === pr ? "bg-surface text-fg shadow-sm" : "text-fg-muted")}
              >
                {pr === "month" ? "Monthly" : "Yearly −20%"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {renderPlans("plan")}
      </div>

      <div ref={ctaRef} className="mt-6">
        <button
          type="button"
          disabled={busy || !sel}
          onClick={() => sel && onContinue(sel, period)}
          data-testid="paywall-continue"
          className="flex h-15 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-tomato text-[17px] font-semibold text-white shadow-[0_10px_30px_-10px_rgb(210_64_42/.8)] transition hover:bg-tomato-deep active:scale-[0.97] disabled:opacity-60"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {cta}
        </button>
        <p className="mt-2.5 text-center text-[13px] text-fg-muted">{due} · Cancel anytime</p>
        {notice && <p className="mt-3 rounded-xl bg-butter-soft px-4 py-3 text-center text-[14px] font-medium text-[#5b430a]" data-testid="paywall-notice">{notice}</p>}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[12px] text-fg-muted">
        <ShieldCheck className="h-4 w-4 text-olive" /> Secure payment, processed by Whop
        <span className="rounded-md border border-border bg-surface px-2 py-0.5 font-semibold text-fg">Whop</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-semibold text-fg">
          <CreditCard className="h-3.5 w-3.5" /> Card
        </span>
      </div>

      {sel && (
        <div className="mt-8 rounded-[18px] border border-border bg-surface p-5">
          <p className="font-semibold">What you unlock with {sel.name}</p>
          <ul className="mt-3 space-y-2.5">
            {sel.unlock.map((l) => (
              <li key={l} className="flex gap-2.5 text-[15px]">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-olive text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        {FAQ.map((f, i) => (
          <div key={f.q} className="border-b border-border">
            <button className="flex w-full cursor-pointer items-center justify-between gap-3 py-4 text-left font-semibold" onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i}>
              {f.q}
              <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", faqOpen === i && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {faqOpen === i && (
                <m.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pb-4 text-[14px] leading-relaxed text-fg-muted">
                  {f.a}
                </m.p>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <p className="font-serif text-[22px] font-semibold tracking-[-0.02em]">Pick up where you left off</p>
        <div className="mt-4">
          {renderPlans("plan-bottom")}
        </div>
        <button
          type="button"
          disabled={busy || !sel}
          onClick={() => sel && onContinue(sel, period)}
          className="mt-5 flex h-14 w-full cursor-pointer items-center justify-center rounded-full bg-tomato text-[16px] font-semibold text-white transition hover:bg-tomato-deep active:scale-[0.97] disabled:opacity-60"
        >
          {cta}
        </button>
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-fg-muted">
        Renews automatically until canceled. Prices in USD. Taxes may apply.
      </p>

      {sticky && (
        <AnimatePresence>
          {!ctaVisible && sel && (
            <m.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="sticky bottom-0 -mx-5 mt-4 border-t border-border bg-bg/95 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-7 sm:px-7"
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => onContinue(sel, period)}
                className="flex h-14 w-full cursor-pointer items-center justify-center rounded-full bg-tomato text-[16px] font-semibold text-white active:scale-[0.97]"
              >
                {cta} · {perDay(sel, period)}
              </button>
            </m.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/* ---------------- Whop checkout, inside the page ---------------- */

type WhopCk = { create: (k: string) => { mount: (sel: string) => void }; destroy?: () => void };
declare global {
  interface Window {
    WhopElements?: () => { checkout: { create: (o: Record<string, unknown>) => WhopCk } };
  }
}

let whopScript: Promise<void> | null = null;
function loadWhop() {
  whopScript ??= new Promise<void>((resolve, reject) => {
    if (window.WhopElements) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdn.whop.com/elements/amber/elements.js";
    s.setAttribute("data-whop-elements", "");
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      whopScript = null;
      reject(new Error("whop_script"));
    };
    document.head.appendChild(s);
  });
  return whopScript;
}

export type CheckoutTarget = { plan: PublicPlan; period: "month" | "year"; upgrade?: boolean };
type Session = { embed: string | null; ref: string; fallback_url: string | null };

/** Opens Whop's embedded checkout in #whop-checkout. Returns a cleanup. */
export function useWhopCheckout(session: Session | null, onPaid: (ref: string) => void) {
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    if (!session) return;
    if (!session.embed) {
      if (session.fallback_url) location.href = session.fallback_url;
      return;
    }
    let ck: WhopCk | null = null;
    let done = false;
    const show = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const t2 = setTimeout(() => {
      if (document.querySelector("#whop-checkout iframe")) show();
    }, 2000);
    const t15 = setTimeout(() => {
      if (!done) {
        if (session.fallback_url) location.href = session.fallback_url;
        else setFailed(true);
      }
    }, 15000);
    loadWhop()
      .then(() => {
        if (!window.WhopElements) throw new Error("no_whop");
        ck = window.WhopElements().checkout.create({
          checkoutConfiguration: session.embed,
          returnUrl: location.origin + "/dashboard?paid=1&ref=" + encodeURIComponent(session.ref),
          appearance: { theme: { appearance: "light" } },
          onLoadingChange: (st: unknown) => {
            const loading = st && typeof st === "object" ? (st as { loading?: boolean }).loading : st;
            if (loading === false) show();
          },
          onComplete: (r: { result?: string } | undefined) => {
            if (r && r.result === "payment") onPaid(session.ref);
          },
        });
        ck.create("checkout").mount("#whop-checkout");
      })
      .catch(() => {
        if (session.fallback_url) location.href = session.fallback_url;
        else setFailed(true);
      });
    return () => {
      clearTimeout(t2);
      clearTimeout(t15);
      try {
        ck?.destroy?.();
      } catch {}
      const host = document.getElementById("whop-checkout");
      if (host) host.innerHTML = "";
    };
    // onPaid is stable enough for one session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  return { ready, failed };
}

export function CheckoutBody({ target, session, onPaid, error }: { target: CheckoutTarget; session: Session | null; onPaid: (ref: string) => void; error?: string | null }) {
  const { ready, failed } = useWhopCheckout(session, onPaid);
  const price = target.period === "year" && target.plan.yearly ? `${money(target.plan.yearly.price_cents)} / year` : `${money(target.plan.price_cents)} / month`;
  return (
    <div className="px-5 pb-6 pt-14 sm:px-7" data-testid="checkout-sheet">
      <p className="label-mono text-fg-muted">[ Secure checkout ]</p>
      <h3 className="mt-1 text-[26px] font-semibold tracking-[-0.03em]">
        {target.plan.name} · {price}
      </h3>
      <div className="relative mt-5 min-h-[420px] rounded-[18px] border border-border bg-white">
        {!ready && !failed && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[14px] text-fg-muted" data-testid="checkout-loading">
            <Loader2 className="h-6 w-6 animate-spin text-tomato" />
            Loading secure checkout…
          </div>
        )}
        {(failed || error) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <Lock className="h-6 w-6 text-fg-muted" />
            <p className="font-semibold">{error || "The secure checkout didn't load."}</p>
            <p className="text-sm text-fg-muted">Your recipe is saved. Close this and try again.</p>
          </div>
        )}
        <div id="whop-checkout" className={cn("min-h-[420px] transition-opacity", ready ? "opacity-100" : "opacity-0")} data-testid="whop-host" />
      </div>
      <p className="mt-4 text-center text-[12px] text-fg-muted">Secure payment by Whop · Cancel in 1 click</p>
    </div>
  );
}

/* ---------------- Unlock film (after paying) ---------------- */

export function UnlockFilm({ open, planName, lines, onDone }: { open: boolean; planName: string; lines: string[]; onDone: () => void }) {
  const reduce = useReducedMotion();
  const [scene, setScene] = React.useState(0);
  React.useEffect(() => {
    if (!open) return;
    // Restart the film each time it opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScene(0);
    const ts = [setTimeout(() => setScene(1), 1600), setTimeout(() => setScene(2), 3600), setTimeout(onDone, 5200)];
    return () => ts.forEach(clearTimeout);
  }, [open, onDone]);
  const icons = lines.slice(0, 3);
  return (
    <AnimatePresence>
      {open && (
        <m.div className="fixed inset-0 z-[90] grid place-items-center overflow-hidden bg-ink text-cream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="unlock-film">
          <div className="dot-grid absolute inset-0" />
          <div className="glow-top absolute inset-0" />
          <button onClick={onDone} aria-label="Skip" className="absolute left-4 top-4 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/10 text-cream hover:bg-white/20">
            ✕
          </button>
          <AnimatePresence mode="wait">
            {scene === 0 && (
              <m.div key="s0" className="relative px-6 text-center" initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                <m.div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-lime text-ink" initial={reduce ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}>
                  <Check className="h-10 w-10" strokeWidth={3} />
                </m.div>
                <p className="label-mono text-cream/60">[ Payment confirmed ]</p>
                <p className="mt-3 font-serif text-[44px] font-semibold leading-none tracking-[-0.04em] sm:text-[64px]">You&apos;re on {planName}</p>
              </m.div>
            )}
            {scene === 1 && (
              <m.div key="s1" className="relative w-full max-w-md px-6" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <p className="text-center label-mono text-cream/60">[ Now unlocked ]</p>
                <div className="mt-5 space-y-3">
                  {icons.map((l, i) => (
                    <m.div key={l} className="flex items-center gap-3 rounded-2xl bg-white/[.07] px-4 py-3.5 text-[16px] font-medium" initial={reduce ? false : { opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * i }}>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-lime text-ink">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                      {l}
                    </m.div>
                  ))}
                </div>
              </m.div>
            )}
            {scene === 2 && (
              <m.div key="s2" className="relative text-center" initial={reduce ? false : { opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <p className="font-serif text-[64px] font-semibold tracking-[-0.04em] sm:text-[88px]">Let&apos;s go.</p>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      )}
    </AnimatePresence>
  );
}
