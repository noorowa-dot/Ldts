import { cn } from "@/lib/utils";

/** Kitchen-timer style progress ring with tick marks. */
export function ProgressRing({ value, size = 96, className, dark = true }: { value: number; size?: number; className?: string; dark?: boolean }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={i}
            x1="50" y1="3" x2="50" y2={i % 6 === 0 ? 9 : 6.5}
            stroke={dark ? "#fbf6ec" : "#1f1b14"}
            strokeOpacity={i / 24 <= pct / 100 ? 0.7 : 0.18}
            strokeWidth="1.4"
            transform={`rotate(${i * 15} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r={r} fill="none" stroke={dark ? "rgb(251 246 236 / .12)" : "rgb(31 27 20 / .08)"} strokeWidth="7" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke="#C8FF3D" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset .25s linear" }}
        />
      </svg>
      <div className={cn("absolute inset-0 grid place-items-center font-mono text-lg font-medium tabular-nums", dark ? "text-cream" : "text-fg")}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}
