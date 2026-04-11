// @TASK fare-certificates - 항공운임증명서 라우터
// @SPEC GET/POST/DELETE /api/fare-certificates

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth';
import { airportToCity } from '../utils/airport-codes';

/** 직인 이미지를 Base64 Data URI로 로드 (서버 시작 시 1회) */
let sealDataUri = '';
try {
  const sealPath = path.join(__dirname, '../../public/seal.jpg');
  const sealBuf = fs.readFileSync(sealPath);
  sealDataUri = `data:image/jpeg;base64,${sealBuf.toString('base64')}`;
} catch {
  // 직인 파일 없으면 빈 문자열
}
import {
  listFareCertificates,
  getFareCertificateById,
  createFareCertificate,
  reissueFareCertificate,
  deleteFareCertificate,
  getByBookingId,
  getByScheduleId,
  FareCertificateRow,
  CreateFareCertificateData,
} from '../services/fare-certificates.service';

export const fareCertificatesRouter = Router();
fareCertificatesRouter.use(requireAuth);

// GET /api/fare-certificates
fareCertificatesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, page, limit } = req.query;
    const result = await listFareCertificates({
      search: search as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: '운임증명서 목록 조회 실패' });
  }
});

// GET /api/fare-certificates/by-booking/:bookingId
// NOTE: 이 라우트는 /:id 보다 먼저 정의해야 함
fareCertificatesRouter.get('/by-booking/:bookingId', async (req: Request, res: Response) => {
  try {
    const certificates = await getByBookingId(req.params.bookingId);
    res.json({ success: true, data: { certificates } });
  } catch (err) {
    res.status(500).json({ success: false, error: '예약별 운임증명서 조회 실패' });
  }
});

// GET /api/fare-certificates/by-schedule/:scheduleId
fareCertificatesRouter.get('/by-schedule/:scheduleId', async (req: Request, res: Response) => {
  try {
    const certificates = await getByScheduleId(req.params.scheduleId);
    res.json({ success: true, data: { certificates } });
  } catch (err) {
    res.status(500).json({ success: false, error: '스케줄별 운임증명서 조회 실패' });
  }
});

// GET /api/fare-certificates/quotations — 견적서 목록 (/:id 보다 먼저!)
fareCertificatesRouter.get('/quotations', async (req: Request, res: Response) => {
  try {
    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();
    const { search, page = '1', limit = '50' } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 50, 100);
    const offset = (pageNum - 1) * limitNum;

    let where = '';
    const values: unknown[] = [];
    if (search) {
      where = `WHERE recipient LIKE ? OR quotation_number LIKE ? OR traveler_name LIKE ?`;
      const term = `%${search}%`;
      values.push(term, term, term);
    }

    const total = await db.get<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM air_quotations ${where}`, values);
    const quotations = await db.all(
      `SELECT id, quotation_number, recipient, issue_date, valid_until, pax_count, total_amount, status, created_at
       FROM air_quotations ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, limitNum, offset]
    );

    res.json({ success: true, data: { quotations, total: total?.cnt || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, error: '견적서 목록 조회 실패' });
  }
});

// GET /api/fare-certificates/quotation/detail/:id — 견적서 상세 (JSON)
fareCertificatesRouter.get('/quotation/detail/:id', async (req: Request, res: Response) => {
  try {
    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();
    const row = await db.get<any>('SELECT * FROM air_quotations WHERE id = ?', [req.params.id]);
    if (!row) { res.status(404).json({ success: false, error: '견적서를 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { quotation: row } });
  } catch (err) {
    res.status(500).json({ success: false, error: '견적서 상세 조회 실패' });
  }
});

// GET /api/fare-certificates/:id
fareCertificatesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const cert = await getFareCertificateById(req.params.id);
    if (!cert) {
      res.status(404).json({ success: false, error: '운임증명서를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { certificate: cert } });
  } catch (err) {
    res.status(500).json({ success: false, error: '운임증명서 조회 실패' });
  }
});

const createCertSchema = z.object({
  booking_id: z.string().min(1, '예약 ID는 필수입니다.'),
  recipient: z.string().min(1, '수신인은 필수입니다.').max(100, '수신인은 100자 이내여야 합니다.'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD').optional(),
  traveler_name: z.string().optional(),
  cabin_class: z.string().optional(),
  route_description: z.string().optional(),
  ticket_period_start: z.string().nullable().optional(),
  ticket_period_end: z.string().nullable().optional(),
  pax_count: z.number().int().min(1).optional(),
  base_fare_per_person: z.number().min(0).optional(),
  tax_per_person: z.number().min(0).optional(),
  total_fare: z.number().min(0).optional(),
  total_tax: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  segments_json: z.string().optional(),
});

// POST /api/fare-certificates
fareCertificatesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createCertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const cert = await createFareCertificate(parsed.data as CreateFareCertificateData);
    res.status(201).json({ success: true, data: { certificate: cert } });
  } catch (err) {
    res.status(500).json({ success: false, error: '운임증명서 생성 실패' });
  }
});

// POST /api/fare-certificates/:id/reissue
fareCertificatesRouter.post('/:id/reissue', async (req: Request, res: Response) => {
  try {
    const cert = await reissueFareCertificate(req.params.id);
    if (!cert) {
      res.status(404).json({ success: false, error: '운임증명서를 찾을 수 없습니다.' });
      return;
    }
    res.status(201).json({ success: true, data: { certificate: cert } });
  } catch (err) {
    res.status(500).json({ success: false, error: '운임증명서 재발행 실패' });
  }
});

// DELETE /api/fare-certificates/:id
fareCertificatesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteFareCertificate(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: '운임증명서를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '삭제되었습니다.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: '운임증명서 삭제 실패' });
  }
});

