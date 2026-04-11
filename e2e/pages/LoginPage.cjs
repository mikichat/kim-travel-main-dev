// @ts-check
/**
 * 로그인 페이지 Page Object Model
 */

class LoginPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email, password) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
  }

  async getErrorMessage() {
    return await this.page.textContent('[data-testid="error-message"]');
  }

  async isErrorMessageVisible() {
    return await this.page.isVisible('[data-testid="error-message"]');
  }

  async waitForNavigation() {
    await this.page.waitForNavigation();
  }
}

module.exports = LoginPage;
