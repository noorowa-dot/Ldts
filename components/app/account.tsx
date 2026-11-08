"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, LogOut, Trash2, ExternalLink, Loader2, Ticket, Check } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useMe } from "./me-context";
import { PageTitle } from "./app-shell";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-[14px] text-fg-muted">{k}</span>
      <span className="text-right text-[15px] font-semibold">{v}</span>
    </div>
  );
}

export function AccountPage() {
  const me = useMe();
  const router = useRouter();
  const [cancelStep, setCancelStep] = React.useState<0 | 1 | 2>(0);
  const [cancelMsg, setCancelMsg] = React.useState<{ message: string; manage_url?: string } | null>(null);
  const [delStep, setDelStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  async function cancel() {
    setBusy(true);
    const r = await fetch("/api/billing/cancel", { method: "POST" });
    const d = await r.json().catch(() => ({ message: "Please try again in a minute." }));
    setBusy(false);
    setCancelMsg(d);
    setCancelStep(2);
  }
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/");
    router.refresh();
  }
  async function del() {
    setBusy(true);
    const r = await fetch("/api/account/delete", { method: "POST" });
    if (r.ok) {
      await supabaseBrowser().auth.signOut();
      router.replace("/");
      router.refresh();
    } else {
      setBusy(false);
      alert("We couldn't delete your account. Please try again.");
    }
  }

  const renew = me.until ? new Date(me.until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
  return (
    <div className="space-y-4">
      <PageTitle title="Account" />
      <section className="recipe-card p-5 sm:p-6">
        <h2 className="font-sans text-[17px] font-semibold tracking-normal">Profile</h2>
        <div className="mt-2">
          <Row k="Email" v={<span data-testid="account-email">{me.email}</span>} />
          <Row k="Language" v="English (US)" />
        </div>
        <a href="/app/settings" className="mt-3 inline-flex h-10 items-center rounded-full border border-border px-4 text-[14px] font-semibold md:hidden">Diet, calories & appearance</a>
      </section>

      <section className="recipe-card p-5 sm:p-6" id="billing">
        <h2 className="flex items-center gap-2 font-sans text-[17px] font-semibold tracking-normal"><CreditCard className="h-5 w-5" /> Plan & billing</h2>
        <div className="mt-2">
          <Row k="Current plan" v={me.planName ?? "Free"} />
          {me.planName && !me.voucher && <Row k={me.status === "canceled" || me.status === "canceling" ? "Ends on" : "Renews on"} v={renew ?? "Each month"} />}
          {me.voucher && <Row k="Billing" v="Free access with a voucher" />}
          <Row k={me.tier === "none" ? "Recipes today" : "Recipes this month"} v={`${me.used} of ${me.limit}`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!me.voucher && (
            <a href="/pricing" className="inline-flex h-11 items-center rounded-full bg-tomato px-5 font-semibold text-white active:scale-95" data-testid="change-plan">
              {me.planName ? "Change plan" : "See plans"}
            </a>
          )}
          {me.planName && !me.voucher && cancelStep === 0 && (
            <button onClick={() => setCancelStep(1)} className="h-11 cursor-pointer rounded-full border border-border px-5 font-semibold" data-testid="cancel-sub">
              Cancel my subscription
            </button>
          )}
        </div>
        {cancelStep === 1 && (
          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <p className="font-semibold">Cancel {me.planName}?</p>
            <p className="mt-1 text-[14px] text-fg-muted">You keep your plan until the end of the period you paid for{renew ? ` (${renew})` : ""}. Your recipes stay saved.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setCancelStep(0)} className="h-10 cursor-pointer rounded-full border border-border px-4 font-semibold">Keep my plan</button>
              <button onClick={cancel} disabled={busy} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 font-semibold text-cream dark:bg-cream dark:text-ink" data-testid="cancel-confirm">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Yes, cancel
              </button>
            </div>
          </div>
        )}
        {cancelStep === 2 && cancelMsg && (
          <div className="mt-4 rounded-2xl bg-olive-soft p-4 text-[14px] text-olive">
            {cancelMsg.message}
            {cancelMsg.manage_url && (
              <a href={cancelMsg.manage_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 font-semibold underline">
                Manage my subscription <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </section>

      <VoucherBox />

      <section className="recipe-card p-5 sm:p-6">
        <button onClick={signOut} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-5 font-semibold" data-testid="sign-out">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </section>

      <section className="recipe-card p-5 sm:p-6">
        <h2 className="font-sans text-[17px] font-semibold tracking-normal text-tomato-deep">Delete my account</h2>
        <p className="mt-1 text-[14px] text-fg-muted">Deletes your account, every recipe and every fridge photo. If you have a plan, it is canceled too.</p>
        {delStep === 0 ? (
          <button onClick={() => setDelStep(1)} className="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-tomato/40 px-5 font-semibold text-tomato-deep">
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setDelStep(0)} className="h-11 cursor-pointer rounded-full border border-border px-5 font-semibold">Keep my account</button>
            <button onClick={del} disabled={busy} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-tomato px-5 font-semibold text-white">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Yes, delete everything
            </button>
          </div>
        )}
      </section>
      <p className="text-center text-[13px] text-fg-muted">
        <a href="/terms" className="underline">Terms</a> · <a href="/privacy" className="underline">Privacy</a>
      </p>
    </div>
  );
}

function VoucherBox() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 6) return setMsg({ ok: false, text: "Type the full code." });
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/voucher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: d.message || "That code doesn't match a voucher." });
    setCode("");
    setMsg({ ok: true, text: `Done: you're on ${d.label}${d.until ? ` until ${new Date(d.until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}.` });
    router.refresh();
  }
  return (
    <section className="recipe-card p-5 sm:p-6" id="voucher">
      <h2 className="flex items-center gap-2 font-sans text-[17px] font-semibold tracking-normal">
        <Ticket className="h-5 w-5" /> Have a voucher?
      </h2>
      <form onSubmit={redeem} className="mt-3 flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="PP-XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          aria-label="Voucher code"
          className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 font-mono text-[15px] uppercase tracking-wider outline-none focus:border-tomato"
          data-testid="voucher-input"
        />
        <button type="submit" disabled={busy} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 font-semibold text-cream disabled:opacity-60 dark:bg-cream dark:text-ink" data-testid="voucher-redeem">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Redeem
        </button>
      </form>
      {msg && (
        <p className={msg.ok ? "mt-3 flex items-center gap-2 rounded-xl bg-olive-soft px-3 py-2.5 text-[14px] font-semibold text-olive" : "mt-2 text-[14px] text-tomato-deep"} data-testid="voucher-msg">
          {msg.ok && <Check className="h-4 w-4" />} {msg.text}
        </p>
      )}
    </section>
  );
}
