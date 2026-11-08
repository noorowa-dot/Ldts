import { renderOg } from "@/lib/og";
import { getShare } from "@/lib/share";

export const alt = "A recipe made from what was in the fridge, with Platepal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const r = await getShare(id);
  if (!r) return renderOg({ kicker: "Made with Platepal", title: "Tonight's dinner is already in your fridge.", items: ["Snap", "Scan", "Cook"] });
  return renderOg({
    kicker: `Made from ${r.names.length} fridge items`,
    title: r.title,
    meta: `${r.time_minutes} min · Serves ${r.servings} · ${r.difficulty}`,
    items: r.names,
  });
}
