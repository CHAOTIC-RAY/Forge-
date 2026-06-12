import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Point at a running instance via PLAYWRIGHT_BASE_URL
 * (e.g. the Cloudflare preview/prod URL or a local `npm run preview`).
 * These tests are intentionally not part of the unit-test CI job because they
 * require a live deployment + auth; run them with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
