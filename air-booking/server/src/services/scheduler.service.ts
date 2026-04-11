// 알림 스케줄러 — node-cron + Nodemailer
// NMTL/TL/BSP 마감일 알림 (사용자별 hours_before 설정 반영)

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { getIntranetDb } from '../db/intranet';
import { cleanupExpiredBookings } from './bookings.service';
import { deleteExpiredTickets } from './tickets.service';
import { broadcastAlert } from './websocket.service';

let transporter: nodemailer.Transporter | null = null;
let scheduledTask: cron.ScheduledTask | null = null;

export function initMailTransporter(): void {
  const user = process.env.NOTIFY_EMAIL;
  const pass = process.env.NOTIFY_EMAIL_PASS;

  if (!user || !pass) {
    console.log('[알림] 이메일 설정 없음 (NOTIFY_EMAIL / NOTIFY_EMAIL_PASS) — 알림 비활성');
    return;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  transporter.verify((err) => {
    if (err) {
      console.error('[알림] 이메일 연결 실패:', err.message);
      transporter = null;
    } else {
      console.log('[알림] 이메일 알림 활성화됨 →', user);
    }
  });
}

interface DeadlineItem {
  type: 'NMTL' | 'TL' | 'BSP' | '출발';
  date: string;
  label: string;
  bookingId?: number;
  bspId?: number;
}

// 마감 임박 항목 조회
async function getUpcomingDeadlines(hoursAhead: number): Promise<DeadlineItem[]> {
  const db = await getIntranetDb();
  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const nowStr = now.toISOString().slice(0, 10);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const items: DeadlineItem[] = [];

  // NMTL 마감
  const nmtlRows = await db.all<{ id: number; pnr: string; name_kr: string | null; nmtl_date: string }[]>(
    `SELECT id, pnr, name_kr, nmtl_date FROM air_bookings
     WHERE nmtl_date BETWEEN ? AND ? AND status NOT IN ('cancelled', 'ticketed')`,
    [nowStr, cutoffStr]
  );
  for (const r of nmtlRows) {
    items.push({ type: 'NMTL', date: r.nmtl_date, label: `${r.name_kr || r.pnr} (PNR: ${r.pnr})`, bookingId: r.id });
  }

  // TL 마감
  const tlRows = await db.all<{ id: number; pnr: string; name_kr: string | null; tl_date: string }[]>(
    `SELECT id, pnr, name_kr, tl_date FROM air_bookings
     WHERE tl_date BETWEEN ? AND ? AND status NOT IN ('cancelled', 'ticketed')`,
    [nowStr, cutoffStr]
  );
  for (const r of tlRows) {
    items.push({ type: 'TL', date: r.tl_date, label: `${r.name_kr || r.pnr} (PNR: ${r.pnr})`, bookingId: r.id });
  }

  // 출발일
  const depRows = await db.all<{ id: number; pnr: string; name_kr: string | null; departure_date: string }[]>(
    `SELECT id, pnr, name_kr, departure_date FROM air_bookings
     WHERE departure_date BETWEEN ? AND ? AND status NOT IN ('cancelled')`,
    [nowStr, cutoffStr]
  );
  for (const r of depRows) {
    items.push({ type: '출발', date: r.departure_date, label: `${r.name_kr || r.pnr} (PNR: ${r.pnr})`, bookingId: r.id });
  }

  // BSP 입금일 (인트라넷 DB 통합)
  const bspRows = await db.all<{ id: number; payment_date: string; description: string | null }[]>(
    `SELECT id, payment_date, description FROM air_bsp_dates
     WHERE payment_date BETWEEN ? AND ? AND is_notified = 0`,
    [nowStr, cutoffStr]
  );
  for (const r of bspRows) {
    items.push({ type: 'BSP', date: r.payment_date, label: r.description || 'BSP 입금일', bspId: r.id });
  }

  return items;
}

// 알림 이메일 발송
async function sendAlertEmail(items: DeadlineItem[], hoursLabel: string): Promise<void> {
  // WebSocket으로 브라우저 실시간 알림 브로드캐스트
  if (items.length > 0) {
    broadcastAlert({
      type: 'deadline_alert',
      items: items.map(i => ({ type: i.type, date: i.date, label: i.label })),
    });
  }

  if (!transporter || items.length === 0) return;

  const to = process.env.NOTIFY_EMAIL_TO || process.env.NOTIFY_EMAIL;
  if (!to) return;

  const rows = items
    .map((item) => {
      const color = item.type === 'NMTL' ? '#DC2626' : item.type === 'TL' ? '#F59E0B' : item.type === 'BSP' ? '#2563EB' : '#16A34A';
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><span style="color:${color};font-weight:700;">${item.type}</span></td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.label}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.date}</td>
      </tr>`;
    })
    .join('');

  const html = `
    <div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
        <h2 style="margin:0;">항공 예약 마감일 알림</h2>
        <p style="margin:8px 0 0;opacity:0.9;">${hoursLabel} 이내 마감 ${items.length}건</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:16px;border-radius:0 0 12px 12px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:8px;text-align:left;">유형</th>
            <th style="padding:8px;text-align:left;">내용</th>
            <th style="padding:8px;text-align:left;">마감일</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:16px;font-size:12px;color:#9ca3af;">이 알림은 자동 발송됩니다. 설정 변경은 시스템 설정 페이지에서 가능합니다.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"항공예약관리" <${process.env.NOTIFY_EMAIL}>`,
      to,
      subject: `[항공예약] 마감 임박 ${items.length}건 (${hoursLabel} 이내)`,
      html,
    });
    console.log(`[알림] 이메일 발송 완료 — ${items.length}건`);

    // BSP 항목은 알림 발송 완료 표시 (인트라넷 DB)
    const bspDb = await getIntranetDb();
    for (const item of items) {
      if (item.bspId) {
        await bspDb.run('UPDATE air_bsp_dates SET is_notified = 1 WHERE id = ?', [item.bspId]);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[알림] 이메일 발송 실패:', message);
  }
}

