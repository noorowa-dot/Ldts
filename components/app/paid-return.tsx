"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { UnlockFilm } from "@/components/funnel/paywall";

export function PaidReturn({ refId }: { refId: string }) {
  const router = useRouter();
  const [film, setFilm] = React.useState<{ name: string; lines: string[] } | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    fetch("/api/checkout/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: refId }) })
      .then((r) => r.json())
      .then((d) => (d.paid ? setFilm({ name: d.plan?.name ?? "your plan", lines: d.unlock ?? [] }) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [refId]);
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-ink px-6 text-center text-cream">
      {!failed ? (
        <p className="flex items-center gap-2 text-cream/70"><Loader2 className="h-5 w-5 animate-spin" /> Confirming your payment…</p>
      ) : (
        <div>
          <p className="font-serif text-[28px] font-semibold">We&apos;re still confirming your payment.</p>
          <p className="mt-2 text-cream/65">It can take a few seconds. This page is safe to refresh.</p>
          <button onClick={() => location.reload()} className="mt-6 h-12 cursor-pointer rounded-full bg-tomato px-6 font-semibold text-white">Check again</button>
        </div>
      )}
      <UnlockFilm open={!!film} planName={film?.name ?? ""} lines={film?.lines ?? []} onDone={() => { router.replace("/app"); router.refresh(); }} />
    </main>
  );
}
