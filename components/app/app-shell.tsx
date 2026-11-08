"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { Bookmark, CalendarDays, CookingPot, Refrigerator, Settings, ShoppingCart, UserRound } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { useMe } from "./me-context";
import { ThemeSync } from "./theme";
import { VoucherWelcome } from "./voucher-welcome";

const NAV = [
  { href: "/app", label: "Fridge", icon: Refrigerator, phone: true },
  { href: "/app/plan", label: "Plan", icon: CalendarDays, phone: true },
  { href: "/app/shop", label: "Shop", icon: ShoppingCart, phone: true },
  { href: "/app/recipes", label: "Recipes", icon: CookingPot, phone: true },
  { href: "/app/saved", label: "Saved", icon: Bookmark, phone: false },
  { href: "/app/settings", label: "Settings", icon: Settings, phone: false },
  { href: "/app/account", label: "Account", icon: UserRound, phone: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const me = useMe();
  const active = (href: string) =>
    (href === "/app" ? path === "/app" : path.startsWith(href)) || (href === "/app/recipes" && (path.startsWith("/r/") || path.startsWith("/app/saved")));
  const activeDesk = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href)) || (href === "/app/recipes" && path.startsWith("/r/"));
  const pct = me.limit ? Math.min(100, (me.used / me.limit) * 100) : 0;
  return (
    <div className="min-h-[100dvh] bg-bg text-fg">
      <ThemeSync />
      <VoucherWelcome />
      {/* Sidebar (computer) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <a href="/app" className="px-2"><Logo /></a>
        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold transition", activeDesk(n.href) ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface-2/70 hover:text-fg")}>
              <n.icon className={cn("h-5 w-5", activeDesk(n.href) && "text-tomato")} />
              {n.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-border bg-bg p-4">
          <p className="text-[13px] font-semibold">{me.planName ? `${me.planName} plan` : "Free"}</p>
          <p className="mt-0.5 text-[12px] text-fg-muted">
            {me.used} of {me.limit} {me.tier === "none" ? "previews today" : "recipes this month"}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-olive" style={{ width: `${pct}%` }} />
          </div>
          {me.tier !== "chef" && (
            <a href="/pricing" className="mt-3 block text-[13px] font-semibold text-tomato hover:underline">{me.tier === "none" ? "See plans" : "Get more recipes"}</a>
          )}
        </div>
      </aside>

      {/* Top bar (phone) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur md:hidden">
        <a href="/app"><Logo /></a>
        <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-[11px] text-fg-muted">
          {me.used}/{me.limit} {me.tier === "none" ? "today" : "this month"}
        </span>
      </header>

      <main className="pb-28 md:pb-12 md:pl-[248px]">
        <div className="mx-auto max-w-[920px] px-4 pt-5 sm:px-8 sm:pt-10">{children}</div>
      </main>

      {/* Bottom tabs (phone) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.filter((n) => n.phone).map((n) => (
          <a key={n.href} href={n.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", active(n.href) ? "text-tomato" : "text-fg-muted")}>
            <n.icon className="h-5.5 w-5.5" />
            {n.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">{title}</h1>
        {sub && <p className="mt-1.5 text-[15px] text-fg-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
