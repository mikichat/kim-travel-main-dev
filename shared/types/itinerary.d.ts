export type ItineraryStatus = 'draft' | 'published';
export interface Itinerary {
  id: string;
  title: string;
  description?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  status: ItineraryStatus;
  createdAt: Date;
  updatedAt: Date;
}
export interface CreateItineraryRequest {
  title: string;
  description?: string;
  destination: string;
  startDate: string;
  endDate: string;
  status?: ItineraryStatus;
}
export interface UpdateItineraryRequest {
  title?: string;
  description?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  status?: ItineraryStatus;
}
export interface ItineraryResponse {
  success: boolean;
  message: string;
  data?: Itinerary;
}
export interface ItineraryListResponse {
  success: boolean;
  message: string;
  data?: Itinerary[];
}
//# sourceMappingURL=itinerary.d.ts.map
