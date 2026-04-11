// @ts-check
/**
 * 인보이스 관리 페이지 Page Object Model
 */

class InvoicePage {
  constructor(page) {
    this.page = page;
  }

  async createInvoice(data) {
    await this.page.click('[data-testid="create-invoice-button"]');
    await this.page.waitForSelector('[data-testid="invoice-form"]');

    await this.page.fill('[data-testid="invoice-number-input"]', data.invoiceNumber);
    await this.page.fill('[data-testid="invoice-date-input"]', data.date);
    await this.page.fill('[data-testid="due-date-input"]', data.dueDate);
    await this.page.fill('[data-testid="client-name-input"]', data.clientName);
    await this.page.fill('[data-testid="amount-input"]', data.amount);
    await this.page.fill('[data-testid="description-input"]', data.description);

    await this.page.click('[data-testid="submit-invoice-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async getInvoiceList() {
    return await this.page.locator('[data-testid^="invoice-item-"]').allTextContents();
  }

  async getInvoiceCount() {
    return await this.page.locator('[data-testid^="invoice-item-"]').count();
  }

  async openPreview(invoiceNumber) {
    await this.page.click(`[data-testid="preview-invoice-${invoiceNumber}"]`);
    await this.page.waitForSelector('[data-testid="invoice-preview"]');
  }

  async downloadInvoice(invoiceNumber) {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click(`[data-testid="download-invoice-${invoiceNumber}"]`);
    return await downloadPromise;
  }

  async isPreviewVisible() {
    return await this.page.isVisible('[data-testid="invoice-preview"]');
  }

  async closePreview() {
    await this.page.click('[data-testid="close-preview"]');
  }
}

module.exports = InvoicePage;
