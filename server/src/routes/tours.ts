import { Router } from 'express';
import type { Tour, ApiResponse, PaginationMeta } from '../types/shared';

const router = Router();

// Mock data for initial development
const mockTours: Tour[] = [
  {
    id: '1',
    title: 'Paris Adventure',
    description: 'Explore the City of Light with our expert guides.',
    destination: 'Paris, France',
    duration: 7,
    price: 2500,
    currency: 'USD',
    maxParticipants: 20,
    status: 'published',
    startDate: new Date('2024-03-15'),
    endDate: new Date('2024-03-22'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Tokyo Experience',
    description: 'Discover the blend of traditional and modern Japan.',
    destination: 'Tokyo, Japan',
    duration: 10,
    price: 3500,
    currency: 'USD',
    maxParticipants: 15,
    status: 'published',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-04-11'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: 'Italian Getaway',
    description: 'Experience the beauty of Rome, Florence, and Venice.',
    destination: 'Italy',
    duration: 12,
    price: 4200,
    currency: 'USD',
    maxParticipants: 18,
    status: 'published',
    startDate: new Date('2024-05-10'),
    endDate: new Date('2024-05-22'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// GET /api/tours - List all tours
router.get('/', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTours = mockTours.slice(startIndex, endIndex);

  const meta: PaginationMeta = {
    page,
    pageSize,
    totalCount: mockTours.length,
    totalPages: Math.ceil(mockTours.length / pageSize),
    hasNextPage: endIndex < mockTours.length,
    hasPreviousPage: page > 1,
  };

  const response: ApiResponse<Tour[]> = {
    success: true,
    data: paginatedTours,
    meta,
  };

  res.json(response);
});

// GET /api/tours/:id - Get tour by ID
router.get('/:id', (req, res) => {
  const tour = mockTours.find((t) => t.id === req.params.id);

  if (!tour) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Tour with id ${req.params.id} not found`,
      },
    };
    res.status(404).json(response);
    return;
  }

  const response: ApiResponse<Tour> = {
    success: true,
    data: tour,
  };

  res.json(response);
});

export { router as toursRouter };
