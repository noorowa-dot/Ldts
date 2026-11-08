"use client";
import * as React from "react";
import { ChefHat, Clock, Heart, Trash2, Camera, RotateCcw } from "lucide-react";
import type { ListItem } from "@/lib/lists";
import { cn } from "@/lib/utils";
import { Toast, useToast } from "./recipe-detail";

export function RecipeList({ items: initial, mode }: { items: ListItem[]; mode: "all" | "saved" }) {
  const [items, setItems] = React.useState(initial);
  const { toast, show } = useToast();

  async function unfav(id: string) {
    setItems((xs) => (mode === "saved" ? xs.filter((x) => x.id !== id) : xs.map((x) => (x.id === id ? { ...x, is_favorite: !x.is_favorite } : x))));
    const it = items.find((x) => x.id === id);
    const r = await fetch(`/api/recipes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_favorite: !it?.is_favorite }) });
    if (r.status === 403) {
      setItems(initial);
      return show("Your plan's saved list is full. Upgrade to save more.");
    }
    show(it?.is_favorite ? "Removed from saved" : "Saved to your cookbook");
  }
  async function del(id: string) {
    if (!confirm("Delete this recipe and its photo? This can't be undone.")) return;
    const r = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    if (r.ok) {
      setItems((xs) => xs.filter((x) => x.id !== id));
      show("Recipe deleted");
    } else show("Couldn't delete. Try again.");
  }

  if (!items.length) {
    return (
      <div className="recipe-card flex flex-col items-center px-6 py-14 text-center" data-testid="empty-state">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-butter-soft text-[#7a5a0a]">
          {mode === "saved" ? <Heart className="h-7 w-7" /> : <ChefHat className="h-7 w-7" />}
        </span>
        <p className="mt-4 text-[17px] font-semibold">
          {mode === "saved" ? "Tap the heart on a recipe you loved to keep it here." : "Your recipes will live here. Snap your fridge to make the first one."}
        </p>
        <a href="/app" className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-tomato px-6 font-semibold text-white active:scale-95">
          <Camera className="h-5 w-5" /> Make my recipe
        </a>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <li key={r.id} className="recipe-card group flex overflow-hidden">
            <a href={`/r/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-3">
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-ink-3">
                {r.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <ChefHat className="absolute inset-0 m-auto h-7 w-7 text-cream/40" />
                )}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 font-serif text-[18px] font-semibold leading-tight tracking-[-0.01em]">{r.title}</span>
                <span className="mt-1 flex items-center gap-2 text-[12px] text-fg-muted">
                  <Clock className="h-3.5 w-3.5" /> {r.time_minutes} min · {r.found_count} ingredients · {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </span>
            </a>
            <span className="flex flex-col justify-center gap-1 pr-2">
              <button onClick={() => unfav(r.id)} aria-label={r.is_favorite ? "Remove from saved" : "Save"} className={cn("grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-surface-2", r.is_favorite ? "text-tomato" : "text-fg-muted")}>
                <Heart className={cn("h-4.5 w-4.5", r.is_favorite && "fill-current")} />
              </button>
              <button onClick={() => del(r.id)} aria-label="Delete" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-tomato-deep">
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <Toast text={toast} />
    </>
  );
}

export function ListError() {
  return (
    <div className="recipe-card flex flex-col items-center px-6 py-12 text-center">
      <p className="text-[17px] font-semibold">We couldn&apos;t load your recipes.</p>
      <button onClick={() => location.reload()} className="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-5 font-semibold">
        <RotateCcw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
