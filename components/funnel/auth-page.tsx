"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { AuthForm } from "./auth-form";

export function AuthPage({ mode, next, notice }: { mode: "signup" | "login"; next: string; notice?: string | null }) {
  const router = useRouter();
  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-ink px-4 py-10">
      <div className="dot-grid absolute inset-0" />
      <div className="glow-top absolute inset-0" />
      <div className="relative w-full max-w-[440px]">
        <Link href="/" className="mx-auto mb-6 block w-fit" aria-label="Platepal home">
          <Logo dark />
        </Link>
        <div className="rounded-[28px] bg-bg p-6 text-fg shadow-[var(--shadow-lift)] sm:p-8">
          <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.03em]">
            {mode === "signup" ? "Sign up so Platepal can make your recipe" : "Welcome back"}
          </h1>
          <p className="mt-2 text-[15px] text-fg-muted">
            {mode === "signup" ? "Free to start. Your recipes are saved to your account." : "Log in to see your recipes and your fridge."}
          </p>
          {notice && <p className="mt-4 rounded-xl bg-butter-soft px-4 py-3 text-[14px] text-[#5b430a]">{notice}</p>}
          <div className="mt-6">
            <AuthForm
              initialMode={mode}
              next={next}
              onDone={async (r) => {
                const v = r?.voucher?.ok ? "voucher=1" : "";
                const withV = (u: string) => (v ? u + (u.includes("?") ? "&" : "?") + v : u);
                if (next === "/app" && r?.latest && r?.claimed) router.replace(withV(`/r/${r.latest}?unlock=1`));
                else if (v) router.replace(withV(next));
                else router.replace(next);
                router.refresh();
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
