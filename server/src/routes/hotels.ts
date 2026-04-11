import express, { Request, Response } from 'express';
import {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
} from '../services/hotelService';
import {
  CreateHotelRequest,
  UpdateHotelRequest,
  HotelResponse,
  HotelListResponse,
} from '../../../shared/types/hotel';

const router = express.Router();

/**
 * GET /api/hotels
 * Get all hotels with optional pagination
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const page = req.query.page
      ? parseInt(req.query.page as string, 10)
      : undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;

    const { hotels, total } = getAllHotels(page, limit);

    const response: HotelListResponse = {
      success: true,
      message: 'Hotels retrieved successfully',
      data: hotels,
    };

    // Add pagination info if requested
    if (page !== undefined && limit !== undefined) {
      response.pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }

    res.json(response);
  } catch (error) {
    const response: HotelListResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get hotels',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/hotels/:id
 * Get hotel by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const hotel = getHotelById(id);

    if (!hotel) {
      const response: HotelResponse = {
        success: false,
        message: 'Hotel not found',
      };
      return res.status(404).json(response);
    }

    const response: HotelResponse = {
      success: true,
      message: 'Hotel retrieved successfully',
      data: hotel,
    };
    res.json(response);
  } catch (error) {
    const response: HotelResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get hotel',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/hotels
 * Create a new hotel
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const data: CreateHotelRequest = req.body;
    const hotel = createHotel(data);

    const response: HotelResponse = {
      success: true,
      message: 'Hotel created successfully',
      data: hotel,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: HotelResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to create hotel',
    };
    res.status(400).json(response);
  }
});

/**
 * PUT /api/hotels/:id
 * Update a hotel
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data: UpdateHotelRequest = req.body;
    const hotel = updateHotel(id, data);

    const response: HotelResponse = {
      success: true,
      message: 'Hotel updated successfully',
      data: hotel,
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Hotel not found') {
      const response: HotelResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: HotelResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to update hotel',
    };
    res.status(400).json(response);
  }
});

/**
 * DELETE /api/hotels/:id
 * Delete a hotel
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    deleteHotel(id);

    const response: HotelResponse = {
      success: true,
      message: 'Hotel deleted successfully',
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Hotel not found') {
      const response: HotelResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: HotelResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to delete hotel',
    };
    res.status(500).json(response);
  }
});

export const hotelsRouter = router;
