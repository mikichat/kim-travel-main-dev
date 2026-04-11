import { useEffect, useState } from 'react';
import type { ImageAsset, ImageCategory } from '../mocks/data/images';
import { getImages, GetImagesParams } from '../api/images';

interface UseImagesOptions extends GetImagesParams {
  enabled?: boolean;
}

interface UseImagesResult {
  images: ImageAsset[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage images
 */
export function useImages(options: UseImagesOptions = {}): UseImagesResult {
  const { enabled = true, page, pageSize, category, tags, search } = options;
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const fetchImages = async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getImages({
        page,
        pageSize,
        category,
        tags,
        search,
      });

      if (response.success && response.data) {
        setImages(response.data);

        if (response.meta) {
          setTotalCount(response.meta.totalCount);
          setTotalPages(response.meta.totalPages);
          setCurrentPage(response.meta.page);
          setHasNextPage(response.meta.hasNextPage);
          setHasPreviousPage(response.meta.hasPreviousPage);
        }
      } else {
        setError('Failed to fetch images');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch images';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, page, pageSize, category, tags, search]);

  return {
    images,
    isLoading,
    error,
    totalCount,
    totalPages,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    refetch: fetchImages,
  };
}

/**
 * Hook to fetch image categories
 */
export function useImageCategories() {
  const [categories, setCategories] = useState<
    { category: ImageCategory; count: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { getImageCategories } = await import('../api/images');
        const response = await getImageCategories();

        if (response.success && response.data) {
          setCategories(response.data);
        } else {
          setError('Failed to fetch categories');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch categories';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, isLoading, error };
}

/**
 * Hook to fetch image tags
 */
export function useImageTags() {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { getImageTags } = await import('../api/images');
        const response = await getImageTags();

        if (response.success && response.data) {
          setTags(response.data);
        } else {
          setError('Failed to fetch tags');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch tags';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  return { tags, isLoading, error };
}
