import { http, HttpResponse, delay } from 'msw';
import {
  mockHotels,
  getMockHotelById,
  getMockHotelsByLocation,
  getAvailableRooms,
} from '../data/hotels';
import type { Hotel, RoomType } from '../data/hotels';
import type { ApiResponse, PaginationMeta } from '@tourworld/shared';

const API_BASE = '/api';

/**
 * Mock handlers for hotels API
 */
export const hotelHandlers = [
  // GET /api/hotels - List all hotels with pagination
  http.get(`${API_BASE}/hotels`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const location = url.searchParams.get('location');
    const minRating = url.searchParams.get('minRating');
    const maxPrice = url.searchParams.get('maxPrice');
    const search = url.searchParams.get('search');

    // Filter hotels
    let filteredHotels = [...mockHotels];

    if (location) {
      filteredHotels = getMockHotelsByLocation(location);
    }

    if (minRating) {
      const rating = parseFloat(minRating);
      filteredHotels = filteredHotels.filter((hotel) => hotel.rating >= rating);
    }

    if (maxPrice) {
      const price = parseInt(maxPrice, 10);
      filteredHotels = filteredHotels.filter(
        (hotel) => hotel.pricePerNight <= price
      );
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredHotels = filteredHotels.filter(
        (hotel) =>
          hotel.name.toLowerCase().includes(lowerSearch) ||
          hotel.location.toLowerCase().includes(lowerSearch) ||
          hotel.description.toLowerCase().includes(lowerSearch)
      );
    }

    // Pagination
    const totalCount = filteredHotels.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedHotels = filteredHotels.slice(start, end);

    const meta: PaginationMeta = {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    const response: ApiResponse<Hotel[]> = {
      success: true,
      data: paginatedHotels,
      meta,
    };

    return HttpResponse.json(response);
  }),

  // GET /api/hotels/:id - Get single hotel
  http.get(`${API_BASE}/hotels/:id`, async ({ params }) => {
    await delay(50);

    const { id } = params;
    const hotel = getMockHotelById(id as string);

    if (!hotel) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'HOTEL_NOT_FOUND',
            message: `Hotel with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const response: ApiResponse<Hotel> = {
      success: true,
      data: hotel,
    };

    return HttpResponse.json(response);
  }),

  // GET /api/hotels/:id/rooms - Get hotel rooms
  http.get(`${API_BASE}/hotels/:id/rooms`, async ({ params, request }) => {
    await delay(50);

    const { id } = params;
    const hotel = getMockHotelById(id as string);

    if (!hotel) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'HOTEL_NOT_FOUND',
            message: `Hotel with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const availableOnly = url.searchParams.get('available') === 'true';

    let rooms = hotel.roomTypes;
    if (availableOnly) {
      rooms = getAvailableRooms(id as string);
    }

    const response: ApiResponse<RoomType[]> = {
      success: true,
      data: rooms,
    };

    return HttpResponse.json(response);
  }),

  // POST /api/hotels/:id/rooms/check-availability - Check room availability
  http.post(
    `${API_BASE}/hotels/:id/rooms/check-availability`,
    async ({ params, request }) => {
      await delay(150);

      const { id } = params;
      const hotel = getMockHotelById(id as string);

      if (!hotel) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'HOTEL_NOT_FOUND',
              message: `Hotel with id '${id}' not found`,
            },
          } as ApiResponse<never>,
          { status: 404 }
        );
      }

      const body = (await request.json()) as {
        roomTypeId: string;
        checkIn: string;
        checkOut: string;
        guests: number;
      };

      const room = hotel.roomTypes.find((r) => r.id === body.roomTypeId);

      if (!room) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'ROOM_NOT_FOUND',
              message: `Room type with id '${body.roomTypeId}' not found`,
            },
          } as ApiResponse<never>,
          { status: 404 }
        );
      }

      // Mock availability check
      const isAvailable = room.available && body.guests <= room.maxOccupancy;
      const checkIn = new Date(body.checkIn);
      const checkOut = new Date(body.checkOut);
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalPrice = room.pricePerNight * nights;

      const response: ApiResponse<{
        available: boolean;
        room: RoomType;
        nights: number;
        totalPrice: number;
        currency: string;
      }> = {
        success: true,
        data: {
          available: isAvailable,
          room,
          nights,
          totalPrice,
          currency: hotel.currency,
        },
      };

      return HttpResponse.json(response);
    }
  ),

  // POST /api/hotels - Create new hotel (admin)
  http.post(`${API_BASE}/hotels`, async ({ request }) => {
    await delay(100);

    const body = (await request.json()) as Partial<Hotel>;

    const newHotel: Hotel = {
      id: `hotel-${Date.now()}`,
      name: body.name || 'New Hotel',
      description: body.description || '',
      location: body.location || '',
      address: body.address || '',
      rating: body.rating || 0,
      pricePerNight: body.pricePerNight || 0,
      currency: body.currency || 'KRW',
      amenities: body.amenities || [],
      images: body.images || [],
      roomTypes: body.roomTypes || [],
      checkInTime: body.checkInTime || '15:00',
      checkOutTime: body.checkOutTime || '11:00',
      contactPhone: body.contactPhone || '',
      contactEmail: body.contactEmail || '',
    };

    mockHotels.push(newHotel);

    const response: ApiResponse<Hotel> = {
      success: true,
      data: newHotel,
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  // PUT /api/hotels/:id - Update hotel
  http.put(`${API_BASE}/hotels/:id`, async ({ params, request }) => {
    await delay(100);

    const { id } = params;
    const hotelIndex = mockHotels.findIndex((h) => h.id === id);

    if (hotelIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'HOTEL_NOT_FOUND',
            message: `Hotel with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const body = (await request.json()) as Partial<Hotel>;
    const existingHotel = mockHotels[hotelIndex]!;
    const updatedHotel: Hotel = {
      ...existingHotel,
      ...body,
      id: existingHotel.id, // Prevent ID change
    };

    mockHotels[hotelIndex] = updatedHotel;

    const response: ApiResponse<Hotel> = {
      success: true,
      data: updatedHotel,
    };

    return HttpResponse.json(response);
  }),

  // DELETE /api/hotels/:id - Delete hotel
  http.delete(`${API_BASE}/hotels/:id`, async ({ params }) => {
    await delay(100);

    const { id } = params;
    const hotelIndex = mockHotels.findIndex((h) => h.id === id);

    if (hotelIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'HOTEL_NOT_FOUND',
            message: `Hotel with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    mockHotels.splice(hotelIndex, 1);

    return HttpResponse.json({ success: true }, { status: 200 });
  }),
];
