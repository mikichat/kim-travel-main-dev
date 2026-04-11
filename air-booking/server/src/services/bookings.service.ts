// @TASK P5 - Bookings Service (인트라넷 DB 직접 연결)
// @SPEC travel_agency.db의 air_bookings 테이블 직접 조회/수정

import path from 'path';
import * as fs from 'fs';
import { encrypt, decrypt } from './crypto.service';
import { getIntranetDb } from '../db/intranet';

const BACKUP_DIR = path.join(__dirname, '../../data/backups/bookings');

/** 예약 데이터를 로컬 JSON 파일로 보관 */
function saveBackup(booking: BookingRow): void {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${booking.pnr}_${booking.id}_${timestamp}.json`;
    fs.writeFileSync(
      path.join(BACKUP_DIR, filename),
      JSON.stringify(booking, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('[backup] Backup failed:', err);
  }
}

function decryptBooking(row: BookingRow): BookingRow {
  if (!row) return row;
  return {
    ...row,
    passport_number: decrypt(row.passport_number) ?? null,
  };
}

function decryptBookings(rows: BookingRow[]): BookingRow[] {
  return rows.map(decryptBooking);
}

export interface PassengerInput {
  name_en?: string;
  name_kr?: string;
  title?: string;
  gender?: string;
  passport_number?: string;
  seat_number?: string;
}

export interface SegmentInput {
  id?: string;
  airline?: string;
  flight_number?: string;
  route_from?: string;
  route_to?: string;
  departure_date?: string;
  arrival_date?: string;
  departure_time?: string;
  arrival_time?: string;
}

export interface SegmentRow {
  id: string;
  booking_id: string;
  seg_index: number;
  airline: string | null;
  flight_number: string | null;
  route_from: string | null;
  route_to: string | null;
  departure_date: string | null;
  departure_time: string | null;
  arrival_time: string | null;
}

export interface PassengerRow {
  id: string;
  booking_id: string;
  name_en: string | null;
  name_kr: string | null;
  title: string | null;
  gender: string | null;
  passport_number: string | null;
  seat_number: string | null;
  created_at: string;
}

export interface BookingRow {
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
  created_at: string;
  updated_at: string;
  passengers?: PassengerRow[];
  segments?: SegmentRow[];
}

export interface BookingListParams {
  status?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
}

export async function listBookings(params: BookingListParams): Promise<{ bookings: BookingRow[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.status) {
    conditions.push('status = ?');
    values.push(params.status);
  }

  if (params.search) {
    conditions.push('(pnr LIKE ? OR name_kr LIKE ? OR name_en LIKE ? OR agency LIKE ?)');
    const searchTerm = `%${params.search}%`;
    values.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (params.date_from) {
    conditions.push('departure_date >= ?');
    values.push(params.date_from);
  }
  if (params.date_to) {
    conditions.push('departure_date <= ?');
    values.push(params.date_to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortCol = params.sort === 'departure_date' ? 'departure_date' : 'created_at';
  const sortOrder = params.order === 'asc' ? 'ASC' : 'DESC';
  const limit = Math.min(params.limit || 50, 100);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM air_bookings ${where}`, values
  );

  const bookings = await db.all<BookingRow[]>(
    `SELECT id, user_id, customer_id, pnr, airline, flight_number, route_from, route_to,
            name_kr, name_en, passport_number, seat_number, fare,
            nmtl_date, tl_date, departure_date, return_date, status, remarks, pax_count, agency,
            original_pnr_text, created_at, updated_at
     FROM air_bookings ${where}
     ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  // 각 예약의 segments 로드 (단일 IN 쿼리)
  const decrypted = decryptBookings(bookings);
  const bookingIds = decrypted.map(b => b.id);
  if (bookingIds.length > 0) {
    const placeholders = bookingIds.map(() => '?').join(',');
    const allSegs = await db.all<SegmentRow[]>(
      `SELECT * FROM air_booking_segments WHERE booking_id IN (${placeholders}) ORDER BY seg_index`,
      bookingIds
    );
    const segMap = new Map<string, SegmentRow[]>();
    for (const seg of allSegs) {
      if (!segMap.has(seg.booking_id)) segMap.set(seg.booking_id, []);
      segMap.get(seg.booking_id)!.push(seg);
    }
    for (const b of decrypted) {
      const segs = segMap.get(b.id);
      if (segs && segs.length > 0) b.segments = segs;
    }
  }

  // flight_saves 통합 (변환기에서 직접 저장한 항공편, AB- 제외)
  const savedPnrs = new Set(decrypted.map(b => b.pnr).filter(Boolean));
  const fsSearch = params.search ? `AND (name LIKE ? OR pnr LIKE ?)` : '';
  const fsVals = params.search ? [`%${params.search}%`, `%${params.search}%`] : [];
  const flightSaves = await db.all<any[]>(
    `SELECT id, name, pnr, data, created_at, updated_at FROM flight_saves WHERE id NOT LIKE 'AB-%' ${fsSearch} ORDER BY updated_at DESC LIMIT 50`,
    fsVals
  );

  const extraBookings: BookingRow[] = [];
  for (const fs of flightSaves) {
    if (fs.pnr && savedPnrs.has(fs.pnr)) continue;
    let data: any = {};
    try { data = typeof fs.data === 'string' ? JSON.parse(fs.data) : fs.data; } catch {}
    const flights = data.flights || [];
    const first = flights[0] || {};
    const last = flights.length > 1 ? flights[flights.length - 1] : {};
    extraBookings.push({
      id: fs.id,
      user_id: '',
      customer_id: null,
      pnr: fs.pnr || '',
      airline: first.airline || '',
      flight_number: first.flightNumber || '',
      route_from: first.departure?.code || '',
      route_to: first.arrival?.code || '',
      name_kr: data.customerInfo?.name || fs.name || '',
      name_en: '',
      passport_number: null,
      seat_number: null,
      fare: null,
      nmtl_date: null,
      tl_date: null,
      departure_date: first.date ? first.date.replace(/\(.*\)/, '').replace(/\./g, '-') : '',
      return_date: last.date ? last.date.replace(/\(.*\)/, '').replace(/\./g, '-') : null,
      status: 'confirmed',
      remarks: null,
      pax_count: parseInt(data.customerInfo?.totalPeople) || 1,
      agency: fs.name || '',
      original_pnr_text: data.originalPnrText || '',
      created_at: fs.created_at || '',
      updated_at: fs.updated_at || '',
      source: 'converter',
    } as any);
  }

  const allBookings = [...decrypted, ...extraBookings];
  return { bookings: allBookings, total: (countRow?.cnt || 0) + extraBookings.length };
}

export async function getBookingById(id: string): Promise<BookingRow | undefined> {
  const db = await getIntranetDb();
  const row = await db.get<BookingRow>(
    `SELECT id, user_id, customer_id, pnr, airline, flight_number, route_from, route_to,
            name_kr, name_en, passport_number, seat_number, fare,
            nmtl_date, tl_date, departure_date, return_date, status, remarks, pax_count, agency,
            original_pnr_text, created_at, updated_at
     FROM air_bookings WHERE id = ?`, [id]
  );
  if (!row) return undefined;
  const decrypted = decryptBooking(row);
  const passengers = await db.all<PassengerRow[]>(
    'SELECT id, booking_id, name_en, name_kr, title, gender, passport_number, seat_number, created_at FROM air_booking_passengers WHERE booking_id = ? ORDER BY created_at',
    [id]
  );
  const segments = await db.all<SegmentRow[]>(
    'SELECT id, booking_id, seg_index, airline, flight_number, route_from, route_to, departure_date, departure_time, arrival_time FROM air_booking_segments WHERE booking_id = ? ORDER BY seg_index',
    [id]
  );
  const decryptedPassengers = passengers.map(p => ({
    ...p,
    passport_number: decrypt(p.passport_number) ?? null,
  }));
  return { ...decrypted, passengers: decryptedPassengers, segments };
}

export interface CreateBookingData {
  user_id: string;
  customer_id?: string | null;
  pnr: string;
  airline?: string;
  flight_number?: string;
  route_from?: string;
  route_to?: string;
  name_kr?: string;
  name_en?: string;
  passport_number?: string;
  seat_number?: string;
  fare?: number;
  nmtl_date?: string;
  tl_date?: string;
  departure_date?: string;
  return_date?: string;
  status?: string;
  remarks?: string;
  pax_count?: number;
  agency?: string;
  group_id?: string;
  original_pnr_text?: string;
  passengers?: PassengerInput[];
  segments?: SegmentInput[];
}

export async function createBooking(data: CreateBookingData): Promise<BookingRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();
  const paxCount =
    data.passengers && data.passengers.length > 0 ? data.passengers.length : (data.pax_count ?? 1);
  const firstPax = data.passengers?.[0];
  const nameEn = data.name_en || firstPax?.name_en || null;
  const nameKr = data.name_kr || firstPax?.name_kr || null;

  // 트랜잭션: 예약 + 탑승객 + 구간을 원자적으로 삽입
  await db.run('BEGIN TRANSACTION');
  try {
  await db.run(
    `INSERT INTO air_bookings (id, user_id, customer_id, pnr, airline, flight_number, route_from, route_to, name_kr, name_en, passport_number, seat_number, fare, nmtl_date, tl_date, departure_date, return_date, status, remarks, pax_count, agency, group_id, original_pnr_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.user_id,
      data.customer_id ?? null,
      data.pnr,
      data.airline ?? null,
      data.flight_number ?? null,
      data.route_from ?? null,
      data.route_to ?? null,
      nameKr,
      nameEn,
      encrypt(data.passport_number),
      data.seat_number ?? null,
      data.fare ?? null,
      data.nmtl_date ?? null,
      data.tl_date ?? null,
      data.departure_date ?? null,
      data.return_date ?? null,
      data.status || 'pending',
      data.remarks ?? null,
      paxCount,
      data.agency ?? null,
      data.group_id ?? null,
      data.original_pnr_text ?? null,
    ]
  );

  if (data.passengers && data.passengers.length > 0) {
    for (const pax of data.passengers) {
      const paxId = crypto.randomUUID();
      await db.run(
        `INSERT INTO air_booking_passengers (id, booking_id, name_en, name_kr, title, gender, passport_number, seat_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paxId,
          id,
          pax.name_en ?? null,
          pax.name_kr ?? null,
          pax.title ?? null,
          pax.gender ?? null,
          encrypt(pax.passport_number) ?? null,
          pax.seat_number ?? null,
        ]
      );
    }
  }

  // segments 저장
  if (data.segments && data.segments.length > 0) {
    for (let i = 0; i < data.segments.length; i++) {
      const seg = data.segments[i];
      const segId = crypto.randomUUID();
      await db.run(
        `INSERT INTO air_booking_segments (id, booking_id, seg_index, airline, flight_number, route_from, route_to, departure_date, departure_time, arrival_time, arrival_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [segId, id, i, seg.airline ?? null, seg.flight_number ?? null, seg.route_from ?? null, seg.route_to ?? null, seg.departure_date ?? null, seg.departure_time ?? null, seg.arrival_time ?? null, seg.arrival_date ?? seg.departure_date ?? null]
      );
    }
  }

  await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }

  const created = (await getBookingById(id))!;
  saveBackup(created);

  // flight_schedules 자동 동기화
  await syncToFlightSchedules(db, created);

  // flight_saves 동기화 (변환기에서도 보이도록)
  try {
    const segments = created.segments || [];
    const passengers = created.passengers || [];
    const flightSaveData = {
      id: 'AB-' + id,
      name: data.agency || created.name_kr || '',
      pnr: data.pnr,
      saveDate: created.created_at,
      originalPnrText: data.original_pnr_text || '',
      flights: segments.map((s: any) => ({
        flightNumber: s.flight_number || '',
        airline: s.airline || data.airline || '',
        date: s.departure_date ? s.departure_date.replace(/-/g, '.') : '',
        arrivalDate: s.arrival_date ? s.arrival_date.replace(/-/g, '.') : (s.departure_date ? s.departure_date.replace(/-/g, '.') : ''),
        departure: { airport: s.route_from || '', code: s.route_from || '', time: s.departure_time || '' },
        arrival: { airport: s.route_to || '', code: s.route_to || '', time: s.arrival_time || '' },
      })),
      customerInfo: {
        name: created.name_kr || created.name_en || '',
        phone: '',
        totalPeople: (data.pax_count || 1).toString(),
        passengers: passengers.map((p: any, i: number) => ({
          index: i + 1,
          name: p.name_en || p.name_kr || '',
        })),
      },
    };
    await db.run(
      `INSERT OR REPLACE INTO flight_saves (id, name, pnr, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
      ['AB-' + id, flightSaveData.name, data.pnr, JSON.stringify(flightSaveData)]
    );
  } catch (e) {
    // flight_saves 동기화 실패해도 air_bookings 저장은 성공
  }

  return created;
}

export async function updateBooking(
  id: string,
  data: Partial<CreateBookingData>,
  changedBy: string
): Promise<BookingRow | null> {
  const db = await getIntranetDb();
  const existing = await getBookingById(id);
  if (!existing) return null;

  const updatableFields = [
    'customer_id', 'pnr', 'airline', 'flight_number', 'route_from', 'route_to',
    'name_kr', 'name_en', 'passport_number', 'seat_number', 'fare',
    'nmtl_date', 'tl_date', 'departure_date', 'return_date', 'status', 'remarks', 'agency',
  ] as const;

  const setClauses: string[] = [];
  const setValues: unknown[] = [];
  const historyEntries: { field: string; oldVal: unknown; newVal: unknown }[] = [];

  for (const field of updatableFields) {
    if (field in data) {
      const newVal = data[field as keyof typeof data];
      const oldVal = existing[field as keyof BookingRow];
      if (newVal !== oldVal) {
        setClauses.push(`${field} = ?`);
        if (field === 'passport_number') {
          setValues.push(encrypt(newVal as string | null));
        } else {
          setValues.push(newVal ?? null);
        }
        historyEntries.push({ field, oldVal, newVal });
      }
    }
  }

  if (setClauses.length === 0) return existing;

  setClauses.push("updated_at = datetime('now')");
  setValues.push(id);

  await db.run(
    `UPDATE air_bookings SET ${setClauses.join(', ')} WHERE id = ?`,
    setValues
  );

  // Record history
  for (const entry of historyEntries) {
    const histId = crypto.randomUUID();
    await db.run(
      'INSERT INTO air_booking_history (id, booking_id, field_changed, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?, ?)',
      [histId, id, entry.field, String(entry.oldVal ?? ''), String(entry.newVal ?? ''), changedBy]
    );
  }

  // segments 시간 업데이트
  if (data.segments && Array.isArray(data.segments)) {
    for (const seg of data.segments) {
      if (seg.id) {
        await db.run(
          `UPDATE air_booking_segments SET departure_time = ?, arrival_time = ? WHERE id = ?`,
          [seg.departure_time ?? null, seg.arrival_time ?? null, seg.id]
        );
      }
    }
  }

  const updated = (await getBookingById(id))!;
  saveBackup(updated);

  // flight_schedules 자동 동기화
  await syncToFlightSchedules(db, updated);

  // flight_saves 동기화 (변환기 저장된 항공편에도 반영)
  try {
    const segments = updated.segments || [];
    const passengers = updated.passengers || [];
    const flightSaveData = {
      id: 'AB-' + id,
      name: updated.agency || updated.name_kr || '',
      pnr: updated.pnr,
      saveDate: updated.created_at,
      originalPnrText: updated.original_pnr_text || '',
      flights: segments.map((s: any) => ({
        flightNumber: s.flight_number || '',
        airline: s.airline || updated.airline || '',
        date: s.departure_date ? s.departure_date.replace(/-/g, '.') : '',
        arrivalDate: s.arrival_date ? s.arrival_date.replace(/-/g, '.') : (s.departure_date ? s.departure_date.replace(/-/g, '.') : ''),
        departure: { airport: s.route_from || '', code: s.route_from || '', time: s.departure_time || '' },
        arrival: { airport: s.route_to || '', code: s.route_to || '', time: s.arrival_time || '' },
      })),
      customerInfo: {
        name: updated.name_kr || updated.name_en || '',
        phone: '',
        totalPeople: (updated.pax_count || 1).toString(),
        passengers: passengers.map((p: any, i: number) => ({
          index: i + 1,
          name: p.name_en || p.name_kr || '',
        })),
      },
    };
    await db.run(
      `UPDATE flight_saves SET name = ?, data = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [flightSaveData.name, JSON.stringify(flightSaveData), 'AB-' + id]
    );
  } catch (e) {}

  return updated;
}