// 스케줄러 체크 실행
async function runAlertCheck(): Promise<void> {
  try {
    const db = await getIntranetDb();

    // 활성화된 알림 설정 조회 (사용자별 hours_before)
    const settings = await db.all<{ hours_before: number }[]>(
      'SELECT DISTINCT hours_before FROM air_alert_settings WHERE enabled = 1'
    );

    if (settings.length === 0) {
      // 기본값: 24시간
      const items = await getUpcomingDeadlines(24);
      await sendAlertEmail(items, '24시간');
      return;
    }

    // 각 hours_before 설정에 대해 체크
    for (const s of settings) {
      const items = await getUpcomingDeadlines(s.hours_before);
      await sendAlertEmail(items, `${s.hours_before}시간`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[알림] 스케줄러 오류:', message);
  }
}

// 스케줄러 시작 — 매 시간 정각에 실행
export function startScheduler(): void {
  if (process.env.JEST_WORKER_ID) return; // 테스트 환경에서는 실행 안 함

  initMailTransporter();

  // 매 시간 정각 (0분)에 체크
  scheduledTask = cron.schedule('0 * * * *', () => {
    console.log('[알림] 스케줄러 체크 실행:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    runAlertCheck().catch(err => console.error('[알림] 스케줄러 오류:', err));
  });

  // 매일 자정 — 귀국 후 3일 지난 예약 자동 삭제 + 5년 만료 티켓 삭제
  cron.schedule('0 0 * * *', () => {
    console.log('[정리] 만료 예약/티켓 삭제 체크:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    cleanupExpiredBookings().catch(err => console.error('[정리] 만료 예약 삭제 오류:', err));
    deleteExpiredTickets().catch(err => console.error('[정리] 만료 티켓 삭제 오류:', err));
  });

  // 매주 일요일 03:00 — DB 무결성 검증 + WAL 체크포인트 + REINDEX
  cron.schedule('0 3 * * 0', async () => {
    console.log('[DB 점검] 주간 무결성 검증 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    try {
      const db = await getIntranetDb();
      const check = await db.get<{ integrity_check: string }>('PRAGMA integrity_check');
      if (check?.integrity_check !== 'ok') {
        console.error('[DB 점검] 무결성 오류 감지:', check?.integrity_check);
        await db.run('REINDEX');
        const recheck = await db.get<{ integrity_check: string }>('PRAGMA integrity_check');
        console.log('[DB 점검] REINDEX 후:', recheck?.integrity_check);
      } else {
        console.log('[DB 점검] 무결성 OK');
      }
      await db.run('PRAGMA wal_checkpoint(TRUNCATE)');
      console.log('[DB 점검] WAL 체크포인트 완료');

      // 고아 레코드 정리
      const orphanPax = await db.run('DELETE FROM air_booking_passengers WHERE booking_id NOT IN (SELECT id FROM air_bookings)');
      const orphanSeg = await db.run('DELETE FROM air_booking_segments WHERE booking_id NOT IN (SELECT id FROM air_bookings)');
      if ((orphanPax.changes || 0) + (orphanSeg.changes || 0) > 0) {
        console.log(`[DB 점검] 고아 레코드 정리: passengers ${orphanPax.changes || 0}건, segments ${orphanSeg.changes || 0}건`);
      }
    } catch (err) {
      console.error('[DB 점검] 실패:', err);
    }
  });

  console.log('[알림] 스케줄러 시작됨 — 매 시간 알림, 매일 자정 만료 삭제, 매주 일요일 DB 점검');

  // 서버 시작 시 즉시 1회 실행
  runAlertCheck().catch(err => console.error('[알림] 스케줄러 오류:', err));
  cleanupExpiredBookings().catch(err => console.error('[정리] 만료 예약 삭제 오류:', err));
  deleteExpiredTickets().catch(err => console.error('[정리] 만료 티켓 삭제 오류:', err));
}

// 스케줄러 중지
export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

// 테스트용 export
export { getUpcomingDeadlines, sendAlertEmail, runAlertCheck };
