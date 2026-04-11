import { useEffect, useState } from 'react';
import type { Hotel } from '../mocks/data/hotels';
import { getHotels, GetHotelsParams } from '../api/hotels';

interface UseHotelsOptions extends GetHotelsParams {
  enabled?: boolean;
}

interface UseHotelsResult {
  hotels: Hotel[];
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
 * Hook to fetch and manage hotels
 */
export function useHotels(options: UseHotelsOptions = {}): UseHotelsResult {
  const {
    enabled = true,
    page,
    pageSize,
    location,
    minRating,
    maxPrice,
    search,
  } = options;
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const fetchHotels = async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getHotels({
        page,
        pageSize,
        location,
        minRating,
        maxPrice,
        search,
      });

      if (response.success && response.data) {
        setHotels(response.data);

        if (response.meta) {
          setTotalCount(response.meta.totalCount);
          setTotalPages(response.meta.totalPages);
          setCurrentPage(response.meta.page);
          setHasNextPage(response.meta.hasNextPage);
          setHasPreviousPage(response.meta.hasPreviousPage);
        }
      } else {
        setError('Failed to fetch hotels');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch hotels';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, page, pageSize, location, minRating, maxPrice, search]);

  return {
    hotels,
    isLoading,
    error,
    totalCount,
    totalPages,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    refetch: fetchHotels,
  };
}
