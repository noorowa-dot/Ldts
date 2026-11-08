"use client";
import * as React from "react";
import type { Me } from "@/lib/me";

const MeCtx = React.createContext<Me | null>(null);
export function MeProvider({ me, children }: { me: Me; children: React.ReactNode }) {
  return <MeCtx.Provider value={me}>{children}</MeCtx.Provider>;
}
export function useMe() {
  const m = React.useContext(MeCtx);
  if (!m) throw new Error("useMe outside MeProvider");
  return m;
}
