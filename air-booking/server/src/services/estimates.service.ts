// 세부 견적서/정산서 서비스 — travel_agency.db air_estimates 테이블

import { getIntranetDb } from '../db/intranet';
import { Database } from 'sqlite';

export interface EstimateRow {
  id: string;
  doc_number: string;
  doc_type: 'estimate' | 'settlement' | 'domestic' | 'domestic_settlement' | 'delivery' | 'claim';
  recipient: string;
  subject: string;
  quote_date: string;
  valid_period: string;
  company_name: string;
  ceo_name: string;
  biz_no: string;
  phone: string;
  address: string;
  manager: string;
  email: string;
  group_name: string;
  itinerary: string;
  travel_date: string;
  pax_size: number;
  leader: string;
  guide: string;
  conditions: string;
  room_style: string;
  currency: string;
  exchange_rate: number;
  rate_date: string;
  rate_source: string;
  sections_json: any;
  flight_included: number;
  commission: number;
  grand_total: number;
  per_person: number;
  notices_json: any;
  status: string;
  created_at: string;
  updated_at: string;
  // 납품확인서/대금청구서 전용
  contract_number: string;
  contract_date: string;
  contract_name: string;
  service_period: string;
  service_location: string;
  completion_date: string;
  student_count: number;
  teacher_count: number;
  escort_count: number;
  supply_amount: number;
  vat_amount: number;
  amount_korean: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  seal_image: string;
  institution_name: string;
  department: string;
  contact_person: string;
  sign_date: string;
  sign_supplier: string;
  attachments_json: any;
}

function parseJsonFields(row: EstimateRow): EstimateRow {
  try { if (row.sections_json) row.sections_json = JSON.parse(row.sections_json); } catch { row.sections_json = {}; }
  try { if (row.attachments_json) row.attachments_json = JSON.parse(row.attachments_json); } catch { row.attachments_json = []; }
  try { if (row.notices_json) row.notices_json = JSON.parse(row.notices_json); } catch { row.notices_json = []; }
  return row;
}

export async function listEstimates(params: {
  search?: string;
  doc_type?: string;
  page?: number;
  limit?: number;
}): Promise<{ estimates: EstimateRow[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    conditions.push('(recipient LIKE ? OR doc_number LIKE ? OR group_name LIKE ? OR subject LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term, term);
  }
  if (params.doc_type) {
    if (params.doc_type === 'domestic') {
      conditions.push("doc_type IN ('domestic','domestic_settlement')");
    } else if (params.doc_type === 'estimate') {
      conditions.push("doc_type IN ('estimate','settlement')");
    } else if (params.doc_type === 'delivery') {
      conditions.push("doc_type IN ('delivery','claim')");
    } else {
      conditions.push('doc_type = ?');
      values.push(params.doc_type);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 50, 100);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM air_estimates ${where}`, values
  );

  const estimates = await db.all<EstimateRow[]>(
    `SELECT * FROM air_estimates ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return { estimates: estimates.map(parseJsonFields), total: countRow?.cnt || 0 };
}

export async function getEstimateById(id: string): Promise<EstimateRow | undefined> {
  const db = await getIntranetDb();
  const row = await db.get<EstimateRow>('SELECT * FROM air_estimates WHERE id = ?', [id]);
  if (!row) return undefined;
  return parseJsonFields(row);
}

async function generateDocNumber(db: Database, docType: string): Promise<string> {
  const prefix = docType === 'settlement' ? 'STL' : docType === 'domestic_settlement' ? 'DSTL' : docType === 'domestic' ? 'DOM' : docType === 'delivery' ? 'DLV' : docType === 'claim' ? 'CLM' : 'EST';
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const full = `${prefix}-${dateStr}`;

  const row = await db.get<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM air_estimates WHERE doc_number LIKE ?',
    [`${full}%`]
  );
  const seq = (row?.cnt || 0) + 1;
  return `${full}-${String(seq).padStart(3, '0')}`;
}

export async function createEstimate(data: Record<string, any>): Promise<EstimateRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();
  const docType = data.doc_type || 'estimate';
  const docNumber = await generateDocNumber(db, docType);
  const quoteDate = data.quote_date || new Date().toISOString().slice(0, 10);

  await db.run(
    `INSERT INTO air_estimates (
      id, doc_number, doc_type, recipient, subject, quote_date, valid_period,
      company_name, ceo_name, biz_no, phone, address, manager, email,
      group_name, itinerary, travel_date, pax_size, leader, guide,
      conditions, room_style, currency, exchange_rate, rate_date, rate_source,
      sections_json, flight_included, commission, grand_total, per_person, notices_json, status,
      contract_number, contract_date, contract_name, service_period, service_location, completion_date,
      student_count, teacher_count, escort_count, supply_amount, vat_amount, amount_korean, manual_taxable, manual_vat,
      bank_name, account_number, account_holder, seal_image, institution_name, department, contact_person,
      sign_date, sign_supplier, attachments_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?)`,
    [
      id, docNumber, docType,
      data.recipient || '', data.subject || '', quoteDate, data.valid_period || '견적일로부터 30일',
      data.company_name || '', data.ceo_name || '', data.biz_no || '',
      data.phone || '', data.address || '', data.manager || '', data.email || '',
      data.group_name || '', data.itinerary || '', data.travel_date || '',
      data.pax_size || 1, data.leader || '', data.guide || '',
      data.conditions || '', data.room_style || '',
      data.currency || 'JPY', data.exchange_rate || 9.8,
      data.rate_date || '', data.rate_source || '하나은행 고시환율',
      typeof data.sections_json === 'string' ? data.sections_json : JSON.stringify(data.sections_json || {}),
      data.flight_included ? 1 : 0,
      data.commission || 0, data.grand_total || 0, data.per_person || 0,
      typeof data.notices_json === 'string' ? data.notices_json : JSON.stringify(data.notices_json || []),
      data.status || 'draft',
      data.contract_number || '', data.contract_date || '', data.contract_name || '',
      data.service_period || '', data.service_location || '', data.completion_date || '',
      data.student_count || 0, data.teacher_count || 0, data.escort_count || 0,
      data.supply_amount || 0, data.vat_amount || 0, data.amount_korean || '', data.manual_taxable ?? null, data.manual_vat ?? null,
      data.bank_name || '', data.account_number || '', data.account_holder || '',
      data.seal_image || '', data.institution_name || '', data.department || '', data.contact_person || '',
      data.sign_date || '', data.sign_supplier || '',
      typeof data.attachments_json === 'string' ? data.attachments_json : JSON.stringify(data.attachments_json || []),
    ]
  );

  return (await getEstimateById(id))!;
}

