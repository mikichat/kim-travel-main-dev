// 예약 카드 상세 보기

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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
  segments: {
    seg_index: number;
    airline: string;
    flight_number: string;
    route_from: string;
    route_to: string;
    departure_date: string;
    departure_time: string;
    arrival_time: string;
    arrival_date: string;
  }[];
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

export default function ReservationCardPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
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

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      {error}
    </div>
  );
  if (!booking) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      예약 정보 없음
    </div>
  );

  const segments = booking.segments || [];
  const passengers = booking.passengers || [];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          ← 뒤로 가기
        </button>

        <div ref={cardRef} className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-5 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white">
            <div className="text-2xl font-bold tracking-wider">{booking.pnr}</div>
            <div className="text-sm opacity-80 mt-1">{booking.airline}</div>
          </div>

          {/* Flight Info */}
          <div className="p-4">
            {segments.length > 0 ? segments.map((seg, i) => (
              <div key={i} className={`${i < segments.length - 1 ? 'border-b border-gray-100 pb-4 mb-4' : ''}`}>
                <div className="text-xs text-gray-500 font-semibold mb-3">
                  {i === 0 ? '출발' : segments.length === 2 && i === 1 ? '귀국' : `구간 ${i + 1}`}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{seg.route_from}</div>
                    <div className="text-xs text-gray-400">{getAirportName(seg.route_from)}</div>
                    {seg.departure_time && <div className="text-sm font-semibold mt-1">{seg.departure_time}</div>}
                  </div>
                  <div className="flex-1 text-center text-gray-300">
                    <div className="text-xs">{seg.airline} {seg.flight_number}</div>
                    <div className="text-lg">✈</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{seg.route_to}</div>
                    <div className="text-xs text-gray-400">{getAirportName(seg.route_to)}</div>
                    {seg.arrival_time && <div className="text-sm font-semibold mt-1">{seg.arrival_time}</div>}
                  </div>
                </div>
                <div className="text-sm text-gray-500 text-center mt-2">
                  {formatDate(seg.departure_date)}
                  {seg.arrival_date && seg.arrival_date !== seg.departure_date && (
                    <span className="text-red-500 text-xs"> (도착: {formatDate(seg.arrival_date)})</span>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-center mb-4">
                <div className="flex justify-around items-center">
                  <div>
                    <div className="text-2xl font-bold">{booking.route_from}</div>
                    <div className="text-xs text-gray-400">{getAirportName(booking.route_from)}</div>
                  </div>
                  <span className="text-gray-300">✈</span>
                  <div>
                    <div className="text-2xl font-bold">{booking.route_to}</div>
                    <div className="text-xs text-gray-400">{getAirportName(booking.route_to)}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">{formatDate(booking.departure_date)}</div>
                {booking.return_date && <div className="text-sm text-gray-500">귀국: {formatDate(booking.return_date)}</div>}
              </div>
            )}
          </div>

          {/* Passengers */}
          {passengers.length > 0 && (
            <div className="px-4 py-4 border-t border-gray-100">
              <div className="text-sm font-semibold text-gray-700 mb-3">탑승객 ({passengers.length}명)</div>
              {passengers.map((p, i) => (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-orange-500 w-5">{i + 1}</span>
                  <span className="text-sm font-semibold">{p.name_kr || p.name_en}</span>
                  {p.name_kr && p.name_en && <span className="text-xs text-gray-400">{p.name_en}</span>}
                  {p.title && <span className="text-xs text-gray-400">{p.title}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Remarks */}
          {booking.remarks && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              <strong>참고:</strong> {booking.remarks}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}