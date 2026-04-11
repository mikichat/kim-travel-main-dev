/**
 * Image types for mock data
 */
export interface ImageAsset {
  id: string;
  url: string;
  thumbnailUrl: string;
  altText: string;
  category: ImageCategory;
  tags: string[];
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export type ImageCategory =
  | 'tour'
  | 'hotel'
  | 'destination'
  | 'activity'
  | 'food'
  | 'transport';

/**
 * Mock image data for development and testing
 */
export const mockImages: ImageAsset[] = [
  // Tour images
  {
    id: 'img-001',
    url: '/images/tours/jeju-hallasan.jpg',
    thumbnailUrl: '/images/tours/thumbs/jeju-hallasan.jpg',
    altText: '제주 한라산 정상',
    category: 'tour',
    tags: ['제주도', '한라산', '산', '자연'],
    width: 1920,
    height: 1080,
    fileSize: 524288,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-10'),
  },
  {
    id: 'img-002',
    url: '/images/tours/jeju-seongsan.jpg',
    thumbnailUrl: '/images/tours/thumbs/jeju-seongsan.jpg',
    altText: '성산일출봉 전경',
    category: 'tour',
    tags: ['제주도', '성산일출봉', '유네스코', '일출'],
    width: 1920,
    height: 1280,
    fileSize: 614400,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-10'),
  },
  {
    id: 'img-003',
    url: '/images/tours/osaka-castle.jpg',
    thumbnailUrl: '/images/tours/thumbs/osaka-castle.jpg',
    altText: '오사카 성',
    category: 'tour',
    tags: ['일본', '오사카', '성', '역사'],
    width: 1600,
    height: 1200,
    fileSize: 491520,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-12'),
  },
  // Destination images
  {
    id: 'img-004',
    url: '/images/destinations/danang-beach.jpg',
    thumbnailUrl: '/images/destinations/thumbs/danang-beach.jpg',
    altText: '다낭 미케비치',
    category: 'destination',
    tags: ['베트남', '다낭', '해변', '바다'],
    width: 1920,
    height: 1080,
    fileSize: 450560,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-15'),
  },
  {
    id: 'img-005',
    url: '/images/destinations/hoian-lantern.jpg',
    thumbnailUrl: '/images/destinations/thumbs/hoian-lantern.jpg',
    altText: '호이안 등불 야경',
    category: 'destination',
    tags: ['베트남', '호이안', '야경', '등불'],
    width: 1800,
    height: 1200,
    fileSize: 389120,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-15'),
  },
  // Hotel images
  {
    id: 'img-006',
    url: '/images/hotels/jeju-grand-lobby.jpg',
    thumbnailUrl: '/images/hotels/thumbs/jeju-grand-lobby.jpg',
    altText: '제주 그랜드 호텔 로비',
    category: 'hotel',
    tags: ['제주도', '호텔', '로비', '럭셔리'],
    width: 1600,
    height: 1067,
    fileSize: 327680,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-08'),
  },
  {
    id: 'img-007',
    url: '/images/hotels/osaka-hilton-room.jpg',
    thumbnailUrl: '/images/hotels/thumbs/osaka-hilton-room.jpg',
    altText: '오사카 힐튼 호텔 객실',
    category: 'hotel',
    tags: ['일본', '오사카', '호텔', '객실'],
    width: 1600,
    height: 1067,
    fileSize: 286720,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-08'),
  },
  // Activity images
  {
    id: 'img-008',
    url: '/images/activities/udo-bike.jpg',
    thumbnailUrl: '/images/activities/thumbs/udo-bike.jpg',
    altText: '우도 자전거 투어',
    category: 'activity',
    tags: ['제주도', '우도', '자전거', '액티비티'],
    width: 1920,
    height: 1280,
    fileSize: 409600,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-11'),
  },
  {
    id: 'img-009',
    url: '/images/activities/usj-entrance.jpg',
    thumbnailUrl: '/images/activities/thumbs/usj-entrance.jpg',
    altText: '유니버설 스튜디오 재팬 입구',
    category: 'activity',
    tags: ['일본', '오사카', '유니버설', '테마파크'],
    width: 1920,
    height: 1080,
    fileSize: 552960,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-12'),
  },
  // Food images
  {
    id: 'img-010',
    url: '/images/food/jeju-black-pork.jpg',
    thumbnailUrl: '/images/food/thumbs/jeju-black-pork.jpg',
    altText: '제주 흑돼지 구이',
    category: 'food',
    tags: ['제주도', '흑돼지', '음식', '한식'],
    width: 1600,
    height: 1067,
    fileSize: 307200,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-10'),
  },
];

/**
 * Get mock image by ID
 */
export function getMockImageById(id: string): ImageAsset | undefined {
  return mockImages.find((image) => image.id === id);
}

/**
 * Get mock images by category
 */
export function getMockImagesByCategory(category: ImageCategory): ImageAsset[] {
  return mockImages.filter((image) => image.category === category);
}

/**
 * Get mock images by tags
 */
export function getMockImagesByTags(tags: string[]): ImageAsset[] {
  return mockImages.filter((image) =>
    tags.some((tag) => image.tags.includes(tag))
  );
}

/**
 * Search mock images
 */
export function searchMockImages(query: string): ImageAsset[] {
  const lowerQuery = query.toLowerCase();
  return mockImages.filter(
    (image) =>
      image.altText.toLowerCase().includes(lowerQuery) ||
      image.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
