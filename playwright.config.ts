import { defineConfig } from "@playwright/test";

const chromiumPath = process.env.PW_CHROMIUM || (process.env.CI ? undefined : "/opt/pw-browsers/chromium");
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined;

export default defineConfig({
  testDir: "tests",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "off",
    launchOptions: { executablePath: chromiumPath, args: ["--no-sandbox"], proxy },
  },
  projects: [
    { name: "phone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "computer", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
