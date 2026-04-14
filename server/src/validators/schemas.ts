import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  search: z.string().optional(),
  sortField: z.string().optional().default('created_at'),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});

// Booking schemas
export const createBookingSchema = z.object({
  userId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  pnr: z.string().max(20).optional(),
  airline: z.string().max(50).optional(),
  flightNumber: z.string().max(20).optional(),
  routeFrom: z.string().max(10).optional(),
  routeTo: z.string().max(10).optional(),
  nameKr: z.string().max(100).optional(),
  nameEn: z.string().max(100).optional(),
  passportNumber: z.string().max(50).optional(),
  seatNumber: z.string().max(10).optional(),
  fare: z.coerce.number().positive().optional(),
  nmtlDate: z.string().optional(),
  tlDate: z.string().optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'ticketed', 'cancelled']).optional().default('pending'),
  remarks: z.string().max(500).optional(),
});

export const updateBookingSchema = createBookingSchema.partial();

// BSP Date schemas
export const createBspDateSchema = z.object({
  paymentDate: z.string().min(1),
  description: z.string().max(200).optional(),
  type: z.enum(['payment', 'reminder']).optional().default('payment'),
  isNotified: z.boolean().optional().default(false),
});

export const updateBspDateSchema = createBspDateSchema.partial();

// Vendor schemas
export const createVendorSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().max(200).optional(),
  bankAccount: z.string().max(50).optional(),
  bankName: z.string().max(50).optional(),
  remarks: z.string().max(500).optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

// Settlement schemas
export const createSettlementSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.coerce.number().min(0).optional().default(0),
  status: z.enum(['pending', 'completed', 'cancelled']).optional().default('pending'),
  description: z.string().max(500).optional(),
});

export const updateSettlementSchema = createSettlementSchema.partial();

// Hotel schemas
export const createHotelSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(300).optional(),
  country: z.string().max(50).optional(),
  city: z.string().max(50).optional(),
  starRating: z.coerce.number().int().min(1).max(5).optional(),
  phone: z.string().max(20).optional(),
  url: z.string().url().optional(),
  locationRemarks: z.string().max(200).optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  amenities: z.string().max(500).optional(),
});

export const updateHotelSchema = createHotelSchema.partial();

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100),
});

// Validation helper
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errors };
  }
  return { success: true, data: result.data };
}
