// @ts-check
/**
 * E2E 테스트: 일정 관리 - CRUD 작업
 * 일정 생성, 조회, 수정, 삭제 전체 워크플로우
 */

const { test, expect } = require('@playwright/test');
const LoginPage = require('./pages/LoginPage.cjs');
const DashboardPage = require('./pages/DashboardPage.cjs');
const SchedulePage = require('./pages/SchedulePage.cjs');
const { testUser, testSchedule, testScheduleUpdate } = require('./fixtures/test-data.cjs');

test.describe('Schedule Management - CRUD', () => {
  let loginPage;
  let dashboardPage;
  let schedulePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    schedulePage = new SchedulePage(page);

    // 로그인 및 일정 페이지 이동
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForNavigation();
    await dashboardPage.navigateTo('schedule');
  });

  test('should create a new schedule', async ({ page }) => {
    const initialCount = await schedulePage.getScheduleCount();
    await schedulePage.createSchedule(testSchedule);

    const newCount = await schedulePage.getScheduleCount();
    expect(newCount).toBe(initialCount + 1);
    expect(await schedulePage.isScheduleVisible(testSchedule.groupName)).toBeTruthy();
  });

  test('should display all schedules in list', async ({ page }) => {
    const schedules = await schedulePage.getScheduleList();
    expect(schedules.length).toBeGreaterThan(0);
  });

  test('should edit an existing schedule', async ({ page }) => {
    // 먼저 일정 생성
    await schedulePage.createSchedule(testSchedule);
    await page.waitForTimeout(500);

    // 일정 수정 (ID는 동적으로 선택되므로, 마지막 생성된 일정으로 가정)
    const scheduleItems = await page.locator('[data-testid^="schedule-item-"]').count();
    const lastId = scheduleItems - 1;

    await schedulePage.editSchedule(lastId, testScheduleUpdate);
    expect(await schedulePage.isScheduleVisible(testScheduleUpdate.groupName)).toBeTruthy();
  });

  test('should delete a schedule', async ({ page }) => {
    // 일정 생성
    await schedulePage.createSchedule(testSchedule);
    await page.waitForTimeout(500);

    const countBefore = await schedulePage.getScheduleCount();

    // 마지막 일정 삭제
    const scheduleItems = await page.locator('[data-testid^="schedule-item-"]').count();
    const lastId = scheduleItems - 1;

    await schedulePage.deleteSchedule(lastId);

    const countAfter = await schedulePage.getScheduleCount();
    expect(countAfter).toBe(countBefore - 1);
  });

  test('should require group name field', async ({ page }) => {
    await page.click('[data-testid="create-schedule-button"]');
    await page.waitForSelector('[data-testid="schedule-form"]');

    // 필수 필드 없이 제출 시도
    await page.click('[data-testid="submit-schedule-button"]');

    // 에러 메시지 확인
    const errorVisible = await page.isVisible('[data-testid="error-message"]');
    expect(errorVisible).toBeTruthy();
  });
});
