// ==========================================
// Error Codes
// ==========================================
export const ErrorCodes = {
  // Auth errors (1000-1099)
  AUTH_INVALID_CREDENTIALS: 'AUTH_1001',
  AUTH_TOKEN_EXPIRED: 'AUTH_1002',
  AUTH_TOKEN_INVALID: 'AUTH_1003',
  AUTH_USER_NOT_FOUND: 'AUTH_1004',
  AUTH_USER_ALREADY_EXISTS: 'AUTH_1005',
  AUTH_PERMISSION_DENIED: 'AUTH_1006',

  // Validation errors (2000-2099)
  VALIDATION_INVALID_INPUT: 'VAL_2001',
  VALIDATION_MISSING_FIELD: 'VAL_2002',
  VALIDATION_INVALID_FORMAT: 'VAL_2003',
  VALIDATION_OUT_OF_RANGE: 'VAL_2004',

  // Resource errors (3000-3099)
  RESOURCE_NOT_FOUND: 'RES_3001',
  RESOURCE_ALREADY_EXISTS: 'RES_3002',
  RESOURCE_CONFLICT: 'RES_3003',

  // Database errors (4000-4099)
  DB_CONNECTION_ERROR: 'DB_4001',
  DB_QUERY_ERROR: 'DB_4002',
  DB_CONSTRAINT_VIOLATION: 'DB_4003',

  // Server errors (5000-5099)
  INTERNAL_SERVER_ERROR: 'SRV_5001',
  SERVICE_UNAVAILABLE: 'SRV_5002',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ==========================================
// API Error class
// ==========================================
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      success: false,
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

// ==========================================
// Factory functions for common errors
// ==========================================
export const Errors = {
  // Auth errors
  invalidCredentials: (details?: Record<string, unknown>) =>
    new ApiError(ErrorCodes.AUTH_INVALID_CREDENTIALS, '유효하지 않은 이메일 또는 비밀번호입니다', 401, details),

  tokenExpired: () =>
    new ApiError(ErrorCodes.AUTH_TOKEN_EXPIRED, '인증 토큰이 만료되었습니다. 다시 로그인해주세요', 401),

  tokenInvalid: () =>
    new ApiError(ErrorCodes.AUTH_TOKEN_INVALID, '유효하지 않은 인증 토큰입니다', 401),

  userNotFound: () =>
    new ApiError(ErrorCodes.AUTH_USER_NOT_FOUND, '사용자를 찾을 수 없습니다', 404),

  userAlreadyExists: (email?: string) =>
    new ApiError(ErrorCodes.AUTH_USER_ALREADY_EXISTS, '이미 존재하는 사용자입니다', 409, { email }),

  // Validation errors
  validationError: (message: string, field?: string) =>
    new ApiError(ErrorCodes.VALIDATION_INVALID_INPUT, message, 400, { field }),

  missingField: (field: string) =>
    new ApiError(ErrorCodes.VALIDATION_MISSING_FIELD, `${field}은(는) 필수입니다`, 400, { field }),

  // Resource errors
  notFound: (resource: string) =>
    new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, `${resource}을(를) 찾을 수 없습니다`, 404, { resource }),

  alreadyExists: (resource: string) =>
    new ApiError(ErrorCodes.RESOURCE_ALREADY_EXISTS, `${resource}이(가) 이미 존재합니다`, 409, { resource }),

  // Server errors
  internal: (message: string = '서버 내부 오류가 발생했습니다') =>
    new ApiError(ErrorCodes.INTERNAL_SERVER_ERROR, message, 500),
} as const;

// ==========================================
// Error Response Helpers
// ==========================================
export interface ErrorResponse {
  success: false;
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function toErrorResponse(error: ApiError | Error): ErrorResponse {
  if (error instanceof ApiError) {
    return {
      success: false,
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    };
  }

  return {
    success: false,
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    message: error.message || '알 수 없는 오류가 발생했습니다',
  };
}

// ==========================================
// Async wrapper for route handlers
// ==========================================
export type AsyncRequestHandler = (...args: unknown[]) => Promise<unknown>;

export function asyncHandler<T extends AsyncRequestHandler>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Unhandled error:', error);
      throw Errors.internal();
    }
  }) as T;
}