// Hotel type for client-side components
// Used by HotelCard, useHotels hook, and HotelListPage

export interface Hotel {
  id: string;
  name: string;
  location: string;
  rating: number;
  description?: string;
  images?: string[];
  amenities?: string[];
  contactPhone?: string;
  contactEmail?: string;
  pricePerNight?: number;
  currency?: string;
}
