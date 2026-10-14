import { test, expect } from "@playwright/test";

test("a supplied cancel URL does not assert payment state", async ({
  page,
}) => {
  await page.goto("/pricing?status=cancel");
  await expect(page.getByRole("status")).toHaveText(
    "Checkout cancellation requested. Payment status is not confirmed here.",
  );
});

test("pricing shows no checkout notice on a plain visit", async ({ page }) => {
  await page.goto("/pricing");
  await expect(
    page.getByRole("heading", { name: "Pricing", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

for (const status of ["success", "already-subscribed"]) {
  test(`a supplied ${status} URL leaves billing state unconfirmed`, async ({
    page,
  }) => {
    await page.goto(`/pricing?status=${status}`);
    await expect(page.getByRole("status")).toContainText("not confirmed here");
  });
}
