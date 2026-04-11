// Re-export shared types for client use
// These types are duplicated from @tourworld/shared for TypeScript compilation

// ==========================================
// Tour Types
// ==========================================
export interface Tour {
  id: string;
  title: string;
  description: string;
  destination: string;
  duration: number;
  price: number;
  currency: string;
  maxParticipants: number;
  status: TourStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TourStatus = 'draft' | 'published' | 'archived' | 'cancelled';

// ==========================================
// API Response Types
// ==========================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
