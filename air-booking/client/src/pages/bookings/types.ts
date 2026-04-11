// @TASK P2-S3-T1 - 예약장부 공유 타입
// @SPEC PNR 파싱, 테이블 정렬/필터/검색, 행 확장 상세

import type { BadgeStatus } from '../../components/common/StatusBadge';

export interface Passenger {
  id: string;
  booking_id: string;
  name_en: string | null;
  name_kr: string | null;
  title: string | null;
  gender: string | null;
  passport_number: string | null;
  seat_number: string | null;
}

export interface Booking {
  id: string;
  user_id: string;
  customer_id: string | null;
  pnr: string;
  airline: string | null;
  flight_number: string | null;
  route_from: string | null;
  route_to: string | null;
  name_kr: string | null;
  name_en: string | null;
  passport_number: string | null;
  seat_number: string | null;
  fare: number | null;
  nmtl_date: string | null;
  tl_date: string | null;
  departure_date: string | null;
  return_date: string | null;
  status: string;
  remarks: string | null;
  pax_count: number;
  agency: string | null;
  group_id: string | null;
  original_pnr_text: string | null;
  passengers?: Passenger[];
  segments?: { id?: string; flight_number: string; route_from: string; route_to: string; departure_date: string; departure_time?: string; arrival_time?: string }[];
  created_at: string;
  updated_at: string;
}

export type StatusFilter = '' | 'pending' | 'confirmed' | 'ticketed' | 'cancelled';
export type SortField = 'created_at' | 'departure_date';

export interface Segment {
  id?: string;
  flight: string;
  from: string;
  to: string;
  date: string;
  departureTime?: string;
  arrivalTime?: string;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: '대기 (Pending)',
  confirmed: '확정 (Confirmed)',
  ticketed: '발권완료 (Ticketed)',
  cancelled: '취소 (Cancelled)',
};

export const STATUS_MAP: Record<string, BadgeStatus> = {
  pending: 'pending',
  confirmed: 'imminent',
  ticketed: 'completed',
  cancelled: 'urgent',
};

export const PAX_THRESHOLD = 4;
