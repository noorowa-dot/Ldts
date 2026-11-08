"use client";
import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Reset() {
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr("This reset link has expired. Ask for a new one.");
    router.replace("/app");
    router.refresh();
  }
  return (
    <main className="relative grid min-h-[100dvh] place-items-center bg-ink px-4">
      <div className="dot-grid absolute inset-0" />
      <div className="relative w-full max-w-[420px]">
        <Link href="/" className="mx-auto mb-6 block w-fit"><Logo dark /></Link>
        <form onSubmit={submit} className="rounded-[28px] bg-bg p-6 sm:p-8" noValidate>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Set a new password</h1>
          <Input className="mt-6" type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={pw} onChange={(e) => { setPw(e.target.value); setErr(null); }} />
          {err && <p className="mt-1.5 text-sm text-tomato-deep">{err} {err.includes("expired") && <a className="underline" href="/forgot">Get a new link</a>}</p>}
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={busy}>
            {busy && <Loader2 className="h-5 w-5 animate-spin" />} Save my new password
          </Button>
        </form>
      </div>
    </main>
  );
}
