"use client";
import { Check, Minus } from "lucide-react";
import { FEATURE_ROWS, type Cell, type Tier } from "@/lib/plan-config";
import { cn } from "@/lib/utils";

type Col = { key: "visitor" | Tier; label: string; sub?: string };

/** Which level gets what. Columns: Free account + the paid plans (and visitors, when shown publicly). */
export function PlanTable({ prices, highlight, showVisitor = false, className }: { prices?: Partial<Record<Tier, string>>; highlight?: Tier | null; showVisitor?: boolean; className?: string }) {
  const cols: Col[] = [
    ...(showVisitor ? [{ key: "visitor" as const, label: "No account" }] : []),
    { key: "none", label: "Free", sub: "account" },
    { key: "starter", label: "Starter", sub: prices?.starter },
    { key: "pro", label: "Pro", sub: prices?.pro },
    { key: "chef", label: "Chef", sub: prices?.chef },
  ];
  const cell = (c: Cell) =>
    c === true ? (
      <Check className="mx-auto h-4 w-4 text-olive" strokeWidth={3} aria-label="Included" />
    ) : c === false ? (
      <Minus className="mx-auto h-4 w-4 text-fg-muted/50" aria-label="Not included" />
    ) : (
      <span className="font-medium">{c}</span>
    );
  return (
    <div className={cn("-mx-1 overflow-x-auto rounded-2xl border border-border bg-surface", className)} data-testid="plan-table">
      <table className="w-full min-w-[440px] border-collapse text-[12px] sm:text-[13px]">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-semibold">Feature</th>
            {cols.map((c) => (
              <th key={c.key} className={cn("px-1.5 py-2.5 text-center font-semibold", highlight === c.key && "bg-lime/40")}>
                {c.label}
                {c.sub && <span className="block text-[11px] font-normal text-fg-muted">{c.sub}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_ROWS.map((r) => (
            <tr key={r.label} className="border-b border-border/70 last:border-0">
              <th scope="row" className="sticky left-0 z-10 max-w-[150px] bg-surface px-3 py-2 text-left font-normal leading-snug text-fg">
                {r.label}
              </th>
              {cols.map((c) => (
                <td key={c.key} className={cn("px-1.5 py-2 text-center leading-snug", highlight === c.key && "bg-lime/25")}>
                  {cell(r.cells[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
