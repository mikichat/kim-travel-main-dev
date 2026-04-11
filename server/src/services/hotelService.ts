import { v4 as uuidv4 } from 'uuid';
import {
  Hotel,
  CreateHotelRequest,
  UpdateHotelRequest,
  Coordinates,
} from '../../../shared/types/hotel';

// In-memory hotel store (for testing/development)
// In production, replace with database
export const hotelStore = new Map<string, Hotel>();

// Mock userId for development
const MOCK_USER_ID = 'mock-user-id';

/**
 * Validate star rating (1-5)
 */
function isValidStarRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Validate coordinates
 */
function isValidCoordinates(coords: Coordinates): boolean {
  const { lat, lng } = coords;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Get all hotels with optional pagination
 */
export function getAllHotels(
  page?: number,
  limit?: number
): { hotels: Hotel[]; total: number } {
  const allHotels = Array.from(hotelStore.values());
  const total = allHotels.length;

  // If pagination is not requested, return all
  if (page === undefined || limit === undefined) {
    return { hotels: allHotels, total };
  }

  // Calculate pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const hotels = allHotels.slice(startIndex, endIndex);

  return { hotels, total };
}

/**
 * Get hotel by ID
 */
export function getHotelById(id: string): Hotel | null {
  return hotelStore.get(id) || null;
}

/**
 * Create a new hotel
 */
export function createHotel(data: CreateHotelRequest): Hotel {
  // Validate required fields
  if (!data.name || data.name.trim() === '') {
    throw new Error('Hotel name is required');
  }

  // Validate star rating if provided
  if (data.starRating !== undefined && !isValidStarRating(data.starRating)) {
    throw new Error('Star rating must be an integer between 1 and 5');
  }

  // Validate coordinates if provided
  if (data.coordinates && !isValidCoordinates(data.coordinates)) {
    throw new Error(
      'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180'
    );
  }

  // Create hotel
  const id = uuidv4();
  const now = new Date();

  const hotel: Hotel = {
    id,
    userId: MOCK_USER_ID,
    name: data.name.trim(),
    address: data.address,
    country: data.country,
    city: data.city,
    starRating: data.starRating,
    phone: data.phone,
    url: data.url,
    locationRemarks: data.locationRemarks,
    coordinates: data.coordinates,
    amenities: data.amenities,
    createdAt: now,
    updatedAt: now,
  };

  // Store hotel
  hotelStore.set(id, hotel);

  return hotel;
}

/**
 * Update a hotel
 */
export function updateHotel(id: string, data: UpdateHotelRequest): Hotel {
  // Get existing hotel
  const existing = hotelStore.get(id);
  if (!existing) {
    throw new Error('Hotel not found');
  }

  // Validate name if provided
  if (data.name !== undefined && data.name.trim() === '') {
    throw new Error('Hotel name cannot be empty');
  }

  // Validate star rating if provided
  if (data.starRating !== undefined && !isValidStarRating(data.starRating)) {
    throw new Error('Star rating must be an integer between 1 and 5');
  }

  // Validate coordinates if provided
  if (data.coordinates && !isValidCoordinates(data.coordinates)) {
    throw new Error(
      'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180'
    );
  }

  // Update hotel
  const updated: Hotel = {
    ...existing,
    name: data.name !== undefined ? data.name.trim() : existing.name,
    address: data.address !== undefined ? data.address : existing.address,
    country: data.country !== undefined ? data.country : existing.country,
    city: data.city !== undefined ? data.city : existing.city,
    starRating:
      data.starRating !== undefined ? data.starRating : existing.starRating,
    phone: data.phone !== undefined ? data.phone : existing.phone,
    url: data.url !== undefined ? data.url : existing.url,
    locationRemarks:
      data.locationRemarks !== undefined
        ? data.locationRemarks
        : existing.locationRemarks,
    coordinates:
      data.coordinates !== undefined ? data.coordinates : existing.coordinates,
    amenities:
      data.amenities !== undefined ? data.amenities : existing.amenities,
    updatedAt: new Date(),
  };

  // Store updated hotel
  hotelStore.set(id, updated);

  return updated;
}

/**
 * Delete a hotel
 */
export function deleteHotel(id: string): void {
  const existing = hotelStore.get(id);
  if (!existing) {
    throw new Error('Hotel not found');
  }

  hotelStore.delete(id);
}
