import { encrypt, decrypt, hashForSearch } from '../services/crypto.service';

describe('crypto.service', () => {
  it('should encrypt and decrypt a string', () => {
    const original = 'M12345678';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');
    expect(decrypt(encrypted)).toBe(original);
  });

  it('should return null for null/undefined/empty input', () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeNull();
    expect(encrypt('')).toBeNull();
    expect(decrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeNull();
    expect(decrypt('')).toBeNull();
  });

  it('should handle plaintext (non-encrypted) data gracefully', () => {
    // 평문 데이터는 그대로 반환 (마이그레이션 호환)
    expect(decrypt('plain-text-no-colons')).toBe('plain-text-no-colons');
    expect(decrypt('invalid:format')).toBe('invalid:format');
  });

  it('should produce different ciphertexts for same input (random IV)', () => {
    const enc1 = encrypt('test');
    const enc2 = encrypt('test');
    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe('test');
    expect(decrypt(enc2)).toBe('test');
  });

  it('should handle Korean text', () => {
    const original = '010-1234-5678';
    const encrypted = encrypt(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it('should handle email addresses', () => {
    const original = 'test@example.com';
    const encrypted = encrypt(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  describe('hashForSearch', () => {
    it('should return consistent hash for same input', () => {
      expect(hashForSearch('M12345678')).toBe(hashForSearch('M12345678'));
    });

    it('should return null for null/undefined/empty', () => {
      expect(hashForSearch(null)).toBeNull();
      expect(hashForSearch(undefined)).toBeNull();
      expect(hashForSearch('')).toBeNull();
    });

    it('should be case-insensitive', () => {
      expect(hashForSearch('ABC')).toBe(hashForSearch('abc'));
    });

    it('should return 16-char hex string', () => {
      const hash = hashForSearch('test');
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });
  });
});
