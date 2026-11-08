import { itemKey } from "./week";

/** Things every kitchen is assumed to have: never asked about in "Check your spice cabinet". */
const STAPLE = /^(salt|kosher salt|sea salt|table salt|pepper|black pepper|ground black pepper|salt and pepper|water|warm water|cold water|ice water|oil|cooking oil|vegetable oil|neutral oil|canola oil|olive oil|extra virgin olive oil|cooking spray|nonstick spray)$/;

export function pantryKey(name: string) {
  return itemKey(name.replace(/\(.*?\)/g, " ").replace(/,.*$/, ""));
}

export function isStaple(name: string) {
  const k = pantryKey(name).replace(/^(a pinch of|pinch of|to taste|some) /, "");
  return STAPLE.test(k);
}
