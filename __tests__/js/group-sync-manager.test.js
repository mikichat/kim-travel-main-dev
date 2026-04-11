/**
 * group-sync-manager.js unit tests (Phase 70)
 *
 * Tests syncCustomerToGroup matching logic and other testable methods.
 */

// ---- global shims ----
global.window = global;
global.document = {
  getElementById: jest.fn(() => null),
  createElement: jest.fn(() => ({
    id: '',
    className: '',
    innerHTML: '',
    remove: jest.fn(),
  })),
  body: {
    appendChild: jest.fn(),
  },
};
global.showToast = jest.fn();
global.showConfirmModal = jest.fn();
global.fetchJSON = jest.fn();
global.ConflictResolver = undefined;

require('../../js/group-sync-manager.js');
const GroupSyncManager = global.GroupSyncManager;

afterEach(() => {
  jest.clearAllMocks();
  global.ConflictResolver = undefined;
});

// ============================================================
// syncCustomerToGroup
// ============================================================
describe('GroupSyncManager.syncCustomerToGroup', () => {
  test('no groups → returns silently', async () => {
    global.fetchJSON.mockResolvedValueOnce({ data: [] });
    await GroupSyncManager.syncCustomerToGroup('C1', { name_kor: '홍길동' });
    // Only 1 fetchJSON call (fetch groups), no update calls
    expect(global.fetchJSON).toHaveBeenCalledTimes(1);
  });

  test('matches by passport number and updates', async () => {
    const groups = [{
      id: 'G1',
      members: JSON.stringify([
        { passportNo: 'M12345678', nameKor: '홍길동', nameEn: 'HONG GILDONG' },
      ]),
    }];
    global.fetchJSON
      .mockResolvedValueOnce({ data: groups }) // fetch groups
      .mockResolvedValueOnce({}); // update group

    await GroupSyncManager.syncCustomerToGroup('C1', {
      passport_number: 'M12345678',
      name_kor: '홍길동 수정',
      name_eng: 'HONG UPDATED',
      gender: 'M',
      phone: '010-1234-5678',
    });

    expect(global.fetchJSON).toHaveBeenCalledTimes(2);
    const updateCall = global.fetchJSON.mock.calls[1];
    expect(updateCall[0]).toBe('/tables/groups/G1');
    expect(updateCall[1].method).toBe('PUT');
    const body = JSON.parse(updateCall[1].body);
    const members = JSON.parse(body.members);
    expect(members[0].nameKor).toBe('홍길동 수정');
    expect(members[0].phone).toBe('010-1234-5678');
  });

  test('matches by Korean name', async () => {
    const groups = [{
      id: 'G1',
      members: JSON.stringify([
        { nameKor: '김철수', nameEn: 'KIM CHEOLSU' },
      ]),
    }];
    global.fetchJSON
      .mockResolvedValueOnce({ data: groups })
      .mockResolvedValueOnce({});

    await GroupSyncManager.syncCustomerToGroup('C1', {
      name_kor: '김철수',
      birth_date: '1990-01-01',
    });

    expect(global.fetchJSON).toHaveBeenCalledTimes(2);
  });

  test('matches by English name', async () => {
    const groups = [{
      id: 'G1',
      members: JSON.stringify([
        { nameKor: '박민수', nameEn: 'PARK MINSU' },
      ]),
    }];
    global.fetchJSON
      .mockResolvedValueOnce({ data: groups })
      .mockResolvedValueOnce({});

    await GroupSyncManager.syncCustomerToGroup('C1', {
      name_eng: 'PARK MINSU',
      passport_expiry: '2030-12-31',
    });

    expect(global.fetchJSON).toHaveBeenCalledTimes(2);
  });

  test('no match → no update', async () => {
    const groups = [{
      id: 'G1',
      members: JSON.stringify([
        { nameKor: '홍길동', nameEn: 'HONG' },
      ]),
    }];
    global.fetchJSON.mockResolvedValueOnce({ data: groups });

    await GroupSyncManager.syncCustomerToGroup('C1', {
      name_kor: '다른사람',
    });

    // Only 1 call (fetch groups), no update
    expect(global.fetchJSON).toHaveBeenCalledTimes(1);
  });

  test('invalid members JSON → skips group', async () => {
    const groups = [{
      id: 'G1',
      members: 'invalid-json',
    }];
    global.fetchJSON.mockResolvedValueOnce({ data: groups });

    await GroupSyncManager.syncCustomerToGroup('C1', { name_kor: '홍길동' });
    // No update call
    expect(global.fetchJSON).toHaveBeenCalledTimes(1);
  });

  test('uses ConflictResolver when available', async () => {
    global.ConflictResolver = {
      resolve: jest.fn().mockReturnValue({ source: 'customer' }),
    };

    const groups = [{
      id: 'G1',
      members: JSON.stringify([{ nameKor: '홍길동' }]),
    }];
    global.fetchJSON
      .mockResolvedValueOnce({ data: groups })
      .mockResolvedValueOnce({});

    await GroupSyncManager.syncCustomerToGroup('C1', { name_kor: '홍길동' });

    expect(global.ConflictResolver.resolve).toHaveBeenCalled();
    expect(global.fetchJSON).toHaveBeenCalledTimes(2);
  });

  test('ConflictResolver blocks update', async () => {
    global.ConflictResolver = {
      resolve: jest.fn().mockReturnValue({ source: 'group' }),
    };

    const groups = [{
      id: 'G1',
      members: JSON.stringify([{ nameKor: '홍길동' }]),
    }];
    global.fetchJSON.mockResolvedValueOnce({ data: groups });

    await GroupSyncManager.syncCustomerToGroup('C1', { name_kor: '홍길동' });

    // No update call because ConflictResolver said 'group' wins
    expect(global.fetchJSON).toHaveBeenCalledTimes(1);
  });

  test('fetchJSON error → handles gracefully', async () => {
    global.fetchJSON.mockRejectedValueOnce(new Error('Network error'));

    // Should not throw
    await GroupSyncManager.syncCustomerToGroup('C1', { name_kor: '홍길동' });
  });

  test('groups returned as direct array (no .data wrapper)', async () => {
    const groups = [{
      id: 'G1',
      members: JSON.stringify([{ nameKor: '홍길동' }]),
    }];
    global.fetchJSON
      .mockResolvedValueOnce(groups) // Direct array, no .data
      .mockResolvedValueOnce({});

    await GroupSyncManager.syncCustomerToGroup('C1', { name_kor: '홍길동' });
    expect(global.fetchJSON).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// syncToCalendar (simple stub)
// ============================================================
describe('GroupSyncManager.syncToCalendar', () => {
  test('returns success', async () => {
    const result = await GroupSyncManager.syncToCalendar({});
    expect(result.success).toBe(true);
  });
});

// ============================================================
// findExistingCustomer (stub)
// ============================================================
describe('GroupSyncManager.findExistingCustomer', () => {
  test('returns not found', async () => {
    const result = await GroupSyncManager.findExistingCustomer({});
    expect(result.found).toBe(false);
  });
});

// ============================================================
// showSyncError
// ============================================================
describe('GroupSyncManager.showSyncError', () => {
  test('calls showToast when available', () => {
    GroupSyncManager.showSyncError(new Error('test error'));
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining('test error'),
      'error'
    );
  });
});

// ============================================================
// previewSync
// ============================================================
describe('GroupSyncManager.previewSync', () => {
  test('builds preview with validation API', async () => {
    global.fetchJSON
      .mockResolvedValueOnce({ valid: [{id: 1}], duplicates: [{id: 2}] }) // validate
      .mockResolvedValueOnce({ exact_match: { name: '하노이' } }); // findMatchingProduct

    const group = {
      members: [{ nameKor: '홍길동' }, { nameKor: '김철수' }],
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
      destination: '하노이',
      name: '테스트그룹',
    };
    const preview = await GroupSyncManager.previewSync(group);

    expect(preview.newCustomers).toBe(1);
    expect(preview.existingCustomers).toBe(1);
    expect(preview.totalMembers).toBe(2);
    expect(preview.productAction).toContain('기존 상품 연결');
    expect(preview.groupName).toBe('테스트그룹');
  });

  test('validation API error → local estimation', async () => {
    global.fetchJSON
      .mockRejectedValueOnce(new Error('API error')) // validate fails
      .mockResolvedValueOnce({ exact_match: null, similar_matches: [] }); // findMatchingProduct

    const group = {
      members: [{ nameKor: '홍길동' }],
      destination: '다낭',
      name: 'G1',
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
    };
    const preview = await GroupSyncManager.previewSync(group);

    expect(preview.newCustomers).toBe(1); // local estimate = all members
    expect(preview.existingCustomers).toBe(0);
    expect(preview.productAction).toContain('신규 상품 생성');
  });

  test('no destination → no productAction', async () => {
    global.fetchJSON.mockResolvedValueOnce({ valid: [], duplicates: [] });

    const group = {
      members: [],
      destination: '',
      name: 'G',
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
    };
    const preview = await GroupSyncManager.previewSync(group);

    expect(preview.productAction).toBeUndefined();
  });

  test('filters empty members', async () => {
    global.fetchJSON
      .mockResolvedValueOnce({ valid: [1], duplicates: [] })
      .mockResolvedValueOnce(null);

    const group = {
      members: [{ nameKor: '' }, { nameEn: '' }, { nameKor: '홍길동' }],
      destination: '하노이',
      name: 'G',
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
    };
    const preview = await GroupSyncManager.previewSync(group);

    expect(preview.totalMembers).toBe(1);
  });

  test('includes totalOperations in preview', async () => {
    global.fetchJSON.mockResolvedValueOnce({ valid: [], duplicates: [] });

    const group = {
      members: [],
      destination: '',
      name: 'G',
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
    };
    const preview = await GroupSyncManager.previewSync(group);

    expect(preview.totalOperations).toBe(3);
  });
});

// ============================================================
// syncCustomers
// ============================================================
describe('GroupSyncManager.syncCustomers', () => {
  test('converts members and calls batch API', async () => {
    global.fetchJSON.mockResolvedValueOnce({ created: 1, updated: 0 });

    const group = {
      id: 'G1',
      name: '테스트',
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
      destination: '다낭',
      members: [
        {
          nameKor: '홍길동',
          passportNo: 'M123',
          nameEn: 'HONG',
          birthDate: '1990-01-01',
          passportExpire: '2030-12-31',
          phone: '010-1234-5678',
          gender: 'M',
        },
      ],
    };

    const result = await GroupSyncManager.syncCustomers(group);

    expect(result.created).toBe(1);
    const [url, opts] = global.fetchJSON.mock.calls[0];
    expect(url).toBe('/api/sync/customers/batch');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.members[0].nameKor).toBe('홍길동');
    expect(body.members[0].passportNo).toBe('M123');
    expect(body.group_id).toBe('G1');
    expect(body.group_name).toBe('테스트');
    expect(body.departure_date).toBe('2026-03-01');
    expect(body.destination).toBe('다낭');
  });

  test('handles snake_case input fields for dates', async () => {
    global.fetchJSON.mockResolvedValueOnce({ created: 1, updated: 0 });

    const group = {
      id: 'G1',
      name: 'Test',
      departure_date: '2026-03-01',
      return_date: '2026-03-05',
      destination: '다낭',
      members: [
        {
          nameKor: '홍길동',
          passport_number: 'M123',
          name_eng: 'HONG',
          birth_date: '1990-01-01',
          passport_expiry: '2030-12-31',
        },
      ],
    };

    const result = await GroupSyncManager.syncCustomers(group);

    expect(result.created).toBe(1);
    const body = JSON.parse(
      global.fetchJSON.mock.calls[0][1].body
    );
    // Should use snake_case input if camelCase is not available
    expect(body.departure_date).toBe('2026-03-01');
    expect(body.return_date).toBe('2026-03-05');
    expect(body.members.length).toBe(1);
    expect(body.members[0].passportNo).toBe('M123');
    expect(body.members[0].nameEn).toBe('HONG');
  });

  test('filters empty members before sync', async () => {
    global.fetchJSON.mockResolvedValueOnce({ created: 1, updated: 0 });

    const group = {
      id: 'G1',
      name: 'Test',
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
      destination: '다낭',
      members: [
        { nameKor: '' },
        { nameEn: '' },
        { nameKor: '홍길동' },
      ],
    };

    await GroupSyncManager.syncCustomers(group);

    const body = JSON.parse(
      global.fetchJSON.mock.calls[0][1].body
    );
    expect(body.members).toHaveLength(1);
  });

  test('sets default gender to M', async () => {
    global.fetchJSON.mockResolvedValueOnce({ created: 1, updated: 0 });

    const group = {
      id: 'G1',
      name: 'Test',
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
      destination: '다낭',
      members: [{ nameKor: '홍길동' }],
    };

    await GroupSyncManager.syncCustomers(group);

    const body = JSON.parse(
      global.fetchJSON.mock.calls[0][1].body
    );
    expect(body.members[0].gender).toBe('M');
  });
});

// ============================================================
// syncProduct
// ============================================================
describe('GroupSyncManager.syncProduct', () => {
  test('no destination → returns message', async () => {
    const result = await GroupSyncManager.syncProduct({ destination: '' });

    expect(result.message).toContain('목적지 정보 없음');
    expect(result.matched).toBeUndefined();
  });

  test('matching product found → matched: true', async () => {
    global.fetchJSON.mockResolvedValueOnce({
      exact_match: { id: 1, name: '다낭' },
    });

    const result = await GroupSyncManager.syncProduct({
      destination: '다낭',
    });

    expect(result.matched).toBe(true);
    expect(result.product.name).toBe('다낭');
  });

  test('no matching product → matched: false', async () => {
    global.fetchJSON.mockResolvedValueOnce({
      exact_match: null,
      similar_matches: [],
    });

    const result = await GroupSyncManager.syncProduct({
      destination: '신규도시',
    });

    expect(result.matched).toBe(false);
    expect(result.message).toContain('신규 상품 생성 필요');
    expect(result.message).toContain('신규도시');
  });
});

// ============================================================
// findMatchingProduct
// ============================================================
describe('GroupSyncManager.findMatchingProduct', () => {
  test('returns exact_match when available', async () => {
    global.fetchJSON.mockResolvedValueOnce({
      exact_match: { id: 1, name: '다낭' },
    });

    const result = await GroupSyncManager.findMatchingProduct('다낭');

    expect(result.name).toBe('다낭');
    expect(result.id).toBe(1);
  });

  test('falls back to similar_matches[0]', async () => {
    global.fetchJSON.mockResolvedValueOnce({
      exact_match: null,
      similar_matches: [{ id: 2, name: '다낭 비치' }],
    });

    const result = await GroupSyncManager.findMatchingProduct('다낭');

    expect(result.name).toBe('다낭 비치');
    expect(result.id).toBe(2);
  });

  test('no match → null', async () => {
    global.fetchJSON.mockResolvedValueOnce({
      exact_match: null,
      similar_matches: [],
    });

    const result = await GroupSyncManager.findMatchingProduct('없는도시');

    expect(result).toBeNull();
  });

  test('API error → null', async () => {
    global.fetchJSON.mockRejectedValueOnce(new Error('Network fail'));

    const result = await GroupSyncManager.findMatchingProduct('다낭');

    expect(result).toBeNull();
  });

  test('encodes destination in URL', async () => {
    global.fetchJSON.mockResolvedValueOnce({
      exact_match: null,
      similar_matches: [],
    });

    await GroupSyncManager.findMatchingProduct('다낭&특수');

    const [url] = global.fetchJSON.mock.calls[0];
    expect(url).toContain('/api/products/match?destination=');
    expect(url).toContain(encodeURIComponent('다낭&특수'));
  });
});

// ============================================================
// syncGroupsToDatabase
// ============================================================
describe('GroupSyncManager.syncGroupsToDatabase', () => {
  test('updates each group with PUT', async () => {
    global.fetchJSON.mockResolvedValue({});

    await GroupSyncManager.syncGroupsToDatabase([
      { id: 'G1', name: 'A', members: [{ nameKor: '홍길동' }] },
      { id: 'G2', name: 'B', members: [] },
    ]);

    expect(global.fetchJSON).toHaveBeenCalledTimes(2);
    expect(global.fetchJSON.mock.calls[0][0]).toBe('/tables/groups/G1');
    expect(global.fetchJSON.mock.calls[1][0]).toBe('/tables/groups/G2');
  });

  test('stringifies members field', async () => {
    global.fetchJSON.mockResolvedValue({});

    const members = [{ nameKor: '홍길동' }, { nameKor: '김철수' }];
    await GroupSyncManager.syncGroupsToDatabase([
      { id: 'G1', name: 'A', members },
    ]);

    const [, opts] = global.fetchJSON.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(typeof body.members).toBe('string');
    expect(JSON.parse(body.members)).toEqual(members);
  });

  test('API error → handled gracefully', async () => {
    global.fetchJSON.mockRejectedValueOnce(new Error('fail'));

    // Should not throw
    await expect(
      GroupSyncManager.syncGroupsToDatabase([{ id: 'G1', members: [] }])
    ).resolves.toBeUndefined();
  });

  test('empty groups array → no calls', async () => {
    await GroupSyncManager.syncGroupsToDatabase([]);

    expect(global.fetchJSON).not.toHaveBeenCalled();
  });
});

// ============================================================
// DOM methods
// ============================================================
describe('GroupSyncManager DOM methods', () => {
  test('showSyncProgress creates element on first call', () => {
    GroupSyncManager.showSyncProgress(1, 3, '고객 동기화 중...');

    expect(global.document.createElement).toHaveBeenCalledWith('div');
    expect(global.document.body.appendChild).toHaveBeenCalled();
  });

  test('showSyncProgress updates existing element', () => {
    const mockEl = {
      id: 'syncProgress',
      innerHTML: '',
      remove: jest.fn(),
    };
    global.document.getElementById.mockReturnValueOnce(mockEl);

    GroupSyncManager.showSyncProgress(1, 3, '메시지');

    // Should update innerHTML of existing element
    expect(mockEl.innerHTML).toContain('메시지');
    expect(mockEl.innerHTML).toContain('1 / 3');
  });

  test('showSyncProgress calculates correct percentage', () => {
    const mockEl = {
      id: 'syncProgress',
      innerHTML: '',
      remove: jest.fn(),
    };
    global.document.getElementById.mockReturnValueOnce(mockEl);

    GroupSyncManager.showSyncProgress(2, 4, 'test');

    // 2/4 = 50%
    expect(mockEl.innerHTML).toContain('50%');
  });

  test('hideSyncProgress removes element when exists', () => {
    const mockEl = { remove: jest.fn() };
    global.document.getElementById.mockReturnValueOnce(mockEl);

    GroupSyncManager.hideSyncProgress();

    expect(mockEl.remove).toHaveBeenCalled();
  });

  test('hideSyncProgress does nothing when no element', () => {
    global.document.getElementById.mockReturnValueOnce(null);

    // Should not throw
    GroupSyncManager.hideSyncProgress();

    expect(global.document.getElementById).toHaveBeenCalledWith(
      'syncProgress'
    );
  });
});

// ============================================================
// showSyncConfirmDialog
// ============================================================
describe('GroupSyncManager.showSyncConfirmDialog', () => {
  test('creates dialog element with preview data', async () => {
    const mockDialog = {
      id: 'syncConfirmDialog',
      className: 'sync-confirm-dialog',
      innerHTML: '',
      remove: jest.fn(),
    };
    const mockCancelBtn = {
      addEventListener: jest.fn(),
    };
    const mockConfirmBtn = {
      addEventListener: jest.fn(),
    };

    global.document.createElement.mockReturnValueOnce(mockDialog);
    global.document.getElementById
      .mockReturnValueOnce(null) // Check for existing dialog
      .mockReturnValueOnce(mockCancelBtn) // Get cancel button
      .mockReturnValueOnce(mockConfirmBtn); // Get confirm button

    const promise = GroupSyncManager.showSyncConfirmDialog({
      newCustomers: 5,
      existingCustomers: 2,
      totalMembers: 7,
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
    });

    expect(global.document.createElement).toHaveBeenCalledWith('div');
    expect(mockDialog.id).toBe('syncConfirmDialog');
    expect(mockDialog.innerHTML).toContain('5명'); // newCustomers
    expect(mockDialog.innerHTML).toContain('2명'); // existingCustomers
    expect(global.document.body.appendChild).toHaveBeenCalledWith(
      mockDialog
    );
    expect(promise).toBeInstanceOf(Promise);
  });

  test('removes existing dialog before creating new one', () => {
    const existingDialog = { remove: jest.fn() };
    const newDialog = {
      id: 'syncConfirmDialog',
      className: 'sync-confirm-dialog',
      innerHTML: '',
      remove: jest.fn(),
    };
    const mockBtn = { addEventListener: jest.fn() };

    global.document.getElementById
      .mockReturnValueOnce(existingDialog) // Check for existing
      .mockReturnValueOnce(mockBtn) // Cancel button
      .mockReturnValueOnce(mockBtn); // Confirm button

    global.document.createElement.mockReturnValueOnce(newDialog);

    GroupSyncManager.showSyncConfirmDialog({
      newCustomers: 0,
      existingCustomers: 0,
      totalMembers: 0,
    });

    expect(existingDialog.remove).toHaveBeenCalled();
  });

  test('includes product action in dialog when available', () => {
    const mockDialog = {
      id: 'syncConfirmDialog',
      className: 'sync-confirm-dialog',
      innerHTML: '',
      remove: jest.fn(),
    };
    const mockBtn = { addEventListener: jest.fn() };

    global.document.createElement.mockReturnValueOnce(mockDialog);
    global.document.getElementById
      .mockReturnValueOnce(null) // Check for existing
      .mockReturnValueOnce(mockBtn) // Cancel
      .mockReturnValueOnce(mockBtn); // Confirm

    GroupSyncManager.showSyncConfirmDialog({
      newCustomers: 1,
      existingCustomers: 0,
      totalMembers: 1,
      departureDate: '2026-03-01',
      returnDate: '2026-03-05',
      productAction: '기존 상품 연결: 다낭',
    });

    expect(mockDialog.innerHTML).toContain('기존 상품 연결: 다낭');
  });
});

// ============================================================
// showSyncResult
// ============================================================
describe('GroupSyncManager.showSyncResult', () => {
  test('creates result dialog with customer data', () => {
    const mockDialog = {
      className: 'sync-result-dialog',
      innerHTML: '',
      remove: jest.fn(),
    };
    global.document.createElement.mockReturnValueOnce(mockDialog);

    GroupSyncManager.showSyncResult({
      customers: {
        created: 3,
        updated: 2,
        skipped: 1,
        errors: [],
      },
      calendar: { success: true },
      product: { matched: true },
    });

    expect(global.document.createElement).toHaveBeenCalledWith('div');
    expect(mockDialog.innerHTML).toContain('3명'); // created
    expect(mockDialog.innerHTML).toContain('2명'); // updated
    expect(mockDialog.innerHTML).toContain('1명'); // skipped
    expect(global.document.body.appendChild).toHaveBeenCalledWith(
      mockDialog
    );
  });

  test('shows error details when errors exist', () => {
    const mockDialog = {
      className: 'sync-result-dialog',
      innerHTML: '',
      remove: jest.fn(),
    };
    global.document.createElement.mockReturnValueOnce(mockDialog);

    GroupSyncManager.showSyncResult({
      customers: {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [
          {
            member: { nameKor: '홍길동' },
            errors: ['Invalid passport'],
          },
          {
            member: { nameEn: 'KIM CHEOL' },
            errors: ['Missing phone'],
          },
        ],
      },
      calendar: {},
      product: {},
    });

    expect(mockDialog.innerHTML).toContain('오류 상세보기');
    expect(mockDialog.innerHTML).toContain('홍길동');
    expect(mockDialog.innerHTML).toContain('Invalid passport');
    expect(mockDialog.innerHTML).toContain('KIM CHEOL');
  });

  test('handles empty error array', () => {
    const mockDialog = {
      className: 'sync-result-dialog',
      innerHTML: '',
      remove: jest.fn(),
    };
    global.document.createElement.mockReturnValueOnce(mockDialog);

    GroupSyncManager.showSyncResult({
      customers: {
        created: 1,
        updated: 0,
        skipped: 0,
        errors: [],
      },
      calendar: {},
      product: {},
    });

    expect(mockDialog.innerHTML).not.toContain('오류 상세보기');
  });
});

// ============================================================
// syncGroup (orchestrator)
// ============================================================
describe('GroupSyncManager.syncGroup', () => {
  // Mock the internal methods to avoid DOM interactions
  let originalShowSyncProgress;
  let originalHideSyncProgress;
  let originalShowSyncConfirmDialog;
  let originalShowSyncResult;

  beforeEach(() => {
    originalShowSyncProgress = GroupSyncManager.showSyncProgress;
    originalHideSyncProgress = GroupSyncManager.hideSyncProgress;
    originalShowSyncConfirmDialog = GroupSyncManager.showSyncConfirmDialog;
    originalShowSyncResult = GroupSyncManager.showSyncResult;

    GroupSyncManager.showSyncProgress = jest.fn();
    GroupSyncManager.hideSyncProgress = jest.fn();
    GroupSyncManager.showSyncConfirmDialog = jest.fn().mockResolvedValue(true);
    GroupSyncManager.showSyncResult = jest.fn();
  });

  afterEach(() => {
    GroupSyncManager.showSyncProgress = originalShowSyncProgress;
    GroupSyncManager.hideSyncProgress = originalHideSyncProgress;
    GroupSyncManager.showSyncConfirmDialog = originalShowSyncConfirmDialog;
    GroupSyncManager.showSyncResult = originalShowSyncResult;
  });

  test('orchestrates full sync flow with confirmation', async () => {
    global.fetchJSON
      .mockResolvedValueOnce({ valid: [1], duplicates: [] }) // previewSync validate
      .mockResolvedValueOnce({ exact_match: { name: '다낭' } }) // findMatchingProduct
      .mockResolvedValueOnce({ created: 1, updated: 0, skipped: 0, errors: [] }) // syncCustomers
      .mockResolvedValueOnce({ success: true }) // syncToCalendar
      .mockResolvedValueOnce({ exact_match: { name: '다낭' } }); // syncProduct findMatchingProduct

    const result = await GroupSyncManager.syncGroup(
      {
        id: 'G1',
        name: 'Test',
        members: [{ nameKor: '홍길동' }],
        departureDate: '2026-03-01',
        returnDate: '2026-03-05',
        destination: '다낭',
      },
      { confirm: true }
    );

    expect(GroupSyncManager.showSyncConfirmDialog).toHaveBeenCalled();
    expect(GroupSyncManager.showSyncProgress).toHaveBeenCalled();
    expect(GroupSyncManager.hideSyncProgress).toHaveBeenCalled();
    expect(GroupSyncManager.showSyncResult).toHaveBeenCalled();
    expect(result.customers).toBeDefined();
    expect(result.calendar).toBeDefined();
    expect(result.product).toBeDefined();
  });

  test('skips confirmation when confirm=false', async () => {
    global.fetchJSON
      .mockResolvedValueOnce({ valid: [], duplicates: [] }) // previewSync
      .mockResolvedValueOnce(null) // findMatchingProduct
      .mockResolvedValueOnce({ created: 0, updated: 0, skipped: 0, errors: [] }) // syncCustomers
      .mockResolvedValueOnce({ success: true }) // syncToCalendar
      .mockResolvedValueOnce(null); // syncProduct

    const result = await GroupSyncManager.syncGroup(
      {
        id: 'G1',
        name: 'Test',
        members: [],
        departureDate: '2026-03-01',
        returnDate: '2026-03-05',
        destination: '',
      },
      { confirm: false }
    );

    expect(GroupSyncManager.showSyncConfirmDialog).not.toHaveBeenCalled();
    expect(result.cancelled).toBeUndefined();
  });

  test('returns cancelled: true when user rejects', async () => {
    GroupSyncManager.showSyncConfirmDialog = jest
      .fn()
      .mockResolvedValueOnce(false);

    global.fetchJSON.mockResolvedValueOnce({
      valid: [],
      duplicates: [],
    });

    const result = await GroupSyncManager.syncGroup(
      {
        id: 'G1',
        name: 'Test',
        members: [],
        departureDate: '2026-03-01',
        returnDate: '2026-03-05',
        destination: '',
      },
      { confirm: true }
    );

    expect(result.cancelled).toBe(true);
  });

  test('hides progress on error and rethrows', async () => {
    global.fetchJSON.mockRejectedValueOnce(new Error('Sync error'));

    try {
      await GroupSyncManager.syncGroup(
        {
          id: 'G1',
          name: 'Test',
          members: [],
          departureDate: '2026-03-01',
          returnDate: '2026-03-05',
          destination: '',
        },
        { confirm: false }
      );
    } catch (e) {
      expect(e.message).toBe('Sync error');
    }

    expect(GroupSyncManager.hideSyncProgress).toHaveBeenCalled();
  });
});
