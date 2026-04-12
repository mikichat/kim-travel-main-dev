import express, { Request, Response } from 'express';
import {
  getAllImages,
  getImageById,
  createImage,
  updateImage,
  deleteImage,
  getAllImageTags,
  bulkDeleteImages,
} from '../services/imageService';
import { getAllCategories } from '../services/categoryService';
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

/**
 * GET /api/images/categories
 * Get all image categories with counts
 */
router.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = getAllCategories();
    const { images } = getAllImages();

    const result = categories.map((cat) => ({
      category: cat,
      count: images.filter((img) => img.categoryId === cat.id).length,
    }));

    res.json({
      success: true,
      message: 'Image categories retrieved successfully',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get categories',
    });
  }
});

/**
 * GET /api/images/tags
 * Get all unique tags from images
 */
router.get('/tags', (req: Request, res: Response) => {
  try {
    const tags = getAllImageTags();
    res.json({
      success: true,
      message: 'Tags retrieved successfully',
      data: tags,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get tags',
    });
  }
});

/**
 * POST /api/images/upload
 * Upload a new image (simplified - accepts metadata, actual file upload not implemented)
 */
router.post('/upload', (req: Request, res: Response) => {
  try {
    const { filename, storagePath, cloudUrl, fileSize, mimeType, categoryId, hotelId, metadata } = req.body;

    if (!filename) {
      res.status(400).json({
        success: false,
        message: 'Filename is required',
      });
      return;
    }

    const image = createImage({
      filename,
      storagePath,
      cloudUrl,
      fileSize: fileSize ? parseInt(fileSize, 10) : undefined,
      mimeType,
      categoryId,
      hotelId,
      metadata: metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: image,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload image',
    });
  }
});

/**
 * POST /api/images/bulk-delete
 * Delete multiple images
 */
router.post('/bulk-delete', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      res.status(400).json({
        success: false,
        message: 'ids array is required',
      });
      return;
    }

    const result = bulkDeleteImages(ids);
    res.json({
      success: true,
      message: `Deleted ${result.deleted.length} images`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to bulk delete images',
    });
  }
});

export const imagesRouter = router;