export async function updateEstimate(id: string, data: Record<string, any>): Promise<EstimateRow | null> {
  const db = await getIntranetDb();
  const existing = await getEstimateById(id);
  if (!existing) return null;

  const allowedFields = [
    'doc_type', 'recipient', 'subject', 'quote_date', 'valid_period',
    'company_name', 'ceo_name', 'biz_no', 'phone', 'address', 'manager', 'email',
    'group_name', 'itinerary', 'travel_date', 'pax_size', 'leader', 'guide',
    'conditions', 'room_style', 'currency', 'exchange_rate', 'rate_date', 'rate_source',
    'sections_json', 'flight_included', 'commission', 'grand_total', 'per_person', 'notices_json', 'status',
    'contract_number', 'contract_date', 'contract_name', 'service_period', 'service_location', 'completion_date',
    'student_count', 'teacher_count', 'escort_count', 'supply_amount', 'vat_amount', 'amount_korean', 'manual_taxable', 'manual_vat',
    'bank_name', 'account_number', 'account_holder', 'seal_image', 'institution_name', 'department', 'contact_person',
    'sign_date', 'sign_supplier', 'attachments_json',
  ];

  const setClauses: string[] = [];
  const setValues: unknown[] = [];

  for (const field of allowedFields) {
    if (field in data) {
      setClauses.push(`${field} = ?`);
      const val = data[field];
      if (['sections_json', 'notices_json', 'attachments_json'].includes(field) && val !== null && typeof val === 'object') {
        setValues.push(JSON.stringify(val));
      } else if (field === 'flight_included') {
        setValues.push(val ? 1 : 0);
      } else {
        setValues.push(val ?? null);
      }
    }
  }

  if (setClauses.length === 0) return existing;

  setClauses.push("updated_at = datetime('now')");
  setValues.push(id);

  await db.run(
    `UPDATE air_estimates SET ${setClauses.join(', ')} WHERE id = ?`,
    setValues
  );

  return (await getEstimateById(id))!;
}

export async function deleteEstimate(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM air_estimates WHERE id = ?', [id]);
  return (result.changes || 0) > 0;
}
