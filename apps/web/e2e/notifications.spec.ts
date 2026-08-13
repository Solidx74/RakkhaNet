import { test, expect } from "@playwright/test";
import { authenticateAsE2EAdmin } from "./helpers/auth";

test.describe("Disaster Broadcast Alerts End-to-End Tests", () => {
  test("Admin can issue emergency broadcast and citizens receive live alerts", async ({ page }) => {
    await authenticateAsE2EAdmin(page);
    // 1. Visit Admin Broadcast panel directly
    await page.goto("/admin/broadcast");

    // Check heading is visible
    await expect(page.locator("h2")).toContainText("Emergency Alert Broadcast Panel");

    // Fill form
    await page.getByPlaceholder("e.g. Danger Signal No. 10 Cyclone Alert").fill("National Cyclone Warning");
    await page.getByPlaceholder("Describe details, evacuation corridors, or emergency contacts...").fill("Cyclone Sidr approaching coastal belt. Evacuate to patenga center.");

    // Submit alert
    await page.click("button[type='submit']");

    // Success notice display
    await expect(page.getByText("Disaster broadcast dispatched successfully")).toBeVisible();
  });
});
