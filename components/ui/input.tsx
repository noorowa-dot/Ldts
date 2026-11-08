import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-13 w-full rounded-2xl border border-border bg-surface px-4 text-[16px] text-fg placeholder:text-fg-muted/70",
        "outline-none transition focus:border-tomato focus:ring-4 focus:ring-tomato/15",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
