// PDF Types

export interface PdfDayItem {
  dayNumber: number;
  date: string;
  items: {
    id: string;
    time: string;
    title: string;
    description?: string;
    location?: string;
    duration?: number;
  }[];
}

export interface PdfHotelInfo {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  starRating?: number;
  phone?: string;
  url?: string;
}

export interface PdfData {
  title: string;
  destination: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  days: PdfDayItem[];
  hotels: PdfHotelInfo[];
  checklist: string[];
}

// Request/Response Types
export interface GeneratePdfRequest {
  itineraryId: string;
  hotelIds?: string[];
  checklist?: string[];
  coverImage?: string;
}

export interface PdfResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    url: string;
    createdAt: Date;
  };
}

export interface PdfPreviewResponse {
  success: boolean;
  message: string;
  data?: PdfData;
}
