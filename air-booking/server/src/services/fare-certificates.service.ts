// @TASK fare-certificates - 항공운임증명서 서비스
// @SPEC air_fare_certificates 테이블 CRUD + 재발행 + 번호 생성

import { getIntranetDb } from '../db/intranet';
import { Database } from 'sqlite';

export interface FareCertificateRow {
  id: string;
  cert_number: string;
  booking_id: string;
  flight_schedule_id: string | null;
  recipient: string;
  issue_date: string;
  traveler_name: string;
  cabin_class: string;
  route_description: string;
  ticket_period_start: string | null;
  ticket_period_end: string | null;
  pax_count: number;
  base_fare_per_person: number;
  tax_per_person: number;
  total_fare: number;
  total_tax: number;
  total_amount: number;
  segments_json: string;
  status: string;
  created_at: string;
  updated_at: string;
  // JOIN fields
  pnr?: string;
  group_name?: string;
}

const SELECT_COLUMNS = `
  fc.id, fc.cert_number, fc.booking_id, fc.flight_schedule_id, fc.recipient, fc.issue_date,
  fc.traveler_name, fc.cabin_class, fc.route_description,
  fc.ticket_period_start, fc.ticket_period_end, fc.pax_count,
  fc.base_fare_per_person, fc.tax_per_person,
  fc.total_fare, fc.total_tax, fc.total_amount,
  fc.segments_json, fc.status, fc.created_at, fc.updated_at
`.trim();

/**
 * 증명서 번호 생성: YY-NNN (예: 26-001)
 * 해당 연도의 마지막 번호를 조회하여 +1
 */
