import { v4 as uuidv4 } from 'uuid';
import {
  ItineraryItem,
  CreateItineraryItemRequest,
  UpdateItineraryItemRequest,
  ReorderItemsRequest,
} from '../../../shared/types/itineraryItem';
import { getItineraryById } from './itineraryService';

// In-memory item store (for testing/development)
// Key: itemId, Value: ItineraryItem
export const itineraryItemStore = new Map<string, ItineraryItem>();

/**
 * Validate time format (HH:MM)
 */
function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
}

/**
 * Get all items for an itinerary
 */
export function getItineraryItems(itineraryId: string): ItineraryItem[] {
  // Check if itinerary exists
  const itinerary = getItineraryById(itineraryId);
  if (!itinerary) {
    throw new Error('Itinerary not found');
  }

  // Get all items for this itinerary
  const items = Array.from(itineraryItemStore.values()).filter(
    (item) => item.itineraryId === itineraryId
  );

  // Sort by day then sortOrder
  return items.sort((a, b) => {
    if (a.day !== b.day) {
      return a.day - b.day;
    }
    return a.sortOrder - b.sortOrder;
  });
}

/**
 * Get item by ID
 */
export function getItineraryItemById(
  itineraryId: string,
  itemId: string
): ItineraryItem | null {
  const item = itineraryItemStore.get(itemId);

  if (!item || item.itineraryId !== itineraryId) {
    return null;
  }

  return item;
}

/**
 * Create a new itinerary item
 */
export function createItineraryItem(
  itineraryId: string,
  data: CreateItineraryItemRequest
): ItineraryItem {
  // Check if itinerary exists
  const itinerary = getItineraryById(itineraryId);
  if (!itinerary) {
    throw new Error('Itinerary not found');
  }

  // Validate required fields
  if (
    data.day === undefined ||
    data.sortOrder === undefined ||
    !data.time ||
    !data.title
  ) {
    throw new Error('Missing required fields: day, sortOrder, time, title');
  }

  // Validate day
  if (data.day < 1) {
    throw new Error('Day must be a positive number');
  }

  // Validate time format
  if (!isValidTime(data.time)) {
    throw new Error('Invalid time format. Expected HH:MM (e.g., 09:00, 14:30)');
  }

  // Create item
  const id = uuidv4();
  const now = new Date();

  const item: ItineraryItem = {
    id,
    itineraryId,
    day: data.day,
    sortOrder: data.sortOrder,
    time: data.time,
    title: data.title,
    description: data.description,
    location: data.location,
    duration: data.duration,
    createdAt: now,
    updatedAt: now,
  };

  // Store item
  itineraryItemStore.set(id, item);

  return item;
}

/**
 * Update an itinerary item
 */
export function updateItineraryItem(
  itineraryId: string,
  itemId: string,
  data: UpdateItineraryItemRequest
): ItineraryItem {
  // Get existing item
  const existing = itineraryItemStore.get(itemId);

  if (!existing || existing.itineraryId !== itineraryId) {
    throw new Error('Item not found');
  }

  // Validate time if provided
  if (data.time && !isValidTime(data.time)) {
    throw new Error('Invalid time format. Expected HH:MM (e.g., 09:00, 14:30)');
  }

  // Validate day if provided
  if (data.day !== undefined && data.day < 1) {
    throw new Error('Day must be a positive number');
  }

  // Update item
  const updated: ItineraryItem = {
    ...existing,
    day: data.day ?? existing.day,
    sortOrder: data.sortOrder ?? existing.sortOrder,
    time: data.time ?? existing.time,
    title: data.title ?? existing.title,
    description:
      data.description !== undefined ? data.description : existing.description,
    location: data.location !== undefined ? data.location : existing.location,
    duration: data.duration !== undefined ? data.duration : existing.duration,
    updatedAt: new Date(),
  };

  // Store updated item
  itineraryItemStore.set(itemId, updated);

  return updated;
}

/**
 * Delete an itinerary item
 */
export function deleteItineraryItem(itineraryId: string, itemId: string): void {
  const existing = itineraryItemStore.get(itemId);

  if (!existing || existing.itineraryId !== itineraryId) {
    throw new Error('Item not found');
  }

  itineraryItemStore.delete(itemId);
}

/**
 * Reorder itinerary items (for drag-and-drop)
 */
export function reorderItineraryItems(
  itineraryId: string,
  data: ReorderItemsRequest
): ItineraryItem[] {
  // Validate request
  if (!data.items || !Array.isArray(data.items)) {
    throw new Error('Missing items array');
  }

  // Update each item's day and sortOrder
  for (const itemUpdate of data.items) {
    const item = itineraryItemStore.get(itemUpdate.id);

    if (!item || item.itineraryId !== itineraryId) {
      throw new Error(`Item not found: ${itemUpdate.id}`);
    }

    const updated: ItineraryItem = {
      ...item,
      day: itemUpdate.day,
      sortOrder: itemUpdate.sortOrder,
      updatedAt: new Date(),
    };

    itineraryItemStore.set(itemUpdate.id, updated);
  }

  // Return updated list
  return getItineraryItems(itineraryId);
}
