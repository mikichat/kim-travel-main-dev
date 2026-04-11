// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page.locator('input[type="email"], input[name="email"], #email')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"], input[name="password"], #password')).toBeVisible({ timeout: 5000 });
  });

  test('login with invalid credentials fails', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('login with empty credentials fails', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: '',
        password: '',
      },
    });
    // 400 or 401
    expect([400, 401]).toContain(response.status());
  });

  test('logout without session succeeds gracefully', async ({ request }) => {
    const response = await request.post('/api/auth/logout');
    // Server allows logout even without active session (200)
    expect(response.status()).toBe(200);
  });

  test('protected API without auth returns 401', async ({ request }) => {
    const response = await request.get('/tables/groups');
    expect(response.status()).toBe(401);
  });
});
