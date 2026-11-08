import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/funnel/auth-page";
import { KwopFlow } from "@/components/landing/kwop-flow";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Log in", description: "Log in to Platepal to see your recipes." };

function safe(n?: string) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/app";
}

export default async function Page(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safe(typeof sp.next === "string" ? sp.next : undefined);
  if (await getUser()) redirect(next);
  const notice = sp.error === "link" ? "That sign-in link has expired. Log in below." : sp.reset === "1" ? "Your password was changed. Log in with the new one." : null;
  return (
    <>
      <KwopFlow />
      <AuthPage mode="login" next={next} notice={notice} />
    </>
  );
}
