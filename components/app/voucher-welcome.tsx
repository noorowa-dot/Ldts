"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { useMe } from "./me-context";

const UnlockFilm = dynamic(() => import("@/components/funnel/paywall").then((m) => m.UnlockFilm), { ssr: false });

/** After signing up with a voucher (?voucher=1): the same unlock moment a buyer gets, without paying. */
export function VoucherWelcome() {
  const me = useMe();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const u = new URL(location.href);
    if (u.searchParams.get("voucher") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      u.searchParams.delete("voucher");
      history.replaceState(null, "", u.pathname + (u.search || ""));
    }
  }, []);
  const q = me.quotas;
  const lines = [
    `${q.recipes} fridge recipes a month`,
    q.planMeals >= 14 ? "Plan lunch + dinner all week" : "Plan your dinners + smart shopping lists",
    q.priceCheck ? "Price check across your stores" : "Every step, every amount",
  ];
  return <UnlockFilm open={open} planName={me.planName ?? "your plan"} lines={lines} onDone={() => setOpen(false)} />;
}
