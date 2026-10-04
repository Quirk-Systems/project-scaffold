import { test, expect } from "@playwright/test";

test("a payer returning from a cancelled checkout is told they were not charged", async ({
  page,
}) => {
  await page.goto("/pricing?status=cancel");
  await expect(page.getByRole("status")).toHaveText(
    "Checkout cancelled. You have not been charged.",
  );
});

test("pricing shows no checkout notice on a plain visit", async ({ page }) => {
  await page.goto("/pricing");
  await expect(
    page.getByRole("heading", { name: "Pricing", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/checkout (complete|cancelled)/i)).toHaveCount(0);
});
