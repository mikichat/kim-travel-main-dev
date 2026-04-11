// ==========================================
// API Common Types
// ==========================================

/**
 * 기본 API 응답 구조
 * 모든 API 응답은 이 형식을 따릅니다.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

/**
 * 성공 응답 타입
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/**
 * 에러 응답 타입
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/**
 * API 에러 구조
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string; // 필드별 검증 에러 시 사용
}

/**
 * 페이지네이션 메타 정보
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * 페이지네이션 요청 파라미터
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 목록 조회 기본 쿼리 파라미터
 */
export interface ListQueryParams extends PaginationParams {
  search?: string;
  filter?: Record<string, string | number | boolean>;
}

/**
 * 정렬 옵션
 */
export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

// ==========================================
// HTTP Method Types
// ==========================================
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ==========================================
// Common ID Types
// ==========================================
export type ID = string; // UUID
export type UserId = string;
export type ItineraryId = string;
export type ItineraryItemId = string;
export type HotelId = string;
export type ImageId = string;
export type ImageCategoryId = string;

// ==========================================
// Timestamp Types
// ==========================================
export interface Timestamps {
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreatedTimestamp {
  createdAt: Date | string;
}

// ==========================================
// Utility Types
// ==========================================
export type WithoutTimestamps<T> = Omit<T, 'createdAt' | 'updatedAt'>;
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * ID 파라미터가 있는 경로 요청
 */
export interface IdParams {
  id: string;
}

/**
 * 부모-자식 관계의 ID 파라미터
 */
export interface NestedIdParams {
  id: string;
  itemId: string;
}

// ==========================================
// Filter Types
// ==========================================
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface SearchFilter {
  query?: string;
  fields?: string[];
}
