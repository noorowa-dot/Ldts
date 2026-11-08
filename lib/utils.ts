import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function plural(n: number, one: string, many = one + "s") {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

export function listNice(items: string[], max = 3) {
  const xs = items.slice(0, max).map((s) => s.toLowerCase());
  if (xs.length <= 1) return xs.join("");
  return xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
}
