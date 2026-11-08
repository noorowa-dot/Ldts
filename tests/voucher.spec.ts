import { test, expect } from "@playwright/test";

/**
 * A creator's voucher link: /signup?voucher=CODE → code prefilled → account unlocked, no card.
 * Needs a multi-use test voucher: VOUCHER_TEST_CODE=XXXX (create one with scripts/make-voucher.mjs).
 */
test("voucher link unlocks the account without a card", async ({ page }) => {
  const code = process.env.VOUCHER_TEST_CODE;
  test.skip(!code, "Set VOUCHER_TEST_CODE to run");
  await page.goto(`/signup?voucher=${code}`);
  await expect(page.getByTestId("voucher-pending-input")).toHaveValue(code!.toUpperCase());
  await page.getByTestId("email").fill(`vouch+${Date.now()}${Math.floor(Math.random() * 1000)}@platepal-test.dev`);
  await page.getByTestId("password").fill("CorrectHorse42!");
  await page.getByTestId("auth-submit").click();
  await page.waitForURL(/\/app/);
  await expect(page.getByTestId("unlock-film")).toBeVisible({ timeout: 20_000 });
  await page.goto("/app/account");
  await expect(page.locator("#billing")).toContainText("Free access with a voucher");
});
