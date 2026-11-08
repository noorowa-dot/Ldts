import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { PaidReturn } from "@/components/app/paid-return";

/** Buyers coming back from the fallback checkout page land here: confirm, play the unlock film, go to the app. */
export default async function Page(props: PageProps<"/dashboard">) {
  const sp = await props.searchParams;
  const user = await getUser();
  const ref = typeof sp.ref === "string" ? sp.ref : null;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard?paid=1${ref ? `&ref=${ref}` : ""}`)}`);
  if (sp.paid !== "1" || !ref) redirect("/app");
  return <PaidReturn refId={ref} />;
}
