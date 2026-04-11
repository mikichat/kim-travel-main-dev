import axios from 'axios';
import type { ApiResponse } from '@tourworld/shared';
import type { ImageAsset, ImageCategory } from '../mocks/data/images';

const API_BASE_URL = '/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface GetImagesParams {
  page?: number;
  pageSize?: number;
  category?: ImageCategory;
  tags?: string;
  search?: string;
}

export interface UploadImageParams {
  file: File;
  category: ImageCategory;
  tags?: string;
  altText?: string;
}

/**
 * Get all images with optional filters
 */
export async function getImages(
  params: GetImagesParams = {}
): Promise<ApiResponse<ImageAsset[]>> {
  const response = await api.get<ApiResponse<ImageAsset[]>>('/images', {
    params,
  });
  return response.data;
}

/**
 * Get a single image by ID
 */
export async function getImageById(
  id: string
): Promise<ApiResponse<ImageAsset>> {
  const response = await api.get<ApiResponse<ImageAsset>>(`/images/${id}`);
  return response.data;
}

/**
 * Get all image categories with counts
 */
export async function getImageCategories(): Promise<
  ApiResponse<{ category: ImageCategory; count: number }[]>
> {
  const response =
    await api.get<ApiResponse<{ category: ImageCategory; count: number }[]>>(
      '/images/categories'
    );
  return response.data;
}

/**
 * Get all unique tags
 */
export async function getImageTags(): Promise<ApiResponse<string[]>> {
  const response = await api.get<ApiResponse<string[]>>('/images/tags');
  return response.data;
}

/**
 * Upload a new image
 */
export async function uploadImage(
  params: UploadImageParams
): Promise<ApiResponse<ImageAsset>> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('category', params.category);
  if (params.tags) {
    formData.append('tags', params.tags);
  }
  if (params.altText) {
    formData.append('altText', params.altText);
  }

  const response = await api.post<ApiResponse<ImageAsset>>(
    '/images/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

/**
 * Update image metadata
 */
export async function updateImage(
  id: string,
  metadata: Partial<ImageAsset>
): Promise<ApiResponse<ImageAsset>> {
  const response = await api.put<ApiResponse<ImageAsset>>(
    `/images/${id}`,
    metadata
  );
  return response.data;
}

/**
 * Delete a single image
 */
export async function deleteImage(id: string): Promise<ApiResponse<void>> {
  const response = await api.delete<ApiResponse<void>>(`/images/${id}`);
  return response.data;
}

/**
 * Delete multiple images
 */
export async function bulkDeleteImages(
  ids: string[]
): Promise<ApiResponse<{ deleted: string[]; notFound: string[] }>> {
  const response = await api.post<
    ApiResponse<{ deleted: string[]; notFound: string[] }>
  >('/images/bulk-delete', { ids });
  return response.data;
}
