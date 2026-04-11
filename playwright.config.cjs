// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.cjs',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'node backend/server.js',
    port: 5000,
    timeout: 15000,
    reuseExistingServer: true,
  },
  outputDir: './e2e/test-results',
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
});
