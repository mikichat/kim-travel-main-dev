// ==========================================
// API Request Types
// ==========================================

import type { PaginationParams, DateRangeFilter } from './api.js';
import type {
  ItineraryStatus,
  Coordinates,
  ItineraryMetadata,
  HotelAmenity,
  ImageMetadata,
} from './models.js';

// ==========================================
// Itinerary Requests (FEAT-2)
// ==========================================

/**
 * 일정표 목록 조회 쿼리 파라미터
 */
export interface ListItinerariesQuery
  extends PaginationParams, DateRangeFilter {
  status?: ItineraryStatus;
  search?: string;
}

/**
 * 일정표 생성 요청
 */
export interface CreateItineraryRequest {
  title: string;
  description?: string | null;
  startDate?: string | null; // ISO Date string (YYYY-MM-DD)
  endDate?: string | null;
  status?: ItineraryStatus;
  metadata?: ItineraryMetadata | null;
}

/**
 * 일정표 수정 요청
 */
export interface UpdateItineraryRequest {
  title?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: ItineraryStatus;
  metadata?: ItineraryMetadata | null;
}

// ==========================================
// ItineraryItem Requests (FEAT-2)
// ==========================================

/**
 * 일정 항목 목록 조회 쿼리 파라미터
 */
export interface ListItineraryItemsQuery extends PaginationParams {
  dayNumber?: number;
}

/**
 * 일정 항목 생성 요청
 */
export interface CreateItineraryItemRequest {
  hotelId?: string | null;
  dayNumber: number;
  startTime?: string | null; // HH:mm format
  endTime?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  coordinates?: Coordinates | null;
  sortOrder?: number;
  imageIds?: string[]; // 연결할 이미지 ID 목록
}

/**
 * 일정 항목 수정 요청
 */
export interface UpdateItineraryItemRequest {
  hotelId?: string | null;
  dayNumber?: number;
  startTime?: string | null;
  endTime?: string | null;
  title?: string;
  description?: string | null;
  location?: string | null;
  coordinates?: Coordinates | null;
  sortOrder?: number;
  imageIds?: string[];
}

/**
 * 일정 항목 순서 변경 요청
 */
export interface ReorderItineraryItemsRequest {
  items: Array<{
    id: string;
    sortOrder: number;
    dayNumber?: number; // 일자 변경 시
  }>;
}

/**
 * 일정 항목에 이미지 추가 요청
 */
export interface AddImageToItemRequest {
  imageId: string;
  sortOrder?: number;
}

// ==========================================
// Hotel Requests (FEAT-1)
// ==========================================

/**
 * 호텔 목록 조회 쿼리 파라미터
 */
export interface ListHotelsQuery extends PaginationParams {
  search?: string;
  country?: string;
  city?: string;
  starRating?: number;
  minStarRating?: number;
}

/**
 * 호텔 생성 요청
 */
export interface CreateHotelRequest {
  name: string;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  starRating?: number | null;
  phone?: string | null;
  url?: string | null;
  locationRemarks?: string | null;
  coordinates?: Coordinates | null;
  amenities?: HotelAmenity[] | null;
}

/**
 * 호텔 수정 요청
 */
export interface UpdateHotelRequest {
  name?: string;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  starRating?: number | null;
  phone?: string | null;
  url?: string | null;
  locationRemarks?: string | null;
  coordinates?: Coordinates | null;
  amenities?: HotelAmenity[] | null;
}

// ==========================================
// Image Requests (FEAT-3)
// ==========================================

/**
 * 이미지 목록 조회 쿼리 파라미터
 */
export interface ListImagesQuery extends PaginationParams {
  categoryId?: string;
  hotelId?: string;
  search?: string;
  mimeType?: string;
}

/**
 * 이미지 업로드 요청 메타데이터
 * 실제 파일은 multipart/form-data로 전송
 */
export interface UploadImageRequest {
  categoryId?: string | null;
  hotelId?: string | null;
  metadata?: ImageMetadata | null;
}

/**
 * 이미지 정보 수정 요청
 */
export interface UpdateImageRequest {
  categoryId?: string | null;
  hotelId?: string | null;
  metadata?: ImageMetadata | null;
}

/**
 * 이미지 일괄 삭제 요청
 */
export interface BulkDeleteImagesRequest {
  imageIds: string[];
}

// ==========================================
// ImageCategory Requests (FEAT-3)
// ==========================================

/**
 * 이미지 카테고리 목록 조회 쿼리 파라미터
 */
export interface ListImageCategoriesQuery extends PaginationParams {
  includeSystem?: boolean; // 시스템 기본 카테고리 포함 여부
}

/**
 * 이미지 카테고리 생성 요청
 */
export interface CreateImageCategoryRequest {
  name: string;
  description?: string | null;
  sortOrder?: number;
}

/**
 * 이미지 카테고리 수정 요청
 */
export interface UpdateImageCategoryRequest {
  name?: string;
  description?: string | null;
  sortOrder?: number;
}

// ==========================================
// Authentication Requests
// ==========================================

/**
 * 로그인 요청
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 회원가입 요청
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * 비밀번호 변경 요청
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * 토큰 갱신 요청
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}
