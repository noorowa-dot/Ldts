"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div>
        <h1 className="font-serif text-[32px] font-semibold tracking-[-0.03em]">Something went wrong on our side.</h1>
        <p className="mt-2 text-fg-muted">Your recipes are safe. Please try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="h-12 cursor-pointer rounded-full bg-tomato px-6 font-semibold text-white">Try again</button>
          <Link href="/" className="inline-flex h-12 items-center rounded-full border border-border px-6 font-semibold">Home</Link>
        </div>
      </div>
    </main>
  );
}
