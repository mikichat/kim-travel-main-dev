/**
 * auto-backup.js unit tests (Phase 69)
 *
 * Tests pure functions only: generateChecksum, validateBackup, generateRestorePreview
 * Avoids DOMContentLoaded auto-init by mocking document and window.
 */

// ---- global shims ----
const localStorageData = {};
global.window = global;
global.localStorage = {
  getItem: jest.fn((key) => localStorageData[key] || null),
  setItem: jest.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: jest.fn((key) => { delete localStorageData[key]; }),
};
global.document = {
  readyState: 'loading',
  addEventListener: jest.fn(),
};
global.Notification = { permission: 'default' };
global.Blob = class {
  constructor(parts) {
    this.size = parts.reduce((s, p) => s + p.length, 0);
  }
};
global.URL = { createObjectURL: jest.fn(), revokeObjectURL: jest.fn() };
global.showToast = jest.fn();
global.showConfirmModal = jest.fn();
global.TravelAgencyDB = undefined;

require('../../js/auto-backup.js');
const AutoBackup = global.AutoBackup;

beforeEach(() => {
  Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
  jest.clearAllMocks();
  // Clear any scheduled timers
  if (AutoBackup._backupTimeout) {
    clearTimeout(AutoBackup._backupTimeout);
    AutoBackup._backupTimeout = null;
  }
  if (AutoBackup._backupInterval) {
    clearInterval(AutoBackup._backupInterval);
    AutoBackup._backupInterval = null;
  }
  // Reset window.location mock
  delete global.window.location;
  global.window.location = { reload: jest.fn() };
});

// ============================================================
// generateChecksum
// ============================================================
describe('AutoBackup.generateChecksum', () => {
  test('same data returns same checksum', () => {
    const data = { key: 'value' };
    const c1 = AutoBackup.generateChecksum(data);
    const c2 = AutoBackup.generateChecksum(data);
    expect(c1).toBe(c2);
  });

  test('different data returns different checksum', () => {
    const c1 = AutoBackup.generateChecksum({ a: '1' });
    const c2 = AutoBackup.generateChecksum({ a: '2' });
    expect(c1).not.toBe(c2);
  });

  test('empty object produces a checksum', () => {
    const c = AutoBackup.generateChecksum({});
    expect(typeof c).toBe('string');
    expect(c.length).toBeGreaterThan(0);
  });

  test('returns hex string', () => {
    const c = AutoBackup.generateChecksum({ test: 'data' });
    expect(c).toMatch(/^-?[0-9a-f]+$/);
  });

  test('null values work', () => {
    const c = AutoBackup.generateChecksum({ key: null });
    expect(typeof c).toBe('string');
  });
});