// GET /api/fare-certificates/:id/pdf — HTML 렌더링 (A4 인쇄용)
fareCertificatesRouter.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const cert = await getFareCertificateById(req.params.id);
    if (!cert) {
      res.status(404).json({ success: false, error: '운임증명서를 찾을 수 없습니다.' });
      return;
    }
    const html = renderCertificateHtml(cert);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ success: false, error: 'PDF 생성 실패' });
  }
});

// POST /api/fare-certificates/preview — 미리보기 HTML
fareCertificatesRouter.post('/preview', async (req: Request, res: Response) => {
  try {
    const data = req.body as Partial<FareCertificateRow>;
    const cert: FareCertificateRow = {
      id: '',
      cert_number: data.cert_number || 'PREVIEW',
      booking_id: data.booking_id || '',
      flight_schedule_id: data.flight_schedule_id || null,
      recipient: data.recipient || '',
      issue_date: data.issue_date || new Date().toISOString().slice(0, 10),
      traveler_name: data.traveler_name || '',
      cabin_class: data.cabin_class || '',
      route_description: data.route_description || '',
      ticket_period_start: data.ticket_period_start || null,
      ticket_period_end: data.ticket_period_end || null,
      pax_count: data.pax_count || 1,
      base_fare_per_person: data.base_fare_per_person || 0,
      tax_per_person: data.tax_per_person || 0,
      total_fare: data.total_fare || 0,
      total_tax: data.total_tax || 0,
      total_amount: data.total_amount || 0,
      segments_json: data.segments_json || '[]',
      status: data.status || 'issued',
      created_at: '',
      updated_at: '',
    };
    const html = renderCertificateHtml(cert);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ success: false, error: '미리보기 생성 실패' });
  }
});

/** 금액 포맷 (원화) */
function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

/** 날짜를 PNR 스타일로 포맷: 2025-09-12 → 25년 09/12일 */
function formatPnrDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const yy = parts[0].slice(2);
  const mm = parts[1];
  const dd = parts[2];
  return `${yy}년 ${mm}/${dd}일`;
}

/** segments_json 파싱 */
function parseSegments(json: string): Array<{
  airline?: string;
  flight_number?: string;
  route_from?: string;
  route_to?: string;
  departure_date?: string;
  departure_time?: string;
  arrival_date?: string;
  cabin_class?: string;
}> {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 편별 스케줄을 PNR 형식 텍스트로 렌더링 */
function renderSegmentLines(segments: ReturnType<typeof parseSegments>): string {
  if (segments.length === 0) {
    return '<p style="color:#999;text-align:center">구간 정보 없음</p>';
  }
  return segments.map((seg, i) => {
    const flight = seg.flight_number || '';
    const dateFormatted = formatPnrDate(seg.departure_date || '');
    const time = seg.departure_time ? seg.departure_time.slice(0, 5) : '';
    const fromCity = airportToCity(seg.route_from || '');
    const fromCode = (seg.route_from || '').toUpperCase();
    const toCity = airportToCity(seg.route_to || '');
    const toCode = (seg.route_to || '').toUpperCase();
    const arrDate = seg.arrival_date ? formatPnrDate(seg.arrival_date) : '';
    const cabin = seg.cabin_class ? `&nbsp;[${seg.cabin_class}]` : '';
    return `<p style="margin:4px 0;font-size:11pt">${i + 1}. ${flight}&nbsp;&nbsp;${dateFormatted}${time ? '&nbsp;' + time : ''}&nbsp;&nbsp;${fromCity}(${fromCode})&nbsp;-&nbsp;${toCity}(${toCode})${arrDate ? '&nbsp;' + arrDate + '착' : ''}${cabin}</p>`;
  }).join('\n');
}

/** 날짜를 한글 형식으로: 2026-03-20 → 2026년 03월 20일 */
function formatDateKR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
}

