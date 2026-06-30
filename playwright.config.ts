import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  retries: 1,
  fullyParallel: false,

  use: {
    headless: process.env.DMF_TEST_HEADLESS !== 'false',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    baseURL: process.env.DMF_TEST_SITE_URL || 'https://dmfam.org',
  },

  // Each spec file navigates to its target site explicitly.
  // No projects — all specs share the same Chrome launch config
  // defined in helpers/browser.ts via the dmfPage fixture.
});
