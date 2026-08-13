import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  // Use the installed Chrome channel so contributors do not need a separate browser download.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:5001",
      NEXT_PUBLIC_SOCKET_URL: "http://localhost:5001",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
