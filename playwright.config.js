import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5188",
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
    headless: true,
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 960 },
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 5188 --strictPort",
    url: "http://127.0.0.1:5188",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
