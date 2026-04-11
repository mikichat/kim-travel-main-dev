const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.ts',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://192.168.0.15:5174',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
