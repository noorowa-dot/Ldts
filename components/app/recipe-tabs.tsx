import Link from "next/link";
import { cn } from "@/lib/utils";

export function RecipeTabs({ active }: { active: "recipes" | "saved" }) {
  return (
    <div className="mb-5 inline-flex rounded-full bg-surface-2 p-1 text-[14px] font-semibold">
      {(
        [
          ["recipes", "/app/recipes", "All recipes"],
          ["saved", "/app/saved", "Saved"],
        ] as const
      ).map(([k, href, label]) => (
        <Link key={k} href={href} className={cn("rounded-full px-4 py-1.5 transition", active === k ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}>
          {label}
        </Link>
      ))}
    </div>
  );
}
