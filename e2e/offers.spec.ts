import { test, expect } from "@playwright/test";

test("Offers navigation clears the selected filter without reloading", async ({
  page,
}) => {
  await page.route("**/api/offers*", async (route) => {
    const status = new URL(route.request().url()).searchParams.get("status");
    await route.fulfill({
      json: {
        offers: [
          {
            id: status ?? "all",
            assetId: "asset-1",
            title: status === "claimed" ? "Claimed offer" : "Unfiltered offer",
            pitch: "Navigation fixture",
            status: "claimed",
            asset: { assetType: "verse" },
          },
        ],
      },
    });
  });
  await page.goto("/quirk/offers");
  await expect(
    page.getByText("Unfiltered offer", { exact: true }),
  ).toBeVisible();
  const filters = page.getByRole("group", { name: "Filter offers" });
  await filters.getByRole("button", { name: "claimed", exact: true }).click();
  await expect(page).toHaveURL(/\/quirk\/offers\?status=claimed$/);
  await expect(page.getByText("Claimed offer", { exact: true })).toBeVisible();

  // A document marker distinguishes the persistent App Router link from reload.
  await page.evaluate(() => {
    document.documentElement.dataset.offersNavigation = "same-document";
  });
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Offers", exact: true })
    .click();
  await expect(page).toHaveURL(/\/quirk\/offers$/);
  await expect(
    filters.getByRole("button", { name: "all", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    filters.getByRole("button", { name: "claimed", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByText("Unfiltered offer", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Claimed offer", { exact: true })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute(
    "data-offers-navigation",
    "same-document",
  );
});
