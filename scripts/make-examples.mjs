// Draws Platepal's three example shelves (illustrations, no stock photos) and renders them to JPEG.
// Usage: node scripts/make-examples.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const W = 1200, H = 900;

const egg = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="33" fill="#fbf3e4" stroke="#d9c7a8" stroke-width="2"/>`;
const tomato = (x, y, r = 34) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#e2412b"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.25}" fill="#f2735e" opacity=".7"/><path d="M${x - 12} ${y - r + 4} l12 8 l12 -8 l-6 10 l-6 -4 l-6 4z" fill="#3f7a2a"/></g>`;
const lemon = (x, y) => `<g><ellipse cx="${x}" cy="${y}" rx="46" ry="34" fill="#f6d33c"/><ellipse cx="${x - 14}" cy="${y - 10}" rx="14" ry="7" fill="#fbe98a"/><circle cx="${x + 46}" cy="${y}" r="5" fill="#d8b21f"/></g>`;
const label = (x, y, w, h, text, bg, fg = "#fff", size = 26, rot = 0) =>
  `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${bg}"/><text x="${x + w / 2}" y="${y + h / 2 + size * 0.36}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" fill="${fg}" text-anchor="middle">${text}</text></g>`;

function fridge(shelves) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f6f7"/><stop offset="1" stop-color="#dfe6e8"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#cfdde2" stop-opacity=".9"/></linearGradient>
    <radialGradient id="light" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#fffbe8" stop-opacity=".9"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wall)"/>
  <rect width="${W}" height="${H}" fill="url(#light)"/>
  <rect x="0" y="0" width="40" height="${H}" fill="#cfd8db"/><rect x="${W - 40}" y="0" width="40" height="${H}" fill="#cfd8db"/>
  ${[300, 600].map((y) => `<rect x="40" y="${y}" width="${W - 80}" height="16" fill="url(#glass)" stroke="#b8c7cc"/>`).join("")}
  ${shelves}
  </svg>`;
}

function pantry(items) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7cfa6"/><stop offset="1" stop-color="#cfae7b"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="#efe4cf"/>
  ${[0, 1, 2].map((i) => `<rect x="0" y="${i * 300}" width="${W}" height="300" fill="${i % 2 ? "#eadcc2" : "#efe4cf"}"/>`).join("")}
  ${[290, 590, 880].map((y) => `<rect x="0" y="${y}" width="${W}" height="22" fill="url(#wood)"/><rect x="0" y="${y + 22}" width="${W}" height="6" fill="#b08d58"/>`).join("")}
  ${items}
  </svg>`;
}

const examples = {
  "half-empty-fridge": fridge(`
    <!-- top shelf: egg carton + feta + lemon -->
    <rect x="90" y="190" width="380" height="100" rx="12" fill="#b9a585"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => egg(130 + i * 60, 185)).join("")}
    ${label(120, 235, 320, 44, "DOZEN EGGS", "#8c7651", "#fff", 24)}
    <rect x="530" y="180" width="200" height="110" rx="14" fill="#f8f8f4" stroke="#cfcfc4" stroke-width="3"/>
    ${label(550, 210, 160, 50, "FETA", "#2f6fb5", "#fff", 30)}
    ${lemon(820, 255)}${lemon(930, 262)}
    <!-- middle shelf: spinach bag + cherry tomatoes + chicken -->
    <path d="M90 595 L120 400 Q230 370 340 400 L370 595 Z" fill="#cfe8c4" stroke="#8fbf7c" stroke-width="3"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<ellipse cx="${150 + (i % 4) * 55}" cy="${450 + Math.floor(i / 4) * 60}" rx="30" ry="20" fill="#3f8a36" transform="rotate(${i * 25} ${150 + (i % 4) * 55} ${450 + Math.floor(i / 4) * 60})"/>`).join("")}
    ${label(130, 540, 200, 42, "BABY SPINACH", "#2f7d32", "#fff", 20)}
    <rect x="420" y="470" width="230" height="125" rx="14" fill="#e9f3f6" stroke="#a9c6cf" stroke-width="3"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => tomato(460 + (i % 3) * 75, 510 + Math.floor(i / 3) * 50, 24)).join("")}
    ${label(440, 440, 190, 36, "CHERRY TOMATOES", "#c0392b", "#fff", 16)}
    <rect x="700" y="470" width="400" height="125" rx="16" fill="#f3d6d0" stroke="#d9a79d" stroke-width="3"/>
    <ellipse cx="820" cy="530" rx="90" ry="42" fill="#f0b9a8"/><ellipse cx="985" cy="535" rx="90" ry="40" fill="#eeb3a0"/>
    ${label(760, 570, 280, 34, "CHICKEN THIGHS", "#ffffff", "#b03a2e", 20)}
    <!-- bottom: onion + garlic + milk -->
    <circle cx="200" cy="790" r="70" fill="#c98a4b"/><path d="M200 720 q10 -30 0 -45" stroke="#7a5a2a" stroke-width="6" fill="none"/>
    <path d="M150 760 Q200 730 250 760" stroke="#a86c33" stroke-width="5" fill="none"/>
    <ellipse cx="370" cy="820" rx="52" ry="44" fill="#f3efe6" stroke="#d6cdb8" stroke-width="3"/><path d="M370 776 v-24" stroke="#bfb59c" stroke-width="6"/>
    ${label(320, 862, 100, 28, "GARLIC", "#8d8571", "#fff", 16)}
    <rect x="860" y="640" width="150" height="250" rx="18" fill="#ffffff" stroke="#c9d3d6" stroke-width="3"/>
    <rect x="890" y="615" width="90" height="35" rx="8" fill="#2f6fb5"/>
    ${label(870, 720, 130, 50, "MILK", "#2f6fb5", "#fff", 30)}
  `),
  "pantry-shelf": pantry(`
    <!-- top: pasta + rice -->
    <rect x="80" y="70" width="230" height="220" rx="10" fill="#1f5fa8"/>
    <rect x="110" y="120" width="170" height="70" rx="8" fill="#fff"/>
    <text x="195" y="167" font-family="Arial Black, Arial" font-weight="900" font-size="34" fill="#1f5fa8" text-anchor="middle">PENNE</text>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${120 + i * 32}" y="215" width="22" height="50" rx="6" fill="#f2cf7a" transform="rotate(25 ${131 + i * 32} 240)"/>`).join("")}
    <rect x="360" y="110" width="200" height="180" rx="16" fill="#f4efe4" stroke="#cbbf9f" stroke-width="3"/>
    ${label(380, 170, 160, 56, "RICE", "#b9472f", "#fff", 34)}
    <rect x="620" y="60" width="120" height="230" rx="20" fill="#3d5a1e"/><rect x="655" y="30" width="50" height="40" rx="6" fill="#2a3d14"/>
    ${label(632, 150, 96, 40, "OLIVE OIL", "#e7d27a", "#2a3d14", 15)}
    <rect x="800" y="140" width="150" height="150" rx="18" fill="#c58b4c"/><rect x="805" y="120" width="140" height="35" rx="8" fill="#7b4a21"/>
    ${label(812, 190, 126, 52, "PEANUT BUTTER", "#fff3dc", "#7b4a21", 15)}
    <!-- middle: canned chickpeas, crushed tomatoes, black beans -->
    ${[["CHICKPEAS", "#d9a441", 120], ["CRUSHED TOMATOES", "#c0392b", 420], ["BLACK BEANS", "#2b2b2b", 720]]
      .map(([t, c, x]) => `<rect x="${x}" y="400" width="210" height="190" rx="14" fill="#c9cdd0"/><rect x="${x}" y="430" width="210" height="130" fill="${c}"/>${label(x + 10, 470, 190, 50, t, "#ffffff", c, t.length > 10 ? 17 : 24)}<ellipse cx="${x + 105}" cy="400" rx="105" ry="14" fill="#dfe3e5"/>`)
      .join("")}
    <!-- bottom: onions, garlic, potatoes, spices -->
    ${[0, 1, 2].map((i) => `<circle cx="${140 + i * 95}" cy="${810 - (i % 2) * 10}" r="62" fill="#c98a4b"/><path d="M${140 + i * 95} ${748 - (i % 2) * 10} q8 -26 0 -40" stroke="#7a5a2a" stroke-width="5" fill="none"/>`).join("")}
    ${label(110, 860, 240, 26, "YELLOW ONIONS", "#7a5a2a", "#fff", 16)}
    ${[0, 1].map((i) => `<ellipse cx="${520 + i * 85}" cy="820" rx="45" ry="40" fill="#f3efe6" stroke="#d6cdb8" stroke-width="3"/>`).join("")}
    ${label(495, 864, 140, 22, "GARLIC", "#8d8571", "#fff", 14)}
    ${[0, 1, 2].map((i) => `<ellipse cx="${790 + i * 105}" cy="${820 + (i % 2) * 8}" rx="58" ry="44" fill="#b98a55"/><circle cx="${770 + i * 105}" cy="810" r="5" fill="#8a6235"/>`).join("")}
    ${label(780, 864, 220, 22, "POTATOES", "#6e4f2b", "#fff", 14)}
  `),
  "leftovers-night": fridge(`
    <!-- top: leftover rice container + rotisserie chicken -->
    <rect x="90" y="170" width="300" height="120" rx="18" fill="#e9f3f6" stroke="#9fbcc5" stroke-width="4"/>
    ${Array.from({ length: 40 }).map((_, i) => `<ellipse cx="${115 + (i % 10) * 26}" cy="${200 + Math.floor(i / 10) * 20}" rx="9" ry="5" fill="#fbfaf4" stroke="#e3dfd2"/>`).join("")}
    ${label(130, 135, 220, 40, "LEFTOVER RICE", "#4d7f8c", "#fff", 20)}
    <rect x="450" y="160" width="360" height="130" rx="20" fill="#f6efe2" stroke="#d1c3a7" stroke-width="3"/>
    <ellipse cx="630" cy="225" rx="140" ry="52" fill="#c97b3c"/><ellipse cx="600" cy="210" rx="60" ry="18" fill="#e09a59" opacity=".8"/>
    ${label(510, 125, 240, 40, "ROTISSERIE CHICKEN", "#8a4b1d", "#fff", 18)}
    <rect x="870" y="150" width="90" height="140" rx="14" fill="#3b2216"/><rect x="890" y="125" width="50" height="30" rx="6" fill="#c0392b"/>
    ${label(876, 200, 78, 34, "SOY SAUCE", "#f4e6c9", "#3b2216", 11)}
    <!-- middle: broccoli, carrots, scallions -->
    ${[0, 1, 2].map((i) => `<g><rect x="${135 + i * 70}" y="${510}" width="24" height="70" rx="8" fill="#9cc46a"/>${[0, 1, 2, 3].map((j) => `<circle cx="${130 + i * 70 + j * 12}" cy="${490 - (j % 2) * 14}" r="26" fill="#3f8a36"/>`).join("")}</g>`).join("")}
    ${label(120, 410, 230, 36, "BROCCOLI", "#2f7d32", "#fff", 20)}
    ${[0, 1, 2, 3].map((i) => `<path d="M${450 + i * 50} 590 L${470 + i * 50} 440 L${490 + i * 50} 590 Z" fill="#ef8a2c" transform="rotate(${-10 + i * 6} ${470 + i * 50} 515)"/><path d="M${470 + i * 50} 440 l-10 -30 M${470 + i * 50} 440 l10 -28" stroke="#4a8a2a" stroke-width="6"/>`).join("")}
    ${label(440, 405, 220, 34, "CARROTS", "#d0661a", "#fff", 18)}
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${740 + i * 26}" y="430" width="14" height="160" rx="7" fill="#7cbf5a"/><rect x="${740 + i * 26}" y="540" width="14" height="50" rx="7" fill="#f2f6ea"/>`).join("")}
    ${label(720, 400, 180, 30, "SCALLIONS", "#4a8a2a", "#fff", 16)}
    <!-- bottom: tortillas + cheddar + eggs -->
    <ellipse cx="240" cy="800" rx="170" ry="70" fill="#f2dfb5" stroke="#d4b986" stroke-width="4"/>
    ${label(140, 780, 200, 40, "TORTILLAS", "#c1872f", "#fff", 22)}
    <rect x="490" y="720" width="250" height="140" rx="12" fill="#f5b930"/>
    ${label(510, 765, 210, 50, "CHEDDAR", "#ffffff", "#c47d0e", 30)}
    <rect x="800" y="760" width="300" height="100" rx="12" fill="#b9a585"/>
    ${[0, 1, 2, 3].map((i) => egg(845 + i * 70, 755)).join("")}
    ${label(830, 805, 240, 40, "EGGS", "#8c7651", "#fff", 24)}
  `),
};

mkdirSync("public/examples", { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--headless", "--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const [name, svg] of Object.entries(examples)) {
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: `public/examples/${name}.jpg`, type: "jpeg", quality: 82 });
  console.log("wrote", name);
}
await browser.close();