export async function deleteBooking(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  await db.run('BEGIN TRANSACTION');
  try {
    await db.run('DELETE FROM air_booking_history WHERE booking_id = ?', [id]);
    await db.run('DELETE FROM air_booking_passengers WHERE booking_id = ?', [id]);
    await db.run('DELETE FROM air_booking_segments WHERE booking_id = ?', [id]);
    await db.run('DELETE FROM air_settlements WHERE booking_id = ?', [id]);
    const result = await db.run('DELETE FROM air_bookings WHERE id = ?', [id]);
    // flight_saves에 AB- 캐시가 있을 수 있으므로 함께 정리
    await db.run('DELETE FROM flight_saves WHERE id = ?', [`AB-${id}`]);
    await db.run('COMMIT');
    return (result.changes || 0) > 0;
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
}

/** 귀국일(return_date) 또는 출발일(departure_date) + 3일 지난 예약 자동 삭제 */
export async function cleanupExpiredBookings(): Promise<number> {
  const db = await getIntranetDb();
  // return_date 우선, 없으면 departure_date 사용
  const expired = await db.all<{ id: string }[]>(
    `SELECT id FROM air_bookings
     WHERE date(COALESCE(return_date, departure_date), '+3 days') < date('now')
       AND COALESCE(return_date, departure_date) IS NOT NULL`
  );
  if (!expired || expired.length === 0) return 0;

  for (const { id } of expired) {
    // 삭제 전 백업
    const booking = await getBookingById(id);
    if (booking) saveBackup(booking);
    await deleteBooking(id);
  }
  console.log(`[cleanup] ${expired.length}건 만료 예약 삭제됨`);
  return expired.length;
}

/**
 * air_bookings 데이터를 flight_schedules에 동기화
 * - PNR로 기존 스케줄 검색: 있으면 UPDATE, 없으면 INSERT
 * - source = 'air-booking'으로 표시
 */
async function syncToFlightSchedules(db: Awaited<ReturnType<typeof getIntranetDb>>, booking: BookingRow): Promise<void> {
  try {
    if (!booking.pnr) return;

    // 첫 번째 segment 정보 사용 (없으면 booking 레벨 데이터)
    const segments = booking.segments || [];
    const firstSeg = segments[0];

    const airline = firstSeg?.airline || booking.airline || 'TBA';
    const flightNumber = firstSeg?.flight_number || booking.flight_number || '';
    const routeFrom = firstSeg?.route_from || booking.route_from || 'TBA';
    const routeTo = firstSeg?.route_to || booking.route_to || 'TBA';
    const departureDate = firstSeg?.departure_date || booking.departure_date || new Date().toISOString().split('T')[0];
    const departureTime = firstSeg?.departure_time || '00:00';
    const arrivalTime = firstSeg?.arrival_time || '00:00';

    // PNR로 기존 flight_schedules 검색
    const existing = await db.get<{ id: string }>(
      'SELECT id FROM flight_schedules WHERE pnr = ?',
      [booking.pnr]
    );

    if (existing) {
      // UPDATE
      await db.run(
        `UPDATE flight_schedules SET
          group_name = ?, airline = ?, flight_number = ?,
          departure_date = ?, departure_airport = ?, departure_time = ?,
          arrival_date = ?, arrival_airport = ?, arrival_time = ?,
          passengers = ?, source = 'air-booking'
        WHERE id = ?`,
        [
          booking.agency || booking.name_kr || null,
          airline, flightNumber,
          departureDate, routeFrom, departureTime,
          booking.return_date || departureDate, routeTo, arrivalTime,
          booking.pax_count || 1,
          existing.id,
        ]
      );
    } else {
      // INSERT
      const fsId = crypto.randomUUID();
      await db.run(
        `INSERT INTO flight_schedules (id, group_name, airline, flight_number, departure_date, departure_airport, departure_time, arrival_date, arrival_airport, arrival_time, passengers, pnr, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'air-booking')`,
        [
          fsId,
          booking.agency || booking.name_kr || null,
          airline, flightNumber,
          departureDate, routeFrom, departureTime,
          booking.return_date || departureDate, routeTo, arrivalTime,
          booking.pax_count || 1,
          booking.pnr,
        ]
      );
    }
  } catch (err) {
    console.warn('[sync] flight_schedules 동기화 실패 (예약 저장은 정상):', err);
  }
}
