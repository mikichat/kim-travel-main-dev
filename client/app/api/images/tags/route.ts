import { NextResponse } from 'next/server';
import type { ApiResponse } from '@tourworld/shared';
import { mockImages, getAllTags } from '@/mocks/data/images.data';

export async function GET() {
  const tags = getAllTags(mockImages);
  const response: ApiResponse<string[]> = {
    success: true,
    data: tags,
  };
  return NextResponse.json(response);
}
