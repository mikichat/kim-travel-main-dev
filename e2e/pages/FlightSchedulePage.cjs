// @ts-check
/**
 * 항공 스케줄 관리 페이지 Page Object Model
 */

class FlightSchedulePage {
  constructor(page) {
    this.page = page;
  }

  async addFlight(data) {
    await this.page.click('[data-testid="add-flight-button"]');
    await this.page.waitForSelector('[data-testid="flight-form"]');

    await this.page.fill('[data-testid="airline-input"]', data.airline);
    await this.page.fill('[data-testid="flight-number-input"]', data.flightNumber);
    await this.page.fill('[data-testid="departure-airport-input"]', data.departureAirport);
    await this.page.fill('[data-testid="arrival-airport-input"]', data.arrivalAirport);
    await this.page.fill('[data-testid="departure-time-input"]', data.departureTime);
    await this.page.fill('[data-testid="arrival-time-input"]', data.arrivalTime);
    await this.page.fill('[data-testid="aircraft-input"]', data.aircraft);
    await this.page.fill('[data-testid="seats-input"]', data.seats);
    await this.page.fill('[data-testid="price-input"]', data.price);

    await this.page.click('[data-testid="submit-flight-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async getFlightList() {
    return await this.page.locator('[data-testid^="flight-item-"]').allTextContents();
  }

  async getFlightCount() {
    return await this.page.locator('[data-testid^="flight-item-"]').count();
  }

  async deleteFlight(flightNumber) {
    await this.page.click(`[data-testid="delete-flight-${flightNumber}"]`);
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForLoadState('networkidle');
  }

  async editFlight(flightNumber, data) {
    await this.page.click(`[data-testid="edit-flight-${flightNumber}"]`);
    await this.page.waitForSelector('[data-testid="flight-form"]');

    await this.page.fill('[data-testid="price-input"]', data.price);
    await this.page.fill('[data-testid="seats-input"]', data.seats);

    await this.page.click('[data-testid="submit-flight-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async isFlightVisible(flightNumber) {
    return await this.page.isVisible(`text=${flightNumber}`);
  }
}

module.exports = FlightSchedulePage;
