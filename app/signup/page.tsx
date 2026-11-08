import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/funnel/auth-page";
import { KwopFlow } from "@/components/landing/kwop-flow";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create your account", description: "Create your free Platepal account and turn your fridge into tonight's recipe." };

function safe(n?: string) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/app";
}

export default async function Page(props: PageProps<"/signup">) {
  const sp = await props.searchParams;
  const next = safe(typeof sp.next === "string" ? sp.next : undefined);
  if (await getUser()) redirect(next);
  return (
    <>
      <KwopFlow />
      <AuthPage mode="signup" next={next} />
    </>
  );
}
