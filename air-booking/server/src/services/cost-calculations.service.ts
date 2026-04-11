// 원가 계산서 서비스 — travel_agency.db의 cost_calculations 테이블 직접 조회

import { getIntranetDb } from '../db/intranet';

export interface CostCalculationRow {
  id: number;
  code: string;
  name: string;
  destination: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  nights: number | null;
  days: number | null;
  adults: number;
  children: number;
  infants: number;
  tc: number;
  domestic_vehicle_type: string | null;
  domestic_vehicle_total: number;
  flight_data: string | null;
  etc_costs: string | null;
  land_cost_1: string | null;
  land_cost_2: string | null;
  margin_amount_1: number;
  margin_amount_2: number;
  notes_1: string | null;
  notes_2: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostCalculationListItem {
  id: number;
  code: string;
  name: string;
  destination: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  nights: number | null;
  days: number | null;
  adults: number;
  children: number;
  infants: number;
  tc: number;
  created_at: string;
  updated_at: string;
}

export interface CostCalculationListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export async function listCostCalculations(params: CostCalculationListParams): Promise<{ items: CostCalculationListItem[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    conditions.push('(name LIKE ? OR code LIKE ? OR destination LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 50, 100);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM cost_calculations ${where}`, values
  );

  const items = await db.all<CostCalculationListItem[]>(
    `SELECT id, code, name, destination, departure_date, arrival_date,
            nights, days, adults, children, infants, tc, created_at, updated_at
     FROM cost_calculations ${where}
     ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return { items, total: countRow?.cnt || 0 };
}

export async function getCostCalculationById(id: number): Promise<CostCalculationRow | null> {
  const db = await getIntranetDb();
  const row = await db.get<CostCalculationRow>(
    'SELECT * FROM cost_calculations WHERE id = ?', [id]
  );
  if (!row) return null;

  // Parse JSON fields
  try { if (row.flight_data) row.flight_data = JSON.parse(row.flight_data as string); } catch { row.flight_data = null; }
  try { if (row.etc_costs) row.etc_costs = JSON.parse(row.etc_costs as string); } catch { row.etc_costs = null; }
  try { if (row.land_cost_1) row.land_cost_1 = JSON.parse(row.land_cost_1 as string); } catch { row.land_cost_1 = null; }
  try { if (row.land_cost_2) row.land_cost_2 = JSON.parse(row.land_cost_2 as string); } catch { row.land_cost_2 = null; }

  return row;
}

export interface CreateCostCalculationData {
  code?: string;
  name: string;
  destination?: string;
  departure_date?: string;
  arrival_date?: string;
  nights?: number;
  days?: number;
  adults?: number;
  children?: number;
  infants?: number;
  tc?: number;
  domestic_vehicle_type?: string;
  domestic_vehicle_total?: number;
  flight_data?: unknown;
  etc_costs?: unknown;
  land_cost_1?: unknown;
  land_cost_2?: unknown;
  margin_amount_1?: number;
  margin_amount_2?: number;
  notes_1?: string;
  notes_2?: string;
}

async function generateCode(db: Awaited<ReturnType<typeof getIntranetDb>>): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `COST-${year}-${month}-`;

  const rows = await db.all<{ code: string }[]>(
    'SELECT code FROM cost_calculations WHERE code LIKE ? ORDER BY code DESC',
    [`${prefix}%`]
  );

  let nextNumber = 1;
  if (rows.length > 0) {
    const numbers = rows.map(r => {
      const parts = r.code.split('-');
      return parseInt(parts[3]) || 0;
    });
    nextNumber = Math.max(...numbers) + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

export async function createOrUpdateCostCalculation(data: CreateCostCalculationData): Promise<CostCalculationRow> {
  const db = await getIntranetDb();

  const flightData = data.flight_data ? JSON.stringify(data.flight_data) : null;
  const etcCosts = data.etc_costs ? JSON.stringify(data.etc_costs) : null;
  const landCost1 = data.land_cost_1 ? JSON.stringify(data.land_cost_1) : null;
  const landCost2 = data.land_cost_2 ? JSON.stringify(data.land_cost_2) : null;

  const params = [
    data.name, data.destination ?? null, data.departure_date ?? null, data.arrival_date ?? null,
    data.nights ?? null, data.days ?? null, data.adults ?? 0, data.children ?? 0, data.infants ?? 0, data.tc ?? 0,
    data.domestic_vehicle_type ?? null, data.domestic_vehicle_total ?? 0,
    flightData, etcCosts, landCost1, landCost2,
    data.margin_amount_1 ?? 0, data.margin_amount_2 ?? 0, data.notes_1 ?? null, data.notes_2 ?? null,
  ];

  if (data.code) {
    const existing = await db.get<{ id: number }>('SELECT id FROM cost_calculations WHERE code = ?', [data.code]);

    if (existing) {
      await db.run(
        `UPDATE cost_calculations SET
          name = ?, destination = ?, departure_date = ?, arrival_date = ?,
          nights = ?, days = ?, adults = ?, children = ?, infants = ?, tc = ?,
          domestic_vehicle_type = ?, domestic_vehicle_total = ?,
          flight_data = ?, etc_costs = ?, land_cost_1 = ?, land_cost_2 = ?,
          margin_amount_1 = ?, margin_amount_2 = ?, notes_1 = ?, notes_2 = ?,
          updated_at = datetime('now','localtime')
        WHERE code = ?`,
        [...params, data.code]
      );
      return (await getCostCalculationById(existing.id))!;
    }

    await db.run(
      `INSERT INTO cost_calculations (
        code, name, destination, departure_date, arrival_date,
        nights, days, adults, children, infants, tc,
        domestic_vehicle_type, domestic_vehicle_total,
        flight_data, etc_costs, land_cost_1, land_cost_2,
        margin_amount_1, margin_amount_2, notes_1, notes_2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.code, ...params]
    );

    const created = await db.get<{ id: number }>('SELECT id FROM cost_calculations WHERE code = ?', [data.code]);
    return (await getCostCalculationById(created!.id))!;
  }

  // Auto-generate code
  const code = await generateCode(db);
  await db.run(
    `INSERT INTO cost_calculations (
      code, name, destination, departure_date, arrival_date,
      nights, days, adults, children, infants, tc,
      domestic_vehicle_type, domestic_vehicle_total,
      flight_data, etc_costs, land_cost_1, land_cost_2,
      margin_amount_1, margin_amount_2, notes_1, notes_2
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, ...params]
  );

  const created = await db.get<{ id: number }>('SELECT id FROM cost_calculations WHERE code = ?', [code]);
  return (await getCostCalculationById(created!.id))!;
}

export async function deleteCostCalculation(id: number): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM cost_calculations WHERE id = ?', [id]);
  return (result.changes || 0) > 0;
}
