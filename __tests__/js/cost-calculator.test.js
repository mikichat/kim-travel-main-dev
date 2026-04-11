/**
 * cost-calculator.js unit tests (Phase 70)
 *
 * DOM-heavy file — only pure functions are extracted and tested.
 * Pattern: same as free-travel.test.js (function extraction).
 */

// ---- Function extraction from cost-calculator.js ----

/** 숫자를 천단위 콤마로 포맷팅 */
function formatNumber(num) {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** HTML 이스케이프 */
function _escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ============================================================
// formatNumber
// ============================================================
describe('formatNumber', () => {
  test('normal number with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  test('zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  test('negative number', () => {
    expect(formatNumber(-5000)).toBe('-5,000');
  });

  test('decimal rounds', () => {
    expect(formatNumber(1234.56)).toBe('1,235');
  });

  test('NaN → "0"', () => {
    expect(formatNumber(NaN)).toBe('0');
  });

  test('null → "0"', () => {
    expect(formatNumber(null)).toBe('0');
  });

  test('undefined → "0"', () => {
    expect(formatNumber(undefined)).toBe('0');
  });

  test('string number', () => {
    expect(formatNumber(999999)).toBe('999,999');
  });

  test('small number (no comma needed)', () => {
    expect(formatNumber(100)).toBe('100');
  });

  test('large number', () => {
    expect(formatNumber(1000000000)).toBe('1,000,000,000');
  });
});

// ============================================================
// _escapeHtml
// ============================================================
describe('_escapeHtml', () => {
  test('escapes & < > " \'', () => {
    expect(_escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  test('single quotes escaped', () => {
    expect(_escapeHtml("it's")).toBe('it&#039;s');
  });

  test('null → empty string', () => {
    expect(_escapeHtml(null)).toBe('');
  });

  test('undefined → empty string', () => {
    expect(_escapeHtml(undefined)).toBe('');
  });

  test('number → string', () => {
    expect(_escapeHtml(123)).toBe('123');
  });

  test('plain text unchanged', () => {
    expect(_escapeHtml('hello world')).toBe('hello world');
  });
});
