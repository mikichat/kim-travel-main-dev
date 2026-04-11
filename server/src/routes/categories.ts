import express, { Request, Response } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoryService';
import {
  CreateImageCategoryRequest,
  UpdateImageCategoryRequest,
  ImageCategoryResponse,
  ImageCategoryListResponse,
} from '../../../shared/types/image';

const router = express.Router();

/**
 * GET /api/categories
 * Get all categories
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const categories = getAllCategories();

    const response: ImageCategoryListResponse = {
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
    };
    res.json(response);
  } catch (error) {
    const response: ImageCategoryListResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to get categories',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/categories/:id
 * Get category by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const category = getCategoryById(id);

    if (!category) {
      const response: ImageCategoryResponse = {
        success: false,
        message: 'Category not found',
      };
      return res.status(404).json(response);
    }

    const response: ImageCategoryResponse = {
      success: true,
      message: 'Category retrieved successfully',
      data: category,
    };
    res.json(response);
  } catch (error) {
    const response: ImageCategoryResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to get category',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/categories
 * Create a new category
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const data: CreateImageCategoryRequest = req.body;
    const category = createCategory(data);

    const response: ImageCategoryResponse = {
      success: true,
      message: 'Category created successfully',
      data: category,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ImageCategoryResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to create category',
    };
    res.status(400).json(response);
  }
});

/**
 * PUT /api/categories/:id
 * Update a category
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data: UpdateImageCategoryRequest = req.body;
    const category = updateCategory(id, data);

    const response: ImageCategoryResponse = {
      success: true,
      message: 'Category updated successfully',
      data: category,
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Category not found') {
      const response: ImageCategoryResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ImageCategoryResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to update category',
    };
    res.status(400).json(response);
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    deleteCategory(id);

    const response: ImageCategoryResponse = {
      success: true,
      message: 'Category deleted successfully',
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Category not found') {
      const response: ImageCategoryResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: ImageCategoryResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to delete category',
    };
    res.status(500).json(response);
  }
});

export const categoriesRouter = router;