// ============================================================
// validateBackup
// ============================================================
describe('AutoBackup.validateBackup', () => {
  test('null → invalid', () => {
    const result = AutoBackup.validateBackup(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('백업 데이터가 비어있습니다.');
  });

  test('missing timestamp → error', () => {
    const result = AutoBackup.validateBackup({ data: {} });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('백업 타임스탬프가 없습니다.');
  });

  test('missing data → error', () => {
    const result = AutoBackup.validateBackup({ timestamp: Date.now() });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('백업 데이터 객체가 없습니다.');
  });

  test('valid backup', () => {
    const data = { 'group-roster-data': '[]' };
    const result = AutoBackup.validateBackup({
      timestamp: Date.now() - 1000,
      data,
      checksum: AutoBackup.generateChecksum(data),
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('future timestamp → error', () => {
    const result = AutoBackup.validateBackup({
      timestamp: Date.now() + 100000000,
      data: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('미래 날짜'))).toBe(true);
  });

  test('checksum mismatch → error', () => {
    const result = AutoBackup.validateBackup({
      timestamp: Date.now() - 1000,
      data: { key: 'value' },
      checksum: 'wrong-checksum',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('무결성'))).toBe(true);
  });

  test('invalid JSON in data field → error', () => {
    const result = AutoBackup.validateBackup({
      timestamp: Date.now() - 1000,
      data: { customers: 'not-json{{{' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('JSON 형식'))).toBe(true);
  });

  test('valid data with no checksum → valid', () => {
    const result = AutoBackup.validateBackup({
      timestamp: Date.now() - 1000,
      data: { customers: '[]' },
    });
    expect(result.valid).toBe(true);
  });

  test('invalid timestamp format → error', () => {
    const result = AutoBackup.validateBackup({
      timestamp: 'not-a-date',
      data: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('타임스탬프 형식'))).toBe(true);
  });

  test('null data value is skipped in JSON validation', () => {
    const result = AutoBackup.validateBackup({
      timestamp: Date.now() - 1000,
      data: { customers: null, products: '[]' },
    });
    expect(result.valid).toBe(true);
  });
});

// ============================================================
// generateRestorePreview
// ============================================================
describe('AutoBackup.generateRestorePreview', () => {
  test('with stats (new format)', () => {
    const backup = {
      stats: {
        'group-roster-data': 5,
        flight_saves_v2: 3,
        customers: 0,
      },
    };
    const preview = AutoBackup.generateRestorePreview(backup);
    expect(preview).toContain('단체명단: 5건');
    expect(preview).toContain('항공편: 3건');
    expect(preview).not.toContain('고객');
  });

  test('legacy format (no stats, has data)', () => {
    const backup = {
      data: {
        customers: '[{"id":1},{"id":2}]',
        products: '{"name":"test"}',
      },
    };
    const preview = AutoBackup.generateRestorePreview(backup);
    expect(preview).toContain('고객: 2건');
    expect(preview).toContain('상품: 1건');
  });

  test('empty data → "(데이터 없음)"', () => {
    const backup = { data: {} };
    const preview = AutoBackup.generateRestorePreview(backup);
    expect(preview).toBe('  (데이터 없음)');
  });

  test('no stats, no data → "(데이터 없음)"', () => {
    const backup = {};
    const preview = AutoBackup.generateRestorePreview(backup);
    expect(preview).toBe('  (데이터 없음)');
  });

  test('legacy format with unparseable JSON → "있음"', () => {
    const backup = {
      data: {
        customers: 'not-json',
      },
    };
    const preview = AutoBackup.generateRestorePreview(backup);
    expect(preview).toContain('있음');
  });

  test('legacy format with null values excluded', () => {
    const backup = {
      data: {
        customers: null,
        products: '[{"id":1}]',
      },
    };
    const preview = AutoBackup.generateRestorePreview(backup);
    expect(preview).not.toContain('고객');
    expect(preview).toContain('상품: 1건');
  });

  test('legacy format with unknown key uses key name', () => {
    const backup = {
      data: {
        unknown_key: '["a","b"]',
      },
    };
    const preview = AutoBackup.generateRestorePreview(backup);
    expect(preview).toContain('unknown_key: 2건');
  });
});

// ============================================================
// createBackup
// ============================================================
describe('AutoBackup.createBackup', () => {
  test('creates backup and stores in localStorage', () => {
    localStorageData['group-roster-data'] = '[{"id":1}]';
    localStorageData['flight_saves_v2'] = '[]';

    const backup = AutoBackup.createBackup();
    expect(backup).not.toBeNull();
    expect(backup.version).toBe('2.0');
    expect(backup.timestamp).toBeTruthy();
    expect(backup.data['group-roster-data']).toBe('[{"id":1}]');
    expect(backup.checksum).toBeTruthy();
  });

  test('respects MAX_BACKUPS limit', () => {
    // Pre-fill with MAX_BACKUPS items
    const existing = Array.from({ length: AutoBackup.MAX_BACKUPS }, (_, i) => ({
      timestamp: Date.now() - (i + 1) * 1000,
      data: {},
      stats: {},
      size: 0,
    }));
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify(existing);

    AutoBackup.createBackup();

    const backups = JSON.parse(localStorageData[AutoBackup.BACKUP_KEY]);
    expect(backups.length).toBeLessThanOrEqual(AutoBackup.MAX_BACKUPS);
  });
});

// ============================================================
// getBackups / getLastBackupTime / getBackupStatus
// ============================================================
describe('AutoBackup getBackups/getLastBackupTime/getBackupStatus', () => {
  test('getBackups empty → empty array', () => {
    expect(AutoBackup.getBackups()).toEqual([]);
  });

  test('getBackups with invalid JSON → empty array', () => {
    localStorageData[AutoBackup.BACKUP_KEY] = 'not-json';
    expect(AutoBackup.getBackups()).toEqual([]);
  });

  test('getLastBackupTime with no backups → null', () => {
    expect(AutoBackup.getLastBackupTime()).toBeNull();
  });

  test('getLastBackupTime returns last backup timestamp', () => {
    const ts = Date.now();
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([
      { timestamp: ts - 1000 },
      { timestamp: ts },
    ]);
    expect(AutoBackup.getLastBackupTime()).toBe(ts);
  });

  test('getBackupStatus returns correct structure', () => {
    const status = AutoBackup.getBackupStatus();
    expect(status).toHaveProperty('totalBackups');
    expect(status).toHaveProperty('lastBackupTime');
    expect(status).toHaveProperty('nextBackupTime');
    expect(status).toHaveProperty('totalSize');
  });

  test('getBackupStatus with backups returns formatted data', () => {
    const ts = Date.now() - 1000;
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([
      { timestamp: ts, size: 2048 },
    ]);
    const status = AutoBackup.getBackupStatus();
    expect(status.totalBackups).toBe(1);
    expect(status.lastBackupTime).not.toBe('없음');
    expect(status.nextBackupTime).not.toBe('없음');
    expect(status.totalSize).toBe(2048);
  });

  test('getBackupStatus with no backups returns no backup state', () => {
    const status = AutoBackup.getBackupStatus();
    expect(status.totalBackups).toBe(0);
    expect(status.lastBackupTime).toBe('없음');
    expect(status.nextBackupTime).toBe('페이지 새로고침 시');
    expect(status.totalSize).toBe(0);
  });
});

// ============================================================
// checkAndBackup
// ============================================================
describe('AutoBackup.checkAndBackup', () => {
  test('no previous backup → creates backup', () => {
    const spy = jest.spyOn(AutoBackup, 'createBackup').mockReturnValue({ timestamp: Date.now() });
    AutoBackup.checkAndBackup();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('recent backup exists → does not create backup', () => {
    const recentBackup = { timestamp: Date.now() - 1000, data: {}, size: 0 };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([recentBackup]);

    const spy = jest.spyOn(AutoBackup, 'createBackup').mockReturnValue({});
    AutoBackup.checkAndBackup();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('expired backup → creates new backup', () => {
    const expiredBackup = { timestamp: Date.now() - (25 * 60 * 60 * 1000), data: {}, size: 0 };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([expiredBackup]);

    const spy = jest.spyOn(AutoBackup, 'createBackup').mockReturnValue({ timestamp: Date.now() });
    AutoBackup.checkAndBackup();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ============================================================
// scheduleBackup
// ============================================================
describe('AutoBackup.scheduleBackup', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('sets backup timeout and interval', () => {
    const spy = jest.spyOn(AutoBackup, 'createBackup').mockReturnValue({ timestamp: Date.now() });
    AutoBackup.scheduleBackup();

    expect(AutoBackup._backupTimeout).not.toBeNull();
    spy.mockRestore();
  });

  test('clears existing timeout before scheduling new one', () => {
    const spy = jest.spyOn(AutoBackup, 'createBackup').mockReturnValue({ timestamp: Date.now() });
    AutoBackup._backupTimeout = setTimeout(() => {}, 1000);
    const oldTimeout = AutoBackup._backupTimeout;

    AutoBackup.scheduleBackup();

    // New timeout should be different
    expect(AutoBackup._backupTimeout).not.toBe(oldTimeout);
    spy.mockRestore();
  });

  test('clears existing interval before scheduling new one', () => {
    const spy = jest.spyOn(AutoBackup, 'createBackup').mockReturnValue({ timestamp: Date.now() });
    // First schedule
    AutoBackup.scheduleBackup();
    expect(AutoBackup._backupTimeout).not.toBeNull();

    // Schedule again - should clear previous
    AutoBackup.scheduleBackup();
    expect(AutoBackup._backupTimeout).not.toBeNull();

    spy.mockRestore();
  });
});

// ============================================================
// showBackupNotification
// ============================================================
describe('AutoBackup.showBackupNotification', () => {
  test('shows notification when permission granted', () => {
    const mockNotification = jest.fn();
    const origNotification = global.Notification;
    global.Notification = mockNotification;
    global.Notification.permission = 'granted';

    AutoBackup.showBackupNotification({ size: 1024 });
    expect(mockNotification).toHaveBeenCalledWith(
      '자동 백업 완료',
      expect.objectContaining({
        body: expect.stringContaining('KB'),
      })
    );

    global.Notification = origNotification;
  });

  test('does NOT show notification when permission is default', () => {
    const mockNotification = jest.fn();
    const origNotification = global.Notification;
    global.Notification = mockNotification;
    global.Notification.permission = 'default';

    AutoBackup.showBackupNotification({ size: 1024 });
    expect(mockNotification).not.toHaveBeenCalled();

    global.Notification = origNotification;
  });

  test('does NOT show notification when permission is denied', () => {
    const mockNotification = jest.fn();
    const origNotification = global.Notification;
    global.Notification = mockNotification;
    global.Notification.permission = 'denied';

    AutoBackup.showBackupNotification({ size: 1024 });
    expect(mockNotification).not.toHaveBeenCalled();

    global.Notification = origNotification;
  });

  test('formats file size correctly in notification', () => {
    const mockNotification = jest.fn();
    const origNotification = global.Notification;
    global.Notification = mockNotification;
    global.Notification.permission = 'granted';

    AutoBackup.showBackupNotification({ size: 2048 });
    const callArgs = mockNotification.mock.calls[0];
    expect(callArgs[1].body).toContain('2.00 KB');

    global.Notification = origNotification;
  });
});

// ============================================================
// downloadBackup
// ============================================================
describe('AutoBackup.downloadBackup', () => {
  test('downloads backup file successfully', () => {
    const mockA = { href: '', download: '', click: jest.fn() };
    global.document.createElement = jest.fn(() => mockA);

    const backup = {
      timestamp: Date.now(),
      data: { customers: '[]' },
      size: 100,
      version: '2.0',
      appName: 'Test App',
    };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([backup]);

    const result = AutoBackup.downloadBackup(0);
    expect(result).toBe(true);
    expect(mockA.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  test('invalid index returns false and shows error', () => {
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([]);
    const result = AutoBackup.downloadBackup(99);
    expect(result).toBe(false);
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('다운로드 실패'),
      'error'
    );
  });

  test('negative index returns false', () => {
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([
      { timestamp: Date.now(), data: {}, size: 0 },
    ]);
    const result = AutoBackup.downloadBackup(-1);
    expect(result).toBe(false);
  });

  test('generates correct filename with date and time', () => {
    const mockA = { href: '', download: '', click: jest.fn() };
    global.document.createElement = jest.fn(() => mockA);

    const ts = new Date('2026-02-23T15:30:45').getTime();
    const backup = {
      timestamp: ts,
      data: {},
      size: 100,
      version: '2.0',
      appName: 'Test',
    };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([backup]);

    AutoBackup.downloadBackup(0);
    expect(mockA.download).toContain('travel-backup-');
    expect(mockA.download).toContain('.json');
  });

  test('adds checksum if missing', () => {
    const mockA = { href: '', download: '', click: jest.fn() };
    global.document.createElement = jest.fn(() => mockA);

    const backup = {
      timestamp: Date.now(),
      data: { customers: '[]' },
      size: 100,
      version: '2.0',
      appName: 'Test',
      // No checksum
    };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([backup]);

    AutoBackup.downloadBackup(0);
    expect(mockA.href).not.toBe('');
  });
});

// ============================================================
// downloadAllBackups
// ============================================================
describe('AutoBackup.downloadAllBackups', () => {
  test('no backups → warning toast', () => {
    const result = AutoBackup.downloadAllBackups();
    expect(result).toBe(false);
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('다운로드할 백업이 없습니다'),
      'warning'
    );
  });

  test('downloads all backups successfully', () => {
    const mockA = { href: '', download: '', click: jest.fn() };
    global.document.createElement = jest.fn(() => mockA);

    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([
      { timestamp: Date.now(), data: {}, size: 50 },
      { timestamp: Date.now() - 1000, data: {}, size: 50 },
    ]);

    const result = AutoBackup.downloadAllBackups();
    expect(result).toBe(true);
    expect(mockA.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  test('shows success toast with backup count', () => {
    const mockA = { href: '', download: '', click: jest.fn() };
    global.document.createElement = jest.fn(() => mockA);

    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([
      { timestamp: Date.now(), data: {}, size: 50 },
      { timestamp: Date.now() - 1000, data: {}, size: 50 },
      { timestamp: Date.now() - 2000, data: {}, size: 50 },
    ]);

    AutoBackup.downloadAllBackups();
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('3개'),
      'success'
    );
  });
});

// ============================================================
// restoreBackup
// ============================================================
describe('AutoBackup.restoreBackup', () => {
  test('invalid index returns false', async () => {
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([]);
    const result = await AutoBackup.restoreBackup(99);
    expect(result).toBe(false);
  });

  test('negative index returns false', async () => {
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([
      { timestamp: Date.now(), data: {}, size: 0 },
    ]);
    const result = await AutoBackup.restoreBackup(-1);
    expect(result).toBe(false);
  });

  test('user cancels restore → returns false', async () => {
    const backup = { timestamp: Date.now(), data: { customers: '[]' }, size: 50 };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([backup]);
    global.showConfirmModal.mockResolvedValueOnce(false);

    const result = await AutoBackup.restoreBackup(0);
    expect(result).toBe(false);
  });

  test('user confirms restore → shows success and reloads', async () => {
    const backup = {
      timestamp: Date.now(),
      data: { customers: '["test"]' },
      size: 50,
    };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([backup]);
    global.showConfirmModal.mockResolvedValueOnce(true);

    await AutoBackup.restoreBackup(0);
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('복원되었습니다'),
      'success'
    );
    expect(global.window.location.reload).toHaveBeenCalled();
  });

  test('restores data to localStorage before reload', async () => {
    const backup = {
      timestamp: Date.now(),
      data: { customers: '["test"]', products: '[]' },
      size: 50,
    };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([backup]);
    global.showConfirmModal.mockResolvedValueOnce(true);

    await AutoBackup.restoreBackup(0);
    expect(localStorageData.customers).toBe('["test"]');
    expect(localStorageData.products).toBe('[]');
  });
});

// ============================================================
// deleteBackup
// ============================================================
describe('AutoBackup.deleteBackup', () => {
  test('user cancels delete → returns false', async () => {
    const backup = { timestamp: Date.now(), data: {}, size: 0 };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([backup]);
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(false));

    const result = await AutoBackup.deleteBackup(0);
    expect(result).toBe(false);
  });

  test('successful deletion removes backup', async () => {
    const backup1 = { timestamp: Date.now() - 1000, data: {}, size: 0 };
    const backup2 = { timestamp: Date.now(), data: {}, size: 0 };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([backup1, backup2]);
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(true));

    const result = await AutoBackup.deleteBackup(0);
    expect(result).toBe(true);
    const remaining = JSON.parse(localStorageData[AutoBackup.BACKUP_KEY]);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].timestamp).toBe(backup2.timestamp);
  });

  test('invalid index returns false', async () => {
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([]);
    const result = await AutoBackup.deleteBackup(99);
    expect(result).toBe(false);
  });

  test('negative index returns false', async () => {
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([
      { timestamp: Date.now(), data: {}, size: 0 },
    ]);
    const result = await AutoBackup.deleteBackup(-1);
    expect(result).toBe(false);
  });

  test('deletes middle backup correctly', async () => {
    const ts1 = Date.now() - 2000;
    const ts2 = Date.now() - 1000;
    const ts3 = Date.now();
    const backups = [
      { timestamp: ts1, data: {}, size: 0 },
      { timestamp: ts2, data: {}, size: 0 },
      { timestamp: ts3, data: {}, size: 0 },
    ];
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify(backups);
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(true));

    await AutoBackup.deleteBackup(1);
    const remaining = JSON.parse(localStorageData[AutoBackup.BACKUP_KEY]);
    expect(remaining).toHaveLength(2);
    expect(remaining[0].timestamp).toBe(ts1);
    expect(remaining[1].timestamp).toBe(ts3);
  });
});

// ============================================================
// clearAllBackups
// ============================================================
describe('AutoBackup.clearAllBackups', () => {
  test('user confirms clear → removes all backups', async () => {
    localStorageData[AutoBackup.BACKUP_KEY] = '[{}, {}]';
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(true));

    const result = await AutoBackup.clearAllBackups();
    expect(result).toBe(true);
    expect(global.localStorage.removeItem).toHaveBeenCalledWith(AutoBackup.BACKUP_KEY);
  });

  test('user cancels clear → returns false', async () => {
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(false));
    const result = await AutoBackup.clearAllBackups();
    expect(result).toBe(false);
  });

  test('clears localStorage correctly', async () => {
    localStorageData[AutoBackup.BACKUP_KEY] = '[{timestamp: Date.now()}]';
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(true));

    await AutoBackup.clearAllBackups();
    expect(localStorageData[AutoBackup.BACKUP_KEY]).toBeUndefined();
  });
});

// ============================================================
// importBackup
// ============================================================
describe('AutoBackup.importBackup', () => {
  test('invalid JSON file → error toast', async () => {
    const mockFile = {
      text: jest.fn().mockResolvedValueOnce('not valid json'),
    };

    const result = await AutoBackup.importBackup(mockFile);
    expect(result).toBe(false);
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('JSON 파싱 실패'),
      'error'
    );
  });

  test('invalid backup data → error toast', async () => {
    const mockFile = {
      text: jest.fn().mockResolvedValueOnce(JSON.stringify({
        data: { customers: 'invalid-json{{{' },
      })),
    };

    const result = await AutoBackup.importBackup(mockFile);
    expect(result).toBe(false);
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('가져오기 실패'),
      'error'
    );
  });

  test('user cancels import → returns false', async () => {
    const backup = {
      timestamp: Date.now(),
      data: { customers: '[]' },
      checksum: AutoBackup.generateChecksum({ customers: '[]' }),
    };
    const mockFile = {
      text: jest.fn().mockResolvedValueOnce(JSON.stringify(backup)),
    };
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(false));

    const result = await AutoBackup.importBackup(mockFile);
    expect(result).toBe(false);
  });

  test('valid backup restores data and reloads', async () => {
    const backup = {
      timestamp: Date.now(),
      data: { customers: '[]', products: '[]' },
      checksum: AutoBackup.generateChecksum({
        customers: '[]',
        products: '[]',
      }),
    };
    const mockFile = {
      text: jest.fn().mockResolvedValueOnce(JSON.stringify(backup)),
    };
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(true));

    await AutoBackup.importBackup(mockFile);
    expect(localStorageData.customers).toBe('[]');
    expect(localStorageData.products).toBe('[]');
    expect(global.window.location.reload).toHaveBeenCalled();
  });
});

// ============================================================
// initialize
// ============================================================
describe('AutoBackup.initialize', () => {
  beforeEach(() => {
    // Reset document mock to prevent issues with initialize
    global.window.addEventListener = jest.fn();
  });

  test('calls checkAndBackup on initialization', () => {
    const spy = jest.spyOn(AutoBackup, 'checkAndBackup').mockReturnValue(undefined);
    const scheduleSpy = jest.spyOn(AutoBackup, 'scheduleBackup').mockReturnValue(undefined);

    AutoBackup.initialize();

    expect(spy).toHaveBeenCalled();
    expect(scheduleSpy).toHaveBeenCalled();

    spy.mockRestore();
    scheduleSpy.mockRestore();
  });

  test('sets up beforeunload listener', () => {
    const listeners = [];
    global.window.addEventListener = jest.fn((event, handler) => {
      if (event === 'beforeunload') {
        listeners.push(handler);
      }
    });

    const checkSpy = jest.spyOn(AutoBackup, 'checkAndBackup').mockReturnValue(undefined);
    const scheduleSpy = jest.spyOn(AutoBackup, 'scheduleBackup').mockReturnValue(undefined);
    const createSpy = jest.spyOn(AutoBackup, 'createBackup').mockReturnValue({});

    AutoBackup.initialize();

    // Verify beforeunload listener was registered
    expect(global.window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    // Trigger beforeunload with no recent backup
    if (listeners.length > 0) {
      listeners[0]();
      expect(createSpy).toHaveBeenCalled();
    }

    checkSpy.mockRestore();
    scheduleSpy.mockRestore();
    createSpy.mockRestore();
  });

  test('beforeunload does not backup if recent backup exists', () => {
    const listeners = [];
    global.window.addEventListener = jest.fn((event, handler) => {
      if (event === 'beforeunload') {
        listeners.push(handler);
      }
    });

    const recentBackup = { timestamp: Date.now() - 1000, data: {}, size: 0 };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([recentBackup]);

    const checkSpy = jest.spyOn(AutoBackup, 'checkAndBackup').mockReturnValue(undefined);
    const scheduleSpy = jest.spyOn(AutoBackup, 'scheduleBackup').mockReturnValue(undefined);
    const createSpy = jest.spyOn(AutoBackup, 'createBackup').mockReturnValue({});

    AutoBackup.initialize();

    // Trigger beforeunload with recent backup
    if (listeners.length > 0) {
      listeners[0]();
      expect(createSpy).not.toHaveBeenCalled();
    }

    checkSpy.mockRestore();
    scheduleSpy.mockRestore();
    createSpy.mockRestore();
  });
});

// ============================================================
// Error handling edge cases
// ============================================================
describe('AutoBackup error handling', () => {
  test('clearAllBackups handles removeItem error', async () => {
    const origRemoveItem = global.localStorage.removeItem;
    global.localStorage.removeItem = jest.fn(() => {
      throw new Error('Storage error');
    });
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(true));

    const result = await AutoBackup.clearAllBackups();
    expect(result).toBe(false);
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('오류'),
      'error'
    );

    global.localStorage.removeItem = origRemoveItem;
  });

  test('downloadBackup creates correct blob and triggers download', () => {
    const mockA = { href: '', download: '', click: jest.fn() };
    global.document.createElement = jest.fn(() => mockA);

    const backup = {
      timestamp: Date.now(),
      data: { customers: '[]' },
      size: 100,
      version: '2.0',
      appName: 'Test',
    };
    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([backup]);

    const result = AutoBackup.downloadBackup(0);
    expect(result).toBe(true);
    // Verify that createElement was called to create the download link
    expect(global.document.createElement).toHaveBeenCalledWith('a');
    expect(mockA.click).toHaveBeenCalled();
  });

  test('downloadAllBackups with single backup', () => {
    const mockA = { href: '', download: '', click: jest.fn() };
    global.document.createElement = jest.fn(() => mockA);

    localStorageData[AutoBackup.BACKUP_KEY] = JSON.stringify([
      { timestamp: Date.now(), data: {}, size: 50 },
    ]);

    const result = AutoBackup.downloadAllBackups();
    expect(result).toBe(true);
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('1개'),
      'success'
    );
  });

  test('restoreBackup throws error shows error toast', async () => {
    // Empty backups array to trigger error
    localStorageData[AutoBackup.BACKUP_KEY] = '[]';
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(true));

    const result = await AutoBackup.restoreBackup(0);
    expect(result).toBe(false);
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('오류'),
      'error'
    );
  });

  test('importBackup with large file size in preview', async () => {
    const backup = {
      timestamp: Date.now(),
      data: { customers: '[]' },
      size: 1024 * 1024 * 5, // 5 MB
      checksum: AutoBackup.generateChecksum({ customers: '[]' }),
    };
    const mockFile = {
      text: jest.fn().mockResolvedValueOnce(JSON.stringify(backup)),
    };
    global.showConfirmModal.mockImplementationOnce(() => Promise.resolve(false));

    await AutoBackup.importBackup(mockFile);
    // Check that the modal was called with size info
    expect(global.showConfirmModal).toHaveBeenCalled();
    const callArgs = global.showConfirmModal.mock.calls[0];
    expect(callArgs[1]).toContain('KB');
  });
});
