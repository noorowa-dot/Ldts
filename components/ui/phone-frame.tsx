"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** A realistic iPhone drawn in CSS: frame, dynamic island, status bar with live time. */
export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  const [time, setTime] = useState("9:41");
  useEffect(() => {
    const f = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[AP]M/, ""));
    f();
    const t = setInterval(f, 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={cn("relative mx-auto aspect-[9/19] w-[270px] rounded-[46px] bg-[#0d0c09] p-[9px] shadow-[0_40px_80px_-30px_rgb(0_0_0/.7),inset_0_0_0_1.5px_#3b362c]", className)}>
      <div className="absolute -left-[2px] top-24 h-10 w-[3px] rounded-l bg-[#2a261f]" />
      <div className="absolute -right-[2px] top-32 h-16 w-[3px] rounded-r bg-[#2a261f]" />
      <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-cream">
        <div className="absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-7 text-[13px] font-semibold text-ink">
          <span suppressHydrationWarning>{time}</span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 18 12" className="h-2.5 w-4"><path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V3.5H9zM13 11h2V1h-2z" fill="currentColor" /></svg>
            <span className="relative ml-1 h-[11px] w-[22px] rounded-[3px] border border-ink/50"><span className="absolute inset-[1.5px] right-[5px] rounded-[1.5px] bg-ink" /></span>
          </span>
        </div>
        <div className="absolute left-1/2 top-2.5 z-30 h-[26px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
        <div className="h-full w-full pt-11">{children}</div>
      </div>
    </div>
  );
}
