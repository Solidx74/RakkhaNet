import { test, expect } from "@playwright/test";

test.describe("Risk Map Module End-to-End Tests", () => {
  test("User can navigate to Risk Map page and search risk zones by region", async ({ page }) => {
    // Navigate to Risk Map page
    await page.goto("http://localhost:3000/risk-map");

    // Verify page heading
    await expect(page.locator("h1")).toContainText("RiskMap");

    // Verify analytics summary cards render
    await expect(page.getByText("Active Hazard Zones")).toBeVisible();
    await expect(page.getByText("Critical Warning Zones")).toBeVisible();

    // Verify search input is present
    const searchInput = page.getByPlaceholder("e.g. Sunamganj, Cox's Bazar, Sylhet...");
    await expect(searchInput).toBeVisible();

    // Search region "Sunamganj"
    await searchInput.fill("Sunamganj");

    // Verify Sunamganj risk zone card appears
    await expect(page.getByText("Sunamganj Surma River Basin Inundation Zone")).toBeVisible();
  });
});
