import type { ImageAsset, ImageCategory } from './images';

// Mock images data
export const mockImages: ImageAsset[] = [
  {
    id: '1',
    filename: 'mountain-tour.jpg',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200',
    altText: '雄伟的山脉景色',
    fileSize: 256000,
    width: 1920,
    height: 1080,
    tags: ['mountain', 'nature', 'landscape'],
    category: 'tour',
    mimeType: 'image/jpeg',
    createdAt: '2024-01-15T10:30:00Z',
    uploadedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    filename: 'beach-resort.jpg',
    url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=200',
    altText: '美丽的海滩度假村',
    fileSize: 312000,
    width: 1920,
    height: 1080,
    tags: ['beach', 'resort', 'ocean'],
    category: 'hotel',
    mimeType: 'image/jpeg',
    createdAt: '2024-01-16T14:20:00Z',
    uploadedAt: '2024-01-16T14:20:00Z',
  },
  {
    id: '3',
    filename: 'paris-eiffel.jpg',
    url: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=200',
    altText: '巴黎埃菲尔铁塔',
    fileSize: 289000,
    width: 1920,
    height: 1080,
    tags: ['paris', 'landmark', 'eiffel'],
    category: 'destination',
    mimeType: 'image/jpeg',
    createdAt: '2024-01-17T09:15:00Z',
    uploadedAt: '2024-01-17T09:15:00Z',
  },
  {
    id: '4',
    filename: 'traditional-food.jpg',
    url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200',
    altText: '美味的传统美食',
    fileSize: 198000,
    width: 1920,
    height: 1080,
    tags: ['food', 'restaurant', 'cuisine'],
    category: 'food',
    mimeType: 'image/jpeg',
    createdAt: '2024-01-18T11:45:00Z',
    uploadedAt: '2024-01-18T11:45:00Z',
  },
  {
    id: '5',
    filename: 'adventure-tour.jpg',
    url: 'https://images.unsplash.com/photo-1539635278303-d4002c5e388c?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1539635278303-d4002c5e388c?w=200',
    altText: '激动人心的冒险之旅',
    fileSize: 276000,
    width: 1920,
    height: 1080,
    tags: ['adventure', 'tour', 'nature'],
    category: 'activity',
    mimeType: 'image/jpeg',
    createdAt: '2024-01-19T16:00:00Z',
    uploadedAt: '2024-01-19T16:00:00Z',
  },
  {
    id: '6',
    filename: 'luxury-bus.jpg',
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=200',
    altText: '豪华旅游巴士',
    fileSize: 234000,
    width: 1920,
    height: 1080,
    tags: ['bus', 'transport', 'luxury'],
    category: 'transport',
    mimeType: 'image/jpeg',
    createdAt: '2024-01-20T08:30:00Z',
    uploadedAt: '2024-01-20T08:30:00Z',
  },
  {
    id: '7',
    filename: 'tokyo-night.jpg',
    url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=200',
    altText: '东京夜景',
    fileSize: 301000,
    width: 1920,
    height: 1080,
    tags: ['tokyo', 'night', 'cityscape'],
    category: 'destination',
    mimeType: 'image/jpeg',
    createdAt: '2024-01-21T20:00:00Z',
    uploadedAt: '2024-01-21T20:00:00Z',
  },
  {
    id: '8',
    filename: 'spa-resort.jpg',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200',
    altText: '水疗度假村',
    fileSize: 267000,
    width: 1920,
    height: 1080,
    tags: ['spa', 'resort', 'relaxation'],
    category: 'hotel',
    mimeType: 'image/jpeg',
    createdAt: '2024-01-22T13:00:00Z',
    uploadedAt: '2024-01-22T13:00:00Z',
  },
];

export function filterImages(
  images: ImageAsset[],
  filters: {
    category?: ImageCategory;
    tags?: string;
    search?: string;
  }
): ImageAsset[] {
  return images.filter((image) => {
    if (filters.category && image.category !== filters.category) {
      return false;
    }
    if (filters.tags) {
      const tagList = filters.tags.split(',').map((t) => t.trim());
      const hasMatchingTag = tagList.some((tag) =>
        image.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
      );
      if (!hasMatchingTag) {
        return false;
      }
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        image.altText.toLowerCase().includes(searchLower) ||
        image.filename.toLowerCase().includes(searchLower) ||
        image.tags.some((tag) => tag.toLowerCase().includes(searchLower));
      if (!matchesSearch) {
        return false;
      }
    }
    return true;
  });
}

export function paginateImages(
  images: ImageAsset[],
  page: number = 1,
  pageSize: number = 20
): { data: ImageAsset[]; meta: {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} } {
  const totalCount = images.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = images.slice(startIndex, endIndex);

  return {
    data,
    meta: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export function getCategoriesWithCount(images: ImageAsset[]): { category: ImageCategory; count: number }[] {
  const categoryMap = new Map<ImageCategory, number>();
  images.forEach((image) => {
    categoryMap.set(image.category, (categoryMap.get(image.category) || 0) + 1);
  });
  return Array.from(categoryMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}

export function getAllTags(images: ImageAsset[]): string[] {
  const tagSet = new Set<string>();
  images.forEach((image) => {
    image.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}
