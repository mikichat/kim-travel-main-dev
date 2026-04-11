import { http, HttpResponse, delay } from 'msw';
import {
  mockImages,
  getMockImageById,
  getMockImagesByCategory,
  searchMockImages,
} from '../data/images';
import type { ImageAsset, ImageCategory } from '../data/images';
import type { ApiResponse, PaginationMeta } from '@tourworld/shared';

const API_BASE = '/api';

/**
 * Mock handlers for images API
 */
export const imageHandlers = [
  // GET /api/images - List all images with pagination and filtering
  http.get(`${API_BASE}/images`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const category = url.searchParams.get('category') as ImageCategory | null;
    const tags = url.searchParams.get('tags');
    const search = url.searchParams.get('search');

    // Filter images
    let filteredImages = [...mockImages];

    if (category) {
      filteredImages = getMockImagesByCategory(category);
    }

    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      filteredImages = filteredImages.filter((img) =>
        tagArray.some((tag) => img.tags.includes(tag))
      );
    }

    if (search) {
      filteredImages = searchMockImages(search);
    }

    // Pagination
    const totalCount = filteredImages.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedImages = filteredImages.slice(start, end);

    const meta: PaginationMeta = {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    const response: ApiResponse<ImageAsset[]> = {
      success: true,
      data: paginatedImages,
      meta,
    };

    return HttpResponse.json(response);
  }),

  // GET /api/images/:id - Get single image
  http.get(`${API_BASE}/images/:id`, async ({ params }) => {
    await delay(50);

    const { id } = params;
    const image = getMockImageById(id as string);

    if (!image) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: `Image with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const response: ApiResponse<ImageAsset> = {
      success: true,
      data: image,
    };

    return HttpResponse.json(response);
  }),

  // GET /api/images/categories - List all categories with counts
  http.get(`${API_BASE}/images/categories`, async () => {
    await delay(50);

    const categoryCounts: Record<ImageCategory, number> = {
      tour: 0,
      hotel: 0,
      destination: 0,
      activity: 0,
      food: 0,
      transport: 0,
    };

    mockImages.forEach((img) => {
      categoryCounts[img.category]++;
    });

    const categories = Object.entries(categoryCounts).map(
      ([category, count]) => ({
        category: category as ImageCategory,
        count,
      })
    );

    const response: ApiResponse<{ category: ImageCategory; count: number }[]> =
      {
        success: true,
        data: categories,
      };

    return HttpResponse.json(response);
  }),

  // GET /api/images/tags - List all unique tags
  http.get(`${API_BASE}/images/tags`, async () => {
    await delay(50);

    const tagSet = new Set<string>();
    mockImages.forEach((img) => {
      img.tags.forEach((tag) => tagSet.add(tag));
    });

    const tags = Array.from(tagSet).sort();

    const response: ApiResponse<string[]> = {
      success: true,
      data: tags,
    };

    return HttpResponse.json(response);
  }),

  // POST /api/images/upload - Upload new image (mock)
  http.post(`${API_BASE}/images/upload`, async ({ request }) => {
    await delay(300); // Simulate upload delay

    // In a real scenario, we would handle FormData
    // For mock, we'll create a placeholder response
    const formData = await request.formData();
    const file = formData.get('file');
    const category = (formData.get('category') as ImageCategory) || 'tour';
    const tags = (formData.get('tags') as string) || '';
    const altText = (formData.get('altText') as string) || 'Uploaded image';

    const newImage: ImageAsset = {
      id: `img-${Date.now()}`,
      url: `/images/uploads/${Date.now()}.jpg`,
      thumbnailUrl: `/images/uploads/thumbs/${Date.now()}.jpg`,
      altText,
      category,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      width: 1920,
      height: 1080,
      fileSize: file instanceof File ? file.size : 0,
      mimeType: file instanceof File ? file.type : 'image/jpeg',
      uploadedAt: new Date(),
    };

    mockImages.push(newImage);

    const response: ApiResponse<ImageAsset> = {
      success: true,
      data: newImage,
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  // PUT /api/images/:id - Update image metadata
  http.put(`${API_BASE}/images/:id`, async ({ params, request }) => {
    await delay(100);

    const { id } = params;
    const imageIndex = mockImages.findIndex((img) => img.id === id);

    if (imageIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: `Image with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const body = (await request.json()) as Partial<ImageAsset>;
    const existingImage = mockImages[imageIndex]!;
    const updatedImage: ImageAsset = {
      ...existingImage,
      ...body,
      id: existingImage.id, // Prevent ID change
    };

    mockImages[imageIndex] = updatedImage;

    const response: ApiResponse<ImageAsset> = {
      success: true,
      data: updatedImage,
    };

    return HttpResponse.json(response);
  }),

  // DELETE /api/images/:id - Delete image
  http.delete(`${API_BASE}/images/:id`, async ({ params }) => {
    await delay(100);

    const { id } = params;
    const imageIndex = mockImages.findIndex((img) => img.id === id);

    if (imageIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: `Image with id '${id}' not found`,
          },
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    mockImages.splice(imageIndex, 1);

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // POST /api/images/bulk-delete - Delete multiple images
  http.post(`${API_BASE}/images/bulk-delete`, async ({ request }) => {
    await delay(150);

    const body = (await request.json()) as { ids: string[] };
    const { ids } = body;

    const deletedIds: string[] = [];
    const notFoundIds: string[] = [];

    ids.forEach((id) => {
      const index = mockImages.findIndex((img) => img.id === id);
      if (index !== -1) {
        mockImages.splice(index, 1);
        deletedIds.push(id);
      } else {
        notFoundIds.push(id);
      }
    });

    const response: ApiResponse<{ deleted: string[]; notFound: string[] }> = {
      success: true,
      data: {
        deleted: deletedIds,
        notFound: notFoundIds,
      },
    };

    return HttpResponse.json(response);
  }),
];
