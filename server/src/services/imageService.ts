import { v4 as uuidv4 } from 'uuid';
import {
  Image,
  CreateImageRequest,
  UpdateImageRequest,
} from '../../../shared/types/image';

// In-memory image store (for testing/development)
export const imageStore = new Map<string, Image>();

// Mock userId for development
const MOCK_USER_ID = 'mock-user-id';

/**
 * Clear image store (for testing)
 */
export function clearImageStore(): void {
  imageStore.clear();
}

/**
 * Clear category store (for testing)
 * Re-export from categoryService for convenience
 */
export { clearCategoryStore } from './categoryService';

/**
 * Get all images with optional filters and pagination
 */
export function getAllImages(options?: {
  categoryId?: string;
  hotelId?: string;
  page?: number;
  limit?: number;
}): { images: Image[]; total: number } {
  let allImages = Array.from(imageStore.values());

  // Apply filters
  if (options?.categoryId) {
    allImages = allImages.filter(
      (img) => img.categoryId === options.categoryId
    );
  }

  if (options?.hotelId) {
    allImages = allImages.filter((img) => img.hotelId === options.hotelId);
  }

  const total = allImages.length;

  // Apply pagination
  if (options?.page !== undefined && options?.limit !== undefined) {
    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;
    allImages = allImages.slice(startIndex, endIndex);
  }

  return { images: allImages, total };
}

/**
 * Get image by ID
 */
export function getImageById(id: string): Image | null {
  return imageStore.get(id) || null;
}

/**
 * Create a new image
 */
export function createImage(data: CreateImageRequest): Image {
  // Validate required fields
  if (!data.filename || data.filename.trim() === '') {
    throw new Error('Filename is required');
  }

  // Validate mime type if provided
  if (data.mimeType && !data.mimeType.startsWith('image/')) {
    throw new Error('Invalid mime type: must be an image type');
  }

  // Create image
  const id = uuidv4();
  const now = new Date();

  const image: Image = {
    id,
    userId: MOCK_USER_ID,
    categoryId: data.categoryId,
    hotelId: data.hotelId,
    filename: data.filename.trim(),
    storagePath: data.storagePath,
    cloudUrl: data.cloudUrl,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    metadata: data.metadata,
    createdAt: now,
  };

  // Store image
  imageStore.set(id, image);

  return image;
}

/**
 * Update an image
 */
export function updateImage(id: string, data: UpdateImageRequest): Image {
  // Get existing image
  const existing = imageStore.get(id);
  if (!existing) {
    throw new Error('Image not found');
  }

  // Update image
  const updated: Image = {
    ...existing,
    categoryId:
      data.categoryId !== undefined ? data.categoryId : existing.categoryId,
    hotelId: data.hotelId !== undefined ? data.hotelId : existing.hotelId,
    metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
  };

  // Store updated image
  imageStore.set(id, updated);

  return updated;
}

/**
 * Delete an image
 */
export function deleteImage(id: string): void {
  const existing = imageStore.get(id);
  if (!existing) {
    throw new Error('Image not found');
  }

  imageStore.delete(id);
}
