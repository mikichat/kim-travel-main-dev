import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ImageCopyButton } from '../components/shared/ImageCopyButton';

interface BookingData {
  id: string;
  pnr: string;
  airline: string;
  flight_number: string;
  route_from: string;
  route_to: string;
  departure_date: string;
  return_date: string;
  status: string;
  remarks: string;
  segments: { seg_index: number; airline: string; flight_number: string; route_from: string; route_to: string; departure_date: string; departure_time: string; arrival_time: string; arrival_date: string }[];
  passengers: { name_en: string; name_kr: string; title: string }[];
}

const AIRPORT_NAMES: Record<string, string> = {
  ICN: '서울(인천)', GMP: '서울(김포)', PUS: '부산', CJU: '제주',
  NRT: '도쿄(나리타)', HND: '도쿄(하네다)', KIX: '오사카', FUK: '후쿠오카',
  LHR: '런던', CDG: '파리', FRA: '프랑크푸르트', FCO: '로마',
  JFK: '뉴욕', LAX: '로스앤젤레스', SFO: '샌프란시스코',
  SIN: '싱가포르', BKK: '방콕', HKG: '홍콩', PEK: '베이징', PVG: '상하이',
  SYD: '시드니', CAN: '광저우', TPE: '타이베이', MNL: '마닐라',
  DPS: '발리', SGN: '호치민', HAN: '하노이', DAD: '다낭',
};

function getAirportName(code: string): string {
  return AIRPORT_NAMES[code] || code;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export function ReservationCard() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetch(`/api/bookings/${id}`, { credentials: 'include', signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.success) setBooking(data.data.booking);
        else setError('예약 정보를 찾을 수 없습니다.');
      })
      .catch((e) => { if (e.name !== 'AbortError') setError('서버 연결 실패'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  if (loading) return <div style={centerStyle}>로딩 중...</div>;
  if (error) return <div style={centerStyle}>{error}</div>;
  if (!booking) return <div style={centerStyle}>예약 정보 없음</div>;

  const segments = booking.segments || [];
  const passengers = booking.passengers || [];

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div ref={cardRef} style={cardStyle}>
        {/* Header */}
        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', borderRadius: '12px 12px 0 0' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '2px' }}>{booking.pnr}</div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>{booking.airline}</div>
        </div>

        {/* Flight Info */}
        <div style={{ padding: '16px 20px' }}>
          {segments.length > 0 ? segments.map((seg, i) => (
            <div key={i} style={{ marginBottom: i < segments.length - 1 ? '16px' : '0', paddingBottom: i < segments.length - 1 ? '16px' : '0', borderBottom: i < segments.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
                {i === 0 ? '출발' : segments.length === 2 && i === 1 ? '귀국' : `구간 ${i + 1}`}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{seg.route_from}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{getAirportName(seg.route_from)}</div>
                  {seg.departure_time && <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{seg.departure_time}</div>}
                </div>
                <div style={{ flex: 1, textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: '11px' }}>{seg.airline} {seg.flight_number}</div>
                  <div>✈</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{seg.route_to}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{getAirportName(seg.route_to)}</div>
                  {seg.arrival_time && <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{seg.arrival_time}</div>}
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#475569', textAlign: 'center', marginTop: '6px' }}>
                {formatDate(seg.departure_date)}
                {seg.arrival_date && seg.arrival_date !== seg.departure_date && (
                  <span style={{ color: '#ef4444', fontSize: '11px' }}> (도착: {formatDate(seg.arrival_date)})</span>
                )}
              </div>
            </div>
          )) : (
            // segments 없을 때 기본 정보
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div><div style={{ fontSize: '24px', fontWeight: 700 }}>{booking.route_from}</div><div style={{ fontSize: '12px', color: '#64748b' }}>{getAirportName(booking.route_from)}</div></div>
                <span style={{ color: '#94a3b8' }}>✈</span>
                <div><div style={{ fontSize: '24px', fontWeight: 700 }}>{booking.route_to}</div><div style={{ fontSize: '12px', color: '#64748b' }}>{getAirportName(booking.route_to)}</div></div>
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '8px' }}>{formatDate(booking.departure_date)}</div>
              {booking.return_date && <div style={{ fontSize: '13px', color: '#475569' }}>귀국: {formatDate(booking.return_date)}</div>}
            </div>
          )}
        </div>

        {/* Passengers */}
        {passengers.length > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
              탑승객 ({passengers.length}명)
            </div>
            {passengers.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', minWidth: '20px' }}>{i + 1}</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.name_kr || p.name_en}</span>
                {p.name_kr && p.name_en && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{p.name_en}</span>}
                {p.title && <span style={{ fontSize: '10px', color: '#94a3b8' }}>{p.title}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Remarks */}
        {booking.remarks && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
            <strong>참고:</strong> {booking.remarks}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', gap: '8px' }}>
        <ImageCopyButton targetRef={cardRef as React.RefObject<HTMLElement>} label="카드 복사" />
      </div>
    </div>
  );
}

const centerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: '#94a3b8' };
const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' };
