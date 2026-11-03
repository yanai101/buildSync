import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Test credentials live in the git-ignored `.env.e2e` (see `.env.e2e.example`).
if (existsSync('.env.e2e')) process.loadEnvFile('.env.e2e');

/**
 * End-to-end smoke tests: every page loads without JS errors, console errors
 * or error screens. Runs against the local dev server (reused if already up).
 *
 *   npm run test:e2e            # headless
 *   npm run test:e2e -- --ui    # interactive
 *
 * Credentials: E2E_EMAIL / E2E_PASSWORD from `.env.e2e` (git-ignored) or the environment.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'he-IL',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'public',
      testMatch: /public\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'app-desktop',
      testMatch: /(app|room-archive|teaser)\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
    },
    {
      name: 'app-mobile',
      testMatch: /(room-archive|teaser)\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'], storageState: 'e2e/.auth/user.json' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
