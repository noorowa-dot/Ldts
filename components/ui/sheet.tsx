"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useReducedMotion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** "full": full screen on phones, centered card on desktop. "bottom": bottom sheet with grab handle on phones. */
  mode?: "full" | "bottom";
  width?: number;
  label: string;
  closeSide?: "left" | "right";
  z?: number;
  className?: string;
  testId?: string;
  scrollRef?: React.Ref<HTMLDivElement>;
  footer?: React.ReactNode;
};

export function Sheet({ open, onClose, children, mode = "bottom", width = 480, label, closeSide = "left", z = 60, className, testId, scrollRef, footer }: SheetProps) {
  const reduce = useReducedMotion();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  // Rendered at the top of the page so no animated or transformed parent can trap the overlay.
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: z }} role="dialog" aria-modal="true" aria-label={label} data-testid={testId}>
          <m.div
            className="absolute inset-0 bg-ink/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className={cn("pointer-events-none absolute inset-0 flex justify-center", mode === "bottom" ? "items-end sm:items-center" : "items-stretch sm:items-center")}>
            <m.div
              drag={mode === "bottom" && !reduce ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={onDragEnd}
              initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: "100%", opacity: 1 }}
              transition={{ type: "spring", damping: 32, stiffness: 340, mass: 0.9 }}
              style={{ maxWidth: width }}
              className={cn(
                "pointer-events-auto relative flex w-full flex-col overflow-hidden bg-bg text-fg shadow-[var(--shadow-lift)]",
                mode === "bottom" ? "max-h-[92dvh] rounded-t-[28px] sm:max-h-[88dvh] sm:rounded-[28px]" : "h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:rounded-[28px]",
                className
              )}
            >
              {mode === "bottom" && (
                <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
                  <span className="h-1.5 w-11 rounded-full bg-fg/20" />
                </div>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                data-testid={testId ? `${testId}-close` : undefined}
                className={cn(
                  "absolute top-3 z-20 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-surface-2/90 text-fg backdrop-blur transition hover:bg-border active:scale-95",
                  closeSide === "left" ? "left-3" : "right-3"
                )}
              >
                <X className="h-5 w-5" />
              </button>
              <div ref={scrollRef} className="relative flex-1 overflow-y-auto overscroll-contain">{children}</div>
              {footer}
            </m.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
