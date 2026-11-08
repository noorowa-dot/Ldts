import { test, expect } from "@playwright/test";

/**
 * The blueprint's whole funnel, as a brand-new visitor:
 * landing → example photo → the work → recipe locked → sign-up (new email) → paywall
 * → the Whop checkout sheet opens (never pay) → close → account.
 */
test("try-first funnel, from the landing page to the checkout sheet", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("One 5-star dinner.");
  // No price anywhere on the landing page.
  await expect(page.locator("body")).not.toContainText("/ month");
  await expect(page.locator("body")).not.toContainText("/ day");
  await expect(page.getByRole("link", { name: /pricing/i })).toHaveCount(0);

  // 1. The first action: one tap on an example shelf.
  await page.getByTestId("example-half-empty-fridge").click();
  // 2. The work, in front of them.
  await expect(page.getByTestId("working")).toBeVisible();
  await expect(page.getByText("Making your recipe…")).toBeVisible();
  // 3. The recipe, locked.
  const card = page.getByTestId("recipe-card");
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("recipe-title")).not.toBeEmpty();
  await expect(page.getByTestId("found-list")).toBeVisible();
  const title = (await page.getByTestId("recipe-title").textContent())!.trim();

  // 4. Unlock → sign-up sheet.
  await page.getByTestId("unlock-cta").click();
  const sheet = page.getByTestId("signup-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading")).toHaveText("Save your recipe");
  await sheet.getByTestId("email").fill(`e2e+${Date.now()}${Math.floor(Math.random() * 1000)}@platepal-test.dev`);
  await sheet.getByTestId("password").fill("CorrectHorse42!");
  await sheet.getByTestId("auth-submit").click();

  // 5. Paywall over their own recipe.
  const paywall = page.getByTestId("paywall");
  await expect(paywall).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("paywall-title")).toHaveText(`Your ${title} is ready.`);
  await expect(paywall.getByText("Most popular").first()).toBeVisible();
  await expect(paywall.getByText("/ day").first()).toBeVisible();

  // 6. The checkout opens inside the page (never pay).
  await page.getByTestId("paywall-continue").click();
  await expect(page.getByTestId("checkout-sheet")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#whop-checkout iframe").first()).toBeAttached({ timeout: 20_000 });
  expect(page.url()).not.toContain("whop.com");

  // 7. Close everything, the locked recipe waits behind.
  await page.getByTestId("checkout-close").click();
  await expect(paywall).toBeVisible();
  await page.getByTestId("paywall-sheet-close").click();
  await expect(card).toBeVisible();

  // 8. Account.
  await page.goto("/app/account");
  await expect(page.getByTestId("account-email")).toContainText("@platepal-test.dev");
  await page.goto("/app/recipes");
  // A link to the recipe (ARIA query: ignores the hidden copy React keeps while streaming the list in).
  await expect(page.getByRole("link", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) })).toBeVisible();

  expect(errors).toEqual([]);
});
