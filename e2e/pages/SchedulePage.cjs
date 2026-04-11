// @ts-check
/**
 * 일정 관리 페이지 Page Object Model
 */

class SchedulePage {
  constructor(page) {
    this.page = page;
  }

  async createSchedule(data) {
    await this.page.click('[data-testid="create-schedule-button"]');
    await this.page.waitForSelector('[data-testid="schedule-form"]');

    await this.page.fill('[data-testid="group-name-input"]', data.groupName);
    await this.page.fill('[data-testid="event-date-input"]', data.eventDate);
    await this.page.fill('[data-testid="destination-input"]', data.destination);
    await this.page.fill('[data-testid="days-input"]', data.days);
    await this.page.fill('[data-testid="members-input"]', data.members);
    await this.page.fill('[data-testid="notes-input"]', data.notes);

    await this.page.click('[data-testid="submit-schedule-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async editSchedule(id, data) {
    await this.page.click(`[data-testid="edit-schedule-${id}"]`);
    await this.page.waitForSelector('[data-testid="schedule-form"]');

    await this.page.fill('[data-testid="group-name-input"]', data.groupName);
    await this.page.fill('[data-testid="event-date-input"]', data.eventDate);
    await this.page.fill('[data-testid="destination-input"]', data.destination);
    await this.page.fill('[data-testid="days-input"]', data.days);
    await this.page.fill('[data-testid="members-input"]', data.members);
    await this.page.fill('[data-testid="notes-input"]', data.notes);

    await this.page.click('[data-testid="submit-schedule-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async deleteSchedule(id) {
    await this.page.click(`[data-testid="delete-schedule-${id}"]`);
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForLoadState('networkidle');
  }

  async getScheduleList() {
    return await this.page.locator('[data-testid^="schedule-item-"]').allTextContents();
  }

  async getScheduleCount() {
    return await this.page.locator('[data-testid^="schedule-item-"]').count();
  }

  async isScheduleVisible(groupName) {
    return await this.page.isVisible(`text=${groupName}`);
  }
}

module.exports = SchedulePage;
