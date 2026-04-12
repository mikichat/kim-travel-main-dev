import { z } from 'zod';

// ==========================================
// Auth Schemas
// ==========================================
export const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소여야 합니다'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
});

export const registerSchema = z.object({
  email: z.string().email('유효한 이메일 주소여야 합니다'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  name: z.string().min(1, '이름은 필수입니다').max(100, '이름은 100자를 초과할 수 없습니다'),
});

// ==========================================
// Hotel Schemas
// ==========================================
export const createHotelSchema = z.object({
  name: z.string().min(1, '호텔 이름은 필수입니다').max(200),
  address: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  starRating: z.number().int().min(1).max(5).optional(),
  phone: z.string().max(20).optional(),
  url: z.string().url().optional().or(z.string().max(500).optional()),
  locationRemarks: z.string().max(500).optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  amenities: z.array(z.string()).optional(),
});

export const updateHotelSchema = createHotelSchema.partial();

// ==========================================
// Itinerary Schemas
// ==========================================
export const createItinerarySchema = z.object({
  title: z.string().min(1, '제목은 필수입니다').max(200),
  description: z.string().max(2000).optional(),
  destination: z.string().min(1, '목적지는 필수입니다').max(200),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: '유효한 날짜 형식이어야 합니다',
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: '유효한 날짜 형식이어야 합니다',
  }),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export const updateItinerarySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  destination: z.string().min(1).max(200).optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: '유효한 날짜 형식이어야 합니다',
  }).optional(),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: '유효한 날짜 형식이어야 합니다',
  }).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

// ==========================================
// Common Schemas
// ==========================================
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const uuidSchema = z.string().uuid('유효한 UUID여야 합니다');

// ==========================================
// Type exports from schemas
// ==========================================
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateHotelInput = z.infer<typeof createHotelSchema>;
export type UpdateHotelInput = z.infer<typeof updateHotelSchema>;
export type CreateItineraryInput = z.infer<typeof createItinerarySchema>;
export type UpdateItineraryInput = z.infer<typeof updateItinerarySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;