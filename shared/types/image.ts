/**
 * Image Gallery Types
 * FEAT-3: 이미지 갤러리
 */

export interface Image {
  id: string;
  userId: string;
  categoryId?: string;
  hotelId?: string;
  filename: string;
  storagePath?: string;
  cloudUrl?: string;
  fileSize?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateImageRequest {
  categoryId?: string;
  hotelId?: string;
  filename: string;
  storagePath?: string;
  cloudUrl?: string;
  fileSize?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateImageRequest {
  categoryId?: string;
  hotelId?: string;
  metadata?: Record<string, unknown>;
}

export interface ImageResponse {
  success: boolean;
  message: string;
  data?: Image;
}

export interface ImageListResponse {
  success: boolean;
  message: string;
  data?: Image[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ImageCategory {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: Date;
}

export interface CreateImageCategoryRequest {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateImageCategoryRequest {
  name?: string;
  description?: string;
  sortOrder?: number;
}

export interface ImageCategoryResponse {
  success: boolean;
  message: string;
  data?: ImageCategory;
}

export interface ImageCategoryListResponse {
  success: boolean;
  message: string;
  data?: ImageCategory[];
}
