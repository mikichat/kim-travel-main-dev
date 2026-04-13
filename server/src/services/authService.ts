import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): { userId: string; email: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
}

export function verifyRefreshToken(token: string): { userId: string; email: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; email: string };
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function registerUser(data: { email: string; password: string; name: string }): Promise<{
  user: { id: string; email: string; name: string; createdAt: Date };
  accessToken: string;
  refreshToken: string;
}> {
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  if (!isValidEmail(data.email)) {
    throw new Error('Invalid email format');
  }

  const hashedPassword = await hashPassword(data.password);
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.email, hashedPassword, data.name, now, now);

  const user = { id, email: data.email, name: data.name, createdAt: new Date(now) };
  const payload = { userId: id, email: data.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return { user, accessToken, refreshToken };
}

export async function loginUser(data: { email: string; password: string }): Promise<{
  user: { id: string; email: string; name: string; createdAt: Date };
  accessToken: string;
  refreshToken: string;
}> {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email) as any;
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isValidPassword = await comparePassword(data.password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  const payload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    user: { id: user.id, email: user.email, name: user.name, createdAt: new Date(user.created_at) },
    accessToken,
    refreshToken,
  };
}

export async function getUserById(id: string): Promise<{ id: string; email: string; name: string; createdAt: Date } | null> {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, createdAt: new Date(user.created_at) };
}

export function refreshTokens(refreshToken: string): { accessToken: string; refreshToken: string } {
  const payload = verifyRefreshToken(refreshToken);
  const newPayload = { userId: payload.userId, email: payload.email };
  return {
    accessToken: generateAccessToken(newPayload),
    refreshToken: generateRefreshToken(newPayload),
  };
}

export async function initializeAdminUser(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@tourworld.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!';
  const adminName = process.env.ADMIN_NAME || '관리자';

  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
  if (existingAdmin) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const hashedPassword = await hashPassword(adminPassword);
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, adminEmail, hashedPassword, adminName, now, now);

  console.log(`Admin user created: ${adminEmail}`);
}
