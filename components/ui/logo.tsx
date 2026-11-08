import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-7 w-7", className)}>
      <circle cx="16" cy="17" r="13" fill="#E5482F" />
      <circle cx="16" cy="17" r="8.5" fill="none" stroke="#FBF6EC" strokeOpacity=".55" strokeWidth="1.6" />
      <path d="M16 4.5c1.6-2.6 4.7-3.4 7.4-2.4-.6 2.9-3.2 4.9-6.2 4.7" fill="#C8FF3D" />
      <path d="M16 6.5V4.2" stroke="#6B7A2E" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span
        className={cn(
          "font-serif text-[21px] font-semibold tracking-[-0.03em]",
          dark ? "text-cream" : "text-fg"
        )}
      >
        Platepal
      </span>
    </span>
  );
}
