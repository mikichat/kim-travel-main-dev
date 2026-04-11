// 개인정보 AES-256-GCM 암호화/복호화
// 대상: passport_number, phone, email

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be set in production. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    return crypto.scryptSync('air-booking-dev-key', 'salt', 32);
  }
  // 32바이트 hex 키 또는 문자열에서 파생
  if (/^[0-9a-f]{64}$/i.test(key)) {
    return Buffer.from(key, 'hex');
  }
  return crypto.scryptSync(key, 'air-booking', 32);
}

export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // 형식: iv:tag:encrypted (hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null || ciphertext === '') return null;

  // 암호화되지 않은 평문 데이터 호환 (마이그레이션 전 데이터)
  if (!ciphertext.includes(':')) return ciphertext;

  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext; // 형식 불일치 시 평문 반환

  try {
    const key = getKey();
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // 복호화 실패 시 원본 반환 (평문 데이터 호환)
    return ciphertext;
  }
}

// 검색용 해시 (passport_number 검색에 사용)
export function hashForSearch(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex').slice(0, 16);
}