// ─── 항공 견적서 (Quotation) ─────────────────────────────

// POST /api/fare-certificates/quotation — 견적서 HTML 생성
// POST /api/fare-certificates/quotation — 견적서 미리보기 HTML
fareCertificatesRouter.post('/quotation', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const html = renderQuotationHtml(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ success: false, error: '견적서 생성 실패' });
  }
});

// POST /api/fare-certificates/quotation/save — 견적서 DB 저장
fareCertificatesRouter.post('/quotation/save', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();

    const id = crypto.randomUUID();
    // 견적번호: Q-YYMMDD-NNN
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const pattern = `Q-${today}-%`;
    const last = await db.get<{ num: string | null }>(
      `SELECT quotation_number as num FROM air_quotations WHERE quotation_number LIKE ? ORDER BY quotation_number DESC LIMIT 1`,
      [pattern]
    );
    let seq = 1;
    if (last?.num) {
      const parts = last.num.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const quotationNumber = `Q-${today}-${String(seq).padStart(3, '0')}`;

    const paxCount = data.pax_count || 1;
    const airfare = data.base_fare_per_person || 0;
    const tax = data.tax_per_person || 0;
    const fuel = data.fuel_surcharge_per_person || 0;
    const fee = data.ticket_fee_per_person || 0;
    const totalAmount = (airfare + tax + fuel + fee) * paxCount;

    await db.run(
      `INSERT INTO air_quotations
       (id, quotation_number, booking_id, flight_schedule_id, recipient, issue_date, valid_until,
        traveler_name, cabin_class, route_description, ticket_period_start, ticket_period_end,
        pax_count, base_fare_per_person, tax_per_person, fuel_surcharge_per_person, ticket_fee_per_person,
        total_amount, segments_json, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, quotationNumber, data.booking_id || null, data.flight_schedule_id || null,
       data.recipient || '', data.issue_date || new Date().toISOString().slice(0, 10), data.valid_until || null,
       data.traveler_name || '', data.cabin_class || '', data.route_description || '',
       data.ticket_period_start || null, data.ticket_period_end || null,
       paxCount, airfare, tax, fuel, fee, totalAmount,
       data.segments_json || '[]', data.remarks || '']
    );

    res.json({ success: true, data: { quotation: { id, quotation_number: quotationNumber } } });
  } catch (err: any) {
    console.error('견적서 저장 오류:', err);
    res.status(500).json({ success: false, error: '견적서 저장 실패' });
  }
});

// GET /api/fare-certificates/quotation/:id/pdf — 견적서 PDF HTML
fareCertificatesRouter.get('/quotation/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();
    const row = await db.get<any>('SELECT * FROM air_quotations WHERE id = ?', [req.params.id]);
    if (!row) { res.status(404).json({ success: false, error: '견적서를 찾을 수 없습니다.' }); return; }

    const html = renderQuotationHtml({
      ...row,
      quotation_number: row.quotation_number,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ success: false, error: '견적서 PDF 생성 실패' });
  }
});

// DELETE /api/fare-certificates/quotation/:id
fareCertificatesRouter.delete('/quotation/:id', async (req: Request, res: Response) => {
  try {
    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();
    await db.run('DELETE FROM air_quotations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: '견적서 삭제 실패' });
  }
});

function renderQuotationHtml(data: any): string {
  const segments = parseSegments(data.segments_json || '[]');
  const navy = '#000666';
  const navyLight = '#1a237e';
  const gold = '#775a19';
  const goldLight = '#ffdea5';
  const goldBg = '#fed488';

  const paxCount = data.pax_count || 1;
  const airfare = data.base_fare_per_person || 0;
  const tax = data.tax_per_person || 0;
  const fuelSurcharge = data.fuel_surcharge_per_person || 0;
  const ticketFee = data.ticket_fee_per_person || 0;

  const perPaxTotal = airfare + tax + fuelSurcharge + ticketFee;
  const totalAirfare = airfare * paxCount;
  const totalTax = tax * paxCount;
  const totalFuel = fuelSurcharge * paxCount;
  const totalFee = ticketFee * paxCount;
  const grandTotal = perPaxTotal * paxCount;

  const ticketPeriod = data.ticket_period_start && data.ticket_period_end
    ? `${data.ticket_period_start} ~ ${data.ticket_period_end}`
    : data.ticket_period_start || data.ticket_period_end || '-';

  const validUntil = data.valid_until || '';
  const remarks = data.remarks || '';

  // 편별 스케줄 렌더링 (골드 포인트)
  const scheduleHtml = segments.length === 0
    ? '<p style="color:#999;text-align:center">구간 정보 없음</p>'
    : segments.map((seg: any, i: number) => {
        const flight = seg.flight_number || '';
        const dateF = formatPnrDate(seg.departure_date || '');
        const fromCity = airportToCity(seg.route_from || '');
        const fromCode = (seg.route_from || '').toUpperCase();
        const toCity = airportToCity(seg.route_to || '');
        const toCode = (seg.route_to || '').toUpperCase();
        return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;${i > 0 ? 'border-top:1px solid #f0ead6;' : ''}">
          <span style="background:${navy};color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${i + 1}</span>
          <span style="font-weight:600;color:${navy};min-width:60px">${flight}</span>
          <span style="color:#555">${dateF}</span>
          <span style="color:${gold};font-weight:600">${fromCity}(${fromCode})</span>
          <span style="color:#999">→</span>
          <span style="color:${gold};font-weight:600">${toCity}(${toCode})</span>
        </div>`;
      }).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AIR QUOTATION</title>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4; margin: 5mm 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page { margin: 0; box-shadow: none; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans KR', sans-serif; font-size: 9.5pt; color: #1a1c1d; background: #f5f5f5; line-height: 1.5; }
    .hl { font-family: 'Manrope', 'Noto Sans KR', sans-serif; }
    .page { max-width: 210mm; margin: 10mm auto; background: #fff; box-shadow: 0 4px 30px rgba(0,0,0,0.1); }
    .accent-top { height: 5px; background: linear-gradient(90deg, ${navy}, ${navyLight}, ${gold}); }
    .accent-bottom { height: 4px; background: linear-gradient(90deg, ${gold}, ${navyLight}, ${navy}); }
    .content { padding: 10mm 20mm 8mm; }

    /* 헤더 */
    .header { text-align: center; margin-bottom: 14px; padding-bottom: 0; }
    .header-line { height: 2px; background: ${navy}; margin-bottom: 14px; }
    .header h1 { font-family: 'Manrope', sans-serif; font-size: 20pt; font-weight: 800; letter-spacing: 6px; color: ${navy}; margin: 0 0 4px 0; text-align: center; width: 100%; }
    .header .sub { font-size: 11pt; color: ${gold}; letter-spacing: 6px; font-weight: 700; text-align: center; width: 100%; margin-bottom: 12px; }

    /* 메타 테이블 */
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .meta-table td { padding: 6px 12px; border: 1px solid #e8e8ea; vertical-align: middle; font-size: 9.5pt; }
    .meta-table .label { background: ${navy}; color: #fff; font-weight: 700; width: 100px; text-align: center; font-size: 8.5pt; letter-spacing: 1px; }
    .meta-table .value { color: #1a1c1d; font-weight: 500; }

    /* 섹션 */
    .section-title { font-family: 'Manrope', sans-serif; font-size: 9.5pt; font-weight: 700; color: ${navy}; margin: 12px 0 6px; padding-left: 10px; border-left: 3px solid ${gold}; text-transform: uppercase; letter-spacing: 2px; }
    .schedule-box { padding: 8px 12px; border: 1px solid #e8e8ea; border-radius: 4px; background: #fafafa; margin-bottom: 10px; }

    /* 운임 테이블 */
    .fare-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    .fare-table th { background: ${navy}; color: #fff; padding: 6px 12px; font-weight: 700; font-size: 8.5pt; text-align: center; letter-spacing: 1px; text-transform: uppercase; }
    .fare-table td { border: 1px solid #e8e8ea; padding: 5px 12px; font-size: 9.5pt; }
    .fare-table .amount { text-align: right; font-family: 'Manrope', monospace; font-weight: 600; letter-spacing: 0.3px; }
    .fare-table tbody tr:nth-child(even) { background: #fafafa; }

    /* 총액 카드 */
    .total-card { background: ${goldLight}; border-radius: 6px; padding: 10px 20px; margin: 8px 0 10px; display: table; width: 100%; }
    .total-card .total-label { font-family: 'Manrope', sans-serif; font-weight: 800; color: ${gold}; font-size: 10pt; letter-spacing: 2px; text-transform: uppercase; }
    .total-card .total-label small { display: block; font-size: 7.5pt; font-weight: 500; color: #5d4201; letter-spacing: 0; margin-top: 2px; text-transform: none; }
    .total-card .total-amount { font-family: 'Manrope', sans-serif; font-weight: 900; color: ${navy}; font-size: 20pt; letter-spacing: 1px; }
    .total-card .total-amount .currency { font-size: 9pt; font-weight: 700; margin-right: 4px; color: #5d4201; }

    /* 비고 */
    .remarks-box { margin: 8px 0; padding: 8px 14px; background: #fafafa; border-left: 3px solid ${gold}; font-size: 9pt; line-height: 1.6; color: #333; white-space: pre-wrap; }
    .notes { margin: 8px 0; padding: 8px 14px; font-size: 8pt; color: #767683; line-height: 1.5; }
    .notes li { margin-bottom: 1px; }

    /* 푸터 */
    .footer-area { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e8e8ea; }
    .footer-left { }
    .footer-left .company { font-family: 'Manrope', sans-serif; font-size: 13pt; font-weight: 800; color: ${navy}; }
    .footer-left .rep-area { position: relative; display: inline-block; }
    .footer-left .rep { font-size: 10pt; font-weight: 600; color: #333; }
    .seal-img { position: absolute; right: -60px; top: -10px; width: 55px; height: 55px; object-fit: contain; opacity: 0.7; }
    @media print { .seal-img.hide-on-print { display: none !important; } }
    .footer-left .address { font-size: 8pt; color: #767683; line-height: 1.5; margin-top: 4px; }
    .footer-right { text-align: right; }
    .footer-right .iata { font-family: 'Manrope', sans-serif; font-size: 8pt; font-weight: 700; color: ${navy}; letter-spacing: 1.5px; }
    .footer-right .doc-note { font-size: 7pt; color: #999; margin-top: 4px; max-width: 200px; line-height: 1.4; }

    .print-btn { position: fixed; top: 16px; right: 16px; padding: 10px 28px; background: ${navy}; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,6,102,0.3); }
    .print-btn:hover { background: ${navyLight}; }
  </style>
</head>
<body>
  <div class="no-print" style="position:fixed;top:15px;right:15px;display:flex;gap:12px;align-items:center">
    <label style="font-size:13px;color:#666;cursor:pointer;display:flex;align-items:center;gap:4px">
      <input type="checkbox" id="hideSeal" onchange="document.querySelector('.seal-img').classList.toggle('hide-on-print',this.checked)">
      인쇄 시 직인 제외
    </label>
    <button class="print-btn" onclick="window.print()">인쇄하기</button>
  </div>

  <div class="page">
    <div class="accent-top"></div>
    <div class="content">

      <div class="header">
        <h1 style="display:block;text-align:center;width:100%">AIR QUOTATION</h1>
        <div class="sub" style="display:block;text-align:center;width:100%">항 공 견 적 서</div>
      </div>
      <div class="header-line"></div>

      <table class="meta-table">
        <tr>
          <td class="label">견적번호</td>
          <td class="value" style="font-family:'Manrope',sans-serif;font-weight:700">${data.quotation_number || 'Q-' + new Date().toISOString().slice(0,10).replace(/-/g,'')}</td>
          <td class="label">견적일자</td>
          <td class="value">${formatDateKR(data.issue_date || new Date().toISOString().slice(0,10))}</td>
        </tr>
        <tr>
          <td class="label">수 신</td>
          <td class="value" colspan="3" style="font-weight:700;font-size:11pt">${data.recipient || ''}</td>
        </tr>
        <tr>
          <td class="label">탑승객</td>
          <td class="value">${data.traveler_name || ''}</td>
          <td class="label">인원</td>
          <td class="value" style="font-weight:700">${paxCount}명</td>
        </tr>
        <tr>
          <td class="label">CLASS</td>
          <td class="value">${data.cabin_class || ''}</td>
          <td class="label">항공권기간</td>
          <td class="value">${ticketPeriod}</td>
        </tr>
        <tr>
          <td class="label">여 정</td>
          <td class="value" colspan="3" style="font-weight:600;color:${navy}">${data.route_description || ''}</td>
        </tr>
        ${validUntil ? `<tr><td class="label">유효기간</td><td class="value" colspan="3" style="color:#e00;font-weight:700">${formatDateKR(validUntil)}까지</td></tr>` : ''}
      </table>

      <div class="section-title hl">Flight Schedule</div>
      <div class="schedule-box">
        ${scheduleHtml}
      </div>

      <div class="section-title hl">Fare Breakdown</div>
      <table class="fare-table">
        <thead>
          <tr>
            <th style="width:28%">구 분</th>
            <th style="width:24%">단가 (1인)</th>
            <th style="width:14%">인원</th>
            <th style="width:34%">합 계</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center;font-weight:500">항공운임 (FARE)</td>
            <td class="amount">${formatKRW(airfare)}원</td>
            <td style="text-align:center">${paxCount}명</td>
            <td class="amount">${formatKRW(totalAirfare)}원</td>
          </tr>
          <tr>
            <td style="text-align:center;font-weight:500">TAX (공항세/전쟁보험료 등)</td>
            <td class="amount">${formatKRW(tax)}원</td>
            <td style="text-align:center">${paxCount}명</td>
            <td class="amount">${formatKRW(totalTax)}원</td>
          </tr>
          ${fuelSurcharge > 0 ? `<tr>
            <td style="text-align:center;font-weight:500">유류할증료 (YQ)</td>
            <td class="amount">${formatKRW(fuelSurcharge)}원</td>
            <td style="text-align:center">${paxCount}명</td>
            <td class="amount">${formatKRW(totalFuel)}원</td>
          </tr>` : ''}
          ${ticketFee > 0 ? `<tr>
            <td style="text-align:center;font-weight:500">발권수수료</td>
            <td class="amount">${formatKRW(ticketFee)}원</td>
            <td style="text-align:center">${paxCount}명</td>
            <td class="amount">${formatKRW(totalFee)}원</td>
          </tr>` : ''}
        </tbody>
      </table>

      <div class="total-card">
        <div style="display:table-cell;vertical-align:middle;text-align:left">
          <div class="total-label">총 견적 금액</div>
          <div style="font-size:7.5pt;font-weight:500;color:#5d4201;margin-top:2px">모든 세금 및 수수료 포함</div>
        </div>
        <div style="display:table-cell;vertical-align:middle;text-align:right">
          <span style="font-size:9pt;font-weight:700;margin-right:4px;color:#5d4201">KRW</span>
          <span class="total-amount">${formatKRW(grandTotal)}</span>
        </div>
      </div>

      ${remarks ? `<div class="section-title hl">Remarks</div><div class="remarks-box">${remarks.replace(/\n/g, '<br>')}</div>` : ''}

      <ul class="notes">
        <li>상기 견적은 현재 기준이며 예고 없이 변경될 수 있습니다.</li>
        <li>환율 변동, 유류할증료, 세금 변경 시 금액이 조정될 수 있습니다.</li>
        <li>항공좌석은 예약 확정 전까지 보장되지 않습니다.</li>
        ${validUntil ? `<li>본 견적은 <strong>${formatDateKR(validUntil)}</strong>까지 유효합니다.</li>` : ''}
      </ul>

      <div class="footer-area">
        <div class="footer-left">
          <div class="company">(유) 여행세상</div>
          <div class="rep-area">
            <span class="rep">대표이사 김국진</span>
            ${sealDataUri ? `<img src="${sealDataUri}" alt="직인" class="seal-img" />` : ''}
          </div>
          <div class="address">
            전주시 완산구 서신로 8 &nbsp;|&nbsp; Tel: 063-271-9090 &nbsp;|&nbsp; Fax: 063-271-9030
          </div>
        </div>
      </div>
      <div style="display:table;width:100%;margin-top:8px;padding-top:8px;border-top:1px solid #e8e8ea">
        <span style="display:table-cell;text-align:left;font-size:7.5pt;color:#999">이 문서는 (유)여행세상에서 발행한 공식 견적서입니다.</span>
        <span style="display:table-cell;text-align:right;font-size:8pt;font-weight:700;color:${navy};letter-spacing:1.5px">IATA NO 173-2198-6 TRAVEL WORLD</span>
      </div>

    </div>
    <div class="accent-bottom"></div>
  </div>
</body>
</html>`;
}

/** 운임증명서 HTML 렌더링 (모던 공문서 스타일) */
function renderCertificateHtml(cert: FareCertificateRow): string {
  const segments = parseSegments(cert.segments_json);
  const purple = '#7C5CBF';
  const purpleDark = '#5B3D9E';
  const purpleLight = '#F3EEFA';

  const ticketPeriod = cert.ticket_period_start && cert.ticket_period_end
    ? `${cert.ticket_period_start} ~ ${cert.ticket_period_end}`
    : cert.ticket_period_start || cert.ticket_period_end || '-';

  const perPaxTotal = cert.base_fare_per_person + cert.tax_per_person;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FARE CERTIFICATE ${cert.cert_number}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
  <style>
    @page { size: A4; margin: 8mm 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      font-size: 10.5pt;
      color: #1a1a2e;
      background: #f5f5f5;
      line-height: 1.5;
    }
    .page {
      max-width: 210mm;
      margin: 10mm auto;
      background: #fff;
      box-shadow: 0 2px 20px rgba(0,0,0,0.08);
      position: relative;
    }
    @media print { .page { margin: 0; box-shadow: none; } }

    /* 상단 보라 앵커 라인 */
    .accent-top {
      height: 6px;
      background: linear-gradient(90deg, ${purpleDark}, ${purple}, ${purpleDark});
    }

    .content { padding: 14mm 18mm 10mm; }

    /* 헤더 */
    .header {
      text-align: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${purple};
    }
    .header h1 {
      font-size: 19pt;
      font-weight: 800;
      letter-spacing: 6px;
      color: ${purpleDark};
      margin-bottom: 4px;
    }
    .header .sub {
      font-size: 11pt;
      color: #5a5a72;
      letter-spacing: 4px;
      font-weight: 500;
    }

    /* 메타 정보 테이블 */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1.5px solid #d0d0d8;
    }
    .meta-table td {
      padding: 5px 12px;
      border: 1px solid #e0e0e8;
      vertical-align: middle;
      font-size: 10pt;
    }
    .meta-table .label {
      background: ${purpleLight};
      font-weight: 700;
      color: ${purpleDark};
      width: 120px;
      white-space: nowrap;
      text-align: center;
      font-size: 10pt;
    }
    .meta-table .value {
      color: #1a1a2e;
      font-weight: 500;
    }

    /* 섹션 제목 */
    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: ${purpleDark};
      margin: 12px 0 6px;
      padding-left: 10px;
      border-left: 4px solid ${purple};
    }

    /* 편별 스케줄 */
    .schedule-box {
      padding: 8px 14px;
      border: 1px solid #e0e0e8;
      border-radius: 6px;
      background: #fafafd;
      margin-bottom: 10px;
    }
    .schedule-box p {
      margin: 2px 0;
      font-size: 10pt;
      color: #333;
    }

    /* 운임 테이블 */
    .fare-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      border: 1.5px solid #d0d0d8;
    }
    .fare-table th {
      background: ${purpleLight};
      border: 1px solid #d0d0d8;
      padding: 6px 10px;
      font-weight: 700;
      font-size: 9.5pt;
      text-align: center;
      color: ${purpleDark};
    }
    .fare-table td {
      border: 1px solid #e0e0e8;
      padding: 5px 10px;
      font-size: 10pt;
    }
    .fare-table .amount {
      text-align: right;
      font-family: 'Consolas', 'Courier New', monospace;
      letter-spacing: 0.3px;
    }
    .fare-table .total-row {
      background: ${purpleLight};
      font-weight: 700;
    }
    .fare-table .total-row .amount {
      color: ${purpleDark};
      font-size: 12pt;
    }

    /* 안내 문구 */
    .notes {
      margin: 10px 0;
      padding: 10px 14px;
      background: #fafafd;
      border-left: 3px solid ${purple};
      font-size: 9pt;
      color: #5a5a72;
      line-height: 1.6;
    }
    .notes p { margin-bottom: 1px; }

    /* 하단 서명 영역 */
    .footer-area {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid #e0e0e8;
      text-align: center;
    }
    .footer-area .company {
      font-size: 13pt;
      font-weight: 800;
      color: #1a1a2e;
      margin-bottom: 4px;
    }
    .footer-area .rep-area {
      position: relative;
      display: inline-block;
      margin-bottom: 4px;
    }
    .footer-area .rep {
      font-size: 11pt;
      font-weight: 600;
      color: #333;
    }
    .seal-img {
      position: absolute;
      right: -60px;
      top: -8px;
      width: 60px;
      height: 60px;
      object-fit: contain;
      opacity: 0.7;
      z-index: 0;
    }
    @media print {
      .seal-img.hide-on-print { display: none !important; }
    }
    .footer-area .company,
    .footer-area .rep,
    .footer-area .address,
    .footer-area .iata {
      position: relative;
      z-index: 1;
    }
    .footer-area .address {
      font-size: 9pt;
      color: #8888a0;
      line-height: 1.6;
    }
    .footer-area .iata {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e0e0e8;
      font-size: 9pt;
      font-weight: 700;
      color: ${purpleDark};
      letter-spacing: 1.5px;
    }

    /* 하단 보라 앵커 라인 */
    .accent-bottom {
      height: 6px;
      background: linear-gradient(90deg, ${purpleDark}, ${purple}, ${purpleDark});
    }

    /* 인쇄 버튼 */
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      padding: 10px 28px;
      background: linear-gradient(135deg, ${purple}, ${purpleDark});
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(124,92,191,0.3);
    }
    .print-btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="no-print" style="position:fixed;top:15px;right:15px;display:flex;gap:12px;align-items:center">
    <label style="font-size:13px;color:#666;cursor:pointer;display:flex;align-items:center;gap:4px">
      <input type="checkbox" id="hideSeal" onchange="document.querySelector('.seal-img').classList.toggle('hide-on-print',this.checked)">
      인쇄 시 직인 제외
    </label>
    <button class="print-btn" onclick="window.print()">인쇄하기</button>
  </div>

  <div class="page">
    <div class="accent-top"></div>
    <div class="content">

      <div class="header">
        <h1>FARE CERTIFICATE</h1>
        <div class="sub">항 공 운 임 증 명 서</div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="label">발행번호</td>
          <td class="value">${cert.cert_number}</td>
          <td class="label">발행일자</td>
          <td class="value">${formatDateKR(cert.issue_date)}</td>
        </tr>
        <tr>
          <td class="label">수 신</td>
          <td class="value" colspan="3" style="font-weight:700">${cert.recipient}</td>
        </tr>
        <tr>
          <td class="label">탑 승 객</td>
          <td class="value">${cert.traveler_name || ''}</td>
          <td class="label">인원</td>
          <td class="value">${cert.pax_count}명</td>
        </tr>
        <tr>
          <td class="label">CLASS / 등급</td>
          <td class="value">${cert.cabin_class}</td>
          <td class="label">항공권기간</td>
          <td class="value">${ticketPeriod}</td>
        </tr>
        <tr>
          <td class="label">여 정</td>
          <td class="value" colspan="3">${cert.route_description}</td>
        </tr>
      </table>

      <div class="section-title">편별 스케줄</div>
      <div class="schedule-box">
        ${renderSegmentLines(segments)}
      </div>

      <div class="section-title">운임 내역</div>
      <table class="fare-table">
        <thead>
          <tr>
            <th style="width:30%">구 분</th>
            <th style="width:25%">단가 (1인)</th>
            <th style="width:15%">인원</th>
            <th style="width:30%">합 계</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center">항공권</td>
            <td class="amount">${formatKRW(cert.base_fare_per_person)}원</td>
            <td style="text-align:center">${cert.pax_count}명</td>
            <td class="amount">${formatKRW(cert.total_fare)}원</td>
          </tr>
          <tr>
            <td style="text-align:center">TAX</td>
            <td class="amount">${formatKRW(cert.tax_per_person)}원</td>
            <td style="text-align:center">${cert.pax_count}명</td>
            <td class="amount">${formatKRW(cert.total_tax)}원</td>
          </tr>
          <tr class="total-row">
            <td style="text-align:center">합 계</td>
            <td class="amount">${formatKRW(perPaxTotal)}원</td>
            <td style="text-align:center">${cert.pax_count}명</td>
            <td class="amount">${formatKRW(cert.total_amount)}원</td>
          </tr>
        </tbody>
      </table>

      <div class="notes">
        <p>1. 정상운임은 국제항공여행요금표 및 규정에 의거 틀림없음을 증명합니다.</p>
        <p style="margin-left:14px;font-size:9pt">(단, 정부 및 해당국의 요금 및 환율 변경 등의 사유로 변경될 수 있습니다)</p>
        <p style="margin-top:6px">2. 할인운임은 금일 발권 기준이며 예고 없이 변경될 수 있습니다.</p>
      </div>

      <div class="footer-area">
        <div class="company">(유) 여행세상</div>
        <div class="rep-area">
          <span class="rep">대표이사 김국진</span>
          ${sealDataUri ? `<img src="${sealDataUri}" alt="직인" class="seal-img" />` : ''}
        </div>
        <div class="address">
          전주시 완산구 서신로 8<br>
          Tel: 063-271-9090 &nbsp;|&nbsp; Fax: 063-271-9030
        </div>
        <div class="iata">PREPARED BY : IATA NO 173-2198-6 TRAVEL WORLD<br>Ticketing office,</div>
      </div>

    </div>
    <div class="accent-bottom"></div>
  </div>
</body>
</html>`;
}
