import express, { Request, Response } from 'express';
import {
  getAllItineraries,
  getItineraryById,
  createItinerary,
  updateItinerary,
  deleteItinerary,
} from '../services/itineraryService';
import {
  CreateItineraryRequest,
  UpdateItineraryRequest,
  ItineraryResponse,
  ItineraryListResponse,
} from '../../../shared/types/itinerary';

const router = express.Router();

/**
 * GET /api/itineraries
 * Get all itineraries
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const itineraries = await getAllItineraries();
    const response: ItineraryListResponse = {
      success: true,
      message: 'Itineraries retrieved successfully',
      data: itineraries,
    };
    res.json(response);
  } catch (error) {
    const response: ItineraryListResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to get itineraries',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/itineraries/:id
 * Get itinerary by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const itinerary = await getItineraryById(id);

    if (!itinerary) {
      const response: ItineraryResponse = {
        success: false,
        message: 'Itinerary not found',
      };
      return res.status(404).json(response);
    }

    const response: ItineraryResponse = {
      success: true,
      message: 'Itinerary retrieved successfully',
      data: itinerary,
    };
    res.json(response);
  } catch (error) {
    const response: ItineraryResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to get itinerary',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/itineraries
 * Create a new itinerary
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data: CreateItineraryRequest = req.body;
    const itinerary = await createItinerary(data);

    const response: ItineraryResponse = {
      success: true,
      message: 'Itinerary created successfully',
      data: itinerary,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ItineraryResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to create itinerary',
    };
    res.status(400).json(response);
  }
});

/**
 * PUT /api/itineraries/:id
 * Update an itinerary
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data: UpdateItineraryRequest = req.body;
    const itinerary = await updateItinerary(id, data);

    const response: ItineraryResponse = {
      success: true,
      message: 'Itinerary updated successfully',
      data: itinerary,
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Itinerary not found') {
      const response: ItineraryResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ItineraryResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to update itinerary',
    };
    res.status(400).json(response);
  }
});

/**
 * DELETE /api/itineraries/:id
 * Delete an itinerary
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteItinerary(id);

    const response: ItineraryResponse = {
      success: true,
      message: 'Itinerary deleted successfully',
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Itinerary not found') {
      const response: ItineraryResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ItineraryResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to delete itinerary',
    };
    res.status(500).json(response);
  }
});

export const itinerariesRouter = router;
