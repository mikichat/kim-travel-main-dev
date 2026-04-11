import { NextResponse } from 'next/server';
import type { ApiResponse } from '@tourworld/shared';
import type { ImageCategory } from '@/mocks/data/images';
import { mockImages, getCategoriesWithCount } from '@/mocks/data/images.data';

export async function GET() {
  const categories = getCategoriesWithCount(mockImages);
  const response: ApiResponse<{ category: ImageCategory; count: number }[]> = {
    success: true,
    data: categories,
  };
  return NextResponse.json(response);
}
