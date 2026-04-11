import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@tourworld/shared';
import type { ImageAsset, ImageCategory } from '@/mocks/data/images';
import {
  mockImages,
  filterImages,
  paginateImages,
  getCategoriesWithCount,
  getAllTags,
} from '@/mocks/data/images.data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = request.nextUrl.pathname;

  // Route: /api/images/categories
  if (path.endsWith('/categories')) {
    const categories = getCategoriesWithCount(mockImages);
    const response: ApiResponse<{ category: ImageCategory; count: number }[]> = {
      success: true,
      data: categories,
    };
    return NextResponse.json(response);
  }

  // Route: /api/images/tags
  if (path.endsWith('/tags')) {
    const tags = getAllTags(mockImages);
    const response: ApiResponse<string[]> = {
      success: true,
      data: tags,
    };
    return NextResponse.json(response);
  }

  // Route: /api/images or /api/images/:id
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const category = searchParams.get('category') as ImageCategory | undefined;
  const tags = searchParams.get('tags') || undefined;
  const search = searchParams.get('search') || undefined;

  const filtered = filterImages(mockImages, { category, tags, search });
  const result = paginateImages(filtered, page, pageSize);

  const response: ApiResponse<ImageAsset[]> = {
    success: true,
    data: result.data,
    meta: result.meta,
  };

  return NextResponse.json(response);
}
