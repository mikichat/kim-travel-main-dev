// @TASK P1-R1-T1 - Auth Service (로그인, 잠금, 알림)
// @SPEC Auth API: bcrypt 해싱, 3회 실패 잠금(15분), nodemailer 알림

import bcrypt from 'bcrypt';
import { getIntranetDb } from '../db/intranet';

const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

// In-memory failed attempts tracker
// key: email, value: { count, lockedUntil }
const failedAttempts = new Map<
  string,
  { count: number; lockedUntil: Date | null }
>();

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: string;
}

export interface SafeUser {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

function toSafeUser(user: UserRow): SafeUser {
  const { password_hash, ...safe } = user;
  return safe;
}

function isLocked(email: string): boolean {
  const record = failedAttempts.get(email);
  if (!record || !record.lockedUntil) return false;
  if (new Date() > record.lockedUntil) {
    // Lockout expired, reset
    failedAttempts.delete(email);
    return false;
  }
  return true;
}

function recordFailedAttempt(email: string): void {
  const record = failedAttempts.get(email) || { count: 0, lockedUntil: null };
  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
  }
  failedAttempts.set(email, record);
}

function resetFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

export async function login(
  email: string,
  password: string
): Promise<{ user: SafeUser } | { error: string; status: number }> {
  // Check lockout
  if (isLocked(email)) {
    return {
      error: '계정이 잠금되었습니다. 15분 후 다시 시도하세요.',
      status: 423,
    };
  }

  const db = await getIntranetDb();
  const user = await db.get<UserRow>(
    'SELECT * FROM air_users WHERE email = ?',
    [email]
  );

  if (!user) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.', status: 401 };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    recordFailedAttempt(email);
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.', status: 401 };
  }

  // Success: reset failed attempts
  resetFailedAttempts(email);

  return { user: toSafeUser(user) };
}

export async function getUserById(id: number): Promise<SafeUser | null> {
  const db = await getIntranetDb();
  const user = await db.get<UserRow>('SELECT * FROM air_users WHERE id = ?', [id]);
  if (!user) return null;
  return toSafeUser(user);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// For testing: clear lockout state
export function clearLockouts(): void {
  failedAttempts.clear();
}
