import { cn } from "@/lib/utils";

const tones = {
  olive: "bg-olive-soft text-olive",
  butter: "bg-butter-soft text-[#7a5a0a]",
  tomato: "bg-[#fde3dc] text-tomato-deep",
  lime: "bg-lime text-ink",
  dark: "bg-ink-3 text-cream",
} as const;

export type StickerTone = keyof typeof tones;
export const toneCycle: StickerTone[] = ["olive", "butter", "tomato"];

export function Sticker({ children, tone = "olive", className }: { children: React.ReactNode; tone?: StickerTone; className?: string }) {
  return (
    <span className={cn("sticker", tones[tone], className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}
