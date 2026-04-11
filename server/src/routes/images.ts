import express, { Request, Response } from 'express';
import {
  getAllImages,
  getImageById,
  createImage,
  updateImage,
  deleteImage,
} from '../services/imageService';
import {
  CreateImageRequest,
  UpdateImageRequest,
  ImageResponse,
  ImageListResponse,
} from '../../../shared/types/image';

const router = express.Router();

/**
 * GET /api/images
 * Get all images with optional filters and pagination
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const hotelId = req.query.hotelId as string | undefined;
    const page = req.query.page
      ? parseInt(req.query.page as string, 10)
      : undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;

    const { images, total } = getAllImages({
      categoryId,
      hotelId,
      page,
      limit,
    });

    const response: ImageListResponse = {
      success: true,
      message: 'Images retrieved successfully',
      data: images,
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
    const response: ImageListResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get images',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/images/:id
 * Get image by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const image = getImageById(id);

    if (!image) {
      const response: ImageResponse = {
        success: false,
        message: 'Image not found',
      };
      return res.status(404).json(response);
    }

    const response: ImageResponse = {
      success: true,
      message: 'Image retrieved successfully',
      data: image,
    };
    res.json(response);
  } catch (error) {
    const response: ImageResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get image',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/images
 * Create a new image
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const data: CreateImageRequest = req.body;
    const image = createImage(data);

    const response: ImageResponse = {
      success: true,
      message: 'Image created successfully',
      data: image,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ImageResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to create image',
    };
    res.status(400).json(response);
  }
});

/**
 * PATCH /api/images/:id
 * Update an image
 */
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data: UpdateImageRequest = req.body;
    const image = updateImage(id, data);

    const response: ImageResponse = {
      success: true,
      message: 'Image updated successfully',
      data: image,
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Image not found') {
      const response: ImageResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ImageResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to update image',
    };
    res.status(400).json(response);
  }
});

/**
 * DELETE /api/images/:id
 * Delete an image
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    deleteImage(id);

    const response: ImageResponse = {
      success: true,
      message: 'Image deleted successfully',
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Image not found') {
      const response: ImageResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ImageResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to delete image',
    };
    res.status(500).json(response);
  }
});

export const imagesRouter = router;
