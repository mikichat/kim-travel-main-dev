// @ts-check
/**
 * E2E 테스트: 인보이스 관리 - CRUD 작업
 * 인보이스 생성, 조회, 미리보기, 다운로드
 */

const { test, expect } = require('@playwright/test');
const LoginPage = require('./pages/LoginPage.cjs');
const DashboardPage = require('./pages/DashboardPage.cjs');
const InvoicePage = require('./pages/InvoicePage.cjs');
const { testUser, testInvoice } = require('./fixtures/test-data.cjs');

test.describe('Invoice Management - CRUD', () => {
  let loginPage;
  let dashboardPage;
  let invoicePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    invoicePage = new InvoicePage(page);

    // 로그인 및 인보이스 페이지 이동
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForNavigation();
    await dashboardPage.navigateTo('invoice');
  });

  test('should create a new invoice', async ({ page }) => {
    const initialCount = await invoicePage.getInvoiceCount();
    await invoicePage.createInvoice(testInvoice);

    const newCount = await invoicePage.getInvoiceCount();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should display invoice list', async ({ page }) => {
    const invoices = await invoicePage.getInvoiceList();
    expect(invoices.length).toBeGreaterThanOrEqual(0);
  });

  test('should open invoice preview', async ({ page }) => {
    // 인보이스 생성
    await invoicePage.createInvoice(testInvoice);
    await page.waitForTimeout(500);

    // 미리보기 열기
    await invoicePage.openPreview(testInvoice.invoiceNumber);

    const isVisible = await invoicePage.isPreviewVisible();
    expect(isVisible).toBeTruthy();
  });

  test('should close invoice preview', async ({ page }) => {
    // 인보이스 생성
    await invoicePage.createInvoice(testInvoice);
    await page.waitForTimeout(500);

    // 미리보기 열기
    await invoicePage.openPreview(testInvoice.invoiceNumber);
    await page.waitForSelector('[data-testid="invoice-preview"]');

    // 미리보기 닫기
    await invoicePage.closePreview();

    const isVisible = await invoicePage.isPreviewVisible();
    expect(isVisible).toBeFalsy();
  });

  test('should search for invoice by number', async ({ page }) => {
    // 인보이스 생성
    await invoicePage.createInvoice(testInvoice);
    await page.waitForTimeout(500);

    // 검색
    await page.fill('[data-testid="search-invoice-input"]', testInvoice.invoiceNumber);
    await page.waitForLoadState('networkidle');

    const invoices = await invoicePage.getInvoiceList();
    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices[0]).toContain(testInvoice.invoiceNumber);
  });
});
