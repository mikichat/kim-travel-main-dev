export interface ItineraryItem {
  id: string;
  itineraryId: string;
  day: number;
  sortOrder: number;
  time: string;
  title: string;
  description?: string;
  location?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}
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
//# sourceMappingURL=itineraryItem.d.ts.map
