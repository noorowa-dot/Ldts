/** Weeks start on Monday. Dates are plain YYYY-MM-DD strings in the person's calendar. */
export function mondayOf(d: Date): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}

export function parseWeek(s: string | null | undefined): string {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T12:00:00Z");
    if (!Number.isNaN(d.getTime())) return mondayOf(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  return mondayOf(new Date());
}

export function addDays(week: string, n: number): string {
  const d = new Date(week + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekLabel(week: string): string {
  const a = new Date(week + "T12:00:00Z");
  const b = new Date(addDays(week, 6) + "T12:00:00Z");
  const m = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return a.getUTCMonth() === b.getUTCMonth() ? `${m(a)}–${b.getUTCDate()}` : `${m(a)} – ${m(b)}`;
}

export function itemKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(ies)$/, "y")
    .replace(/([^s])s$/, "$1")
    .slice(0, 60);
}
