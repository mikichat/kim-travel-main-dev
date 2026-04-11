// 인보이스 서비스 — travel_agency.db의 invoices 테이블 직접 조회/생성

import { getIntranetDb } from '../db/intranet';
import { Database } from 'sqlite';
import { getBookingById } from './bookings.service';
import { listTicketsByBooking } from './tickets.service';

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  recipient: string;
  invoice_date: string;
  description: string | null;
  total_amount: number;
  airfare_unit_price: number;
  airfare_quantity: number;
  airfare_total: number;
  seat_preference_unit_price: number;
  seat_preference_quantity: number;
  seat_preference_total: number;
  calculation_mode: string | null;
  base_price_per_person: number | null;
  total_participants: number | null;
  total_travel_cost: number | null;
  deposit_amount: number | null;
  deposit_description: string | null;
  additional_items: string | null;
  balance_due: number | null;
  booking_id: string | null;
  settlement_id: string | null;
  flight_info: any[] | null;
  passenger_info: any[] | null;
  ticket_info: any[] | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  created_at: string;
  updated_at: string;
}

export async function listInvoices(params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ invoices: InvoiceRow[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    conditions.push('(recipient LIKE ? OR invoice_number LIKE ? OR description LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 50, 100);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM invoices ${where}`, values
  );

  const invoices = await db.all<InvoiceRow[]>(
    `SELECT id, invoice_number, recipient, invoice_date, description, total_amount,
            airfare_unit_price, airfare_quantity, airfare_total,
            seat_preference_unit_price, seat_preference_quantity, seat_preference_total,
            calculation_mode, base_price_per_person, total_participants,
            total_travel_cost, deposit_amount, deposit_description,
            additional_items, balance_due,
            bank_name, account_number, account_holder,
            booking_id, settlement_id, flight_info, passenger_info, ticket_info,
            created_at, updated_at
     FROM invoices ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  // Parse JSON fields for list results
  for (const inv of invoices) {
    try { if (inv.additional_items) inv.additional_items = JSON.parse(inv.additional_items as any); } catch { inv.additional_items = null; }
    try { if (inv.flight_info) inv.flight_info = JSON.parse(inv.flight_info as any); } catch { inv.flight_info = null; }
    try { if (inv.passenger_info) inv.passenger_info = JSON.parse(inv.passenger_info as any); } catch { inv.passenger_info = null; }
    try { if (inv.ticket_info) inv.ticket_info = JSON.parse(inv.ticket_info as any); } catch { inv.ticket_info = null; }
  }

  return { invoices, total: countRow?.cnt || 0 };
}

export async function getInvoiceById(id: string): Promise<InvoiceRow | undefined> {
  const db = await getIntranetDb();
  const row = await db.get<InvoiceRow>(
    `SELECT id, invoice_number, recipient, invoice_date, description, total_amount,
            airfare_unit_price, airfare_quantity, airfare_total,
            seat_preference_unit_price, seat_preference_quantity, seat_preference_total,
            calculation_mode, base_price_per_person, total_participants,
            total_travel_cost, deposit_amount, deposit_description,
            additional_items, balance_due,
            bank_name, account_number, account_holder,
            booking_id, settlement_id, flight_info, passenger_info, ticket_info,
            created_at, updated_at
     FROM invoices WHERE id = ?`, [id]
  );
  if (!row) return undefined;

  // Parse JSON fields
  try { if (row.additional_items) row.additional_items = JSON.parse(row.additional_items as any); } catch { row.additional_items = null; }
  try { if (row.flight_info) row.flight_info = JSON.parse(row.flight_info as any); } catch { row.flight_info = null; }
  try { if (row.passenger_info) row.passenger_info = JSON.parse(row.passenger_info as any); } catch { row.passenger_info = null; }
  try { if (row.ticket_info) row.ticket_info = JSON.parse(row.ticket_info as any); } catch { row.ticket_info = null; }

  return row;
}

export interface CreateInvoiceData {
  recipient: string;
  invoice_date?: string;
  description?: string;
  airfare_unit_price?: number;
  airfare_quantity?: number;
  total_amount: number;
}

async function generateInvoiceNumber(db: Database): Promise<string> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `INV-${dateStr}`;

  const row = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM invoices WHERE invoice_number LIKE ?`,
    [`${prefix}%`]
  );

  const seq = (row?.cnt || 0) + 1;
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

export async function createInvoice(data: CreateInvoiceData): Promise<InvoiceRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();
  const invoiceNumber = await generateInvoiceNumber(db);
  const invoiceDate = data.invoice_date || new Date().toISOString().slice(0, 10);
  const airfareTotal = (data.airfare_unit_price || 0) * (data.airfare_quantity || 0);

  await db.run(
    `INSERT INTO invoices (id, invoice_number, recipient, invoice_date, description,
                           airfare_unit_price, airfare_quantity, airfare_total, total_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      invoiceNumber,
      data.recipient,
      invoiceDate,
      data.description || null,
      data.airfare_unit_price || 0,
      data.airfare_quantity || 0,
      airfareTotal,
      data.total_amount,
    ]
  );

  return (await getInvoiceById(id))!;
}

export async function updateInvoice(id: string, data: Record<string, unknown>): Promise<InvoiceRow | null> {
  const db = await getIntranetDb();
  const existing = await getInvoiceById(id);
  if (!existing) return null;

  const allowedFields = [
    'recipient', 'invoice_date', 'description', 'total_amount',
    'airfare_unit_price', 'airfare_quantity', 'airfare_total',
    'seat_preference_unit_price', 'seat_preference_quantity', 'seat_preference_total',
    'calculation_mode', 'base_price_per_person', 'total_participants',
    'total_travel_cost', 'deposit_amount', 'deposit_description',
    'additional_items', 'balance_due',
    'booking_id', 'settlement_id', 'flight_info', 'passenger_info', 'ticket_info',
    'bank_name', 'account_number', 'account_holder',
  ];

  const setClauses: string[] = [];
  const setValues: unknown[] = [];

  for (const field of allowedFields) {
    if (field in data) {
      setClauses.push(`${field} = ?`);
      const val = data[field];
      // Stringify JSON fields
      if (['additional_items', 'flight_info', 'passenger_info', 'ticket_info'].includes(field) && val !== null && typeof val === 'object') {
        setValues.push(JSON.stringify(val));
      } else {
        setValues.push(val ?? null);
      }
    }
  }

  if (setClauses.length === 0) return existing;

  setClauses.push("updated_at = datetime('now')");
  setValues.push(id);

  await db.run(
    `UPDATE invoices SET ${setClauses.join(', ')} WHERE id = ?`,
    setValues
  );

  return (await getInvoiceById(id))!;
}

export async function createInvoiceFromBooking(bookingId: string): Promise<InvoiceRow> {
  const db = await getIntranetDb();

  // 0. 이미 이 booking의 인보이스가 있으면 기존 것 반환
  const existing = await db.get<{ id: string }>(
    'SELECT id FROM invoices WHERE booking_id = ? LIMIT 1',
    [bookingId]
  );
  if (existing) {
    return (await getInvoiceById(existing.id))!;
  }

  // 1. Get booking with passengers and segments
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error('예약을 찾을 수 없습니다.');

  // 2. Get tickets for this booking
  const tickets = await listTicketsByBooking(bookingId);

  // 3. Generate invoice number
  const id = crypto.randomUUID();
  const invoiceNumber = await generateInvoiceNumber(db);
  const invoiceDate = new Date().toISOString().slice(0, 10);

  // 4. Build auto-populated fields
  const recipient = booking.agency || booking.name_kr || '';
  const fare = booking.fare || 0;
  const paxCount = booking.pax_count || 1;
  const totalAmount = fare * paxCount;

  // flight_info from segments (exclude internal IDs)
  const flightInfo = (booking.segments || []).map(seg => ({
    airline: seg.airline,
    flight_number: seg.flight_number,
    route_from: seg.route_from,
    route_to: seg.route_to,
    departure_date: seg.departure_date,
    departure_time: seg.departure_time || '',
    arrival_time: seg.arrival_time || '',
  }));

  // passenger_info from passengers (exclude passport_number for security, include per-person fare)
  const passengerInfo = (booking.passengers || []).map(pax => ({
    name_en: pax.name_en,
    name_kr: pax.name_kr,
    title: pax.title,
    gender: pax.gender,
    fare: fare,  // 기본값: 예약 운임 (고객별로 다르면 UI에서 수정)
  }));

  // ticket_info from tickets
  const ticketInfo = tickets.map(t => ({
    ticket_number: t.ticket_number,
    issue_date: t.issue_date,
    status: t.status,
    passenger_name: t.passenger_name,
  }));

  // 5. Insert invoice
  await db.run(
    `INSERT INTO invoices (id, invoice_number, recipient, invoice_date, description,
                           airfare_unit_price, airfare_quantity, airfare_total, total_amount,
                           base_price_per_person, total_participants,
                           booking_id, flight_info, passenger_info, ticket_info)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      invoiceNumber,
      recipient,
      invoiceDate,
      booking.remarks || null,
      fare,
      paxCount,
      totalAmount,
      totalAmount,
      fare,
      paxCount,
      bookingId,
      JSON.stringify(flightInfo),
      JSON.stringify(passengerInfo),
      JSON.stringify(ticketInfo),
    ]
  );

  return (await getInvoiceById(id))!;
}

