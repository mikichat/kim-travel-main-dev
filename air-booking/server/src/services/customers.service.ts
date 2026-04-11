// @TASK P5 - Customers Service (인트라넷 DB 직접 연결)
// @SPEC travel_agency.db의 customers 테이블 직접 조회/수정

import { getIntranetDb } from '../db/intranet';

export interface CustomerRow {
  id: string;
  name_kr: string | null;
  name_en: string | null;
  phone: string | null;
  email: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  birth_date: string | null;
  gender: string | null;
  remarks: string | null;
  group_name: string | null;
  travel_region: string | null;
  created_at: string;
}

interface IntranetRow {
  id: string;
  name_kor: string;
  name_eng: string;
  phone: string;
  email: string | null;
  passport_number: string;
  passport_expiry: string;
  birth_date: string;
  gender: string | null;
  notes: string | null;
  group_name: string | null;
  travel_region: string | null;
  created_at: string;
}

function mapRow(row: IntranetRow): CustomerRow {
  return {
    id: row.id,
    name_kr: row.name_kor || null,
    name_en: row.name_eng || null,
    phone: row.phone || null,
    email: row.email || null,
    passport_number: row.passport_number || null,
    passport_expiry: row.passport_expiry || null,
    birth_date: row.birth_date || null,
    gender: row.gender || null,
    remarks: row.notes || null,
    group_name: row.group_name || null,
    travel_region: row.travel_region || null,
    created_at: row.created_at || '',
  };
}

export interface CustomerListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export async function listCustomers(params: CustomerListParams): Promise<{ customers: CustomerRow[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = ['is_active = 1'];
  const values: unknown[] = [];

  if (params.search) {
    conditions.push('(name_kor LIKE ? OR name_eng LIKE ? OR passport_number LIKE ? OR phone LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term, term);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(params.limit || 50, 200);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM customers ${where}`, values
  );

  const rows = await db.all<IntranetRow[]>(
    `SELECT id, name_kor, name_eng, phone, email, passport_number, passport_expiry,
            birth_date, gender, notes, group_name, travel_region, created_at
     FROM customers ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return { customers: rows.map(mapRow), total: countRow?.cnt || 0 };
}

export async function getCustomerById(id: string): Promise<CustomerRow | undefined> {
  const db = await getIntranetDb();
  const row = await db.get<IntranetRow>(
    `SELECT id, name_kor, name_eng, phone, email, passport_number, passport_expiry,
            birth_date, gender, notes, group_name, travel_region, created_at
     FROM customers WHERE id = ?`, [id]
  );
  return row ? mapRow(row) : undefined;
}

export async function getCustomerWithBookings(id: string) {
  const customer = await getCustomerById(id);
  if (!customer) return null;

  // Air Booking 예약 이력: 이름 기반 매칭 (인트라넷 DB의 air_bookings 테이블)
  const db = await getIntranetDb();
  const bookings = await db.all(
    `SELECT id, pnr, airline, flight_number, route_from, route_to, departure_date, status
     FROM air_bookings WHERE name_en LIKE ? OR name_kr LIKE ? ORDER BY created_at DESC`,
    [`%${customer.name_en || '###NOMATCH###'}%`, `%${customer.name_kr || '###NOMATCH###'}%`]
  );

  return { customer, bookings };
}

export interface CreateCustomerData {
  name_kr?: string;
  name_en?: string;
  phone?: string;
  email?: string;
  passport_number?: string;
  passport_expiry?: string;
  birth_date?: string;
  gender?: string;
  remarks?: string;
}

export async function createCustomer(data: CreateCustomerData): Promise<CustomerRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();

  await db.run(
    `INSERT INTO customers (id, name_kor, name_eng, phone, email, passport_number, passport_expiry, birth_date, gender, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name_kr || '',
      data.name_en || '',
      data.phone || '',
      data.email || null,
      data.passport_number || '',
      data.passport_expiry || '',
      data.birth_date || '',
      data.gender || null,
      data.remarks || null,
    ]
  );

  return (await getCustomerById(id))!;
}

export async function updateCustomer(id: string, data: Partial<CreateCustomerData>): Promise<CustomerRow | null> {
  const db = await getIntranetDb();
  const existing = await getCustomerById(id);
  if (!existing) return null;

  // Air Booking 필드명 → 인트라넷 필드명 매핑
  const fieldMap: Record<string, string> = {
    name_kr: 'name_kor',
    name_en: 'name_eng',
    phone: 'phone',
    email: 'email',
    passport_number: 'passport_number',
    passport_expiry: 'passport_expiry',
    birth_date: 'birth_date',
    gender: 'gender',
    remarks: 'notes',
  };

  const setClauses: string[] = [];
  const setValues: unknown[] = [];

  for (const [airField, dbField] of Object.entries(fieldMap)) {
    if (airField in data) {
      setClauses.push(`${dbField} = ?`);
      setValues.push((data as Record<string, unknown>)[airField] ?? null);
    }
  }

  if (setClauses.length === 0) return existing;

  setClauses.push("last_modified = datetime('now','localtime')");
  setValues.push(id);

  await db.run(
    `UPDATE customers SET ${setClauses.join(', ')} WHERE id = ?`,
    setValues
  );

  return (await getCustomerById(id))!;
}
