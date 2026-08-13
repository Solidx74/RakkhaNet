import { test, expect } from "@playwright/test";

test.describe("Relief requests & Coordinator Dashboard End-to-End Tests", () => {
  test("Citizen can submit relief request successfully", async ({ page }) => {
    await page.goto("/relief-requests/new");

    await expect(page.locator("h2")).toContainText("Submit Request for Emergency Aid");

    // Fill the form
    await page.getByPlaceholder("e.g. Abul Kalam").fill("Rahim Uddin");
    await page.getByPlaceholder("e.g. 01712345678").fill("01799887766");
    await page.getByPlaceholder("e.g. Village: Patharghata, Ward 3 near central mosque").fill("Mirpur Section 1");
    await page.getByPlaceholder("Describe your emergency needs (keywords like child, elder, drown, starve help AI score priority)...").fill("Need clean water and dry food for starving child.");

    // Submit
    await page.click("button[type='submit']");

    // Check success notification
    await expect(page.getByText("Your relief request was received successfully!")).toBeVisible();
  });
});
