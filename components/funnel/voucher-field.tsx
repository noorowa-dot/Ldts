"use client";
import * as React from "react";
import { Check, Loader2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export type VoucherOk = { ok: true; tier: "starter" | "pro" | "chef"; label: string; until: string | null; unlock: string[] };

const COOKIE = "pp_voucher";

export function pendingVoucher(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )pp_voucher=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "";
}

function setPending(code: string) {
  const v = code.trim().toUpperCase();
  document.cookie = v ? `${COOKIE}=${encodeURIComponent(v)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax` : `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * "Have a voucher code?"
 * - mode "pending": before an account exists (sign-up / log-in). The code is kept and redeemed right after the account is created.
 * - mode "apply": signed in (paywall, upgrade, pricing). Redeems now; free access means no card.
 */
export function VoucherField({ mode, onApplied, className, dark = false }: { mode: "pending" | "apply"; onApplied?: (r: VoucherOk) => void; className?: string; dark?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    // A creator's voucher link (?voucher=CODE) is waiting: show it filled in.
    const p = pendingVoucher();
    if (p) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCode(p);
      setOpen(true);
    }
  }, []);

  async function apply(e?: React.FormEvent) {
    e?.preventDefault();
    if (mode === "pending") return;
    if (code.trim().length < 3) return setMsg({ ok: false, text: "Type the full code." });
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/voucher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: d.message || "That code doesn't match a voucher." });
    setPending("");
    setMsg({ ok: true, text: `Voucher applied: you're on ${d.label}. No card needed.` });
    onApplied?.(d as VoucherOk);
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-semibold underline-offset-4 hover:underline", dark ? "text-cream/80" : "text-fg-muted hover:text-fg", className)}
        data-testid="voucher-open"
      >
        <Ticket className="h-4 w-4" /> Have a voucher code?
      </button>
    );

  return (
    <div className={cn("w-full", className)} data-testid="voucher-field">
      <label htmlFor={`voucher-${mode}`} className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold">
        <Ticket className="h-4 w-4" /> Voucher code
        {mode === "pending" && <span className="font-normal text-fg-muted">(optional)</span>}
      </label>
      {mode === "pending" ? (
        <input
          id="voucher-pending"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setPending(e.target.value);
          }}
          placeholder="Your code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          className="h-12 w-full rounded-2xl border border-border bg-surface px-4 font-mono text-[16px] uppercase tracking-wider text-fg outline-none placeholder:normal-case placeholder:tracking-normal focus:border-tomato"
          data-testid="voucher-pending-input"
        />
      ) : (
        <form onSubmit={apply} className="flex gap-2">
          <input
            id="voucher-apply"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Your code"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={64}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 font-mono text-[16px] uppercase tracking-wider text-fg outline-none placeholder:normal-case placeholder:tracking-normal focus:border-tomato"
            data-testid="voucher-apply-input"
          />
          <button type="submit" disabled={busy || msg?.ok} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-ink px-5 font-semibold text-cream disabled:opacity-60 dark:bg-cream dark:text-ink" data-testid="voucher-apply">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : msg?.ok ? <Check className="h-4 w-4" /> : null} Apply
          </button>
        </form>
      )}
      {msg && (
        <p className={cn("mt-1.5 text-[13px]", msg.ok ? "flex items-center gap-1.5 font-semibold text-olive" : "text-tomato-deep")} data-testid="voucher-field-msg">
          {msg.ok && <Check className="h-4 w-4" />} {msg.text}
        </p>
      )}
    </div>
  );
}
