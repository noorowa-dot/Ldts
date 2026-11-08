"use client";
import * as React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { GoogleButton } from "@/components/ui/google-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VoucherField, type VoucherOk } from "./voucher-field";

const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "1";

type Props = {
  initialMode?: "signup" | "login";
  /** Where Google sends the person back (path + query). */
  next: string;
  /** Called once a session exists (email/password). */
  onDone: (claim: { claimed?: number; latest?: string | null; voucher?: VoucherOk | { ok: false; message: string } | null }) => void | Promise<void>;
  submitLabel?: string;
};

function friendly(msg: string, mode: "signup" | "login") {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already exists"))
    return { field: "email" as const, text: "This email already has an account. Log in?" , switchTo: "login" as const };
  if (m.includes("invalid login") || m.includes("invalid credentials")) return { field: "password" as const, text: "That email and password don't match. Try again or reset your password." };
  if (m.includes("password") && (m.includes("short") || m.includes("at least") || m.includes("weak"))) return { field: "password" as const, text: "Use at least 8 characters." };
  if (m.includes("email") && m.includes("invalid")) return { field: "email" as const, text: "That email doesn't look right." };
  if (m.includes("rate") || m.includes("too many")) return { field: "form" as const, text: "Too many tries. Wait a minute, then try again." };
  if (m.includes("not confirmed")) return { field: "form" as const, text: "Please confirm your email first, then log in." };
  return { field: "form" as const, text: mode === "signup" ? "We couldn't create your account. Please try again." : "We couldn't log you in. Please try again." };
}

export function AuthForm({ initialMode = "signup", next, onDone, submitLabel }: Props) {
  const [mode, setMode] = React.useState<"signup" | "login">(initialMode);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [gBusy, setGBusy] = React.useState(false);
  const [error, setError] = React.useState<{ field: "email" | "password" | "form"; text: string; switchTo?: "login" } | null>(null);

  async function google() {
    setGBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setGBusy(false);
      setError({ field: "form", text: "Google sign-in isn't available right now. Use your email below." });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError({ field: "email", text: "That email doesn't look right." });
    if (password.length < 8) return setError({ field: "password", text: "Use at least 8 characters." });
    setBusy(true);
    const sb = supabaseBrowser();
    const res =
      mode === "signup"
        ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } })
        : await sb.auth.signInWithPassword({ email, password });
    if (res.error) {
      setBusy(false);
      return setError(friendly(res.error.message, mode));
    }
    if (mode === "signup" && res.data.user && (res.data.user.identities?.length ?? 1) === 0) {
      setBusy(false);
      return setError({ field: "email", text: "This email already has an account. Log in?", switchTo: "login" });
    }
    if (!res.data.session) {
      setBusy(false);
      return setError({ field: "form", text: "Check your inbox to confirm your email, then log in." });
    }
    const claim = await fetch("/api/claim", { method: "POST" })
      .then((r) => r.json())
      .catch(() => ({}));
    await onDone(claim);
    setBusy(false);
  }

  return (
    <div className="w-full">
      {GOOGLE && (
        <>
          <GoogleButton onClick={google} loading={gBusy} />
          <div className="my-5 flex items-center gap-3 text-xs text-fg-muted">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div>
          <label htmlFor="email" className="sr-only">Email</label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={error?.field === "email"} data-testid="email" />
          {error?.field === "email" && (
            <p className="mt-1.5 text-sm text-tomato-deep">
              {error.text}{" "}
              {error.switchTo && (
                <button type="button" className="cursor-pointer font-semibold underline" onClick={() => { setMode("login"); setError(null); }}>
                  Log in
                </button>
              )}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="sr-only">Password</label>
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "Password (8+ characters)" : "Your password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" aria-invalid={error?.field === "password"} data-testid="password" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2">
              {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
          {error?.field === "password" && <p className="mt-1.5 text-sm text-tomato-deep">{error.text}</p>}
        </div>
        {error?.field === "form" && <p className="text-sm text-tomato-deep">{error.text}</p>}
        <div className="py-1">
          <VoucherField mode="pending" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy} data-testid="auth-submit">
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {submitLabel ?? (mode === "signup" ? "Create my free account" : "Log in")}
        </Button>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-fg-muted">
        {mode === "signup" ? (
          <span>
            Already have an account?{" "}
            <button type="button" className="cursor-pointer font-semibold text-fg underline-offset-2 hover:underline" onClick={() => { setMode("login"); setError(null); }} data-testid="switch-login">
              Log in
            </button>
          </span>
        ) : (
          <span>
            New here?{" "}
            <button type="button" className="cursor-pointer font-semibold text-fg underline-offset-2 hover:underline" onClick={() => { setMode("signup"); setError(null); }}>
              Create an account
            </button>
          </span>
        )}
        {mode === "login" && (
          <a href="/forgot" className="font-semibold text-fg underline-offset-2 hover:underline">
            Forgot password?
          </a>
        )}
      </div>
      <p className="mt-5 text-center text-xs text-fg-muted">
        By continuing you agree to our <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
