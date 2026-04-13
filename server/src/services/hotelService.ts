import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import {
  Hotel,
  CreateHotelRequest,
  UpdateHotelRequest,
  Coordinates,
} from '../../../shared/types/hotel';

const DEFAULT_USER_ID = 'default-user-id';

function isValidStarRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

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

export async function getAllHotels(page?: number, limit?: number): Promise<{ hotels: Hotel[]; total: number }> {
  const total = db.prepare('SELECT COUNT(*) as count FROM hotels').get() as { count: number };
  const totalCount = total.count;

  if (page === undefined || limit === undefined) {
    const hotels = db.prepare('SELECT * FROM hotels ORDER BY created_at DESC').all() as any[];
    const parsedHotels = hotels.map(h => parseHotel(h));
    return { hotels: parsedHotels, total: totalCount };
  }

  const skip = (page - 1) * limit;
  const hotels = db.prepare('SELECT * FROM hotels ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, skip) as any[];
  const parsedHotels = hotels.map(h => parseHotel(h));

  return { hotels: parsedHotels, total: totalCount };
}

export async function getHotelById(id: string): Promise<Hotel | null> {
  const hotel = db.prepare('SELECT * FROM hotels WHERE id = ?').get(id) as any;
  return hotel ? parseHotel(hotel) : null;
}

export async function createHotel(data: CreateHotelRequest, userId?: string): Promise<Hotel> {
  if (!data.name || data.name.trim() === '') {
    throw new Error('Hotel name is required');
  }

  if (data.starRating !== undefined && !isValidStarRating(data.starRating)) {
    throw new Error('Star rating must be an integer between 1 and 5');
  }

  if (data.coordinates && !isValidCoordinates(data.coordinates)) {
    throw new Error('Invalid coordinates');
  }

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const defaultUser = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined;
    resolvedUserId = defaultUser?.id || DEFAULT_USER_ID;
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const coordinates = data.coordinates ? JSON.stringify(data.coordinates) : null;

  db.prepare(`
    INSERT INTO hotels (id, user_id, name, address, country, city, star_rating, phone, url, location_remarks, coordinates, amenities, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    resolvedUserId,
    data.name.trim(),
    data.address || null,
    data.country || null,
    data.city || null,
    data.starRating || null,
    data.phone || null,
    data.url || null,
    data.locationRemarks || null,
    coordinates,
    data.amenities || null,
    now,
    now
  );

  return getHotelById(id) as Promise<Hotel>;
}

export async function updateHotel(id: string, data: UpdateHotelRequest): Promise<Hotel> {
  const existing = db.prepare('SELECT * FROM hotels WHERE id = ?').get(id);
  if (!existing) {
    throw new Error('Hotel not found');
  }

  if (data.name !== undefined && data.name.trim() === '') {
    throw new Error('Hotel name cannot be empty');
  }

  if (data.starRating !== undefined && !isValidStarRating(data.starRating)) {
    throw new Error('Star rating must be an integer between 1 and 5');
  }

  if (data.coordinates && !isValidCoordinates(data.coordinates)) {
    throw new Error('Invalid coordinates');
  }

  const coordinates = data.coordinates ? JSON.stringify(data.coordinates) : undefined;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE hotels SET
      name = COALESCE(?, name),
      address = COALESCE(?, address),
      country = COALESCE(?, country),
      city = COALESCE(?, city),
      star_rating = COALESCE(?, star_rating),
      phone = COALESCE(?, phone),
      url = COALESCE(?, url),
      location_remarks = COALESCE(?, location_remarks),
      coordinates = COALESCE(?, coordinates),
      amenities = COALESCE(?, amenities),
      updated_at = ?
    WHERE id = ?
  `).run(
    data.name?.trim() || null,
    data.address,
    data.country,
    data.city,
    data.starRating,
    data.phone,
    data.url,
    data.locationRemarks,
    coordinates,
    data.amenities,
    now,
    id
  );

  return getHotelById(id) as Promise<Hotel>;
}

export async function deleteHotel(id: string): Promise<void> {
  const existing = db.prepare('SELECT * FROM hotels WHERE id = ?').get(id);
  if (!existing) {
    throw new Error('Hotel not found');
  }
  db.prepare('DELETE FROM hotels WHERE id = ?').run(id);
}

function parseHotel(h: any): Hotel {
  return {
    id: h.id,
    userId: h.user_id,
    name: h.name,
    address: h.address,
    country: h.country,
    city: h.city,
    starRating: h.star_rating,
    phone: h.phone,
    url: h.url,
    locationRemarks: h.location_remarks,
    coordinates: h.coordinates && typeof h.coordinates === 'string' ? JSON.parse(h.coordinates) : h.coordinates,
    amenities: h.amenities,
    createdAt: h.created_at,
    updatedAt: h.updated_at,
  };
}
