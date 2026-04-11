// ==========================================
// New API Contract Types (T0.5.1)
// ==========================================
export * from './api.js';
export * from './models.js';
export * from './requests.js';
export * from './responses.js';
export * from './errors.js';

// ==========================================
// Legacy Types (하위 호환성 유지)
// ==========================================

// Auth Payload (JWT 토큰에 포함되는 정보)
export interface AuthPayload {
  userId: string;
  email: string;
  role: LegacyUserRole;
}

export type LegacyUserRole = 'admin' | 'manager' | 'staff' | 'user';

// ==========================================
// Tour & Product Types (Legacy)
// ==========================================
export interface Tour {
  id: string;
  title: string;
  description: string;
  destination: string;
  duration: number; // days
  price: number;
  currency: string;
  maxParticipants: number;
  status: TourStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TourStatus = 'draft' | 'published' | 'archived' | 'cancelled';

export interface TourSchedule {
  id: string;
  tourId: string;
  day: number;
  title: string;
  description: string;
  activities: TourActivity[];
}

export interface TourActivity {
  id: string;
  scheduleId: string;
  time: string;
  title: string;
  description: string;
  location?: string;
  duration?: number; // minutes
}

// ==========================================
// Booking & Reservation Types (Legacy)
// ==========================================
export interface Booking {
  id: string;
  tourId: string;
  userId: string;
  status: BookingStatus;
  participants: Participant[];
  totalPrice: number;
  currency: string;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface Participant {
  id: string;
  bookingId: string;
  name: string;
  email?: string;
  phone?: string;
  birthDate?: Date;
  passportNumber?: string;
  passportExpiry?: Date;
  nationality?: string;
  specialRequests?: string;
}

// ==========================================
// Environment & Config Types
// ==========================================
export interface AppConfig {
  apiUrl: string;
  appName: string;
  environment: 'development' | 'staging' | 'production';
}
