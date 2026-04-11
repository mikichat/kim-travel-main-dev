import { http, HttpResponse, delay } from 'msw';
import type { ApiResponse, ItineraryItem } from '@tourworld/shared';

const API_BASE = '/api';

// Mock data for itinerary items
let mockItems: ItineraryItem[] = [
  {
    id: '1',
    itineraryId: '1',
    hotelId: null,
    dayNumber: 1,
    startTime: '09:00',
    endTime: '10:00',
    title: '공항 도착',
    description: '인천국제공항 도착 및 수속',
    location: '인천국제공항',
    coordinates: null,
    sortOrder: 1,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: '2',
    itineraryId: '1',
    hotelId: null,
    dayNumber: 1,
    startTime: '12:00',
    endTime: '13:30',
    title: '점심 식사',
    description: '현지 맛집에서 점심',
    location: '현지 식당',
    coordinates: null,
    sortOrder: 2,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: '3',
    itineraryId: '1',
    hotelId: null,
    dayNumber: 1,
    startTime: '14:00',
    endTime: '15:00',
    title: '호텔 체크인',
    description: '힐튼 호텔 체크인',
    location: '힐튼 호텔',
    coordinates: null,
    sortOrder: 3,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: '4',
    itineraryId: '1',
    hotelId: null,
    dayNumber: 2,
    startTime: '09:00',
    endTime: '12:00',
    title: '관광지 투어',
    description: '도쿄 타워 관광',
    location: '도쿄 타워',
    coordinates: null,
    sortOrder: 1,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
];

/**
 * Mock handlers for itinerary items API
 */
export const itineraryItemHandlers = [
  // GET /api/itineraries/:itineraryId/items - Get all items for an itinerary
  http.get(`${API_BASE}/itineraries/:itineraryId/items`, async ({ params }) => {
    await delay(50);

    const { itineraryId } = params;
    const items = mockItems.filter((item) => item.itineraryId === itineraryId);

    // Sort by dayNumber and sortOrder
    items.sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) {
        return a.dayNumber - b.dayNumber;
      }
      return a.sortOrder - b.sortOrder;
    });

    const response: ApiResponse<ItineraryItem[]> = {
      success: true,
      data: items,
    };

    return HttpResponse.json(response);
  }),

  // POST /api/itineraries/:itineraryId/items - Create a new item
  http.post(`${API_BASE}/itineraries/:itineraryId/items`, async ({ params, request }) => {
    await delay(100);

    const { itineraryId } = params;
    const body = (await request.json()) as Partial<ItineraryItem>;

    const newItem: ItineraryItem = {
      id: `item-${Date.now()}`,
      itineraryId: itineraryId as string,
      hotelId: body.hotelId || null,
      dayNumber: body.dayNumber || 1,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      title: body.title || 'New Item',
      description: body.description || null,
      location: body.location || null,
      coordinates: body.coordinates || null,
      sortOrder: body.sortOrder || mockItems.filter((i) => i.itineraryId === itineraryId && i.dayNumber === body.dayNumber).length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockItems.push(newItem);

    const response: ApiResponse<ItineraryItem> = {
      success: true,
      data: newItem,
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  // PUT /api/itineraries/:itineraryId/items/:id - Update an item
  http.put(`${API_BASE}/itineraries/:itineraryId/items/:id`, async ({ params, request }) => {
    await delay(100);

    const { id } = params;
    const itemIndex = mockItems.findIndex((item) => item.id === id);

    if (itemIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: `Item with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const body = (await request.json()) as Partial<ItineraryItem>;
    const existingItem = mockItems[itemIndex]!;
    const updatedItem: ItineraryItem = {
      ...existingItem,
      ...body,
      id: existingItem.id,
      itineraryId: existingItem.itineraryId,
      updatedAt: new Date().toISOString(),
    };

    mockItems[itemIndex] = updatedItem;

    const response: ApiResponse<ItineraryItem> = {
      success: true,
      data: updatedItem,
    };

    return HttpResponse.json(response);
  }),

  // DELETE /api/itineraries/:itineraryId/items/:id - Delete an item
  http.delete(`${API_BASE}/itineraries/:itineraryId/items/:id`, async ({ params }) => {
    await delay(100);

    const { id } = params;
    const itemIndex = mockItems.findIndex((item) => item.id === id);

    if (itemIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: `Item with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    mockItems.splice(itemIndex, 1);

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // PATCH /api/itineraries/:itineraryId/items/reorder - Reorder items
  http.patch(`${API_BASE}/itineraries/:itineraryId/items/reorder`, async ({ params, request }) => {
    await delay(100);

    const { itineraryId } = params;
    const body = (await request.json()) as { items: Array<{ id: string; dayNumber: number; sortOrder: number }> };

    // Update sortOrder and dayNumber for items
    body.items.forEach((update) => {
      const itemIndex = mockItems.findIndex((item) => item.id === update.id && item.itineraryId === itineraryId);
      if (itemIndex !== -1) {
        mockItems[itemIndex]!.dayNumber = update.dayNumber;
        mockItems[itemIndex]!.sortOrder = update.sortOrder;
        mockItems[itemIndex]!.updatedAt = new Date().toISOString();
      }
    });

    const response: ApiResponse<ItineraryItem[]> = {
      success: true,
      data: mockItems.filter((item) => item.itineraryId === itineraryId),
    };

    return HttpResponse.json(response);
  }),
];
