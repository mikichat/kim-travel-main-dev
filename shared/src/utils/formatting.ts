// ==========================================
// Date Formatting Utilities
// ==========================================

/**
 * Parse ISO date string to Date object
 */
function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Check if date is valid
 */
function isValidDate(date: Date | null): boolean {
  return date !== null && !isNaN(date.getTime());
}

/**
 * Format date for display
 * @param dateString - ISO date string or Date object
 * @param formatStr - format pattern (simplified)
 */
export function formatDate(dateString: string | Date, formatStr: string = 'yyyy-MM-dd'): string {
  const date = typeof dateString === 'string' ? parseDate(dateString) : dateString;
  if (!isValidDate(date)) return 'Invalid date';

  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  return formatStr
    .replace('yyyy', String(yyyy))
    .replace('MM', MM)
    .replace('dd', dd)
    .replace('HH', HH)
    .replace('mm', mm);
}

/**
 * Format date with Korean locale (simple implementation)
 */
export function formatDateKo(dateString: string | Date, formatStr: string = 'yyyy년 MM월 dd일'): string {
  const date = typeof dateString === 'string' ? parseDate(dateString) : dateString;
  if (!isValidDate(date)) return '유효하지 않은 날짜';

  const yyyy = date.getFullYear();
  const MM = date.getMonth() + 1;
  const dd = date.getDate();

  return formatStr
    .replace('yyyy', String(yyyy))
    .replace('MM', String(MM))
    .replace('dd', String(dd));
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string | Date): string {
  return formatDate(dateString, 'yyyy-MM-dd HH:mm');
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? parseDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseDate(endDate) : endDate;
  if (!isValidDate(start) || !isValidDate(end)) return 0;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format relative time (simplified Korean)
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? parseDate(dateString) : dateString;
  if (!isValidDate(date)) return '유효하지 않은 날짜';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 30) return `${diffDay}일 전`;

  return formatDate(date, 'yyyy-MM-dd');
}

// ==========================================
// Currency Formatting
// ==========================================
const currencyLocaleMap: Record<string, string> = {
  KRW: 'ko-KR',
  USD: 'en-US',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
};

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'KRW'): string {
  const locale = currencyLocaleMap[currency] || 'ko-KR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Parse price string to number
 * Handles Korean Won format (e.g., "1,000,000원" → 1000000)
 */
export function parsePrice(priceStr: string): number {
  // Remove all non-numeric characters except decimal point
  const cleaned = priceStr.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// ==========================================
// Phone Number Formatting
// ==========================================
/**
 * Format Korean phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }

  // Return as-is if doesn't match patterns
  return phone;
}

// ==========================================
// String Formatting
// ==========================================
/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Convert to slug (URL-friendly string)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert name to proper case (Korean names)
 */
export function toProperCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}