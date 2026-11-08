"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Check } from "lucide-react";
import { TryFirst } from "@/components/funnel/try-first";
import { HeatPicker } from "@/components/funnel/heat-picker";
import type { Heat } from "@/lib/types";
import { DIETS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMe } from "./me-context";
import { PageTitle } from "./app-shell";

export function Fridge() {
  const me = useMe();
  const router = useRouter();
  const allowed = (id: string) => me.quotas.diets === "all" || (me.quotas.diets === "vegetarian" && id === "vegetarian");
  const [diet, setDiet] = React.useState<string[]>(me.diet.filter(allowed));
  const [upsell, setUpsell] = React.useState(false);
  const [heat, setHeat] = React.useState<Heat>(me.heat ?? "medium");
  function pickHeat(h: Heat) {
    setHeat(h);
    fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ heat: h }) }).catch(() => {});
  }

  function toggle(id: string) {
    if (!allowed(id)) return setUpsell(true);
    const next = diet.includes(id) ? diet.filter((d) => d !== id) : [...diet, id];
    setDiet(next);
    fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ diet: next }) }).catch(() => {});
  }

  const left = Math.max(0, me.limit - me.used);
  return (
    <div>
      <PageTitle title="What's in your fridge?" sub={me.tier === "none" ? `${left} recipe preview${left === 1 ? "" : "s"} left today · 1 full recipe free every week` : `${left} of ${me.limit} recipes left this month`} />

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Dietary filters">
        {DIETS.map((d) => {
          const on = diet.includes(d.id);
          const locked = !allowed(d.id);
          return (
            <button key={d.id} type="button" onClick={() => toggle(d.id)} aria-pressed={on} data-testid={`diet-${d.id}`}
              className={cn("inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold transition active:scale-95",
                on ? "border-olive bg-olive text-white" : "border-border bg-surface text-fg hover:bg-surface-2", locked && "text-fg-muted")}>
              {on && <Check className="h-4 w-4" />}
              {locked && <Lock className="h-3.5 w-3.5" />}
              {d.label}
            </button>
          );
        })}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2" data-testid="fridge-heat">
        <span className="text-[13px] font-semibold text-fg-muted">Heat</span>
        <HeatPicker value={heat} onChange={pickHeat} size="sm" />
      </div>
      {upsell && (
        <p className="mb-4 rounded-2xl bg-butter-soft px-4 py-3 text-[14px] text-[#5b430a]">
          {me.tier === "none" ? "Dietary filters come with a plan." : "All 6 dietary filters come with Pro."}{" "}
          <a href="/pricing" className="font-semibold underline">See plans</a>
        </p>
      )}

      <div className="relative overflow-hidden rounded-[28px] bg-ink p-4 sm:p-6">
        <div className="dot-grid absolute inset-0 opacity-60" />
        <div className="relative">
          <TryFirst
            signedIn
            options={{
              diet,
              heat,
              allowList: true,
              inApp: true,
              onResult: (r) => {
                if (r.access.unlocked) router.push(`/r/${r.id}`);
              },
            }}
          />
        </div>
      </div>
      <p className="mt-4 text-center text-[13px] text-fg-muted">Your photos are stored privately and only you can see them. Delete them anytime from Recipes.</p>
    </div>
  );
}
