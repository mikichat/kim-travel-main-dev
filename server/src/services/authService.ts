import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  UserInfo,
  TokenPayload,
  RegisterRequest,
  LoginRequest,
} from '../../shared/types/auth';

// In-memory user store (for testing/development)
// In production, replace with database
interface StoredUser {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
}

export const userStore = new Map<string, StoredUser>();

// JWT Configuration
const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'your-refresh-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate an access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterRequest): Promise<{
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
}> {
  // Check if user already exists
  const existingUser = Array.from(userStore.values()).find(
    (u) => u.email === data.email
  );
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Validate email
  if (!isValidEmail(data.email)) {
    throw new Error('Invalid email format');
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create user
  const id = uuidv4();
  const createdAt = new Date();
  const user: StoredUser = {
    id,
    email: data.email,
    password: hashedPassword,
    name: data.name,
    createdAt,
  };

  // Store user
  userStore.set(id, user);

  // Generate tokens
  const tokenPayload: TokenPayload = { userId: id, email: data.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Return user info (without password)
  const userInfo: UserInfo = {
    id,
    email: data.email,
    name: data.name,
    createdAt,
  };

  return { user: userInfo, accessToken, refreshToken };
}

/**
 * Login a user
 */
export async function loginUser(data: LoginRequest): Promise<{
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
}> {
  // Find user by email
  const user = Array.from(userStore.values()).find(
    (u) => u.email === data.email
  );
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValidPassword = await comparePassword(data.password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const tokenPayload: TokenPayload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Return user info (without password)
  const userInfo: UserInfo = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };

  return { user: userInfo, accessToken, refreshToken };
}

/**
 * Get user by ID
 */
export function getUserById(id: string): UserInfo | null {
  const user = userStore.get(id);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

/**
 * Refresh tokens
 */
export function refreshTokens(refreshToken: string): {
  accessToken: string;
  refreshToken: string;
} {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Check if user exists
  const user = userStore.get(payload.userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Generate new tokens
  const tokenPayload: TokenPayload = {
    userId: payload.userId,
    email: payload.email,
  };
  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Initialize admin user from environment variables
 * Used for single-user system setup
 */
export async function initializeAdminUser(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@tourworld.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!';
  const adminName = process.env.ADMIN_NAME || '관리자';

  // Check if admin user already exists
  const existingAdmin = Array.from(userStore.values()).find(
    (u) => u.email === adminEmail
  );
  if (existingAdmin) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  // Hash password
  const hashedPassword = await hashPassword(adminPassword);

  // Create admin user
  const id = uuidv4();
  const createdAt = new Date();
  const admin: StoredUser = {
    id,
    email: adminEmail,
    password: hashedPassword,
    name: adminName,
    createdAt,
  };

  // Store admin user
  userStore.set(id, admin);
  console.log(`Admin user created: ${adminEmail}`);
}
