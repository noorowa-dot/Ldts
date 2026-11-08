import type { Metadata } from "next";
import { Planner } from "@/components/app/planner";
import { parseWeek } from "@/lib/week";

export const metadata: Metadata = { title: "Plan your week" };

export default async function Page(props: PageProps<"/app/plan">) {
  const sp = await props.searchParams;
  return <Planner initialWeek={parseWeek(typeof sp.week === "string" ? sp.week : null)} />;
}
