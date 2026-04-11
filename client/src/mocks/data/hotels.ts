/**
 * Hotel types for mock data
 */
export interface Hotel {
  id: string;
  name: string;
  description: string;
  location: string;
  address: string;
  rating: number;
  pricePerNight: number;
  currency: string;
  amenities: string[];
  images: string[];
  roomTypes: RoomType[];
  checkInTime: string;
  checkOutTime: string;
  contactPhone: string;
  contactEmail: string;
}

export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  pricePerNight: number;
  amenities: string[];
  available: boolean;
}

/**
 * Mock hotel data for development and testing
 */
export const mockHotels: Hotel[] = [
  {
    id: 'hotel-001',
    name: '제주 그랜드 호텔',
    description: '제주 중문 관광단지에 위치한 5성급 리조트 호텔',
    location: '제주도 서귀포시',
    address: '제주특별자치도 서귀포시 중문관광로 72번길 75',
    rating: 4.8,
    pricePerNight: 250000,
    currency: 'KRW',
    amenities: [
      '무료 Wi-Fi',
      '수영장',
      '피트니스',
      '스파',
      '레스토랑',
      '비즈니스 센터',
    ],
    images: [
      '/images/hotels/jeju-grand-1.jpg',
      '/images/hotels/jeju-grand-2.jpg',
    ],
    roomTypes: [
      {
        id: 'room-001',
        hotelId: 'hotel-001',
        name: '디럭스 더블',
        description: '바다 전망이 보이는 디럭스 더블룸',
        maxOccupancy: 2,
        bedType: '더블베드',
        pricePerNight: 250000,
        amenities: ['미니바', '욕조', '발코니'],
        available: true,
      },
      {
        id: 'room-002',
        hotelId: 'hotel-001',
        name: '패밀리 스위트',
        description: '가족을 위한 넓은 스위트룸',
        maxOccupancy: 4,
        bedType: '더블베드 2개',
        pricePerNight: 450000,
        amenities: ['미니바', '욕조', '거실', '발코니', '키친'],
        available: true,
      },
    ],
    checkInTime: '15:00',
    checkOutTime: '11:00',
    contactPhone: '+82-64-738-0000',
    contactEmail: 'info@jejugrand.com',
  },
  {
    id: 'hotel-002',
    name: '오사카 힐튼 호텔',
    description: '오사카 중심부에 위치한 글로벌 체인 호텔',
    location: '일본 오사카',
    address: '1-8-8 Umeda, Kita-ku, Osaka, Japan',
    rating: 4.6,
    pricePerNight: 180000,
    currency: 'KRW',
    amenities: ['무료 Wi-Fi', '피트니스', '레스토랑', '컨시어지'],
    images: ['/images/hotels/osaka-hilton-1.jpg'],
    roomTypes: [
      {
        id: 'room-003',
        hotelId: 'hotel-002',
        name: '스탠다드 트윈',
        description: '시내 전망의 스탠다드 트윈룸',
        maxOccupancy: 2,
        bedType: '싱글베드 2개',
        pricePerNight: 180000,
        amenities: ['미니바', '샤워'],
        available: true,
      },
    ],
    checkInTime: '14:00',
    checkOutTime: '12:00',
    contactPhone: '+81-6-6347-7111',
    contactEmail: 'osaka@hilton.com',
  },
  {
    id: 'hotel-003',
    name: '다낭 인터컨티넨탈',
    description: '미케비치 앞 럭셔리 리조트',
    location: '베트남 다낭',
    address: 'Bai Bac, Son Tra Peninsula, Da Nang, Vietnam',
    rating: 4.9,
    pricePerNight: 320000,
    currency: 'KRW',
    amenities: [
      '프라이빗 비치',
      '무료 Wi-Fi',
      '수영장',
      '스파',
      '레스토랑',
      '키즈클럽',
    ],
    images: [
      '/images/hotels/danang-intercontinental-1.jpg',
      '/images/hotels/danang-intercontinental-2.jpg',
    ],
    roomTypes: [
      {
        id: 'room-004',
        hotelId: 'hotel-003',
        name: '오션뷰 디럭스',
        description: '바다가 보이는 디럭스룸',
        maxOccupancy: 2,
        bedType: '킹베드',
        pricePerNight: 320000,
        amenities: ['미니바', '욕조', '발코니', '커피머신'],
        available: true,
      },
      {
        id: 'room-005',
        hotelId: 'hotel-003',
        name: '풀빌라',
        description: '프라이빗 풀이 있는 빌라',
        maxOccupancy: 4,
        bedType: '킹베드',
        pricePerNight: 750000,
        amenities: ['프라이빗풀', '미니바', '욕조', '거실', '키친', '정원'],
        available: false,
      },
    ],
    checkInTime: '14:00',
    checkOutTime: '12:00',
    contactPhone: '+84-236-393-8888',
    contactEmail: 'danang@intercontinental.com',
  },
];

/**
 * Get mock hotel by ID
 */
export function getMockHotelById(id: string): Hotel | undefined {
  return mockHotels.find((hotel) => hotel.id === id);
}

/**
 * Get mock hotels by location
 */
export function getMockHotelsByLocation(location: string): Hotel[] {
  return mockHotels.filter((hotel) =>
    hotel.location.toLowerCase().includes(location.toLowerCase())
  );
}

/**
 * Get available rooms for a hotel
 */
export function getAvailableRooms(hotelId: string): RoomType[] {
  const hotel = getMockHotelById(hotelId);
  if (!hotel) return [];
  return hotel.roomTypes.filter((room) => room.available);
}
