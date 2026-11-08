"use client";
import Link from "next/link";
import * as React from "react";
import { Loader2, MailCheck } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Forgot() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "busy" | "sent" | "error">("idle");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState("error");
    setState("busy");
    await supabaseBrowser().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/reset` });
    setState("sent");
  }
  return (
    <main className="relative grid min-h-[100dvh] place-items-center bg-ink px-4">
      <div className="dot-grid absolute inset-0" />
      <div className="relative w-full max-w-[420px]">
        <Link href="/" className="mx-auto mb-6 block w-fit"><Logo dark /></Link>
        <div className="rounded-[28px] bg-bg p-6 sm:p-8">
          {state === "sent" ? (
            <div className="text-center">
              <MailCheck className="mx-auto h-10 w-10 text-olive" />
              <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.03em]">Check your inbox</h1>
              <p className="mt-2 text-fg-muted">If {email} has an account, a link to reset your password is on its way.</p>
              <a href="/login" className="mt-6 inline-block font-semibold underline">Back to log in</a>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Forgot your password?</h1>
              <p className="mt-2 text-fg-muted">Enter your email. We&apos;ll send you a link to set a new one.</p>
              <Input className="mt-6" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setState("idle"); }} />
              {state === "error" && <p className="mt-1.5 text-sm text-tomato-deep">That email doesn&apos;t look right.</p>}
              <Button type="submit" size="lg" className="mt-4 w-full" disabled={state === "busy"}>
                {state === "busy" && <Loader2 className="h-5 w-5 animate-spin" />} Send me a link
              </Button>
              <a href="/login" className="mt-4 block text-center text-sm font-semibold text-fg-muted hover:text-fg">Back to log in</a>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
