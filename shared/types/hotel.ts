// Hotel Types

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Hotel {
  id: string;
  userId: string;
  name: string;
  address?: string;
  country?: string;
  city?: string;
  starRating?: number;
  phone?: string;
  url?: string;
  locationRemarks?: string;
  coordinates?: Coordinates;
  amenities?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response Types
export interface CreateHotelRequest {
  name: string;
  address?: string;
  country?: string;
  city?: string;
  starRating?: number;
  phone?: string;
  url?: string;
  locationRemarks?: string;
  coordinates?: Coordinates;
  amenities?: string[];
}

export interface UpdateHotelRequest {
  name?: string;
  address?: string;
  country?: string;
  city?: string;
  starRating?: number;
  phone?: string;
  url?: string;
  locationRemarks?: string;
  coordinates?: Coordinates;
  amenities?: string[];
}

export interface HotelResponse {
  success: boolean;
  message: string;
  data?: Hotel;
}

export interface HotelListResponse {
  success: boolean;
  message: string;
  data?: Hotel[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
