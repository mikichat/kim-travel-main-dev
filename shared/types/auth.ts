// Auth Request/Response Types

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: UserInfo;
    accessToken: string;
    refreshToken: string;
  };
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}
