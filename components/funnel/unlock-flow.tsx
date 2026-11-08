"use client";
import * as React from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { LogoMark } from "@/components/ui/logo";
import dynamic from "next/dynamic";
import type { CheckoutTarget, PublicPlan } from "./paywall";
import { usePlans } from "./plans";

// Loaded on first use, so the landing page stays light (Supabase auth, Whop and the film are not needed to see a recipe).
const AuthForm = dynamic(() => import("./auth-form").then((m) => m.AuthForm), { ssr: false, loading: () => <div className="skeleton h-56 w-full" /> });
const PaywallContent = dynamic(() => import("./paywall").then((m) => m.PaywallContent), { ssr: false, loading: () => <div className="space-y-3 px-5 pt-16"><div className="skeleton h-8 w-3/4" /><div className="skeleton h-20 w-full" /><div className="skeleton h-20 w-full" /></div> });
const CheckoutBody = dynamic(() => import("./paywall").then((m) => m.CheckoutBody), { ssr: false });
const UnlockFilm = dynamic(() => import("./paywall").then((m) => m.UnlockFilm), { ssr: false });

/** Warm the funnel code as soon as a recipe is on screen. */
export function preloadFunnel() {
  import("./auth-form");
  import("./paywall");
}
import type { RecipeView } from "@/lib/types";
import type { UpgradeFeature } from "./recipe-card";
import { listNice } from "@/lib/utils";

type Tier = "none" | "starter" | "pro" | "chef";
type Step = null | "signup" | "paywall" | "checkout" | "upgrade";

type Ctx = {
  openUnlock: () => void;
  openUpgrade: (f: UpgradeFeature) => void;
  plans: PublicPlan[] | null;
};
const UnlockCtx = React.createContext<Ctx | null>(null);
export const useUnlock = () => {
  const c = React.useContext(UnlockCtx);
  if (!c) throw new Error("useUnlock outside UnlockProvider");
  return c;
};

export function event(type: "paywall_view" | "feature_used" | "aha", detail?: string) {
  fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, detail }), keepalive: true }).catch(() => {});
}

const ADDS: Record<UpgradeFeature, string> = {
  shopping: "Shopping Saver: the tiny list of what's missing",
  macros: "Macros per serving and the chef's tip on every dish",
  remix: "Remix: same fridge, a brand-new dish",
  saved: "More saved recipes",
  quota: "More recipes every month",
  diet: "All 6 dietary filters",
};

type Props = {
  children: React.ReactNode;
  recipe: RecipeView | null;
  signedIn: boolean;
  tier: Tier;
  currentPlanId?: number | null;
  /** After sign-up/log-in inside the sheet (claim is already done). */
  onAuthed?: () => Promise<void> | void;
  /** After a confirmed payment: refetch the recipe so it unblurs. */
  onUnlocked?: (info: { planName: string; tier: Tier }) => Promise<void> | void;
  /** Path Google should come back to. */
  returnPath: string;
};

