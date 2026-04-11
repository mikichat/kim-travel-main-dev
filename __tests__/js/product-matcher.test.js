/**
 * product-matcher.js unit tests (Phase 67)
 */

// ---- global shims ----
global.window = global;
global.crypto = { randomUUID: () => 'test-uuid-1234' };
global.fetch = jest.fn();

require('../../js/product-matcher.js');
const ProductMatcher = global.ProductMatcher;

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch.mockReset();
});

// ============================================================
// calculateSimilarity
// ============================================================
describe('ProductMatcher.calculateSimilarity', () => {
  test('identical strings return 1', () => {
    expect(ProductMatcher.calculateSimilarity('hello', 'hello')).toBe(1);
  });

  test('completely different strings return low value', () => {
    const sim = ProductMatcher.calculateSimilarity('abc', 'xyz');
    expect(sim).toBeLessThan(0.5);
  });

  test('one character difference', () => {
    const sim = ProductMatcher.calculateSimilarity('hello', 'hallo');
    expect(sim).toBeGreaterThan(0.7);
  });

  test('Korean strings', () => {
    const sim = ProductMatcher.calculateSimilarity('베트남', '베트남');
    expect(sim).toBe(1);
  });

  test('similar Korean destinations', () => {
    const sim = ProductMatcher.calculateSimilarity('베트남 다낭', '베트남 하노이');
    expect(sim).toBeGreaterThan(0.3);
    expect(sim).toBeLessThan(1);
  });

  test('empty string vs non-empty', () => {
    const sim = ProductMatcher.calculateSimilarity('', 'hello');
    expect(sim).toBe(0);
  });

  test('both empty strings', () => {
    // 0/0 → NaN, but let's check
    const sim = ProductMatcher.calculateSimilarity('', '');
    // maxLength=0 → 1 - 0/0 = NaN
    expect(sim).toBeNaN();
  });

  test('one character strings identical', () => {
    expect(ProductMatcher.calculateSimilarity('a', 'a')).toBe(1);
  });

  test('one character strings different', () => {
    expect(ProductMatcher.calculateSimilarity('a', 'b')).toBe(0);
  });
});

// ============================================================
// calculateDuration
// ============================================================
describe('ProductMatcher.calculateDuration', () => {
  test('normal dates (3 nights = 4 days)', () => {
    expect(ProductMatcher.calculateDuration('2026-03-01', '2026-03-04')).toBe(4);
  });

  test('same day returns 1', () => {
    expect(ProductMatcher.calculateDuration('2026-03-01', '2026-03-01')).toBe(1);
  });

  test('null departure returns 0', () => {
    expect(ProductMatcher.calculateDuration(null, '2026-03-04')).toBe(0);
  });

  test('null return returns 0', () => {
    expect(ProductMatcher.calculateDuration('2026-03-01', null)).toBe(0);
  });

  test('both null returns 0', () => {
    expect(ProductMatcher.calculateDuration(null, null)).toBe(0);
  });

  test('empty strings return 0', () => {
    expect(ProductMatcher.calculateDuration('', '')).toBe(0);
  });

  test('reversed dates still returns positive (abs)', () => {
    expect(ProductMatcher.calculateDuration('2026-03-05', '2026-03-01')).toBe(5);
  });
});

// ============================================================
// normalizeDestination
// ============================================================
describe('ProductMatcher.normalizeDestination', () => {
  test('removes spaces', () => {
    expect(ProductMatcher.normalizeDestination('베트남 다낭')).toBe('베트남다낭');
  });

  test('removes parentheses', () => {
    expect(ProductMatcher.normalizeDestination('다낭(베트남)')).toBe('다낭베트남');
  });

  test('converts to lowercase', () => {
    expect(ProductMatcher.normalizeDestination('VIETNAM')).toBe('vietnam');
  });

  test('combined processing', () => {
    expect(ProductMatcher.normalizeDestination('Da Nang (Vietnam)')).toBe('danangvietnam');
  });

  test('no-op for clean string', () => {
    expect(ProductMatcher.normalizeDestination('다낭')).toBe('다낭');
  });
});

