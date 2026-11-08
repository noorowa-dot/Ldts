import { test, expect } from "@playwright/test";

/** Plan the week → the assistant's shopping list → price check (free account: one free list, price check is Pro). */
test("week planner to shopping list", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/signup");
  await page.getByTestId("email").fill(`week+${Date.now()}${Math.floor(Math.random() * 1000)}@platepal-test.dev`);
  await page.getByTestId("password").fill("CorrectHorse42!");
  await page.getByTestId("auth-submit").click();
  await page.waitForURL(/\/app/);

  // Plan a dish by name: the chef writes it.
  await page.goto("/app/plan");
  await expect(page.getByTestId("week-grid")).toBeVisible();
  await page.getByTestId("add-1-dinner").click();
  await page.getByRole("button", { name: "New dish" }).click();
  await page.getByTestId("dish-input").fill("chicken tacos");
  await page.getByTestId("plan-dish").click();
  await expect(page.getByTestId("add-meal-sheet")).toBeHidden({ timeout: 90_000 });
  await expect(page.getByTestId("meal-card")).toHaveCount(1);
  await expect(page.getByTestId("plan-count")).toContainText("1 of");

  // One list, in store amounts.
  await page.getByTestId("build-list").click();
  await page.waitForURL(/\/app\/shop/, { timeout: 90_000 });
  const items = page.getByTestId("shop-item");
  await expect(items.first()).toBeVisible({ timeout: 30_000 });
  expect(await items.count()).toBeGreaterThan(2);
  await expect(page.getByTestId("shop-item").filter({ hasText: /tortilla/i }).first()).toBeVisible();

  await page.getByTestId("tick").first().click();
  await expect(page.getByTestId("shop-progress")).toContainText("1 of");

  // Price check is a Pro feature: it opens the paywall.
  await page.getByTestId("tab-prices").click();
  await page.getByTestId("unlock-prices").click();
  await expect(page.getByTestId("paywall")).toBeVisible({ timeout: 15_000 });

  expect(errors).toEqual([]);
});