export function UnlockProvider({ children, recipe, signedIn, tier, currentPlanId, onAuthed, onUnlocked, returnPath }: Props) {
  const plans = usePlans();
  const [step, setStep] = React.useState<Step>(null);
  const [target, setTarget] = React.useState<CheckoutTarget | null>(null);
  const [session, setSession] = React.useState<{ embed: string | null; ref: string; fallback_url: string | null } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [film, setFilm] = React.useState<{ planName: string; lines: string[] } | null>(null);
  const [upFeature, setUpFeature] = React.useState<UpgradeFeature>("quota");
  const paywallScroll = React.useRef<HTMLDivElement>(null);
  const [authedHere, setAuthedHere] = React.useState(false);
  const isSignedIn = signedIn || authedHere;

  const openPaywall = React.useCallback(() => {
    setNotice(null);
    setStep("paywall");
    event("paywall_view");
  }, []);

  const openUnlock = React.useCallback(() => {
    if (!isSignedIn) setStep("signup");
    else openPaywall();
  }, [isSignedIn, openPaywall]);

  const sortedPlans = React.useMemo(() => [...(plans ?? [])].sort((a, b) => a.price_cents - b.price_cents), [plans]);
  const nextPlan = React.useMemo(() => {
    if (!sortedPlans.length) return null;
    const order: Tier[] = ["none", "starter", "pro", "chef"];
    const need: Record<UpgradeFeature, Tier> = { shopping: "pro", macros: "chef", remix: "pro", saved: "pro", quota: "pro", diet: "pro" };
    const minTier = order.indexOf(need[upFeature]);
    const cur = order.indexOf(tier);
    return sortedPlans.find((p) => order.indexOf(p.tier) > cur && order.indexOf(p.tier) >= Math.min(minTier, 3)) ?? sortedPlans.find((p) => order.indexOf(p.tier) > cur) ?? null;
  }, [sortedPlans, tier, upFeature]);

  const openUpgrade = React.useCallback(
    (f: UpgradeFeature) => {
      setUpFeature(f);
      if (tier === "none") return openUnlock();
      setStep("upgrade");
      event("paywall_view", "upgrade_" + f);
    },
    [tier, openUnlock]
  );

  async function startCheckout(plan: PublicPlan, period: "month" | "year", upgrade = false) {
    setBusy(true);
    setNotice(null);
    setCheckoutError(null);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: plan.id, period, upgrade }) });
      const d = await r.json();
      if (r.status === 409 && d.error === "payments_off") {
        setNotice("Payments open in a moment. Your recipe is saved.");
        return;
      }
      if (r.status === 401) {
        setStep("signup");
        return;
      }
      if (!r.ok) {
        setNotice(d.message || "We couldn't open the secure checkout. Please try again.");
        return;
      }
      if (!d.embed) {
        if (d.fallback_url) location.href = d.fallback_url;
        return;
      }
      setTarget({ plan, period, upgrade });
      setSession({ embed: d.embed, ref: d.ref, fallback_url: d.fallback_url });
      setStep("checkout");
    } catch {
      setNotice("You seem to be offline. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const confirm = React.useCallback(
    async (ref: string) => {
      setStep(null);
      setSession(null);
      try {
        const r = await fetch("/api/checkout/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref }) });
        const d = await r.json();
        if (d.paid) {
          setFilm({ planName: d.plan?.name ?? target?.plan.name ?? "your plan", lines: d.unlock ?? [] });
          await onUnlocked?.({ planName: d.plan?.name ?? "", tier: d.tier });
        } else {
          setNotice("We're still confirming your payment. It can take a few seconds: refresh in a moment.");
          setStep("paywall");
        }
      } catch {
        setNotice("We couldn't confirm the payment yet. Refresh in a moment: it's safe.");
        setStep("paywall");
      }
    },
    [onUnlocked, target]
  );

  const title = recipe ? (
    <>Your {recipe.title} is ready.</>
  ) : (
    <>Your recipe is ready.</>
  );
  const personal = recipe
    ? `Made from your ${listNice(recipe.uses.length ? recipe.uses : recipe.found.map((f) => f.name))}, in ${recipe.time_minutes} minutes. Pick a plan to cook it tonight.`
    : "Pick a plan to see every amount and every step.";

  return (
    <UnlockCtx.Provider value={{ openUnlock, openUpgrade, plans }}>
      {children}

      {/* 1. Sign-up sheet */}
      <Sheet open={step === "signup"} onClose={() => setStep(null)} mode="bottom" label="Save your recipe" testId="signup-sheet" width={460}>
        <div className="px-6 pb-8 pt-14 sm:px-8">
          <LogoMark className="h-9 w-9" />
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.03em]">Save your recipe</h2>
          <p className="mt-2 text-[15px] text-fg-muted">
            {recipe ? <>Your <b className="text-fg">{recipe.title}</b> is waiting. Create a free account to keep it.</> : "It's waiting for you. Create a free account to keep it."}
          </p>
          <div className="mt-6">
            <AuthForm
              next={returnPath}
              onDone={async () => {
                setAuthedHere(true);
                await onAuthed?.();
                openPaywall();
              }}
            />
          </div>
        </div>
      </Sheet>

      {/* 2. Paywall sheet over the recipe */}
      <Sheet open={step === "paywall"} onClose={() => setStep(null)} mode="full" label="Choose your plan" testId="paywall-sheet" scrollRef={paywallScroll}>
        <PaywallContent plans={plans} title={title} personal={personal} onContinue={(p, per) => startCheckout(p, per)} busy={busy} notice={notice} scrollRoot={paywallScroll} />
      </Sheet>

      {/* 3. Checkout sheet over the paywall */}
      <Sheet
        open={step === "checkout" && !!target}
        onClose={() => {
          setSession(null);
          setStep(target?.upgrade ? "upgrade" : "paywall");
        }}
        mode="bottom"
        label="Secure checkout"
        z={70}
        testId="checkout"
        width={520}
      >
        {target && <CheckoutBody target={target} session={session} onPaid={confirm} error={checkoutError} />}
      </Sheet>

      {/* Upgrade sheet: the next plan only */}
      <Sheet open={step === "upgrade"} onClose={() => setStep(null)} mode="bottom" label="Upgrade" testId="upgrade-sheet" width={460}>
        <div className="px-6 pb-8 pt-14">
          {nextPlan ? (
            <>
              <p className="label-mono text-olive">[ Unlock with {nextPlan.name} ]</p>
              <h2 className="mt-2 text-[28px] font-semibold leading-[1.06] tracking-[-0.03em]">
                {upFeature === "quota" ? "You cooked through your plan this month." : `${ADDS[upFeature].split(":")[0]} comes with ${nextPlan.name}.`}
              </h2>
              <ul className="mt-5 space-y-2.5">
                {[ADDS[upFeature], ...nextPlan.unlock.filter((l) => !l.toLowerCase().includes(ADDS[upFeature].split(" ")[0].toLowerCase()))].slice(0, 3).map((l) => (
                  <li key={l} className="flex gap-2.5 text-[15px]">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-olive text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {l}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-baseline justify-between rounded-2xl bg-surface-2 px-4 py-3">
                <span className="font-semibold">{nextPlan.name}</span>
                <span>
                  <b className="font-serif text-2xl">{nextPlan.per_day.replace(/\s*\/\s*day/i, "")}</b> <span className="text-sm text-fg-muted">/ day</span>
                </span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => startCheckout(nextPlan, "month", true)}
                data-testid="upgrade-continue"
                className="mt-5 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-tomato text-[16px] font-semibold text-white active:scale-[0.97] disabled:opacity-60"
              >
                Continue with {nextPlan.name} <ArrowRight className="h-5 w-5" />
              </button>
              <p className="mt-2 text-center text-[12px] text-fg-muted">Your current plan stops at the end of its period. Never billed twice.</p>
              {notice && <p className="mt-3 rounded-xl bg-butter-soft px-4 py-3 text-center text-[14px] text-[#5b430a]">{notice}</p>}
            </>
          ) : (
            <div className="py-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-olive" />
              <p className="mt-3 font-serif text-2xl font-semibold">You&apos;re on our biggest plan.</p>
              <p className="mt-2 text-fg-muted">Your recipes refill at the start of your next billing period.</p>
            </div>
          )}
        </div>
      </Sheet>

      <UnlockFilm
        open={!!film}
        planName={film?.planName ?? ""}
        lines={film?.lines.length ? film.lines : ["Every amount, every step", "Save your favorites", "Snap your next fridge"]}
        onDone={() => setFilm(null)}
      />
      {/* hidden: current plan id is only used to exclude it from upgrades */}
      <span hidden data-plan={currentPlanId ?? ""} />
    </UnlockCtx.Provider>
  );
}