// ============================================================
// explainMatch
// ============================================================
describe('ProductMatcher.explainMatch', () => {
  test('exact match', () => {
    const result = ProductMatcher.explainMatch({
      matchType: 'exact',
      product: { name: '베트남 5일' },
    });
    expect(result).toContain('정확히 일치');
    expect(result).toContain('베트남 5일');
  });

  test('similar match', () => {
    const result = ProductMatcher.explainMatch({
      matchType: 'similar',
      similarity: 0.85,
      product: { name: '다낭 4일' },
    });
    expect(result).toContain('유사한 상품');
    expect(result).toContain('85%');
    expect(result).toContain('다낭 4일');
  });

  test('new product', () => {
    const result = ProductMatcher.explainMatch({
      matchType: 'new',
      product: { name: '하노이 3일', price: 0 },
    });
    expect(result).toContain('신규 상품 생성');
    expect(result).toContain('하노이 3일');
  });

  test('manual_required', () => {
    const result = ProductMatcher.explainMatch({
      matchType: 'manual_required',
      suggestions: [{ name: 'A' }, { name: 'B' }],
    });
    expect(result).toContain('수동 선택');
    expect(result).toContain('2개');
  });

  test('null/unknown matchType returns default', () => {
    const result = ProductMatcher.explainMatch({ matchType: null });
    expect(result).toBe('매칭 실패');
  });

  test('undefined matchType returns default', () => {
    const result = ProductMatcher.explainMatch({});
    expect(result).toBe('매칭 실패');
  });
});

// ============================================================
// findOrCreateProduct
// ============================================================
describe('ProductMatcher.findOrCreateProduct', () => {
  test('no destination returns null product', async () => {
    const result = await ProductMatcher.findOrCreateProduct({ destination: '' });
    expect(result.product).toBeNull();
    expect(result.created).toBe(false);
    expect(result.message).toContain('목적지');
  });

  test('exact_match from API', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exact_match: { id: 1, name: '베트남 5일' } }),
    });

    const result = await ProductMatcher.findOrCreateProduct({ destination: '베트남' });
    expect(result.matchType).toBe('exact');
    expect(result.product.name).toBe('베트남 5일');
    expect(result.created).toBe(false);
  });

  test('similar_match with high similarity (>=0.7)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        similar_matches: [{ id: 2, name: '다낭 4일', similarity: 0.8 }],
      }),
    });

    const result = await ProductMatcher.findOrCreateProduct({ destination: '다낭' });
    expect(result.matchType).toBe('similar');
    expect(result.similarity).toBe(0.8);
    expect(result.created).toBe(false);
  });

  test('similar_match with low similarity (<0.7) → manual_required', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        similar_matches: [{ id: 3, name: '하노이 3일', similarity: 0.4 }],
      }),
    });

    const result = await ProductMatcher.findOrCreateProduct({ destination: '하노이' });
    expect(result.matchType).toBe('manual_required');
    expect(result.product).toBeNull();
    expect(result.suggestions).toHaveLength(1);
  });

  test('no match → creates new product', async () => {
    // First fetch: match API returns no matches
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ similar_matches: [] }),
    });
    // Second fetch: create product API
    global.fetch.mockResolvedValueOnce({ ok: true });

    const result = await ProductMatcher.findOrCreateProduct({
      destination: '제주도',
      departureDate: '2026-03-01',
      returnDate: '2026-03-04',
      name: '제주 그룹',
    });
    expect(result.matchType).toBe('new');
    expect(result.created).toBe(true);
    expect(result.product.destination).toBe('제주도');
    expect(result.product.duration).toBe(4);
  });

  test('API error returns error result', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const result = await ProductMatcher.findOrCreateProduct({ destination: '베트남' });
    expect(result.product).toBeNull();
    expect(result.created).toBe(false);
    expect(result.error).toContain('API 오류');
  });

  test('network error returns error result', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await ProductMatcher.findOrCreateProduct({ destination: '베트남' });
    expect(result.product).toBeNull();
    expect(result.error).toContain('Network failure');
  });

  test('create product fails → error result', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ similar_matches: [] }),
    });
    global.fetch.mockResolvedValueOnce({ ok: false });

    const result = await ProductMatcher.findOrCreateProduct({
      destination: '제주도',
      departureDate: '2026-03-01',
      returnDate: '2026-03-04',
      name: '테스트',
    });
    expect(result.product).toBeNull();
    expect(result.error).toContain('상품 생성 실패');
  });
});

// ============================================================
// matchBatch
// ============================================================
describe('ProductMatcher.matchBatch', () => {
  test('processes multiple groups', async () => {
    // Group 1: exact match
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exact_match: { id: 1, name: 'Product A' } }),
    });
    // Group 2: no destination
    const groups = [
      { destination: '베트남' },
      { destination: '' },
    ];

    const results = await ProductMatcher.matchBatch(groups);
    expect(results).toHaveLength(2);
    expect(results[0].matchType).toBe('exact');
    expect(results[1].product).toBeNull();
  });
});
