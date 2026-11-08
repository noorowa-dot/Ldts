"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { CheckoutBody, PaywallContent, UnlockFilm, usePlans, type CheckoutTarget, type PublicPlan } from "@/components/funnel/paywall";
import { event } from "@/components/funnel/unlock-flow";

/** /pricing: the same paywall, as a page (checkout pages send people back here when they cancel). */
export function PricingClient() {
  const plans = usePlans();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<CheckoutTarget | null>(null);
  const [session, setSession] = React.useState<{ embed: string | null; ref: string; fallback_url: string | null } | null>(null);
  const [film, setFilm] = React.useState<{ name: string; lines: string[] } | null>(null);

  React.useEffect(() => event("paywall_view", "pricing_page"), []);

  async function go(plan: PublicPlan, period: "month" | "year") {
    setBusy(true);
    setNotice(null);
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: plan.id, period }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.status === 409 && d.error === "payments_off") return setNotice("Payments open in a moment. Your recipes are saved.");
    if (!r.ok) return setNotice(d.message || "We couldn't open the secure checkout. Please try again.");
    if (!d.embed) {
      if (d.fallback_url) location.href = d.fallback_url;
      return;
    }
    setTarget({ plan, period });
    setSession(d);
  }

  async function paid(ref: string) {
    setSession(null);
    setTarget(null);
    const r = await fetch("/api/checkout/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref }) });
    const d = await r.json().catch(() => ({}));
    if (d.paid) setFilm({ name: d.plan?.name ?? "your plan", lines: d.unlock ?? [] });
    else setNotice("We're still confirming your payment. Refresh in a moment.");
  }

  return (
    <main className="min-h-[100dvh] bg-bg">
      <div className="mx-auto max-w-[600px]">
        <a href="/app" className="inline-flex items-center gap-1.5 px-5 pt-5 text-[14px] font-semibold text-fg-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Back to my kitchen
        </a>
        <PaywallContent
          plans={plans}
          title="Cook every night with Platepal."
          personal="Every amount, every step, from what's already in your fridge."
          onContinue={go}
          busy={busy}
          notice={notice}
          onVoucher={(r) => setFilm({ name: r.label, lines: r.unlock })}
          tableOpen
        />
      </div>
      <Sheet open={!!target} onClose={() => { setTarget(null); setSession(null); }} label="Secure checkout" testId="checkout" width={520}>
        {target && <CheckoutBody target={target} session={session} onPaid={paid} />}
      </Sheet>
      <UnlockFilm open={!!film} planName={film?.name ?? ""} lines={film?.lines ?? []} onDone={() => { setFilm(null); router.push("/app"); router.refresh(); }} />
    </main>
  );
}
