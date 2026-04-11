import type { Hotel } from './hotels';

// Mock hotels data
export const mockHotels: Hotel[] = [
  {
    id: '1',
    name: '서울格兰德酒店',
    location: '首尔',
    address: '首尔市中区乙支路123',
    rating: 4.5,
    description: '位于首尔市中心的豪华酒店，设施一流。',
    images: ['/images/hotel1.jpg'],
    amenities: ['免费WiFi', '游泳池', '健身中心', '餐厅'],
    contactPhone: '+82-2-1234-5678',
    contactEmail: 'contact@seoulgrand.com',
    pricePerNight: 150000,
    currency: 'KRW',
    roomTypes: ['标准间', '豪华间', '套房'],
    checkInTime: '15:00',
    checkOutTime: '11:00',
  },
  {
    id: '2',
    name: '东京皇家酒店',
    location: '东京',
    address: '东京都港区芝公园1-1-1',
    rating: 4.8,
    description: '俯瞰东京塔的经典豪华酒店。',
    images: ['/images/hotel2.jpg'],
    amenities: ['免费WiFi', '温泉', '餐厅', '酒吧'],
    contactPhone: '+81-3-1234-5678',
    contactEmail: 'info@tokyoroyal.jp',
    pricePerNight: 250000,
    currency: 'KRW',
    roomTypes: ['标准间', '豪华间', '套房', '总统套房'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
  },
  {
    id: '3',
    name: '巴黎香榭丽舍酒店',
    location: '巴黎',
    address: '香榭丽舍大道88号',
    rating: 5.0,
    description: '位于巴黎最著名大街上的奢华酒店。',
    images: ['/images/hotel3.jpg'],
    amenities: ['免费WiFi', '米其林餐厅', '水疗中心', '礼宾服务'],
    contactPhone: '+33-1-1234-5678',
    contactEmail: 'reservation@parischan.fr',
    pricePerNight: 350000,
    currency: 'KRW',
    roomTypes: ['经典间', '高级间', '豪华间', '套房'],
    checkInTime: '15:00',
    checkOutTime: '12:00',
  },
  {
    id: '4',
    name: '纽约广场酒店',
    location: '纽约',
    address: '第五大道768号',
    rating: 4.7,
    description: '纽约市地标性豪华酒店。',
    images: ['/images/hotel4.jpg'],
    amenities: ['免费WiFi', '健身中心', '餐厅', '商务中心'],
    contactPhone: '+1-212-123-4567',
    contactEmail: 'stay@nyplaza.com',
    pricePerNight: 280000,
    currency: 'KRW',
    roomTypes: ['标准间', '豪华间', '套房'],
    checkInTime: '16:00',
    checkOutTime: '11:00',
  },
  {
    id: '5',
    name: '迪拜帆船酒店',
    location: '迪拜',
    address: '朱美拉海滩路',
    rating: 5.0,
    description: '世界著名的七星级豪华酒店。',
    images: ['/images/hotel5.jpg'],
    amenities: ['免费WiFi', '私人沙滩', '游泳池', '直升机停机坪'],
    contactPhone: '+971-4-123-4567',
    contactEmail: 'concierge@burjalarab.ae',
    pricePerNight: 800000,
    currency: 'KRW',
    roomTypes: ['标准间', '豪华间', '套房', '总统套房'],
    checkInTime: '15:00',
    checkOutTime: '12:00',
  },
  {
    id: '6',
    name: '曼谷文华东方酒店',
    location: '曼谷',
    address: '沙通路333号',
    rating: 4.6,
    description: '湄南河畔的经典豪华酒店。',
    images: ['/images/hotel6.jpg'],
    amenities: ['免费WiFi', '河边餐厅', '水疗中心', '泰式烹饪课程'],
    contactPhone: '+66-2-123-4567',
    contactEmail: 'morning@mandarinoriental.co.th',
    pricePerNight: 180000,
    currency: 'KRW',
    roomTypes: ['标准间', '豪华间', '河景房', '套房'],
    checkInTime: '14:00',
    checkOutTime: '12:00',
  },
];

export function filterHotels(
  hotels: Hotel[],
  filters: {
    location?: string;
    minRating?: number;
    maxPrice?: number;
    search?: string;
  }
): Hotel[] {
  return hotels.filter((hotel) => {
    if (filters.location && hotel.location !== filters.location) {
      return false;
    }
    if (filters.minRating && hotel.rating < filters.minRating) {
      return false;
    }
    if (filters.maxPrice && hotel.pricePerNight && hotel.pricePerNight > filters.maxPrice) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        hotel.name.toLowerCase().includes(searchLower) ||
        hotel.location.toLowerCase().includes(searchLower) ||
        (hotel.description?.toLowerCase().includes(searchLower) ?? false);
      if (!matchesSearch) {
        return false;
      }
    }
    return true;
  });
}

export function paginateHotels(
  hotels: Hotel[],
  page: number = 1,
  pageSize: number = 12
): { data: Hotel[]; meta: {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} } {
  const totalCount = hotels.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = hotels.slice(startIndex, endIndex);

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