async function generateCertNumber(db: Database): Promise<string> {
  const yearPrefix = String(new Date().getFullYear()).slice(-2);
  const pattern = `${yearPrefix}-%`;

  const row = await db.get<{ max_num: string | null }>(
    `SELECT cert_number as max_num FROM air_fare_certificates
     WHERE cert_number LIKE ?
     ORDER BY cert_number DESC LIMIT 1`,
    [pattern]
  );

  let seq = 1;
  if (row?.max_num) {
    const parts = row.max_num.split('-');
    const lastSeq = parseInt(parts[1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${yearPrefix}-${String(seq).padStart(3, '0')}`;
}

export async function listFareCertificates(params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ certificates: FareCertificateRow[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    conditions.push('(fc.recipient LIKE ? OR fc.cert_number LIKE ? OR fc.traveler_name LIKE ? OR b.pnr LIKE ? OR fs.group_name LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term, term, term);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 50, 100);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM air_fare_certificates fc
     LEFT JOIN air_bookings b ON fc.booking_id = b.id
     LEFT JOIN flight_schedules fs ON fc.flight_schedule_id = fs.id
     ${where}`,
    values
  );

  const certificates = await db.all<FareCertificateRow[]>(
    `SELECT ${SELECT_COLUMNS}, b.pnr, fs.group_name
     FROM air_fare_certificates fc
     LEFT JOIN air_bookings b ON fc.booking_id = b.id
     LEFT JOIN flight_schedules fs ON fc.flight_schedule_id = fs.id
     ${where}
     ORDER BY fc.created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return { certificates, total: countRow?.cnt || 0 };
}

export async function getFareCertificateById(id: string): Promise<FareCertificateRow | undefined> {
  const db = await getIntranetDb();
  const row = await db.get<FareCertificateRow>(
    `SELECT ${SELECT_COLUMNS}, b.pnr, fs.group_name
     FROM air_fare_certificates fc
     LEFT JOIN air_bookings b ON fc.booking_id = b.id
     LEFT JOIN flight_schedules fs ON fc.flight_schedule_id = fs.id
     WHERE fc.id = ?`,
    [id]
  );
  return row || undefined;
}

export interface CreateFareCertificateData {
  booking_id?: string;
  flight_schedule_id?: string;
  recipient: string;
  issue_date?: string;
  traveler_name?: string;
  cabin_class?: string;
  route_description?: string;
  ticket_period_start?: string | null;
  ticket_period_end?: string | null;
  pax_count?: number;
  base_fare_per_person?: number;
  tax_per_person?: number;
  total_fare?: number;
  total_tax?: number;
  total_amount?: number;
  segments_json?: string;
}

export async function createFareCertificate(data: CreateFareCertificateData): Promise<FareCertificateRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();
  const certNumber = await generateCertNumber(db);
  const issueDate = data.issue_date || new Date().toISOString().slice(0, 10);

  const paxCount = data.pax_count || 1;
  const baseFare = data.base_fare_per_person || 0;
  const taxPer = data.tax_per_person || 0;
  const totalFare = data.total_fare ?? baseFare * paxCount;
  const totalTax = data.total_tax ?? taxPer * paxCount;
  const totalAmount = data.total_amount ?? totalFare + totalTax;

  await db.run(
    `INSERT INTO air_fare_certificates
     (id, cert_number, booking_id, flight_schedule_id, recipient, issue_date,
      traveler_name, cabin_class, route_description,
      ticket_period_start, ticket_period_end, pax_count,
      base_fare_per_person, tax_per_person,
      total_fare, total_tax, total_amount, segments_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      certNumber,
      data.booking_id || null,
      data.flight_schedule_id || null,
      data.recipient,
      issueDate,
      data.traveler_name || '',
      data.cabin_class || '',
      data.route_description || '',
      data.ticket_period_start || null,
      data.ticket_period_end || null,
      paxCount,
      baseFare,
      taxPer,
      totalFare,
      totalTax,
      totalAmount,
      data.segments_json || '[]',
    ]
  );

  return (await getFareCertificateById(id))!;
}

/**
 * 재발행: 기존 증명서를 cancelled로 변경하고, 동일 데이터로 새 증명서 생성 (발행일 오늘)
 */
export async function reissueFareCertificate(id: string): Promise<FareCertificateRow | null> {
  const db = await getIntranetDb();
  const existing = await getFareCertificateById(id);
  if (!existing) return null;

  // 기존 증명서를 cancelled 처리
  await db.run(
    `UPDATE air_fare_certificates SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
    [id]
  );

  // 새 증명서 생성 (기존 데이터 복사, 발행일 오늘)
  const newCert = await createFareCertificate({
    booking_id: existing.booking_id || undefined,
    flight_schedule_id: existing.flight_schedule_id || undefined,
    recipient: existing.recipient,
    issue_date: new Date().toISOString().slice(0, 10),
    traveler_name: existing.traveler_name,
    cabin_class: existing.cabin_class,
    route_description: existing.route_description,
    ticket_period_start: existing.ticket_period_start,
    ticket_period_end: existing.ticket_period_end,
    pax_count: existing.pax_count,
    base_fare_per_person: existing.base_fare_per_person,
    tax_per_person: existing.tax_per_person,
    total_fare: existing.total_fare,
    total_tax: existing.total_tax,
    total_amount: existing.total_amount,
    segments_json: existing.segments_json,
  });

  // 새 증명서의 status를 reissued로 설정
  await db.run(
    `UPDATE air_fare_certificates SET status = 'reissued', updated_at = datetime('now') WHERE id = ?`,
    [newCert.id]
  );

  return (await getFareCertificateById(newCert.id))!;
}

export async function deleteFareCertificate(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM air_fare_certificates WHERE id = ?', [id]);
  return (result.changes || 0) > 0;
}

export async function getByScheduleId(scheduleId: string): Promise<FareCertificateRow[]> {
  const db = await getIntranetDb();
  const rows = await db.all<FareCertificateRow[]>(
    `SELECT ${SELECT_COLUMNS}, b.pnr, fs.group_name
     FROM air_fare_certificates fc
     LEFT JOIN air_bookings b ON fc.booking_id = b.id
     LEFT JOIN flight_schedules fs ON fc.flight_schedule_id = fs.id
     WHERE fc.flight_schedule_id = ?
     ORDER BY fc.created_at DESC`,
    [scheduleId]
  );
  return rows;
}

export async function getByBookingId(bookingId: string): Promise<FareCertificateRow[]> {
  const db = await getIntranetDb();
  const rows = await db.all<FareCertificateRow[]>(
    `SELECT ${SELECT_COLUMNS}, b.pnr, fs.group_name
     FROM air_fare_certificates fc
     LEFT JOIN air_bookings b ON fc.booking_id = b.id
     LEFT JOIN flight_schedules fs ON fc.flight_schedule_id = fs.id
     WHERE fc.booking_id = ?
     ORDER BY fc.created_at DESC`,
    [bookingId]
  );
  return rows;
}
