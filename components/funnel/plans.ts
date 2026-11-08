"use client";
import * as React from "react";

export type PublicPlan = {
  id: number;
  name: string;
  price_cents: number;
  per_day: string;
  yearly: { price_cents: number; per_day: string } | null;
  tier: "starter" | "pro" | "chef";
  tag: string;
  recipes: number;
  unlock: string[];
  featured: boolean;
};

let plansPromise: Promise<PublicPlan[]> | null = null;
export function fetchPlans() {
  plansPromise ??= fetch("/api/plans")
    .then((r) => r.json())
    .then((d) => (d.plans as PublicPlan[]) ?? [])
    .catch(() => {
      plansPromise = null;
      return [];
    });
  return plansPromise;
}

export function usePlans() {
  const [plans, setPlans] = React.useState<PublicPlan[] | null>(null);
  React.useEffect(() => {
    let alive = true;
    fetchPlans().then((p) => alive && setPlans(p));
    return () => {
      alive = false;
    };
  }, []);
  return plans;
}

