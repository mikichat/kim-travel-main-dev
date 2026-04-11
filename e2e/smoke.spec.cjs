// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Smoke Tests', () => {
  test('Swagger UI is accessible', async ({ page }) => {
    const response = await page.goto('/api-docs/');
    expect(response.status()).toBe(200);
    await expect(page.locator('div.swagger-ui')).toBeVisible({ timeout: 10000 });
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page).toHaveTitle(/.*로그인.*|.*login.*/i);
  });

  test('unauthenticated API returns 401', async ({ request }) => {
    const response = await request.get('/api/schedules');
    expect(response.status()).toBe(401);
  });

  test('static files served', async ({ page }) => {
    const response = await page.goto('/login.html');
    expect(response.status()).toBe(200);
  });

  test('API docs JSON available', async ({ request }) => {
    const response = await request.get('/api-docs/swagger-ui-init.js');
    expect(response.status()).toBe(200);
  });
});
