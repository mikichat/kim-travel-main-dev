// ==========================================
// API Response Types
// ==========================================

import type { ApiSuccessResponse, PaginationMeta } from './api.js';
import type {
  User,
  UserProfile,
  Itinerary,
  ItineraryWithItems,
  ItinerarySummary,
  ItineraryItem,
  ItineraryItemWithDetails,
  DaySchedule,
  Hotel,
  HotelSummary,
  HotelWithImages,
  Image,
  ImageSummary,
  ImageWithCategory,
  ImageCategory,
  ImageCategoryWithCount,
} from './models.js';

// ==========================================
// Paginated Response Helper
// ==========================================

/**
 * 페이지네이션된 목록 응답
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

// ==========================================
// Itinerary Responses (FEAT-2)
// ==========================================

/**
 * 일정표 목록 응답
 */
export type ListItinerariesResponse = ApiSuccessResponse<
  PaginatedResponse<ItinerarySummary>
>;

/**
 * 일정표 단일 조회 응답
 */
export type GetItineraryResponse = ApiSuccessResponse<Itinerary>;

/**
 * 일정표 상세 조회 응답 (아이템 포함)
 */
export type GetItineraryWithItemsResponse =
  ApiSuccessResponse<ItineraryWithItems>;

/**
 * 일정표 생성 응답
 */
export type CreateItineraryResponse = ApiSuccessResponse<Itinerary>;

/**
 * 일정표 수정 응답
 */
export type UpdateItineraryResponse = ApiSuccessResponse<Itinerary>;

/**
 * 일정표 삭제 응답
 */
export type DeleteItineraryResponse = ApiSuccessResponse<{ deleted: boolean }>;

// ==========================================
// ItineraryItem Responses (FEAT-2)
// ==========================================

/**
 * 일정 항목 목록 응답
 */
export type ListItineraryItemsResponse = ApiSuccessResponse<
  PaginatedResponse<ItineraryItem>
>;

/**
 * 일자별 그룹화된 일정 항목 목록 응답
 */
export type ListItineraryItemsByDayResponse = ApiSuccessResponse<DaySchedule[]>;

/**
 * 일정 항목 단일 조회 응답
 */
export type GetItineraryItemResponse = ApiSuccessResponse<ItineraryItem>;

/**
 * 일정 항목 상세 조회 응답 (호텔, 이미지 포함)
 */
export type GetItineraryItemWithDetailsResponse =
  ApiSuccessResponse<ItineraryItemWithDetails>;

/**
 * 일정 항목 생성 응답
 */
export type CreateItineraryItemResponse = ApiSuccessResponse<ItineraryItem>;

/**
 * 일정 항목 수정 응답
 */
export type UpdateItineraryItemResponse = ApiSuccessResponse<ItineraryItem>;

/**
 * 일정 항목 삭제 응답
 */
export type DeleteItineraryItemResponse = ApiSuccessResponse<{
  deleted: boolean;
}>;

/**
 * 일정 항목 순서 변경 응답
 */
export type ReorderItineraryItemsResponse = ApiSuccessResponse<{
  reordered: boolean;
}>;

// ==========================================
// Hotel Responses (FEAT-1)
// ==========================================

/**
 * 호텔 목록 응답
 */
export type ListHotelsResponse = ApiSuccessResponse<
  PaginatedResponse<HotelSummary>
>;

/**
 * 호텔 단일 조회 응답
 */
export type GetHotelResponse = ApiSuccessResponse<Hotel>;

/**
 * 호텔 상세 조회 응답 (이미지 포함)
 */
export type GetHotelWithImagesResponse = ApiSuccessResponse<HotelWithImages>;

/**
 * 호텔 생성 응답
 */
export type CreateHotelResponse = ApiSuccessResponse<Hotel>;

/**
 * 호텔 수정 응답
 */
export type UpdateHotelResponse = ApiSuccessResponse<Hotel>;

/**
 * 호텔 삭제 응답
 */
export type DeleteHotelResponse = ApiSuccessResponse<{ deleted: boolean }>;

// ==========================================
// Image Responses (FEAT-3)
// ==========================================

/**
 * 이미지 목록 응답
 */
export type ListImagesResponse = ApiSuccessResponse<
  PaginatedResponse<ImageSummary>
>;

/**
 * 이미지 단일 조회 응답
 */
export type GetImageResponse = ApiSuccessResponse<Image>;

/**
 * 이미지 상세 조회 응답 (카테고리 포함)
 */
export type GetImageWithCategoryResponse =
  ApiSuccessResponse<ImageWithCategory>;

/**
 * 이미지 업로드 응답
 */
export type UploadImageResponse = ApiSuccessResponse<Image>;

/**
 * 이미지 일괄 업로드 응답
 */
export type BulkUploadImagesResponse = ApiSuccessResponse<{
  uploaded: Image[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
}>;

/**
 * 이미지 수정 응답
 */
export type UpdateImageResponse = ApiSuccessResponse<Image>;

/**
 * 이미지 삭제 응답
 */
export type DeleteImageResponse = ApiSuccessResponse<{ deleted: boolean }>;

/**
 * 이미지 일괄 삭제 응답
 */
export type BulkDeleteImagesResponse = ApiSuccessResponse<{
  deleted: number;
  failed: string[]; // 삭제 실패한 이미지 ID 목록
}>;

// ==========================================
// ImageCategory Responses (FEAT-3)
// ==========================================

/**
 * 이미지 카테고리 목록 응답
 */
export type ListImageCategoriesResponse = ApiSuccessResponse<ImageCategory[]>;

/**
 * 이미지 카테고리 목록 응답 (이미지 수 포함)
 */
export type ListImageCategoriesWithCountResponse = ApiSuccessResponse<
  ImageCategoryWithCount[]
>;

/**
 * 이미지 카테고리 단일 조회 응답
 */
export type GetImageCategoryResponse = ApiSuccessResponse<ImageCategory>;

/**
 * 이미지 카테고리 생성 응답
 */
export type CreateImageCategoryResponse = ApiSuccessResponse<ImageCategory>;

/**
 * 이미지 카테고리 수정 응답
 */
export type UpdateImageCategoryResponse = ApiSuccessResponse<ImageCategory>;

/**
 * 이미지 카테고리 삭제 응답
 */
export type DeleteImageCategoryResponse = ApiSuccessResponse<{
  deleted: boolean;
}>;

// ==========================================
// Authentication Responses
// ==========================================

/**
 * 로그인 응답
 */
export type LoginResponse = ApiSuccessResponse<{
  user: Omit<User, 'createdAt' | 'updatedAt'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 초 단위
}>;

/**
 * 회원가입 응답
 */
export type RegisterResponse = ApiSuccessResponse<{
  user: Omit<User, 'createdAt' | 'updatedAt'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}>;

/**
 * 토큰 갱신 응답
 */
export type RefreshTokenResponse = ApiSuccessResponse<{
  accessToken: string;
  expiresIn: number;
}>;

/**
 * 현재 사용자 정보 응답
 */
export type GetCurrentUserResponse = ApiSuccessResponse<UserProfile>;

/**
 * 로그아웃 응답
 */
export type LogoutResponse = ApiSuccessResponse<{ loggedOut: boolean }>;

// ==========================================
// Health Check Response
// ==========================================

/**
 * 헬스 체크 응답
 */
export type HealthCheckResponse = ApiSuccessResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: number;
  database?: {
    connected: boolean;
    latency?: number;
  };
}>;
