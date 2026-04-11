// @TASK P5 - Settlements Service (인트라넷 DB 직접 연결)
// @SPEC travel_agency.db의 air_settlements 테이블 직접 조회/수정

import { getIntranetDb } from '../db/intranet';

export interface SettlementRow {
  id: string;
  booking_id: string;
  vendor_id: string | null;
  payment_type: string | null;
  amount: number | null;
  status: string;
  payment_date: string | null;
  remarks: string | null;
  created_at: string;
}

export interface SettlementListParams {
  status?: string;
  booking_id?: string;
  page?: number;
  limit?: number;
}

export async function listSettlements(params: SettlementListParams): Promise<{ settlements: SettlementRow[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.status) {
    conditions.push('status = ?');
    values.push(params.status);
  }
  if (params.booking_id) {
    conditions.push('booking_id = ?');
    values.push(params.booking_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 50, 100);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM air_settlements ${where}`, values
  );

  const settlements = await db.all<SettlementRow[]>(
    `SELECT id, booking_id, vendor_id, payment_type, amount, status, payment_date, remarks, created_at
     FROM air_settlements ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return { settlements, total: countRow?.cnt || 0 };
}

export async function getSettlementById(id: string): Promise<SettlementRow | undefined> {
  const db = await getIntranetDb();
  return db.get<SettlementRow>(
    `SELECT id, booking_id, vendor_id, payment_type, amount, status, payment_date, remarks, created_at
     FROM air_settlements WHERE id = ?`, [id]
  );
}

export interface CreateSettlementData {
  booking_id: string;
  vendor_id?: string | null;
  payment_type?: string;
  amount?: number;
  status?: string;
  payment_date?: string;
  remarks?: string;
}

export async function createSettlement(data: CreateSettlementData): Promise<SettlementRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();

  await db.run(
    `INSERT INTO air_settlements (id, booking_id, vendor_id, payment_type, amount, status, payment_date, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.booking_id,
      data.vendor_id ?? null,
      data.payment_type ?? null,
      data.amount ?? null,
      data.status || 'unpaid',
      data.payment_date ?? null,
      data.remarks ?? null,
    ]
  );

  return (await getSettlementById(id))!;
}

export async function updateSettlement(
  id: string,
  data: Partial<Omit<CreateSettlementData, 'booking_id'>>
): Promise<SettlementRow | null> {
  const db = await getIntranetDb();
  const existing = await getSettlementById(id);
  if (!existing) return null;

  const updatableFields = ['vendor_id', 'payment_type', 'amount', 'status', 'payment_date', 'remarks'] as const;
  const setClauses: string[] = [];
  const setValues: unknown[] = [];

  for (const field of updatableFields) {
    if (field in data) {
      setClauses.push(`${field} = ?`);
      setValues.push((data as Record<string, unknown>)[field] ?? null);
    }
  }

  if (setClauses.length === 0) return existing;
  setValues.push(id);

  await db.run(
    `UPDATE air_settlements SET ${setClauses.join(', ')} WHERE id = ?`,
    setValues
  );

  return (await getSettlementById(id))!;
}
