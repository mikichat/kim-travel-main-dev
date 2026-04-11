// 고객 안내문 발송 서비스
// 예약 확정 시 고객에게 영문이름/좌석/일정 확인 이메일 발송

import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export function initNotificationMailer(): void {
  const user = process.env.NOTIFY_EMAIL;
  const pass = process.env.NOTIFY_EMAIL_PASS;
  if (!user || !pass) return;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

export interface NoticeData {
  to: string;
  name_kr: string;
  name_en: string;
  pnr: string;
  airline: string;
  flight_number: string;
  route_from: string;
  route_to: string;
  departure_date: string;
  seat_number: string;
  passport_number: string;
}

export async function sendBookingNotice(data: NoticeData): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    return { success: false, error: '이메일 설정이 되어 있지 않습니다.' };
  }

  const html = `
    <div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h2 style="margin:0;">항공 예약 확인 안내</h2>
        <p style="margin:8px 0 0;opacity:0.9;">${data.name_kr}님의 예약 정보입니다</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="color:#374151;margin-bottom:16px;">아래 예약 정보를 확인해주시고, 수정 사항이 있으면 연락 부탁드립니다.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;width:120px;">예약번호 (PNR)</td>
            <td style="padding:10px 8px;font-weight:600;">${data.pnr}</td>
          </tr>
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;">영문 성명</td>
            <td style="padding:10px 8px;font-weight:600;">${data.name_en}</td>
          </tr>
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;">항공편</td>
            <td style="padding:10px 8px;">${data.airline} ${data.flight_number}</td>
          </tr>
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;">구간</td>
            <td style="padding:10px 8px;">${data.route_from} → ${data.route_to}</td>
          </tr>
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;">출발일</td>
            <td style="padding:10px 8px;">${data.departure_date}</td>
          </tr>
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;">좌석</td>
            <td style="padding:10px 8px;">${data.seat_number || '미배정'}</td>
          </tr>
          <tr>
            <td style="padding:10px 8px;color:#6b7280;">여권번호</td>
            <td style="padding:10px 8px;">${data.passport_number ? data.passport_number.slice(0, 2) + '***' + data.passport_number.slice(-2) : '-'}</td>
          </tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#EFF6FF;border-radius:8px;">
          <p style="margin:0;font-size:13px;color:#1D4ED8;">
            <strong>확인 부탁드립니다:</strong><br/>
            1. 영문 성명이 여권과 동일한지<br/>
            2. 출발일 및 구간이 정확한지<br/>
            3. 여권 유효기간이 6개월 이상 남아있는지
          </p>
        </div>
        <p style="margin-top:16px;font-size:12px;color:#9ca3af;">
          본 메일은 여행세상에서 자동 발송된 안내 메일입니다.
          문의사항은 담당자에게 연락 부탁드립니다.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"여행세상" <${process.env.NOTIFY_EMAIL}>`,
      to: data.to,
      subject: `[여행세상] 항공 예약 확인 — ${data.name_kr}님 (${data.pnr})`,
      html,
    });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
