// @TASK P2-S3-T1 - 예약장부 유틸리티 함수

import type { Booking, Segment } from './types';

export function buildShareText(b: Booking): string {
  const paxList = b.passengers || [];
  const paxCount = paxList.length || b.pax_count || 1;

  const lines = [
    '━━━━━━━━━━━━━━━━━━━━',
    `🎫 예약번호: ${b.pnr}`,
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    `✈️ ${b.airline || ''} ${b.flight_number || ''}`,
    `📍 ${b.route_from || '---'} → ${b.route_to || '---'}`,
    `📅 ${b.departure_date || '-'}`,
    '',
  ];

  if (b.nmtl_date) lines.push(`⏰ 발권마감(NMTL): ${b.nmtl_date}`);
  if (b.tl_date) lines.push(`⏰ TL: ${b.tl_date}`);

  // 승객 명단
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`👥 탑승객 (${paxCount}명)`);
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  if (paxList.length > 0) {
    paxList.forEach((p, i) => {
      const name = p.name_en || p.name_kr || '-';
      const title = p.title ? ` ${p.title}` : '';
      lines.push(`${i + 1}. ${name}${title}`);
    });
  } else {
    const name = b.name_en || b.name_kr || '-';
    lines.push(`1. ${name}`);
  }

  if (b.remarks) {
    lines.push('');
    lines.push(`📝 ${b.remarks}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

/** segments 필드 또는 flight_number '/' 분리로 구간 추출 */
export function parseSegments(b: Booking): Segment[] {
  // segments 배열이 있으면 우선 사용
  if (b.segments && b.segments.length > 0) {
    return b.segments.map(s => ({
      id: s.id,
      flight: s.flight_number,
      from: s.route_from,
      to: s.route_to,
      date: s.departure_date,
      departureTime: s.departure_time || '',
      arrivalTime: s.arrival_time || '',
    }));
  }

  // flight_number에 / 가 있으면 왕복
  const flights = (b.flight_number || '').split(/\s*\/\s*/).filter(Boolean);
  if (flights.length > 1) {
    return flights.map((f, i) => ({
      flight: f,
      from: i === 0 ? (b.route_from || '---') : (b.route_to || '---'),
      to: i === 0 ? (b.route_to || '---') : (b.route_from || '---'),
      date: b.departure_date || '-',
    }));
  }

  // 단일 구간
  return [{
    flight: `${b.airline || ''} ${b.flight_number || ''}`.trim(),
    from: b.route_from || '---',
    to: b.route_to || '---',
    date: b.departure_date || '-',
  }];
}
