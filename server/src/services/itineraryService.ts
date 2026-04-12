import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import {
  Itinerary,
  CreateItineraryRequest,
  UpdateItineraryRequest,
  ItineraryStatus,
} from '../../../shared/types/itinerary';

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
export async function getAllItineraries(): Promise<Itinerary[]> {
  const itineraries = await prisma.itinerary.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return itineraries;
}

/**
 * Get itinerary by ID
 */
export async function getItineraryById(id: string): Promise<Itinerary | null> {
  const itinerary = await prisma.itinerary.findUnique({
    where: { id },
  });
  return itinerary;
}

/**
 * Create a new itinerary
 */
export async function createItinerary(data: CreateItineraryRequest): Promise<Itinerary> {
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

  // Create itinerary in database
  const itinerary = await prisma.itinerary.create({
    data: {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      destination: data.destination,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'draft',
      userId: 'mock-user-id', // TODO: get from auth context
    },
  });

  return itinerary;
}

/**
 * Update an itinerary
 */
export async function updateItinerary(
  id: string,
  data: UpdateItineraryRequest
): Promise<Itinerary> {
  // Get existing itinerary
  const existing = await prisma.itinerary.findUnique({
    where: { id },
  });
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
    startDate = data.startDate;
  }

  if (data.endDate) {
    if (!isValidDate(data.endDate)) {
      throw new Error('Invalid end date format');
    }
    endDate = data.endDate;
  }

  // Validate date range
  if (!isValidDateRange(new Date(startDate), new Date(endDate))) {
    throw new Error('End date must be on or after start date');
  }

  // Update itinerary in database
  const updated = await prisma.itinerary.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      destination: data.destination,
      startDate,
      endDate,
      status: data.status,
    },
  });

  return updated;
}

/**
 * Delete an itinerary
 */
export async function deleteItinerary(id: string): Promise<void> {
  const existing = await prisma.itinerary.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error('Itinerary not found');
  }

  await prisma.itinerary.delete({
    where: { id },
  });
}
