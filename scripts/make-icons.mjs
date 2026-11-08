// Renders the app icons from the logo mark. Usage: node scripts/make-icons.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const svg = readFileSync("app/icon.svg", "utf8");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--headless", "--no-sandbox"] });
const page = await browser.newPage();
const make = async (size, file, pad, bg) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${bg};display:grid;place-items:center;width:${size}px;height:${size}px">${svg.replace("<svg ", `<svg width="${size - pad * 2}" height="${size - pad * 2}" `)}</body></html>`);
  await page.screenshot({ path: file, omitBackground: bg === "transparent" });
};
await make(192, "public/icon-192.png", 22, "#17150F");
await make(512, "public/icon-512.png", 60, "#17150F");
await make(512, "public/icon-maskable.png", 110, "#17150F");
await make(180, "app/apple-icon.png", 22, "#17150F");
await browser.close();
console.log("icons done");
