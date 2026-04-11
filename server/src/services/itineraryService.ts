import { v4 as uuidv4 } from 'uuid';
import {
  Itinerary,
  CreateItineraryRequest,
  UpdateItineraryRequest,
  ItineraryStatus,
} from '../../../shared/types/itinerary';

// In-memory itinerary store (for testing/development)
// In production, replace with database
export const itineraryStore = new Map<string, Itinerary>();

/**
 * Validate date string
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate date range
 */
function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return endDate >= startDate;
}

/**
 * Get all itineraries
 */
export function getAllItineraries(): Itinerary[] {
  return Array.from(itineraryStore.values());
}

/**
 * Get itinerary by ID
 */
export function getItineraryById(id: string): Itinerary | null {
  return itineraryStore.get(id) || null;
}

/**
 * Create a new itinerary
 */
export function createItinerary(data: CreateItineraryRequest): Itinerary {
  // Validate required fields
  if (!data.title || !data.destination || !data.startDate || !data.endDate) {
    throw new Error('Missing required fields: title, destination, startDate, endDate');
  }

  // Validate date format
  if (!isValidDate(data.startDate)) {
    throw new Error('Invalid start date format');
  }
  if (!isValidDate(data.endDate)) {
    throw new Error('Invalid end date format');
  }

  // Parse dates
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  // Validate date range
  if (!isValidDateRange(startDate, endDate)) {
    throw new Error('End date must be on or after start date');
  }

  // Create itinerary
  const id = uuidv4();
  const now = new Date();
  const status: ItineraryStatus = data.status || 'draft';

  const itinerary: Itinerary = {
    id,
    title: data.title,
    description: data.description,
    destination: data.destination,
    startDate,
    endDate,
    status,
    createdAt: now,
    updatedAt: now,
  };

  // Store itinerary
  itineraryStore.set(id, itinerary);

  return itinerary;
}

/**
 * Update an itinerary
 */
export function updateItinerary(
  id: string,
  data: UpdateItineraryRequest
): Itinerary {
  // Get existing itinerary
  const existing = itineraryStore.get(id);
  if (!existing) {
    throw new Error('Itinerary not found');
  }

  // Parse and validate dates if provided
  let startDate = existing.startDate;
  let endDate = existing.endDate;

  if (data.startDate) {
    if (!isValidDate(data.startDate)) {
      throw new Error('Invalid start date format');
    }
    startDate = new Date(data.startDate);
  }

  if (data.endDate) {
    if (!isValidDate(data.endDate)) {
      throw new Error('Invalid end date format');
    }
    endDate = new Date(data.endDate);
  }

  // Validate date range
  if (!isValidDateRange(startDate, endDate)) {
    throw new Error('End date must be on or after start date');
  }

  // Update itinerary
  const updated: Itinerary = {
    ...existing,
    title: data.title ?? existing.title,
    description: data.description !== undefined ? data.description : existing.description,
    destination: data.destination ?? existing.destination,
    startDate,
    endDate,
    status: data.status ?? existing.status,
    updatedAt: new Date(),
  };

  // Store updated itinerary
  itineraryStore.set(id, updated);

  return updated;
}

/**
 * Delete an itinerary
 */
export function deleteItinerary(id: string): void {
  const existing = itineraryStore.get(id);
  if (!existing) {
    throw new Error('Itinerary not found');
  }

  itineraryStore.delete(id);
}