/** 여러 예약을 합산하여 인보이스 1장 생성 */
export async function createInvoiceFromMultipleBookings(bookingIds: string[]): Promise<InvoiceRow> {
  const db = await getIntranetDb();

  const allFlightInfo: any[] = [];
  const allPassengerInfo: any[] = [];
  const allTicketInfo: any[] = [];
  let totalFare = 0;
  let totalPax = 0;
  let recipient = '';
  let description = '';

  for (const bid of bookingIds) {
    const booking = await getBookingById(bid);
    if (!booking) continue;

    const tickets = await listTicketsByBooking(bid);
    const fare = booking.fare || 0;

    if (!recipient) recipient = booking.agency || booking.name_kr || '';
    if (booking.remarks) description += (description ? '\n' : '') + `[${booking.pnr}] ${booking.remarks}`;

    // segments → flight_info
    for (const seg of (booking.segments || [])) {
      allFlightInfo.push({
        airline: seg.airline,
        flight_number: seg.flight_number,
        route_from: seg.route_from,
        route_to: seg.route_to,
        departure_date: seg.departure_date,
        departure_time: seg.departure_time || '',
        arrival_time: seg.arrival_time || '',
        pnr: booking.pnr,
      });
    }

    // passengers → passenger_info
    for (const pax of (booking.passengers || [])) {
      allPassengerInfo.push({
        name_en: pax.name_en,
        name_kr: pax.name_kr,
        title: pax.title,
        gender: pax.gender,
        fare: fare,
        pnr: booking.pnr,
      });
      totalPax++;
    }
    if ((booking.passengers || []).length === 0) {
      allPassengerInfo.push({
        name_en: booking.name_en,
        name_kr: booking.name_kr,
        title: '',
        gender: '',
        fare: fare,
        pnr: booking.pnr,
      });
      totalPax++;
    }

    totalFare += fare * (booking.pax_count || 1);

    // segments → flight_info (중복 노선 제거 — 편명+날짜 기준)
    // 이미 위에서 push했으므로 여기서는 skip (아래에서 dedupe)

    // tickets → ticket_info
    for (const t of tickets) {
      allTicketInfo.push({
        ticket_number: t.ticket_number,
        issue_date: t.issue_date,
        status: t.status,
        passenger_name: t.passenger_name,
        pnr: booking.pnr,
      });
    }
  }

  // 다중 PNR 시 동일 편명+구간+날짜 중복 제거
  const seen = new Set<string>();
  const dedupedFlightInfo = allFlightInfo.filter(f => {
    const key = `${f.flight_number}_${f.route_from}_${f.route_to}_${f.departure_date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const id = crypto.randomUUID();
  const invoiceNumber = await generateInvoiceNumber(db);
  const invoiceDate = new Date().toISOString().slice(0, 10);

  await db.run(
    `INSERT INTO invoices (id, invoice_number, recipient, invoice_date, description,
                           airfare_unit_price, airfare_quantity, airfare_total, total_amount,
                           base_price_per_person, total_participants,
                           booking_id, flight_info, passenger_info, ticket_info)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      invoiceNumber,
      recipient,
      invoiceDate,
      description || null,
      0,
      totalPax,
      totalFare,
      totalFare,
      0,
      totalPax,
      bookingIds.join(','),  // 여러 booking_id를 콤마로 저장
      JSON.stringify(dedupedFlightInfo),
      JSON.stringify(allPassengerInfo),
      JSON.stringify(allTicketInfo),
    ]
  );

  return (await getInvoiceById(id))!;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM invoices WHERE id = ?', [id]);
  return (result.changes || 0) > 0;
}
