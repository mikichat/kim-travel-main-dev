// ==========================================
// API Error Types
// ==========================================

import type { ApiErrorResponse, ApiError } from './api.js';

// ==========================================
// Error Codes
// ==========================================

/**
 * HTTP 상태 코드별 에러 코드
 */
export const ErrorCodes = {
  // 400 Bad Request
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',

  // 401 Unauthorized
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',

  // 403 Forbidden
  FORBIDDEN: 'FORBIDDEN',
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  ITINERARY_NOT_FOUND: 'ITINERARY_NOT_FOUND',
  ITINERARY_ITEM_NOT_FOUND: 'ITINERARY_ITEM_NOT_FOUND',
  HOTEL_NOT_FOUND: 'HOTEL_NOT_FOUND',
  IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
  IMAGE_CATEGORY_NOT_FOUND: 'IMAGE_CATEGORY_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // 409 Conflict
  CONFLICT: 'CONFLICT',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RESOURCE_IN_USE: 'RESOURCE_IN_USE',

  // 413 Payload Too Large
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',

  // 415 Unsupported Media Type
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // 422 Unprocessable Entity
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',

  // 429 Too Many Requests
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 500 Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',

  // 502 Bad Gateway
  BAD_GATEWAY: 'BAD_GATEWAY',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',

  // 504 Gateway Timeout
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ==========================================
// Error Details Types
// ==========================================

/**
 * 유효성 검증 에러 상세 정보
 */
export interface ValidationErrorDetails {
  field: string;
  message: string;
  value?: unknown;
  constraint?: string;
}

/**
 * 유효성 검증 에러 응답
 */
export interface ValidationErrorResponse extends ApiErrorResponse {
  error: ApiError & {
    code: typeof ErrorCodes.VALIDATION_ERROR;
    details: {
      errors: ValidationErrorDetails[];
    };
  };
}

/**
 * 파일 업로드 에러 상세 정보
 */
export interface FileUploadErrorDetails {
  filename?: string;
  size?: number;
  mimeType?: string;
  maxSize?: number;
  allowedTypes?: string[];
}

/**
 * 파일 업로드 에러 응답
 */
export interface FileUploadErrorResponse extends ApiErrorResponse {
  error: ApiError & {
    code:
      | typeof ErrorCodes.FILE_TOO_LARGE
      | typeof ErrorCodes.INVALID_FILE_TYPE;
    details: FileUploadErrorDetails;
  };
}

/**
 * 인증 에러 응답
 */
export interface AuthenticationErrorResponse extends ApiErrorResponse {
  error: ApiError & {
    code:
      | typeof ErrorCodes.UNAUTHORIZED
      | typeof ErrorCodes.INVALID_CREDENTIALS
      | typeof ErrorCodes.TOKEN_EXPIRED
      | typeof ErrorCodes.INVALID_TOKEN;
  };
}

/**
 * 권한 에러 응답
 */
export interface AuthorizationErrorResponse extends ApiErrorResponse {
  error: ApiError & {
    code:
      | typeof ErrorCodes.FORBIDDEN
      | typeof ErrorCodes.ACCESS_DENIED
      | typeof ErrorCodes.INSUFFICIENT_PERMISSIONS;
    details?: {
      requiredRole?: string;
      requiredPermission?: string;
    };
  };
}

/**
 * 리소스 없음 에러 응답
 */
export interface NotFoundErrorResponse extends ApiErrorResponse {
  error: ApiError & {
    code:
      | typeof ErrorCodes.NOT_FOUND
      | typeof ErrorCodes.ITINERARY_NOT_FOUND
      | typeof ErrorCodes.ITINERARY_ITEM_NOT_FOUND
      | typeof ErrorCodes.HOTEL_NOT_FOUND
      | typeof ErrorCodes.IMAGE_NOT_FOUND
      | typeof ErrorCodes.IMAGE_CATEGORY_NOT_FOUND
      | typeof ErrorCodes.USER_NOT_FOUND;
    details?: {
      resourceType?: string;
      resourceId?: string;
    };
  };
}

/**
 * 충돌 에러 응답
 */
export interface ConflictErrorResponse extends ApiErrorResponse {
  error: ApiError & {
    code:
      | typeof ErrorCodes.CONFLICT
      | typeof ErrorCodes.DUPLICATE_EMAIL
      | typeof ErrorCodes.DUPLICATE_ENTRY
      | typeof ErrorCodes.RESOURCE_IN_USE;
    details?: {
      conflictingField?: string;
      existingValue?: string;
    };
  };
}

/**
 * Rate Limit 에러 응답
 */
export interface RateLimitErrorResponse extends ApiErrorResponse {
  error: ApiError & {
    code:
      | typeof ErrorCodes.TOO_MANY_REQUESTS
      | typeof ErrorCodes.RATE_LIMIT_EXCEEDED;
    details?: {
      retryAfter?: number; // 초 단위
      limit?: number;
      remaining?: number;
      resetAt?: string; // ISO timestamp
    };
  };
}

/**
 * 서버 에러 응답
 */
export interface ServerErrorResponse extends ApiErrorResponse {
  error: ApiError & {
    code:
      | typeof ErrorCodes.INTERNAL_ERROR
      | typeof ErrorCodes.DATABASE_ERROR
      | typeof ErrorCodes.STORAGE_ERROR;
    details?: {
      requestId?: string; // 디버깅용 요청 ID
    };
  };
}

// ==========================================
// HTTP Status Code to Error Code Mapping
// ==========================================

/**
 * HTTP 상태 코드별 기본 에러 코드 매핑
 */
export const HttpStatusToErrorCode: Record<number, ErrorCode> = {
  400: ErrorCodes.BAD_REQUEST,
  401: ErrorCodes.UNAUTHORIZED,
  403: ErrorCodes.FORBIDDEN,
  404: ErrorCodes.NOT_FOUND,
  409: ErrorCodes.CONFLICT,
  413: ErrorCodes.PAYLOAD_TOO_LARGE,
  415: ErrorCodes.UNSUPPORTED_MEDIA_TYPE,
  422: ErrorCodes.UNPROCESSABLE_ENTITY,
  429: ErrorCodes.TOO_MANY_REQUESTS,
  500: ErrorCodes.INTERNAL_ERROR,
  502: ErrorCodes.BAD_GATEWAY,
  503: ErrorCodes.SERVICE_UNAVAILABLE,
  504: ErrorCodes.GATEWAY_TIMEOUT,
};

// ==========================================
// Error Message Templates
// ==========================================

/**
 * 에러 메시지 템플릿
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // 400
  [ErrorCodes.BAD_REQUEST]: '잘못된 요청입니다.',
  [ErrorCodes.VALIDATION_ERROR]: '입력값 검증에 실패했습니다.',
  [ErrorCodes.INVALID_INPUT]: '유효하지 않은 입력값입니다.',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: '필수 필드가 누락되었습니다.',
  [ErrorCodes.INVALID_FORMAT]: '형식이 올바르지 않습니다.',
  [ErrorCodes.INVALID_DATE_RANGE]: '날짜 범위가 올바르지 않습니다.',

  // 401
  [ErrorCodes.UNAUTHORIZED]: '인증이 필요합니다.',
  [ErrorCodes.INVALID_CREDENTIALS]: '이메일 또는 비밀번호가 올바르지 않습니다.',
  [ErrorCodes.TOKEN_EXPIRED]: '인증 토큰이 만료되었습니다.',
  [ErrorCodes.INVALID_TOKEN]: '유효하지 않은 인증 토큰입니다.',
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]:
    '갱신 토큰이 만료되었습니다. 다시 로그인해주세요.',

  // 403
  [ErrorCodes.FORBIDDEN]: '접근이 거부되었습니다.',
  [ErrorCodes.ACCESS_DENIED]: '해당 리소스에 대한 접근 권한이 없습니다.',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: '권한이 부족합니다.',

  // 404
  [ErrorCodes.NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다.',
  [ErrorCodes.ITINERARY_NOT_FOUND]: '일정표를 찾을 수 없습니다.',
  [ErrorCodes.ITINERARY_ITEM_NOT_FOUND]: '일정 항목을 찾을 수 없습니다.',
  [ErrorCodes.HOTEL_NOT_FOUND]: '호텔을 찾을 수 없습니다.',
  [ErrorCodes.IMAGE_NOT_FOUND]: '이미지를 찾을 수 없습니다.',
  [ErrorCodes.IMAGE_CATEGORY_NOT_FOUND]: '이미지 카테고리를 찾을 수 없습니다.',
  [ErrorCodes.USER_NOT_FOUND]: '사용자를 찾을 수 없습니다.',

  // 409
  [ErrorCodes.CONFLICT]: '리소스 충돌이 발생했습니다.',
  [ErrorCodes.DUPLICATE_EMAIL]: '이미 사용 중인 이메일입니다.',
  [ErrorCodes.DUPLICATE_ENTRY]: '이미 존재하는 항목입니다.',
  [ErrorCodes.RESOURCE_IN_USE]: '사용 중인 리소스는 삭제할 수 없습니다.',

  // 413
  [ErrorCodes.PAYLOAD_TOO_LARGE]: '요청 크기가 너무 큽니다.',
  [ErrorCodes.FILE_TOO_LARGE]: '파일 크기가 허용 한도를 초과했습니다.',

  // 415
  [ErrorCodes.UNSUPPORTED_MEDIA_TYPE]: '지원하지 않는 미디어 타입입니다.',
  [ErrorCodes.INVALID_FILE_TYPE]: '지원하지 않는 파일 형식입니다.',

  // 422
  [ErrorCodes.UNPROCESSABLE_ENTITY]: '요청을 처리할 수 없습니다.',
  [ErrorCodes.BUSINESS_RULE_VIOLATION]: '비즈니스 규칙을 위반했습니다.',

  // 429
  [ErrorCodes.TOO_MANY_REQUESTS]: '요청이 너무 많습니다.',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]:
    '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',

  // 500
  [ErrorCodes.INTERNAL_ERROR]: '서버 내부 오류가 발생했습니다.',
  [ErrorCodes.DATABASE_ERROR]: '데이터베이스 오류가 발생했습니다.',
  [ErrorCodes.STORAGE_ERROR]: '스토리지 오류가 발생했습니다.',

  // 502
  [ErrorCodes.BAD_GATEWAY]: '외부 서비스 연결 오류가 발생했습니다.',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: '외부 서비스 오류가 발생했습니다.',

  // 503
  [ErrorCodes.SERVICE_UNAVAILABLE]: '서비스를 일시적으로 사용할 수 없습니다.',
  [ErrorCodes.DATABASE_UNAVAILABLE]: '데이터베이스에 연결할 수 없습니다.',
  [ErrorCodes.STORAGE_UNAVAILABLE]: '스토리지에 연결할 수 없습니다.',

  // 504
  [ErrorCodes.GATEWAY_TIMEOUT]: '외부 서비스 응답 시간이 초과되었습니다.',
  [ErrorCodes.REQUEST_TIMEOUT]: '요청 처리 시간이 초과되었습니다.',
};

// ==========================================
// Error Code to HTTP Status Mapping
// ==========================================

/**
 * 에러 코드별 HTTP 상태 코드 매핑
 */
export const ErrorCodeToHttpStatus: Record<ErrorCode, number> = {
  // 400
  [ErrorCodes.BAD_REQUEST]: 400,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.INVALID_FORMAT]: 400,
  [ErrorCodes.INVALID_DATE_RANGE]: 400,

  // 401
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]: 401,

  // 403
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.ACCESS_DENIED]: 403,
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,

  // 404
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.ITINERARY_NOT_FOUND]: 404,
  [ErrorCodes.ITINERARY_ITEM_NOT_FOUND]: 404,
  [ErrorCodes.HOTEL_NOT_FOUND]: 404,
  [ErrorCodes.IMAGE_NOT_FOUND]: 404,
  [ErrorCodes.IMAGE_CATEGORY_NOT_FOUND]: 404,
  [ErrorCodes.USER_NOT_FOUND]: 404,

  // 409
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.DUPLICATE_EMAIL]: 409,
  [ErrorCodes.DUPLICATE_ENTRY]: 409,
  [ErrorCodes.RESOURCE_IN_USE]: 409,

  // 413
  [ErrorCodes.PAYLOAD_TOO_LARGE]: 413,
  [ErrorCodes.FILE_TOO_LARGE]: 413,

  // 415
  [ErrorCodes.UNSUPPORTED_MEDIA_TYPE]: 415,
  [ErrorCodes.INVALID_FILE_TYPE]: 415,

  // 422
  [ErrorCodes.UNPROCESSABLE_ENTITY]: 422,
  [ErrorCodes.BUSINESS_RULE_VIOLATION]: 422,

  // 429
  [ErrorCodes.TOO_MANY_REQUESTS]: 429,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,

  // 500
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.STORAGE_ERROR]: 500,

  // 502
  [ErrorCodes.BAD_GATEWAY]: 502,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,

  // 503
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.DATABASE_UNAVAILABLE]: 503,
  [ErrorCodes.STORAGE_UNAVAILABLE]: 503,

  // 504
  [ErrorCodes.GATEWAY_TIMEOUT]: 504,
  [ErrorCodes.REQUEST_TIMEOUT]: 504,
};
