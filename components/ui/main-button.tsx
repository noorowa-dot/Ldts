"use client";
import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  size?: "md" | "lg";
  type?: "button" | "submit";
  disabled?: boolean;
  "data-testid"?: string;
};

/** The one main action: a tomato pill with a breathing glow and a nudging arrow. */
export function MainButton({ children, href, onClick, className, size = "lg", type = "button", disabled, ...rest }: Props) {
  const inner = (
    <>
      <span aria-hidden className="btn-glow pointer-events-none absolute -inset-2 -z-10 rounded-full bg-tomato/45 blur-xl" />
      <span className="pl-2">{children}</span>
      <span
        aria-hidden
        className={cn(
          "grid place-items-center overflow-hidden rounded-full bg-cream text-tomato",
          size === "lg" ? "h-11 w-11" : "h-8 w-8"
        )}
      >
        <span className="arrow-nudge grid place-items-center transition-transform duration-300 group-hover:translate-x-7">
          <ArrowRight className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.4} />
        </span>
      </span>
    </>
  );
  const cls = cn(
    "group relative isolate inline-flex select-none items-center justify-between gap-4 rounded-full bg-tomato font-semibold text-white",
    "transition-[transform,background-color] duration-150 hover:bg-tomato-deep active:scale-[0.955] disabled:opacity-60",
    size === "lg" ? "h-16 pl-6 pr-2.5 text-[17px]" : "h-12 pl-4 pr-2 text-[15px]",
    className
  );
  if (href)
    return (
      <a href={href} className={cls} onClick={onClick} data-testid={rest["data-testid"]}>
        {inner}
      </a>
    );
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} data-testid={rest["data-testid"]}>
      {inner}
    </button>
  );
}
