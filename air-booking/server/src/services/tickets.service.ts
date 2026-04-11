// @TASK Tickets Service - air_tickets CRUD
// @SPEC air_tickets table: id, booking_id, passenger_name, ticket_number, issue_date, status

import { getIntranetDb } from '../db/intranet';

export interface TicketRow {
  id: string;
  booking_id: string;
  passenger_name: string | null;
  ticket_number: string;
  issue_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketData {
  booking_id: string;
  passenger_name?: string;
  ticket_number: string;
  issue_date?: string;
  status?: string;
}

export interface UpdateTicketData {
  passenger_name?: string;
  ticket_number?: string;
  issue_date?: string | null;
  status?: string;
}

export async function listTicketsByBooking(bookingId: string): Promise<TicketRow[]> {
  const db = await getIntranetDb();
  const tickets = await db.all<TicketRow[]>(
    `SELECT id, booking_id, passenger_name, ticket_number, issue_date, status, created_at, updated_at
     FROM air_tickets WHERE booking_id = ? ORDER BY created_at DESC`,
    [bookingId]
  );
  return tickets;
}

export async function getTicketById(id: string): Promise<TicketRow | undefined> {
  const db = await getIntranetDb();
  const ticket = await db.get<TicketRow>(
    `SELECT id, booking_id, passenger_name, ticket_number, issue_date, status, created_at, updated_at
     FROM air_tickets WHERE id = ?`,
    [id]
  );
  return ticket;
}

export async function createTicket(data: CreateTicketData): Promise<TicketRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();

  await db.run(
    `INSERT INTO air_tickets (id, booking_id, passenger_name, ticket_number, issue_date, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.booking_id,
      data.passenger_name ?? null,
      data.ticket_number,
      data.issue_date ?? null,
      data.status || 'issued',
    ]
  );

  return (await getTicketById(id))!;
}

export async function updateTicket(id: string, data: UpdateTicketData): Promise<TicketRow | null> {
  const db = await getIntranetDb();
  const existing = await getTicketById(id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const setValues: unknown[] = [];

  if (data.passenger_name !== undefined) {
    setClauses.push('passenger_name = ?');
    setValues.push(data.passenger_name);
  }
  if (data.ticket_number !== undefined) {
    setClauses.push('ticket_number = ?');
    setValues.push(data.ticket_number);
  }
  if (data.issue_date !== undefined) {
    setClauses.push('issue_date = ?');
    setValues.push(data.issue_date);
  }
  if (data.status !== undefined) {
    setClauses.push('status = ?');
    setValues.push(data.status);
  }

  if (setClauses.length === 0) return existing;

  setClauses.push("updated_at = datetime('now')");
  setValues.push(id);

  await db.run(
    `UPDATE air_tickets SET ${setClauses.join(', ')} WHERE id = ?`,
    setValues
  );

  return (await getTicketById(id))!;
}

/** 여러 티켓 한번에 추가 (단일 트랜잭션) */
export async function createTicketsBulk(items: CreateTicketData[]): Promise<TicketRow[]> {
  if (items.length === 0) return [];

  const db = await getIntranetDb();
  const ids: string[] = [];

  // 트랜잭션으로 묶어서 한번에 INSERT
  await db.run('BEGIN TRANSACTION');
  try {
    for (const item of items) {
      const id = crypto.randomUUID();
      ids.push(id);
      await db.run(
        `INSERT INTO air_tickets (id, booking_id, passenger_name, ticket_number, issue_date, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, item.booking_id, item.passenger_name ?? null, item.ticket_number, item.issue_date ?? null, item.status || 'issued']
      );
    }
    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }

  // 한번에 SELECT
  const placeholders = ids.map(() => '?').join(',');
  const created = await db.all<TicketRow[]>(
    `SELECT id, booking_id, passenger_name, ticket_number, issue_date, status, created_at, updated_at
     FROM air_tickets WHERE id IN (${placeholders}) ORDER BY created_at DESC`,
    ids
  );
  return created;
}

export async function deleteTicket(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM air_tickets WHERE id = ?', [id]);
  return (result.changes || 0) > 0;
}

/** 출발일(또는 귀국일) 기준 5년 이상 지난 예약의 티켓 삭제 */
export async function deleteExpiredTickets(): Promise<number> {
  const db = await getIntranetDb();
  const result = await db.run(
    `DELETE FROM air_tickets WHERE booking_id IN (
       SELECT b.id FROM air_bookings b
       WHERE date(COALESCE(b.return_date, b.departure_date), '+5 years') < date('now')
         AND COALESCE(b.return_date, b.departure_date) IS NOT NULL
     )`
  );
  const count = result.changes || 0;
  if (count > 0) {
    console.log(`[cleanup] ${count}건 만료 티켓 삭제됨`);
  }
  return count;
}
