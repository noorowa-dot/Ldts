"use client";
import { Flame, Loader2 } from "lucide-react";
import { HEATS, type Heat } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Mild → Extra hot. Changes the spice of a dish, never the dish itself. */
export function HeatPicker({ value, onChange, busy, disabled, size = "md", className }: { value: Heat | null; onChange: (h: Heat) => void; busy?: Heat | null; disabled?: boolean; size?: "sm" | "md"; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="radiogroup" aria-label="Heat level">
      {HEATS.map((h) => {
        const on = value === h.id;
        return (
          <button
            key={h.id}
            type="button"
            role="radio"
            aria-checked={on}
            title={h.hint}
            disabled={disabled || !!busy}
            onClick={() => onChange(h.id)}
            data-testid={`heat-${h.id}`}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border font-semibold transition active:scale-95 disabled:cursor-default",
              size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-3.5 text-[14px]",
              on ? "border-tomato bg-tomato text-white" : "border-border bg-surface text-fg hover:bg-surface-2",
              busy && busy !== h.id && "opacity-50"
            )}
          >
            {busy === h.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span className="flex" aria-hidden>
                {Array.from({ length: h.flames }).map((_, i) => (
                  <Flame key={i} className={cn("-mx-[1.5px] h-3.5 w-3.5", on ? "fill-white/30" : h.flames >= 3 ? "text-tomato" : "text-[#d98a1f]")} />
                ))}
              </span>
            )}
            {h.label}
          </button>
        );
      })}
    </div>
  );
}
