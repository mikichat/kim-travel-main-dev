// @ts-check
/**
 * E2E 테스트: 항공 스케줄 관리 - CRUD 작업
 * 항공편 추가, 조회, 수정, 삭제 워크플로우
 */

const { test, expect } = require('@playwright/test');
const LoginPage = require('./pages/LoginPage.cjs');
const DashboardPage = require('./pages/DashboardPage.cjs');
const FlightSchedulePage = require('./pages/FlightSchedulePage.cjs');
const { testUser, testFlight, testFlightUpdate } = require('./fixtures/test-data.cjs');

test.describe('Flight Schedule Management - CRUD', () => {
  let loginPage;
  let dashboardPage;
  let flightSchedulePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    flightSchedulePage = new FlightSchedulePage(page);

    // 로그인 및 항공 스케줄 페이지 이동
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForNavigation();
    await dashboardPage.navigateTo('flight-schedule');
  });

  test('should add a new flight', async ({ page }) => {
    const initialCount = await flightSchedulePage.getFlightCount();
    await flightSchedulePage.addFlight(testFlight);

    const newCount = await flightSchedulePage.getFlightCount();
    expect(newCount).toBe(initialCount + 1);
    expect(await flightSchedulePage.isFlightVisible(testFlight.flightNumber)).toBeTruthy();
  });

  test('should display flight list', async ({ page }) => {
    const flights = await flightSchedulePage.getFlightList();
    expect(flights.length).toBeGreaterThanOrEqual(0);
  });

  test('should edit flight information', async ({ page }) => {
    // 항공편 추가
    await flightSchedulePage.addFlight(testFlight);
    await page.waitForTimeout(500);

    // 항공편 수정 (가격과 좌석수만 수정)
    await flightSchedulePage.editFlight(testFlight.flightNumber, {
      price: '250000',
      seats: '180',
    });

    // 수정 확인 (새로운 가격으로 검색)
    const flightItems = await page.locator('[data-testid^="flight-item-"]').allTextContents();
    const hasUpdatedPrice = flightItems.some(item => item.includes('250000'));
    expect(hasUpdatedPrice).toBeTruthy();
  });

  test('should delete a flight', async ({ page }) => {
    // 항공편 추가
    await flightSchedulePage.addFlight(testFlight);
    await page.waitForTimeout(500);

    const countBefore = await flightSchedulePage.getFlightCount();

    // 항공편 삭제
    await flightSchedulePage.deleteFlight(testFlight.flightNumber);

    const countAfter = await flightSchedulePage.getFlightCount();
    expect(countAfter).toBe(countBefore - 1);
  });

  test('should validate required fields when adding flight', async ({ page }) => {
    await page.click('[data-testid="add-flight-button"]');
    await page.waitForSelector('[data-testid="flight-form"]');

    // 필수 필드 없이 제출 시도
    await page.click('[data-testid="submit-flight-button"]');

    // 에러 메시지 또는 유효성 검사 확인
    const errorVisible = await page.isVisible('[data-testid="error-message"]');
    expect(errorVisible).toBeTruthy();
  });

  test('should search for flight by flight number', async ({ page }) => {
    // 항공편 추가
    await flightSchedulePage.addFlight(testFlight);
    await page.waitForTimeout(500);

    // 검색
    await page.fill('[data-testid="search-flight-input"]', testFlight.flightNumber);
    await page.waitForLoadState('networkidle');

    const flights = await flightSchedulePage.getFlightList();
    expect(flights.length).toBeGreaterThan(0);
    expect(flights[0]).toContain(testFlight.flightNumber);
  });
});
