import type { Metadata } from "next";
import { Shop } from "@/components/app/shop";
import { parseWeek } from "@/lib/week";

export const metadata: Metadata = { title: "Your shop" };

export default async function Page(props: PageProps<"/app/shop">) {
  const sp = await props.searchParams;
  return <Shop initialWeek={parseWeek(typeof sp.week === "string" ? sp.week : null)} />;
}
