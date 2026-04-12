import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import {
  Hotel,
  CreateHotelRequest,
  UpdateHotelRequest,
  Coordinates,
} from '../../../shared/types/hotel';

// Mock userId for development (fallback)
const DEFAULT_USER_ID = 'default-user-id';

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
export async function getAllHotels(
  page?: number,
  limit?: number
): Promise<{ hotels: Hotel[]; total: number }> {
  // Get total count
  const total = await prisma.hotel.count();

  // If pagination is not requested, return all
  if (page === undefined || limit === undefined) {
    const hotels = await prisma.hotel.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // Parse coordinates for each hotel
    const parsedHotels = hotels.map(h => ({
      ...h,
      coordinates: h.coordinates && typeof h.coordinates === 'string'
        ? JSON.parse(h.coordinates)
        : h.coordinates,
    }));
    return { hotels: parsedHotels, total };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const hotels = await prisma.hotel.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  // Parse coordinates for each hotel
  const parsedHotels = hotels.map(h => ({
    ...h,
    coordinates: h.coordinates && typeof h.coordinates === 'string'
      ? JSON.parse(h.coordinates)
      : h.coordinates,
  }));

  return { hotels: parsedHotels, total };
}

/**
 * Get hotel by ID
 */
export async function getHotelById(id: string): Promise<Hotel | null> {
  const hotel = await prisma.hotel.findUnique({
    where: { id },
  });
  return hotel;
}

/**
 * Create a new hotel
 */
export async function createHotel(data: CreateHotelRequest, userId?: string): Promise<Hotel> {
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

  // Use provided userId or find/create default user
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const defaultUser = await prisma.user.findFirst();
    if (defaultUser) {
      resolvedUserId = defaultUser.id;
    } else {
      resolvedUserId = DEFAULT_USER_ID;
    }
  }

  // Create hotel in database
  const hotel = await prisma.hotel.create({
    data: {
      id: uuidv4(),
      userId: resolvedUserId,
      name: data.name.trim(),
      address: data.address,
      country: data.country,
      city: data.city,
      starRating: data.starRating,
      phone: data.phone,
      url: data.url,
      locationRemarks: data.locationRemarks,
      coordinates: data.coordinates ? JSON.stringify(data.coordinates) : null,
      amenities: data.amenities,
    },
  });

  // Parse coordinates back to object if stored as string
  if (hotel.coordinates && typeof hotel.coordinates === 'string') {
    hotel.coordinates = JSON.parse(hotel.coordinates);
  }

  return hotel;
}

/**
 * Update a hotel
 */
export async function updateHotel(id: string, data: UpdateHotelRequest): Promise<Hotel> {
  // Get existing hotel
  const existing = await prisma.hotel.findUnique({
    where: { id },
  });
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

  // Update hotel in database
  const updated = await prisma.hotel.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      address: data.address,
      country: data.country,
      city: data.city,
      starRating: data.starRating,
      phone: data.phone,
      url: data.url,
      locationRemarks: data.locationRemarks,
      coordinates: data.coordinates ? JSON.stringify(data.coordinates) : undefined,
      amenities: data.amenities,
    },
  });

  // Parse coordinates back to object if stored as string
  if (updated.coordinates && typeof updated.coordinates === 'string') {
    updated.coordinates = JSON.parse(updated.coordinates);
  }

  return updated;
}

/**
 * Delete a hotel
 */
export async function deleteHotel(id: string): Promise<void> {
  const existing = await prisma.hotel.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error('Hotel not found');
  }

  await prisma.hotel.delete({
    where: { id },
  });
}
