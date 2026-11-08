"use client";
import * as React from "react";
import { Check, Lock, Monitor, Moon, Sun, Smartphone } from "lucide-react";
import { DIETS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMe } from "./me-context";
import { PageTitle } from "./app-shell";
import { getTheme, setTheme, type ThemePref } from "./theme";
import { Toast, useToast } from "./recipe-detail";

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="recipe-card p-5 sm:p-6">
      <h2 className="font-sans text-[17px] font-semibold tracking-normal">{title}</h2>
      {sub && <p className="mt-0.5 text-[14px] text-fg-muted">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const me = useMe();
  const { toast, show } = useToast();
  const allowed = (id: string) => me.quotas.diets === "all" || (me.quotas.diets === "vegetarian" && id === "vegetarian");
  const [diet, setDiet] = React.useState<string[]>(me.diet);
  const [cal, setCal] = React.useState<string>(me.calorieTarget ? String(me.calorieTarget) : "");
  const [theme, setT] = React.useState<ThemePref>("system");
  // Reads the saved theme from this browser after mount (not available on the server).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setT(getTheme()), []);

  async function save(body: Record<string, unknown>, msg: string) {
    const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    show(r.ok ? msg : "Couldn't save. Try again.");
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Settings" sub="Make every recipe fit the way you eat." />
      <Card title="Dietary filters" sub="Used for every new recipe. You can change them on the Fridge page too.">
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => {
            const on = diet.includes(d.id);
            const locked = !allowed(d.id);
            return (
              <button key={d.id} type="button" aria-pressed={on}
                onClick={() => {
                  if (locked) return show(me.tier === "none" ? "Dietary filters come with a plan" : "All 6 filters come with Pro");
                  const next = on ? diet.filter((x) => x !== d.id) : [...diet, d.id];
                  setDiet(next);
                  save({ diet: next }, "Filters saved");
                }}
                className={cn("inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold transition active:scale-95", on ? "border-olive bg-olive text-white" : "border-border bg-surface hover:bg-surface-2", locked && "text-fg-muted")}>
                {on && <Check className="h-4 w-4" />}
                {locked && <Lock className="h-3.5 w-3.5" />}
                {d.label}
              </button>
            );
          })}
        </div>
      </Card>
      <Card title="Calorie target" sub={me.quotas.calorieTarget ? "Platepal aims for this many calories per serving." : "Included with Chef: Platepal aims each recipe at your calorie target."}>
        {me.quotas.calorieTarget ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = cal ? Number(cal) : null; if (n !== null && (n < 200 || n > 2000)) return show("Pick between 200 and 2,000"); save({ calorie_target: n }, "Calorie target saved"); }}>
            <input type="number" inputMode="numeric" min={200} max={2000} step={10} value={cal} onChange={(e) => setCal(e.target.value)} placeholder="e.g. 550" className="h-12 w-40 rounded-2xl border border-border bg-surface px-4 text-[16px] outline-none focus:border-tomato" />
            <button className="h-12 cursor-pointer rounded-full bg-ink px-5 font-semibold text-cream dark:bg-cream dark:text-ink">Save</button>
          </form>
        ) : (
          <a href="/pricing" className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 font-semibold"><Lock className="h-4 w-4" /> Unlock with Chef</a>
        )}
      </Card>
      <Card title="Appearance">
        <div className="inline-flex rounded-full bg-surface-2 p-1">
          {([["system", Monitor, "System"], ["light", Sun, "Light"], ["dark", Moon, "Dark"]] as const).map(([v, Icon, l]) => (
            <button key={v} onClick={() => { setT(v); setTheme(v); }} className={cn("inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition", theme === v ? "bg-surface shadow-sm" : "text-fg-muted")}>
              <Icon className="h-4 w-4" /> {l}
            </button>
          ))}
        </div>
      </Card>
      <Card title="Put Platepal on your home screen" sub="It opens like an app, no download needed.">
        <p className="flex items-start gap-2 text-[14px] text-fg-muted">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          iPhone: tap Share, then &quot;Add to Home Screen&quot;. Android: tap the ⋮ menu, then &quot;Install app&quot;.
        </p>
      </Card>
      <Toast text={toast} />
    </div>
  );
}
