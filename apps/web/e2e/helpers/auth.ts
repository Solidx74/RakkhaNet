import { expect, type Page } from "@playwright/test";

export async function authenticateAsE2EAdmin(page: Page) {
  const response = await page.request.post("http://localhost:5001/api/auth/sign-in", {
    data: { email: "e2e-admin@rakkhanet.test", password: "E2E_Admin_1234" },
  });
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem("rakkhanet_token", token);
    localStorage.setItem("rakkhanet_user", JSON.stringify(user));
  }, payload.data);
}
