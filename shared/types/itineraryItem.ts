// Itinerary Item Types

export interface ItineraryItem {
  id: string;
  itineraryId: string;
  day: number; // 몇 번째 날 (1, 2, 3...)
  sortOrder: number; // 같은 날 내 순서
  time: string; // "09:00", "14:30" 등
  title: string;
  description?: string;
  location?: string;
  duration?: number; // 분 단위
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response Types
export interface CreateItineraryItemRequest {
  day: number;
  sortOrder: number;
  time: string;
  title: string;
  description?: string;
  location?: string;
  duration?: number;
}

export interface UpdateItineraryItemRequest {
  day?: number;
  sortOrder?: number;
  time?: string;
  title?: string;
  description?: string;
  location?: string;
  duration?: number;
}

export interface ReorderItemsRequest {
  items: Array<{
    id: string;
    day: number;
    sortOrder: number;
  }>;
}

export interface ItineraryItemResponse {
  success: boolean;
  message: string;
  data?: ItineraryItem;
}

export interface ItineraryItemListResponse {
  success: boolean;
  message: string;
  data?: ItineraryItem[];
}
