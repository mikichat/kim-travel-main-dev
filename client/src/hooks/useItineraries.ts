import { useEffect, useState } from 'react';
import type { Tour } from '@tourworld/shared';
import { getTours, GetToursParams } from '../api/itineraries';

interface UseItinerariesOptions extends GetToursParams {
  enabled?: boolean;
}

interface UseItinerariesResult {
  tours: Tour[];
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
 * Hook to fetch and manage tours/itineraries
 */
export function useItineraries(
  options: UseItinerariesOptions = {}
): UseItinerariesResult {
  const { enabled = true, page, pageSize, status, search } = options;
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const fetchTours = async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getTours({ page, pageSize, status, search });

      if (response.success && response.data) {
        setTours(response.data);

        if (response.meta) {
          setTotalCount(response.meta.totalCount);
          setTotalPages(response.meta.totalPages);
          setCurrentPage(response.meta.page);
          setHasNextPage(response.meta.hasNextPage);
          setHasPreviousPage(response.meta.hasPreviousPage);
        }
      } else {
        setError('Failed to fetch tours');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch tours';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, page, pageSize, status, search]);

  return {
    tours,
    isLoading,
    error,
    totalCount,
    totalPages,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    refetch: fetchTours,
  };
}
