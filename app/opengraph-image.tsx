import { renderOg } from "@/lib/og";

export const alt = "Platepal: snap your fridge, get tonight's recipe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    kicker: "Fridge → Dinner",
    title: "3 random ingredients. One 5-star dinner.",
    meta: "Snap your fridge. Get a real recipe in about 10 seconds.",
    items: ["Eggs", "Spinach", "Feta", "Lemon", "Cherry tomatoes"],
  });
}
