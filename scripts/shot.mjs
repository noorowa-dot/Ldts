// Full-page screenshots at 390×844 (phone) and 1440×900 (computer) + console errors.
// Usage: node scripts/shot.mjs /path [/other ...]   (BASE_URL defaults to http://localhost:3000)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.env.BASE_URL || "http://localhost:3000";
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];
const sizes = (process.env.SIZES || "390x844,1440x900").split(",").map((s) => s.split("x").map(Number));
const full = process.env.FULL !== "0";
mkdirSync("shots", { recursive: true });

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--headless", "--no-sandbox"], proxy });
let errors = 0;
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500, reducedMotion: process.env.REDUCED ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") { errors++; console.log(`[console ${w}] ${m.text().slice(0, 300)}`); } });
  page.on("pageerror", (e) => { errors++; console.log(`[pageerror ${w}] ${e.message.slice(0, 300)}`); });
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" }).catch((e) => console.log("goto", e.message));
    // let reveal-on-scroll play everywhere
    if (full) {
      const height = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < height; y += Math.round(h * 0.7)) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.waitForTimeout(Number(process.env.WAIT || 700));
    const name = (p === "/" ? "home" : p.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "")) + `-${w}.png`;
    await page.screenshot({ path: `shots/${name}`, fullPage: full });
    console.log("shot", name);
  }
  await ctx.close();
}
await browser.close();
console.log(errors ? `${errors} console error(s)` : "0 console errors");
