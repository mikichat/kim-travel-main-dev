// ==========================================
// Model Types (Prisma Schema와 동기화)
// ==========================================

import type { Timestamps, CreatedTimestamp } from './api.js';

// ==========================================
// Enums (Prisma Enum과 동기화)
// ==========================================

/**
 * 일정표 상태
 */
export type ItineraryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/**
 * 사용자 역할 (인증 시스템 확장용)
 */
export type UserRole = 'admin' | 'manager' | 'staff' | 'user';

// ==========================================
// User Model
// ==========================================

/**
 * 사용자 정보 (비밀번호 해시 제외)
 */
export interface User extends Timestamps {
  id: string;
  email: string;
  name: string;
}

/**
 * 사용자 프로필 정보 (확장 가능)
 */
export interface UserProfile extends User {
  itineraryCount?: number;
  hotelCount?: number;
  imageCount?: number;
}

// ==========================================
// Itinerary Model (FEAT-2: 일정표)
// ==========================================

/**
 * 좌표 타입
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * 일정표 메타데이터 타입
 */
export interface ItineraryMetadata {
  templateId?: string;
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
    companyName?: string;
  };
  settings?: {
    showMap?: boolean;
    showWeather?: boolean;
    showTimezone?: boolean;
  };
  [key: string]: unknown;
}

/**
 * 일정표 기본 정보
 */
export interface Itinerary extends Timestamps {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startDate: string | null; // ISO Date string (YYYY-MM-DD)
  endDate: string | null;
  status: ItineraryStatus;
  metadata: ItineraryMetadata | null;
}

/**
 * 일정표 상세 정보 (아이템 포함)
 */
export interface ItineraryWithItems extends Itinerary {
  items: ItineraryItem[];
}

/**
 * 일정표 요약 정보 (목록 조회용)
 */
export interface ItinerarySummary {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: ItineraryStatus;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ItineraryItem Model (FEAT-2: 일정 항목)
// ==========================================

/**
 * 일정 항목 기본 정보
 */
export interface ItineraryItem extends Timestamps {
  id: string;
  itineraryId: string;
  hotelId: string | null;
  dayNumber: number;
  startTime: string | null; // HH:mm format
  endTime: string | null;
  title: string;
  description: string | null;
  location: string | null;
  coordinates: Coordinates | null;
  sortOrder: number;
}

/**
 * 일정 항목 상세 정보 (호텔, 이미지 포함)
 */
export interface ItineraryItemWithDetails extends ItineraryItem {
  hotel: Hotel | null;
  images: Image[];
}

/**
 * 일자별 일정 항목 그룹
 */
export interface DaySchedule {
  dayNumber: number;
  date?: string; // 실제 날짜 (시작일 기준 계산)
  items: ItineraryItem[];
}

// ==========================================
// Hotel Model (FEAT-1: 호텔 정보)
// ==========================================

/**
 * 호텔 편의시설 타입
 */
export type HotelAmenity =
  | 'wifi'
  | 'parking'
  | 'breakfast'
  | 'pool'
  | 'gym'
  | 'spa'
  | 'restaurant'
  | 'bar'
  | 'room_service'
  | 'laundry'
  | 'business_center'
  | 'concierge'
  | 'airport_shuttle'
  | 'pet_friendly';

/**
 * 호텔 기본 정보
 */
export interface Hotel extends Timestamps {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  country: string | null;
  city: string | null;
  starRating: number | null; // 1-5
  phone: string | null;
  url: string | null;
  locationRemarks: string | null;
  coordinates: Coordinates | null;
  amenities: HotelAmenity[] | null;
}

/**
 * 호텔 요약 정보 (목록 조회용)
 */
export interface HotelSummary {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  starRating: number | null;
}

/**
 * 호텔 상세 정보 (이미지 포함)
 */
export interface HotelWithImages extends Hotel {
  images: Image[];
}

// ==========================================
// Image Model (FEAT-3: 이미지 갤러리)
// ==========================================

/**
 * 이미지 기본 정보
 */
export interface Image extends CreatedTimestamp {
  id: string;
  userId: string;
  categoryId: string | null;
  hotelId: string | null;
  filename: string;
  storagePath: string | null;
  cloudUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  metadata: ImageMetadata | null;
}

/**
 * 이미지 메타데이터
 */
export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  originalName?: string;
  alt?: string;
  caption?: string;
  [key: string]: unknown;
}

/**
 * 이미지 요약 정보
 */
export interface ImageSummary {
  id: string;
  filename: string;
  cloudUrl: string | null;
  storagePath: string | null;
  mimeType: string | null;
}

/**
 * 이미지 상세 정보 (카테고리 포함)
 */
export interface ImageWithCategory extends Image {
  category: ImageCategory | null;
}

// ==========================================
// ImageCategory Model (FEAT-3: 이미지 카테고리)
// ==========================================

/**
 * 이미지 카테고리 기본 정보
 */
export interface ImageCategory extends CreatedTimestamp {
  id: string;
  userId: string | null; // null이면 시스템 기본 카테고리
  name: string;
  description: string | null;
  sortOrder: number;
}

/**
 * 이미지 카테고리 상세 정보 (이미지 수 포함)
 */
export interface ImageCategoryWithCount extends ImageCategory {
  imageCount: number;
}

// ==========================================
// ItineraryItemImage (연결 테이블)
// ==========================================

/**
 * 일정 항목-이미지 연결 정보
 */
export interface ItineraryItemImage {
  itineraryItemId: string;
  imageId: string;
  sortOrder: number;
}
