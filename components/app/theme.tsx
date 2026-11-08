"use client";
import * as React from "react";

export type ThemePref = "system" | "light" | "dark";

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function getTheme(): ThemePref {
  try {
    return (localStorage.getItem("pp_theme") as ThemePref) || "system";
  } catch {
    return "system";
  }
}

export function setTheme(p: ThemePref) {
  try {
    localStorage.setItem("pp_theme", p);
  } catch {}
  apply(p);
}

/** The app follows the system's light/dark setting unless the person picks one in Settings. */
export function ThemeSync() {
  React.useEffect(() => {
    apply(getTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply(getTheme());
    mq.addEventListener("change", on);
    return () => {
      mq.removeEventListener("change", on);
      document.documentElement.classList.remove("dark");
    };
  }, []);
  return null;
}
