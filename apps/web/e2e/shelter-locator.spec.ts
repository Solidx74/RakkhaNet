import { test, expect } from "@playwright/test";
import { authenticateAsE2EAdmin } from "./helpers/auth";

test.describe("Shelter Locator Module End-to-End Tests", () => {
  test.beforeEach(async ({ page, context }) => {
    await authenticateAsE2EAdmin(page);
    // Mock user geolocation to Chattogram, Bangladesh [lat: 22.35, lng: 91.80]
    await context.setGeolocation({ latitude: 22.35, longitude: 91.80 });
    await context.grantPermissions(["geolocation"]);
  });

  test("User can load Shelter Locator page and view nearest emergency shelters", async ({ page }) => {
    // Navigate to shelter locator page
    await page.goto("/shelters");

    // Check page title and heading
    await expect(page.locator("h1")).toContainText("ShelterLocator");

    // Check Geolocation status indicator badge
    await expect(page.getByText("Nearby Mode Active")).toBeVisible();

    // Verify search input is rendered
    const searchInput = page.getByPlaceholder("Search shelter name or address...");
    await expect(searchInput).toBeVisible();

    // Search for Patenga shelter
    await searchInput.fill("Patenga");

    // Verify filtered shelter card appears in sidebar
    await expect(page.getByText("Patenga Coastal Cyclone Shelter")).toBeVisible();
  });
});
