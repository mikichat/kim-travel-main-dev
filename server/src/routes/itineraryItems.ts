import express, { Request, Response } from 'express';
import {
  getItineraryItems,
  getItineraryItemById,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  reorderItineraryItems,
} from '../services/itineraryItemService';
import {
  CreateItineraryItemRequest,
  UpdateItineraryItemRequest,
  ReorderItemsRequest,
  ItineraryItemResponse,
  ItineraryItemListResponse,
} from '../../../shared/types/itineraryItem';

const router = express.Router({ mergeParams: true });

/**
 * GET /api/itineraries/:itineraryId/items
 * Get all items for an itinerary
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const itineraryId = Array.isArray(req.params.itineraryId)
      ? req.params.itineraryId[0]
      : req.params.itineraryId;
    const items = getItineraryItems(itineraryId);

    const response: ItineraryItemListResponse = {
      success: true,
      message: 'Items retrieved successfully',
      data: items,
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Itinerary not found') {
      const response: ItineraryItemListResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ItineraryItemListResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get items',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/itineraries/:itineraryId/items/:id
 * Get a specific item
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const itineraryId = Array.isArray(req.params.itineraryId)
      ? req.params.itineraryId[0]
      : req.params.itineraryId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = getItineraryItemById(itineraryId, id);

    if (!item) {
      const response: ItineraryItemResponse = {
        success: false,
        message: 'Item not found',
      };
      return res.status(404).json(response);
    }

    const response: ItineraryItemResponse = {
      success: true,
      message: 'Item retrieved successfully',
      data: item,
    };
    res.json(response);
  } catch (error) {
    const response: ItineraryItemResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get item',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/itineraries/:itineraryId/items
 * Create a new item
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const itineraryId = Array.isArray(req.params.itineraryId)
      ? req.params.itineraryId[0]
      : req.params.itineraryId;
    const data: CreateItineraryItemRequest = req.body;
    const item = createItineraryItem(itineraryId, data);

    const response: ItineraryItemResponse = {
      success: true,
      message: 'Item created successfully',
      data: item,
    };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Itinerary not found') {
      const response: ItineraryItemResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ItineraryItemResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create item',
    };
    res.status(400).json(response);
  }
});

/**
 * PUT /api/itineraries/:itineraryId/items/:id
 * Update an item
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const itineraryId = Array.isArray(req.params.itineraryId)
      ? req.params.itineraryId[0]
      : req.params.itineraryId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data: UpdateItineraryItemRequest = req.body;
    const item = updateItineraryItem(itineraryId, id, data);

    const response: ItineraryItemResponse = {
      success: true,
      message: 'Item updated successfully',
      data: item,
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Item not found') {
      const response: ItineraryItemResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ItineraryItemResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update item',
    };
    res.status(400).json(response);
  }
});

/**
 * DELETE /api/itineraries/:itineraryId/items/:id
 * Delete an item
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const itineraryId = Array.isArray(req.params.itineraryId)
      ? req.params.itineraryId[0]
      : req.params.itineraryId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    deleteItineraryItem(itineraryId, id);

    const response: ItineraryItemResponse = {
      success: true,
      message: 'Item deleted successfully',
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Item not found') {
      const response: ItineraryItemResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ItineraryItemResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete item',
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/itineraries/:itineraryId/items/reorder
 * Reorder items (for drag-and-drop)
 */
router.patch('/reorder', (req: Request, res: Response) => {
  try {
    const itineraryId = Array.isArray(req.params.itineraryId)
      ? req.params.itineraryId[0]
      : req.params.itineraryId;
    const data: ReorderItemsRequest = req.body;
    const items = reorderItineraryItems(itineraryId, data);

    const response: ItineraryItemListResponse = {
      success: true,
      message: 'Items reordered successfully',
      data: items,
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      const response: ItineraryItemListResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ItineraryItemListResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to reorder items',
    };
    res.status(400).json(response);
  }
});

export const itineraryItemsRouter = router;
