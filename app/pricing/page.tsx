import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { PricingClient } from "@/components/app/pricing-client";

export const metadata: Metadata = { title: "Choose your plan", robots: { index: false } };

export default async function Page() {
  const user = await getUser();
  if (!user) redirect("/signup?next=/pricing");
  return <PricingClient />;
}
