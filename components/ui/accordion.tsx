"use client";
import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({ items, dark = false, className }: { items: { q: string; a: string }[]; dark?: boolean; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className={cn("divide-y", dark ? "divide-white/10" : "divide-border", className)}>
      {items.map((it, i) => (
        <div key={it.q}>
          <button
            className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-[16px] font-semibold"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {it.q}
            <Plus className={cn("h-5 w-5 shrink-0 transition-transform duration-300", open === i && "rotate-45")} />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 0.8, 0.24, 1] }}
                className="overflow-hidden"
              >
                <p className={cn("pb-5 pr-8 text-[15px] leading-relaxed", dark ? "text-cream/70" : "text-fg-muted")}>{it.a}</p>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
