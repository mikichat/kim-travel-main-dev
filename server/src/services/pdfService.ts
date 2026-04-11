import { v4 as uuidv4 } from 'uuid';
import {
  PdfData,
  PdfDayItem,
  PdfHotelInfo,
  GeneratePdfRequest,
} from '../../../shared/types/pdf';
import { getItineraryById } from './itineraryService';
import { getItineraryItems } from './itineraryItemService';
import { getHotelById } from './hotelService';

// In-memory PDF store (for testing/development)
// In production, store metadata in database and actual PDFs in S3/cloud storage
interface PdfRecord {
  id: string;
  itineraryId: string;
  url: string;
  createdAt: Date;
}

export const pdfStore = new Map<string, PdfRecord>();

/**
 * Format date range
 */
function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  const start = startDate.toLocaleDateString('en-US', options);
  const end = endDate.toLocaleDateString('en-US', options);

  return `${start} - ${end}`;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get PDF preview data
 */
export function getPdfPreview(itineraryId: string): PdfData {
  // Get itinerary
  const itinerary = getItineraryById(itineraryId);
  if (!itinerary) {
    throw new Error('Itinerary not found');
  }

  // Get all itinerary items
  const items = getItineraryItems(itineraryId);

  // Group items by day
  const dayMap = new Map<number, PdfDayItem>();

  items.forEach((item) => {
    if (!dayMap.has(item.day)) {
      // Calculate date for this day
      const dayDate = new Date(itinerary.startDate);
      dayDate.setDate(dayDate.getDate() + item.day - 1);

      dayMap.set(item.day, {
        dayNumber: item.day,
        date: formatDate(dayDate),
        items: [],
      });
    }

    const dayItem = dayMap.get(item.day)!;
    dayItem.items.push({
      id: item.id,
      time: item.time,
      title: item.title,
      description: item.description,
      location: item.location,
      duration: item.duration,
    });
  });

  // Convert map to sorted array
  const days = Array.from(dayMap.values()).sort(
    (a, b) => a.dayNumber - b.dayNumber
  );

  return {
    title: itinerary.title,
    destination: itinerary.destination,
    dateRange: formatDateRange(itinerary.startDate, itinerary.endDate),
    startDate: formatDate(itinerary.startDate),
    endDate: formatDate(itinerary.endDate),
    days,
    hotels: [],
    checklist: [],
  };
}

/**
 * Generate PDF
 */
export function generatePdf(request: GeneratePdfRequest): PdfRecord {
  // Validate request
  if (!request.itineraryId) {
    throw new Error('Missing required field: itineraryId');
  }

  // Get itinerary (will throw if not found)
  const itinerary = getItineraryById(request.itineraryId);
  if (!itinerary) {
    throw new Error('Itinerary not found');
  }

  // Get preview data
  const pdfData = getPdfPreview(request.itineraryId);

  // Add hotels if provided
  if (request.hotelIds && request.hotelIds.length > 0) {
    const hotels: PdfHotelInfo[] = [];
    for (const hotelId of request.hotelIds) {
      const hotel = getHotelById(hotelId);
      if (hotel) {
        hotels.push({
          id: hotel.id,
          name: hotel.name,
          address: hotel.address,
          city: hotel.city,
          country: hotel.country,
          starRating: hotel.starRating,
          phone: hotel.phone,
          url: hotel.url,
        });
      }
    }
    pdfData.hotels = hotels;
  }

  // Add checklist if provided
  if (request.checklist && request.checklist.length > 0) {
    pdfData.checklist = request.checklist;
  }

  // Add cover image if provided
  if (request.coverImage) {
    pdfData.coverImage = request.coverImage;
  }

  // In production: Generate actual PDF file using puppeteer or pdfkit
  // For now, create a mock PDF record
  const id = uuidv4();
  const url = `/api/pdf/download/${id}.pdf`;

  const pdfRecord: PdfRecord = {
    id,
    itineraryId: request.itineraryId,
    url,
    createdAt: new Date(),
  };

  // Store PDF record
  pdfStore.set(id, pdfRecord);

  return pdfRecord;
}

/**
 * Get PDF by ID
 */
export function getPdfById(id: string): PdfRecord | null {
  return pdfStore.get(id) || null;
}
