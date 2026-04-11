import { v4 as uuidv4 } from 'uuid';
import {
  ImageCategory,
  CreateImageCategoryRequest,
  UpdateImageCategoryRequest,
} from '../../../shared/types/image';

// In-memory category store (for testing/development)
export const categoryStore = new Map<string, ImageCategory>();

// Mock userId for development
const MOCK_USER_ID = 'mock-user-id';

/**
 * Clear category store (for testing)
 */
export function clearCategoryStore(): void {
  categoryStore.clear();
}

/**
 * Get all categories
 */
export function getAllCategories(): ImageCategory[] {
  return Array.from(categoryStore.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): ImageCategory | null {
  return categoryStore.get(id) || null;
}

/**
 * Create a new category
 */
export function createCategory(
  data: CreateImageCategoryRequest
): ImageCategory {
  // Validate required fields
  if (!data.name || data.name.trim() === '') {
    throw new Error('Category name is required');
  }

  // Create category
  const id = uuidv4();
  const now = new Date();

  const category: ImageCategory = {
    id,
    userId: MOCK_USER_ID,
    name: data.name.trim(),
    description: data.description,
    sortOrder: data.sortOrder ?? 0,
    createdAt: now,
  };

  // Store category
  categoryStore.set(id, category);

  return category;
}

/**
 * Update a category
 */
export function updateCategory(
  id: string,
  data: UpdateImageCategoryRequest
): ImageCategory {
  // Get existing category
  const existing = categoryStore.get(id);
  if (!existing) {
    throw new Error('Category not found');
  }

  // Validate name if provided
  if (data.name !== undefined && data.name.trim() === '') {
    throw new Error('Category name cannot be empty');
  }

  // Update category
  const updated: ImageCategory = {
    ...existing,
    name: data.name !== undefined ? data.name.trim() : existing.name,
    description:
      data.description !== undefined ? data.description : existing.description,
    sortOrder:
      data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder,
  };

  // Store updated category
  categoryStore.set(id, updated);

  return updated;
}

/**
 * Delete a category
 */
export function deleteCategory(id: string): void {
  const existing = categoryStore.get(id);
  if (!existing) {
    throw new Error('Category not found');
  }

  categoryStore.delete(id);
}
