import { test, expect } from "@playwright/test";

test.describe("Evacuation Guidance Module End-to-End Tests", () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock user geolocation to Chattogram, Bangladesh [lat: 22.35, lng: 91.80]
    await context.setGeolocation({ latitude: 22.35, longitude: 91.80 });
    await context.grantPermissions(["geolocation"]);
  });

  test("User can navigate from Shelter Locator to Evacuation Guidance and view step-by-step route", async ({ page }) => {
    // 1. Visit Evacuation Guidance Page directly
    await page.goto("http://localhost:3000/evacuation");

    // 2. Check page heading
    await expect(page.locator("h1")).toContainText("EvacuationGuidance");

    // 3. Verify Stat Pills render total distance and evacuation duration
    await expect(page.getByText("Total Distance")).toBeVisible();
    await expect(page.getByText("Est. Evacuation Time")).toBeVisible();

    // 4. Verify step-by-step navigation list is present
    await expect(page.getByText("Step-by-Step Navigation Instructions")).toBeVisible();
  });
});
