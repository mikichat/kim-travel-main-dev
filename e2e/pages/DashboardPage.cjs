// @ts-check
/**
 * 대시보드 페이지 Page Object Model
 */

class DashboardPage {
  constructor(page) {
    this.page = page;
  }

  async navigateTo(menuName) {
    const sidebarLink = this.page.locator(`[data-testid="sidebar-${menuName}"]`);
    await sidebarLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getSidebarItems() {
    return await this.page.locator('[data-testid^="sidebar-"]').allTextContents();
  }

  async getPageTitle() {
    return await this.page.textContent('[data-testid="page-title"]');
  }

  async isLoaded() {
    return await this.page.isVisible('[data-testid="page-title"]');
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
  }
}

module.exports = DashboardPage;
