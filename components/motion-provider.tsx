"use client";
import { LazyMotion } from "framer-motion";

const load = () => import("./motion-features").then((r) => r.default);

/** Animation features load after the page shows, keeping the first paint light. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={load} strict>
      {children}
    </LazyMotion>
  );
}
