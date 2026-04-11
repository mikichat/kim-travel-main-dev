import { http, HttpResponse, delay } from 'msw';
import {
  mockTours,
  mockSchedules,
  getMockTourById,
  getMockSchedulesByTourId,
} from '../data/itineraries';
import type {
  ApiResponse,
  PaginationMeta,
  Tour,
  TourSchedule,
} from '@tourworld/shared';

const API_BASE = '/api';

/**
 * Mock handlers for itineraries/tours API
 */
export const itineraryHandlers = [
  // GET /api/tours - List all tours with pagination
  http.get(`${API_BASE}/tours`, async ({ request }) => {
    await delay(100); // Simulate network delay

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    // Filter tours
    let filteredTours = [...mockTours];

    if (status) {
      filteredTours = filteredTours.filter((tour) => tour.status === status);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredTours = filteredTours.filter(
        (tour) =>
          tour.title.toLowerCase().includes(lowerSearch) ||
          tour.destination.toLowerCase().includes(lowerSearch) ||
          tour.description.toLowerCase().includes(lowerSearch)
      );
    }

    // Pagination
    const totalCount = filteredTours.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedTours = filteredTours.slice(start, end);

    const meta: PaginationMeta = {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    const response: ApiResponse<Tour[]> = {
      success: true,
      data: paginatedTours,
      meta,
    };

    return HttpResponse.json(response);
  }),

  // GET /api/tours/:id - Get single tour
  http.get(`${API_BASE}/tours/:id`, async ({ params }) => {
    await delay(50);

    const { id } = params;
    const tour = getMockTourById(id as string);

    if (!tour) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'TOUR_NOT_FOUND',
            message: `Tour with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const response: ApiResponse<Tour> = {
      success: true,
      data: tour,
    };

    return HttpResponse.json(response);
  }),

  // POST /api/tours - Create new tour
  http.post(`${API_BASE}/tours`, async ({ request }) => {
    await delay(100);

    const body = (await request.json()) as Partial<Tour>;

    const newTour: Tour = {
      id: `tour-${Date.now()}`,
      title: body.title || 'Untitled Tour',
      description: body.description || '',
      destination: body.destination || '',
      duration: body.duration || 1,
      price: body.price || 0,
      currency: body.currency || 'KRW',
      maxParticipants: body.maxParticipants || 20,
      status: 'draft',
      startDate: body.startDate || new Date(),
      endDate: body.endDate || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In real scenario, add to mockTours
    mockTours.push(newTour);

    const response: ApiResponse<Tour> = {
      success: true,
      data: newTour,
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  // PUT /api/tours/:id - Update tour
  http.put(`${API_BASE}/tours/:id`, async ({ params, request }) => {
    await delay(100);

    const { id } = params;
    const tourIndex = mockTours.findIndex((t) => t.id === id);

    if (tourIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'TOUR_NOT_FOUND',
            message: `Tour with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const body = (await request.json()) as Partial<Tour>;
    const existingTour = mockTours[tourIndex]!;
    const updatedTour: Tour = {
      ...existingTour,
      ...body,
      id: existingTour.id, // Prevent ID change
      updatedAt: new Date(),
    };

    mockTours[tourIndex] = updatedTour;

    const response: ApiResponse<Tour> = {
      success: true,
      data: updatedTour,
    };

    return HttpResponse.json(response);
  }),

  // DELETE /api/tours/:id - Delete tour
  http.delete(`${API_BASE}/tours/:id`, async ({ params }) => {
    await delay(100);

    const { id } = params;
    const tourIndex = mockTours.findIndex((t) => t.id === id);

    if (tourIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'TOUR_NOT_FOUND',
            message: `Tour with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    mockTours.splice(tourIndex, 1);

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // GET /api/tours/:id/schedules - Get tour schedules
  http.get(`${API_BASE}/tours/:tourId/schedules`, async ({ params }) => {
    await delay(50);

    const { tourId } = params;
    const tour = getMockTourById(tourId as string);

    if (!tour) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'TOUR_NOT_FOUND',
            message: `Tour with id '${tourId}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const schedules = getMockSchedulesByTourId(tourId as string);

    const response: ApiResponse<TourSchedule[]> = {
      success: true,
      data: schedules,
    };

    return HttpResponse.json(response);
  }),

  // POST /api/tours/:id/schedules - Add schedule to tour
  http.post(
    `${API_BASE}/tours/:tourId/schedules`,
    async ({ params, request }) => {
      await delay(100);

      const { tourId } = params;
      const tour = getMockTourById(tourId as string);

      if (!tour) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'TOUR_NOT_FOUND',
              message: `Tour with id '${tourId}' not found`,
            },
          } as ApiResponse<never>,
          { status: 404 }
        );
      }

      const body = (await request.json()) as Partial<TourSchedule>;

      const newSchedule: TourSchedule = {
        id: `schedule-${Date.now()}`,
        tourId: tourId as string,
        day: body.day || 1,
        title: body.title || 'Day Schedule',
        description: body.description || '',
        activities: body.activities || [],
      };

      mockSchedules.push(newSchedule);

      const response: ApiResponse<TourSchedule> = {
        success: true,
        data: newSchedule,
      };

      return HttpResponse.json(response, { status: 201 });
    }
  ),
];
