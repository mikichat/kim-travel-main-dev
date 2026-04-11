// @TASK P5 - Invoices Router (인트라넷 DB 직접 연결)
// @SPEC GET/POST /api/invoices

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth';
import { airportToCity } from '../utils/airport-codes';
import {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  createInvoiceFromBooking,
  createInvoiceFromMultipleBookings,
  deleteInvoice,
  InvoiceRow,
} from '../services/invoices.service';

/** 직인 이미지를 Base64 Data URI로 로드 (서버 시작 시 1회) */
let sealDataUri = '';
try {
  const sealPath = path.join(__dirname, '../../public/seal.jpg');
  const sealBuf = fs.readFileSync(sealPath);
  sealDataUri = `data:image/jpeg;base64,${sealBuf.toString('base64')}`;
} catch {
  // 직인 파일 없으면 빈 문자열
}

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

// Booking-scoped invoice router (mounted at /api/bookings/:bookingId/invoice)
export const bookingInvoiceRouter = Router({ mergeParams: true });
bookingInvoiceRouter.use(requireAuth);

// GET /api/invoices
invoicesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, page, limit } = req.query;
    const result = await listInvoices({
      search: search as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: '인보이스 목록 조회 실패' });
  }
});

// GET /api/invoices/:id
invoicesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      res.status(404).json({ success: false, error: '인보이스를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { invoice } });
  } catch (err) {
    res.status(500).json({ success: false, error: '인보이스 조회 실패' });
  }
});

// GET /api/invoices/:id/pdf
invoicesRouter.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      res.status(404).json({ success: false, error: '인보이스를 찾을 수 없습니다.' });
      return;
    }
    const html = renderInvoiceHtml(invoice);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ success: false, error: '인보이스 HTML 생성 실패' });
  }
});

// ─── 유틸 함수 ───────────────────────────────────────────

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}


function formatDateKR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
}

// ─── 인보이스 HTML 렌더러 ─────────────────────────────────

