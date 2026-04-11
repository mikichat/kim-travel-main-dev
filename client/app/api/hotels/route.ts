import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@tourworld/shared';
import type { Hotel } from '@/mocks/data/hotels';
import { mockHotels, filterHotels, paginateHotels } from '@/mocks/data/hotels.data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);
  const location = searchParams.get('location') || undefined;
  const minRating = searchParams.get('minRating')
    ? parseFloat(searchParams.get('minRating')!)
    : undefined;
  const maxPrice = searchParams.get('maxPrice')
    ? parseFloat(searchParams.get('maxPrice')!)
    : undefined;
  const search = searchParams.get('search') || undefined;

  const filtered = filterHotels(mockHotels, { location, minRating, maxPrice, search });
  const result = paginateHotels(filtered, page, pageSize);

  const response: ApiResponse<Hotel[]> = {
    success: true,
    data: result.data,
    meta: result.meta,
  };

  return NextResponse.json(response);
}
