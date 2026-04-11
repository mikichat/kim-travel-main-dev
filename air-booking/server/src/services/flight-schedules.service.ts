// 항공 스케줄 서비스 — travel_agency.db의 flight_schedules 테이블 직접 조회

import { getIntranetDb } from '../db/intranet';

export interface FlightScheduleRow {
  id: string;
  group_id: string | null;
  group_name: string | null;
  airline: string;
  flight_number: string | null;
  departure_date: string;
  departure_airport: string;
  departure_time: string;
  arrival_date: string;
  arrival_airport: string;
  arrival_time: string;
  passengers: number;
  created_at: string;
}

export interface FlightScheduleListParams {
  search?: string;
  departure_from?: string;
  departure_to?: string;
  page?: number;
  limit?: number;
}

export async function listFlightSchedules(params: FlightScheduleListParams): Promise<{ schedules: FlightScheduleRow[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    conditions.push('(group_name LIKE ? OR airline LIKE ? OR flight_number LIKE ? OR departure_airport LIKE ? OR arrival_airport LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term, term, term);
  }

  if (params.departure_from) {
    conditions.push('departure_date >= ?');
    values.push(params.departure_from);
  }

  if (params.departure_to) {
    conditions.push('departure_date <= ?');
    values.push(params.departure_to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 50, 100);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM flight_schedules ${where}`, values
  );

  const schedules = await db.all<FlightScheduleRow[]>(
    `SELECT id, group_id, group_name, airline, flight_number,
            departure_date, departure_airport, departure_time,
            arrival_date, arrival_airport, arrival_time, passengers, created_at
     FROM flight_schedules ${where}
     ORDER BY departure_date DESC, departure_time ASC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return { schedules, total: countRow?.cnt || 0 };
}

export async function getFlightScheduleById(id: string): Promise<FlightScheduleRow | null> {
  const db = await getIntranetDb();
  const row = await db.get<FlightScheduleRow>(
    `SELECT id, group_id, group_name, airline, flight_number,
            departure_date, departure_airport, departure_time,
            arrival_date, arrival_airport, arrival_time, passengers, created_at
     FROM flight_schedules WHERE id = ?`, [id]
  );
  return row || null;
}

export interface CreateFlightScheduleData {
  group_id?: string;
  group_name: string;
  airline: string;
  flight_number?: string;
  departure_date: string;
  departure_airport: string;
  departure_time: string;
  arrival_date: string;
  arrival_airport: string;
  arrival_time: string;
  passengers?: number;
}

export async function createFlightSchedule(data: CreateFlightScheduleData): Promise<FlightScheduleRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();

  await db.run(
    `INSERT INTO flight_schedules (id, group_id, group_name, airline, flight_number,
     departure_date, departure_airport, departure_time,
     arrival_date, arrival_airport, arrival_time, passengers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.group_id ?? null,
      data.group_name,
      data.airline,
      data.flight_number ?? null,
      data.departure_date,
      data.departure_airport,
      data.departure_time,
      data.arrival_date,
      data.arrival_airport,
      data.arrival_time,
      data.passengers ?? 0,
    ]
  );

  return (await getFlightScheduleById(id))!;
}

export async function updateFlightSchedule(id: string, data: Partial<CreateFlightScheduleData>): Promise<FlightScheduleRow | null> {
  const db = await getIntranetDb();
  const sets: string[] = [];
  const vals: unknown[] = [];

  const fields: (keyof CreateFlightScheduleData)[] = [
    'group_id', 'group_name', 'airline', 'flight_number',
    'departure_date', 'departure_airport', 'departure_time',
    'arrival_date', 'arrival_airport', 'arrival_time', 'passengers',
  ];
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); }
  }
  if (sets.length === 0) return getFlightScheduleById(id);

  vals.push(id);
  await db.run(`UPDATE flight_schedules SET ${sets.join(', ')} WHERE id = ?`, vals);
  return getFlightScheduleById(id);
}

export async function deleteFlightSchedule(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM flight_schedules WHERE id = ?', [id]);
  return (result.changes || 0) > 0;
}

export async function findMatchingBookings(scheduleId: string): Promise<{ pnr: string; airline: string; departure_date: string }[]> {
  const db = await getIntranetDb();
  const schedule = await getFlightScheduleById(scheduleId);
  if (!schedule) return [];

  return db.all<{ pnr: string; airline: string; departure_date: string }[]>(
    `SELECT pnr, airline, departure_date FROM air_bookings
     WHERE airline = ? AND departure_date = ?
       AND (route_from = ? OR route_to = ?)
     LIMIT 20`,
    [schedule.airline, schedule.departure_date, schedule.departure_airport, schedule.arrival_airport]
  );
}

export async function getRelatedBookings(scheduleId: string): Promise<{ id: string; pnr: string; airline: string; flight_number: string; departure_date: string; status: string; pax_count: number }[]> {
  const db = await getIntranetDb();
  const schedule = await getFlightScheduleById(scheduleId);
  if (!schedule) return [];

  return db.all(
    `SELECT id, pnr, airline, flight_number, departure_date, status, pax_count
     FROM air_bookings
     WHERE airline = ? AND departure_date = ?
     ORDER BY created_at DESC LIMIT 50`,
    [schedule.airline, schedule.departure_date]
  );
}

export async function hasRelatedBookings(scheduleId: string): Promise<boolean> {
  const bookings = await getRelatedBookings(scheduleId);
  return bookings.length > 0;
}