function renderInvoiceHtml(invoice: InvoiceRow): string {
  const navy = '#000666';
  const navyLight = '#1a237e';
  const gold = '#775a19';
  const goldLight = '#ffdea5';

  // 항공편 스케줄 섹션
  const flightRows = Array.isArray(invoice.flight_info) ? invoice.flight_info : [];
  const flightHtml = flightRows.length > 0
    ? `
      <div class="section-title hl">Flight Schedule</div>
      <div class="schedule-box">
        ${flightRows.map((seg: Record<string, string>, i: number) => {
          const flight = seg.flight_number || '';
          const date = seg.departure_date || '';
          const fromCity = airportToCity(seg.route_from || '');
          const fromCode = (seg.route_from || '').toUpperCase();
          const toCity = airportToCity(seg.route_to || '');
          const toCode = (seg.route_to || '').toUpperCase();
          const depTime = seg.departure_time ? seg.departure_time.slice(0, 5) : '';
          const arrTime = seg.arrival_time ? seg.arrival_time.slice(0, 5) : '';
          return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;${i > 0 ? 'border-top:1px solid #f0ead6;' : ''}">
            <span style="background:${navy};color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${i + 1}</span>
            <span style="font-weight:600;color:${navy};min-width:60px">${flight}</span>
            <span style="color:#555">${date}</span>
            ${depTime ? `<span style="color:#555">${depTime}</span>` : ''}
            <span style="color:${gold};font-weight:600">${fromCity}(${fromCode})</span>
            <span style="color:#999">→</span>
            <span style="color:${gold};font-weight:600">${toCity}(${toCode})</span>
            ${arrTime ? `<span style="color:#555">${arrTime}착</span>` : ''}
          </div>`;
        }).join('')}
      </div>`
    : '';

  // 탑승자 목록 섹션
  const passengerRows = Array.isArray(invoice.passenger_info) ? invoice.passenger_info : [];
  const passengerHtml = passengerRows.length > 0
    ? `
      <div class="section-title hl">Passengers</div>
      <table class="fare-table" style="margin-bottom:10px">
        <thead>
          <tr>
            <th style="width:5%">No</th>
            <th style="width:35%">이름 (영문)</th>
            <th style="width:30%">이름 (한글)</th>
            <th style="width:15%">구분</th>
            <th style="width:15%">운임</th>
          </tr>
        </thead>
        <tbody>
          ${passengerRows.map((p: Record<string, string | number>, i: number) => `
          <tr>
            <td style="text-align:center">${i + 1}</td>
            <td style="font-family:'Manrope',sans-serif;font-weight:600">${p.name_en || ''}</td>
            <td>${p.name_kr || ''}</td>
            <td style="text-align:center">${p.title || ''}</td>
            <td class="amount">${p.fare ? formatKRW(Number(p.fare)) + '원' : '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
    : '';

  // 운임 내역 행들 — 그룹 형식 vs 배열 형식 감지
  const rawItems = invoice.additional_items;
  const isGrouped = rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems) && (rawItems as any).groups;

  let fareRows: string[];

  if (isGrouped) {
    const gd = rawItems as { groups: Array<{name:string;count:number;unitPrice:number;deposit:number}>; extras?: Array<{name:string;unitPrice:number;count:number;type:string}>; cost_label?: string; deposit_label?: string };
    const costLabel = gd.cost_label || '여행경비';
    const depositLabel = gd.deposit_label || '계약금';
    let airTotal = 0, depTotal = 0;

    fareRows = gd.groups.map(g => {
      const sub = (g.unitPrice || 0) * (g.count || 0);
      airTotal += sub;
      depTotal += (g.deposit || 0) * (g.count || 0);
      return `<tr>
        <td style="text-align:center;font-weight:500">${g.name || costLabel}</td>
        <td class="amount">${formatKRW(g.unitPrice || 0)}원</td>
        <td style="text-align:center">${g.count || 0}명</td>
        <td class="amount" style="font-weight:700">${formatKRW(sub)}원</td>
      </tr>`;
    });

    // 추가항목
    if (gd.extras && gd.extras.length > 0) {
      gd.extras.forEach(ex => {
        const sub = (ex.unitPrice || 0) * (ex.count || 0);
        fareRows.push(`<tr>
          <td style="text-align:center;font-weight:500">${ex.type === 'subtract' ? '(차감) ' : ''}${ex.name}</td>
          <td class="amount">${formatKRW(ex.unitPrice || 0)}원</td>
          <td style="text-align:center">${ex.count || 0}명</td>
          <td class="amount" style="font-weight:700;${ex.type === 'subtract' ? 'color:#c0392b' : ''}">${ex.type === 'subtract' ? '-' : ''}${formatKRW(sub)}원</td>
        </tr>`);
      });
    }

    // 계약금
    if (depTotal > 0) {
      gd.groups.filter(g => g.deposit > 0).forEach(g => {
        const depSub = (g.deposit || 0) * (g.count || 0);
        fareRows.push(`<tr style="color:#059669">
          <td style="text-align:center;font-weight:500">${depositLabel} — ${g.name || ''}</td>
          <td class="amount">${formatKRW(g.deposit || 0)}원</td>
          <td style="text-align:center">${g.count || 0}명</td>
          <td class="amount" style="font-weight:700">-${formatKRW(depSub)}원</td>
        </tr>`);
      });
    }

    fareRows.push(`<tr style="background:${navy};color:#fff">
      <td colspan="3" style="text-align:right;font-weight:700;padding:7px 12px;letter-spacing:1px">합 계</td>`);
  } else {
    const additionalItems = Array.isArray(rawItems)
      ? (rawItems as Array<{ name: string; amount: number }>)
      : [];

    fareRows = [
      `<tr>
        <td style="text-align:center;font-weight:500">항공운임</td>
        <td class="amount">${formatKRW(invoice.airfare_unit_price)}원</td>
        <td style="text-align:center">${invoice.airfare_quantity}명</td>
        <td class="amount" style="font-weight:700">${formatKRW(invoice.airfare_total)}원</td>
      </tr>`,
      invoice.seat_preference_total > 0
        ? `<tr>
            <td style="text-align:center;font-weight:500">좌석선호 수수료</td>
            <td class="amount">${formatKRW(invoice.seat_preference_unit_price)}원</td>
            <td style="text-align:center">${invoice.seat_preference_quantity}명</td>
            <td class="amount">${formatKRW(invoice.seat_preference_total)}원</td>
          </tr>`
        : '',
      ...additionalItems.map((item) =>
        `<tr>
          <td style="text-align:center;font-weight:500">${item.name}</td>
          <td class="amount">-</td>
          <td style="text-align:center">-</td>
          <td class="amount">${formatKRW(item.amount)}원</td>
        </tr>`
      ),
      invoice.deposit_amount && invoice.deposit_amount > 0
        ? `<tr style="color:#c0392b">
            <td style="text-align:center;font-weight:500">${invoice.deposit_description || '예치금 차감'}</td>
            <td class="amount">-</td>
            <td style="text-align:center">-</td>
            <td class="amount" style="font-weight:700;color:#c0392b">-${formatKRW(invoice.deposit_amount)}원</td>
          </tr>`
        : '',
      `<tr style="background:${navy};color:#fff">
        <td colspan="3" style="text-align:right;font-weight:700;padding:7px 12px;letter-spacing:1px">합 계</td>`,
    ];
  }

  // 합계 행의 금액 셀 추가 + 필터 조인
  fareRows.push(
    `<td class="amount" style="font-weight:800;font-size:11pt;padding:7px 12px;color:${goldLight}">${formatKRW(invoice.total_amount)}원</td>
    </tr>`
  );
  const fareRowsHtml = fareRows.filter(Boolean).join('');

  // 잔금 섹션
  const balanceHtml = invoice.balance_due !== null && invoice.balance_due !== undefined
    ? `<div style="display:flex;justify-content:flex-end;margin:6px 0 10px">
        <div style="padding:8px 20px;background:#fff3f3;border:1.5px solid #e74c3c;border-radius:6px;text-align:right">
          <span style="font-size:8.5pt;color:#c0392b;font-weight:700;letter-spacing:1px">잔 금</span>
          <span style="font-family:'Manrope',sans-serif;font-weight:900;font-size:14pt;color:#c0392b;margin-left:10px">${formatKRW(invoice.balance_due)}원</span>
        </div>
      </div>`
    : '';

  // 입금 계좌 섹션
  const bankHtml = invoice.bank_name
    ? `
      <div class="section-title hl">입금 계좌</div>
      <div style="padding:10px 16px;border:1.5px solid #e8e8ea;border-radius:6px;background:#fafafa;margin-bottom:12px;display:flex;gap:30px;align-items:center">
        <div><span style="font-size:8pt;color:#888">은행명</span><br><strong style="font-size:11pt;color:${navy}">${invoice.bank_name}</strong></div>
        <div><span style="font-size:8pt;color:#888">계좌번호</span><br><strong style="font-family:'Manrope',sans-serif;font-size:11pt;color:${navy};letter-spacing:1px">${invoice.account_number || ''}</strong></div>
        <div><span style="font-size:8pt;color:#888">예금주</span><br><strong style="font-size:11pt;color:${navy}">${invoice.account_holder || ''}</strong></div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>INVOICE ${invoice.invoice_number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4; margin: 5mm 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page { margin: 0; box-shadow: none; }
      .seal-img.hide-on-print { display: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans KR', sans-serif; font-size: 9.5pt; color: #1a1c1d; background: #f5f5f5; line-height: 1.5; }
    .hl { font-family: 'Manrope', 'Noto Sans KR', sans-serif; }
    .page { max-width: 210mm; margin: 10mm auto; background: #fff; box-shadow: 0 4px 30px rgba(0,0,0,0.1); }
    .accent-top { height: 5px; background: linear-gradient(90deg, ${navy}, ${navyLight}, ${gold}); }
    .accent-bottom { height: 4px; background: linear-gradient(90deg, ${gold}, ${navyLight}, ${navy}); }
    .content { padding: 10mm 20mm 8mm; }

    .header { text-align: center; margin-bottom: 14px; }
    .header-line { height: 2px; background: ${navy}; margin-bottom: 14px; }
    .header h1 { font-family: 'Manrope', sans-serif; font-size: 22pt; font-weight: 800; letter-spacing: 8px; color: ${navy}; margin: 0 0 4px 0; }
    .header .sub { font-size: 11pt; color: ${gold}; letter-spacing: 8px; font-weight: 700; margin-bottom: 12px; }

    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .meta-table td { padding: 6px 12px; border: 1px solid #e8e8ea; vertical-align: middle; font-size: 9.5pt; }
    .meta-table .label { background: ${navy}; color: #fff; font-weight: 700; width: 100px; text-align: center; font-size: 8.5pt; letter-spacing: 1px; }
    .meta-table .value { color: #1a1c1d; font-weight: 500; }

    .section-title { font-family: 'Manrope', sans-serif; font-size: 9.5pt; font-weight: 700; color: ${navy}; margin: 12px 0 6px; padding-left: 10px; border-left: 3px solid ${gold}; text-transform: uppercase; letter-spacing: 2px; }
    .schedule-box { padding: 8px 12px; border: 1px solid #e8e8ea; border-radius: 4px; background: #fafafa; margin-bottom: 10px; }

    .fare-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    .fare-table th { background: ${navy}; color: #fff; padding: 6px 12px; font-weight: 700; font-size: 8.5pt; text-align: center; letter-spacing: 1px; text-transform: uppercase; }
    .fare-table td { border: 1px solid #e8e8ea; padding: 5px 12px; font-size: 9.5pt; }
    .fare-table .amount { text-align: right; font-family: 'Manrope', monospace; font-weight: 600; letter-spacing: 0.3px; }
    .fare-table tbody tr:nth-child(even) { background: #fafafa; }

    .total-card { background: ${goldLight}; border-radius: 6px; padding: 10px 20px; margin: 8px 0 10px; display: table; width: 100%; }
    .total-amount { font-family: 'Manrope', sans-serif; font-weight: 900; color: ${navy}; font-size: 20pt; letter-spacing: 1px; }

    .footer-area { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e8e8ea; }
    .footer-left .company { font-family: 'Manrope', sans-serif; font-size: 13pt; font-weight: 800; color: ${navy}; }
    .footer-left .rep-area { position: relative; display: inline-block; }
    .footer-left .rep { font-size: 10pt; font-weight: 600; color: #333; }
    .seal-img { position: absolute; right: -60px; top: -10px; width: 55px; height: 55px; object-fit: contain; opacity: 0.7; }
    .footer-left .address { font-size: 8pt; color: #767683; line-height: 1.5; margin-top: 4px; }

    .print-btn { padding: 10px 28px; background: ${navy}; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,6,102,0.3); }
    .print-btn:hover { background: ${navyLight}; }
  </style>
</head>
<body>
  <div class="no-print" style="position:fixed;top:15px;right:15px;display:flex;gap:12px;align-items:center">
    <label style="font-size:13px;color:#666;cursor:pointer;display:flex;align-items:center;gap:4px">
      <input type="checkbox" id="hideSeal" onchange="document.querySelector('.seal-img') && document.querySelector('.seal-img').classList.toggle('hide-on-print',this.checked)">
      인쇄 시 직인 제외
    </label>
    <button class="print-btn" onclick="window.print()">인쇄하기</button>
  </div>

  <div class="page">
    <div class="accent-top"></div>
    <div class="content">

      <div class="header">
        <h1>INVOICE</h1>
        <div class="sub">청 &nbsp; 구 &nbsp; 서</div>
      </div>
      <div class="header-line"></div>

      <table class="meta-table">
        <tr>
          <td class="label">청구번호</td>
          <td class="value" style="font-family:'Manrope',sans-serif;font-weight:700">${invoice.invoice_number}</td>
          <td class="label">발행일자</td>
          <td class="value">${formatDateKR(invoice.invoice_date)}</td>
        </tr>
        <tr>
          <td class="label">수 신</td>
          <td class="value" colspan="3" style="font-weight:700;font-size:11pt">${invoice.recipient}</td>
        </tr>
        ${invoice.description
          ? `<tr>
              <td class="label">내 용</td>
              <td class="value" colspan="3">${invoice.description}</td>
            </tr>`
          : ''}
      </table>

      ${flightHtml}
      ${passengerHtml}

      <div class="section-title hl">Charge Breakdown</div>
      <table class="fare-table">
        <thead>
          <tr>
            <th style="width:32%">구 분</th>
            <th style="width:24%">단 가</th>
            <th style="width:12%">인원</th>
            <th style="width:32%">금 액</th>
          </tr>
        </thead>
        <tbody>
          ${fareRowsHtml}
        </tbody>
      </table>

      <div class="total-card">
        <div style="display:table-cell;vertical-align:middle;text-align:left">
          <div style="font-family:'Manrope',sans-serif;font-weight:800;color:${gold};font-size:10pt;letter-spacing:2px;text-transform:uppercase">청구 금액</div>
          <div style="font-size:7.5pt;font-weight:500;color:#5d4201;margin-top:2px">모든 세금 및 수수료 포함</div>
        </div>
        <div style="display:table-cell;vertical-align:middle;text-align:right">
          <span style="font-size:9pt;font-weight:700;margin-right:4px;color:#5d4201">KRW</span>
          <span class="total-amount">${formatKRW(invoice.total_amount)}</span>
        </div>
      </div>

      ${balanceHtml}
      ${bankHtml}

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
        <span style="display:table-cell;text-align:left;font-size:7.5pt;color:#999">이 문서는 (유)여행세상에서 발행한 공식 청구서입니다.</span>
        <span style="display:table-cell;text-align:right;font-size:8pt;font-weight:700;color:${navy};letter-spacing:1.5px">IATA NO 173-2198-6 TRAVEL WORLD</span>
      </div>

    </div>
    <div class="accent-bottom"></div>
  </div>
</body>
</html>`;
}

const createInvoiceSchema = z.object({
  recipient: z.string().min(1, '수신인은 필수입니다.'),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD').optional(),
  description: z.string().optional(),
  airfare_unit_price: z.number().optional(),
  airfare_quantity: z.number().optional(),
  total_amount: z.number({ required_error: '총 금액은 필수입니다.' }),
});

// POST /api/invoices
invoicesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const invoice = await createInvoice(parsed.data);
    res.status(201).json({ success: true, data: { invoice } });
  } catch (err) {
    res.status(500).json({ success: false, error: '인보이스 생성 실패' });
  }
});

// PATCH /api/invoices/:id
invoicesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updateInvoice(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: '인보이스를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { invoice: updated } });
  } catch (err) {
    res.status(500).json({ success: false, error: '인보이스 수정 실패' });
  }
});

// DELETE /api/invoices/:id
invoicesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteInvoice(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: '인보이스를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '삭제되었습니다.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: '인보이스 삭제 실패' });
  }
});

// POST /api/invoices/multi — 여러 예약 합산 인보이스 생성
invoicesRouter.post('/multi', async (req: Request, res: Response) => {
  const { bookingIds } = req.body;
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    res.status(400).json({ success: false, error: '예약 ID 목록이 필요합니다.' });
    return;
  }
  try {
    const invoice = await createInvoiceFromMultipleBookings(bookingIds);
    res.status(201).json({ success: true, data: { invoice } });
  } catch (err) {
    console.error('[invoices] Multi-booking invoice failed:', err);
    res.status(500).json({ success: false, error: '다중 예약 인보이스 생성 실패' });
  }
});

// POST /api/bookings/:bookingId/invoice — 예약에서 인보이스 자동 생성
bookingInvoiceRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      res.status(400).json({ success: false, error: 'bookingId는 필수입니다.' });
      return;
    }
    const invoice = await createInvoiceFromBooking(bookingId);
    res.status(201).json({ success: true, data: { invoice } });
  } catch (err: any) {
    if (err.message === '예약을 찾을 수 없습니다.') {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    console.error('[invoices] Auto-create failed:', err);
    res.status(500).json({ success: false, error: '인보이스 자동 생성 실패' });
  }
});
