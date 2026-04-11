// @TASK P5 - Vendors Service (인트라넷 DB 공유 모듈 사용)
// @SPEC travel_agency.db의 air_vendors 테이블 직접 조회/수정

import { getIntranetDb } from '../db/intranet';

export interface VendorRow {
  id: string;
  name: string;
  type: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  remarks: string | null;
  created_at: string;
}

export interface VendorListParams {
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listVendors(params: VendorListParams): Promise<{ vendors: VendorRow[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.type) {
    conditions.push('type = ?');
    values.push(params.type);
  }
  if (params.search) {
    conditions.push('(name LIKE ? OR contact_name LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 50, 100);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM air_vendors ${where}`, values
  );

  const vendors = await db.all<VendorRow[]>(
    `SELECT id, name, type, contact_name, phone, email, remarks, created_at
     FROM air_vendors ${where}
     ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return { vendors, total: countRow?.cnt || 0 };
}

export async function getVendorById(id: string): Promise<VendorRow | undefined> {
  const db = await getIntranetDb();
  return db.get<VendorRow>(
    `SELECT id, name, type, contact_name, phone, email, remarks, created_at
     FROM air_vendors WHERE id = ?`, [id]
  );
}

export interface CreateVendorData {
  name: string;
  type?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  remarks?: string;
}

export async function createVendor(data: CreateVendorData): Promise<VendorRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();

  await db.run(
    `INSERT INTO air_vendors (id, name, type, contact_name, phone, email, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.type ?? null,
      data.contact_name ?? null,
      data.phone ?? null,
      data.email ?? null,
      data.remarks ?? null,
    ]
  );

  return (await getVendorById(id))!;
}

export async function updateVendor(
  id: string,
  data: Partial<CreateVendorData>
): Promise<VendorRow | null> {
  const db = await getIntranetDb();
  const existing = await getVendorById(id);
  if (!existing) return null;

  const updatableFields = ['name', 'type', 'contact_name', 'phone', 'email', 'remarks'] as const;
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
    `UPDATE air_vendors SET ${setClauses.join(', ')} WHERE id = ?`,
    setValues
  );

  return (await getVendorById(id))!;
}

export async function deleteVendor(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM air_vendors WHERE id = ?', [id]);
  return (result.changes || 0) > 0;
}
