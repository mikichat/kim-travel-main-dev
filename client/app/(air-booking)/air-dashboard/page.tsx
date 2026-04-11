'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBadge, type BadgeStatus } from '@/components/common/StatusBadge';

interface Booking {
  id: string;
  pnr: string;
  name_kr: string;
  airline: string;
  flight_number: string;
  nmtl_date: string | null;
  tl_date: string | null;
  departure_date: string | null;
  status: string;
}

interface BspDate {
  id: string;
  payment_date: string;
  description: string | null;
  type: string;
  is_notified: number;
}

interface DayItem {
  date: Date;
  label: string;
  dayName: string;
  isToday: boolean;
  bookings: Booking[];
  bspDates: BspDate[];
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getUrgency(dateStr: string | null, daysBeforeThreshold = 3): BadgeStatus {
  if (!dateStr) return 'pending';
  const todayStr = formatDate(new Date());
  if (dateStr < todayStr) return 'completed';
  if (dateStr === todayStr) return 'urgent';
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysBeforeThreshold);
  if (dateStr <= formatDate(threshold)) return 'imminent';
  return 'pending';
}

function isWithinDisplayRange(dateStr: string | null, daysBefore: number): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysBefore;
}

export default function AirBookingDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bspDates, setBspDates] = useState<BspDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, bspRes] = await Promise.all([
          fetch('/api/bookings?limit=100', { credentials: 'include' }),
          fetch('/api/bsp-dates', { credentials: 'include' }),
        ]);
        const bookingsData = await bookingsRes.json();
        const bspData = await bspRes.json();

        if (bookingsData.success) setBookings(bookingsData.data.bookings);
        if (bspData.success) setBspDates(bspData.data.bspDates);
      } catch (err) {
        console.error('[dashboard] Failed to fetch data:', err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const weekDays = useMemo<DayItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = formatDate(date);

      const dayBookings = bookings.filter((b) => {
        const nmtlMatch = b.nmtl_date === dateStr && isWithinDisplayRange(b.nmtl_date, 3);
        const tlMatch = b.tl_date === dateStr && isWithinDisplayRange(b.tl_date, 5);
        return nmtlMatch || tlMatch || b.departure_date === dateStr;
      });

      const dayBsp = bspDates.filter((d) => d.payment_date === dateStr);

      return {
        date,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        dayName: dayNames[date.getDay()],
        isToday: i === 0,
        bookings: dayBookings,
        bspDates: dayBsp,
      };
    });
  }, [bookings, bspDates]);

  const todayItems = useMemo(() => {
    const urgentBookings = bookings
      .filter((b) => b.status !== 'cancelled')
      .map((b) => {
        const deadlines: { type: string; date: string; urgency: BadgeStatus }[] = [];
        if (b.nmtl_date && isWithinDisplayRange(b.nmtl_date, 3)) deadlines.push({ type: 'NMTL', date: b.nmtl_date, urgency: getUrgency(b.nmtl_date, 3) });
        if (b.tl_date && isWithinDisplayRange(b.tl_date, 5)) deadlines.push({ type: 'TL', date: b.tl_date, urgency: getUrgency(b.tl_date, 5) });
        if (b.departure_date) deadlines.push({ type: '출발', date: b.departure_date, urgency: getUrgency(b.departure_date) });
        return deadlines.map((d) => ({ ...d, booking: b }));
      })
      .flat()
      .filter((item) => item.urgency === 'urgent' || item.urgency === 'imminent')
      .sort((a, b) => {
        const order: Record<BadgeStatus, number> = { urgent: 0, imminent: 1, completed: 2, pending: 3, confirmed: 4, ticketed: 5, cancelled: 6 };
        return order[a.urgency] - order[b.urgency];
      });

    return urgentBookings;
  }, [bookings]);

  if (loading) return <LoadingSpinner />;

  if (fetchError) return <div className="error-message">데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</div>;

  const selected = weekDays[selectedDay];

  return (
    <div className="dashboard p-6">
      {/* 7일 롤링 달력 */}
      <section className="dashboard-section mb-6">
        <h2 className="section-title text-lg font-semibold mb-4">이번 주 일정</h2>
        <div className="week-strip flex gap-2 mb-4" role="tablist" aria-label="7일 달력">
          {weekDays.map((day, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === selectedDay}
              className={`week-day px-4 py-2 rounded-lg ${i === selectedDay ? 'bg-blue-100' : ''} ${day.isToday ? 'border-2 border-blue-500' : ''}`}
              onClick={() => setSelectedDay(i)}
            >
              <span className="block text-sm">{day.dayName}</span>
              <span className="block font-medium">{day.label}</span>
              {(day.bookings.length > 0 || day.bspDates.length > 0) && (
                <span className="block text-xs text-blue-600">•</span>
              )}
            </button>
          ))}
        </div>

        {/* 선택된 날짜 이벤트 */}
        {selected && (
          <div className="day-events">
            {selected.bookings.length === 0 && selected.bspDates.length === 0 ? (
              <p className="text-gray-500">일정이 없습니다.</p>
            ) : (
              <>
                {selected.bspDates.map((bsp) => {
                  const isBilling = bsp.type === 'billing';
                  const typeLabel = bsp.type === 'billing' ? '청구' : bsp.type === 'report' ? '보고' : '입금';
                  return (
                    <div key={`bsp-${bsp.id}`} className="event-item p-2 mb-2 bg-gray-50 rounded">
                      <span className={`event-tag inline-block px-2 py-1 text-xs rounded ${isBilling ? 'bg-purple-100' : 'bg-green-100'}`}>
                        {typeLabel}
                      </span>
                      <span className="ml-2">{bsp.description || `BSP ${typeLabel}일`}{bsp.is_notified ? ' ✓' : ''}</span>
                    </div>
                  );
                })}
                {selected.bookings.map((b) => (
                  <div
                    key={`booking-${b.id}`}
                    className="event-item p-2 mb-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100"
                    onClick={() => router.push(`/bookings?highlight=${b.id}`)}
                  >
                    <span className="inline-block px-2 py-1 text-xs bg-blue-200 rounded mr-2">{b.airline || 'AIR'}</span>
                    <span>{b.name_kr || b.pnr} — {b.flight_number || ''}</span>
                    <StatusBadge status={getUrgency(b.nmtl_date || b.tl_date || b.departure_date)} />
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* 오늘 마감 항목 */}
      <section className="dashboard-section mb-6">
        <h2 className="section-title text-lg font-semibold mb-4">
          마감 임박 <span className="count-badge bg-red-500 text-white px-2 py-1 rounded-full text-sm">{todayItems.length}</span>
        </h2>
        {todayItems.length === 0 ? (
          <p className="text-gray-500">긴급 마감 항목이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs">상태</th>
                  <th className="px-4 py-2 text-left text-xs">승객</th>
                  <th className="px-4 py-2 text-left text-xs">유형</th>
                  <th className="px-4 py-2 text-left text-xs">마감일</th>
                  <th className="px-4 py-2 text-left text-xs">항공편</th>
                </tr>
              </thead>
              <tbody>
                {todayItems.map((item, i) => (
                  <tr
                    key={i}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/bookings?highlight=${item.booking.id}`)}
                  >
                    <td className="px-4 py-2"><StatusBadge status={item.urgency} /></td>
                    <td className="px-4 py-2">{item.booking.name_kr || item.booking.pnr}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-1 text-xs rounded ${item.type === 'NMTL' ? 'bg-orange-100' : item.type === 'TL' ? 'bg-yellow-100' : 'bg-green-100'}`}>{item.type}</span></td>
                    <td className="px-4 py-2">{item.date}</td>
                    <td className="px-4 py-2">{item.booking.airline} {item.booking.flight_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 바로가기 */}
      <section className="dashboard-section">
        <h2 className="section-title text-lg font-semibold mb-4">바로가기</h2>
        <div className="quick-actions flex gap-4">
          <button className="quick-btn px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600" onClick={() => router.push('/bookings')}>
            <span className="block">✈</span>
            <span>새 예약</span>
          </button>
          <button className="quick-btn px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600" onClick={() => router.push('/calendar')}>
            <span className="block">📅</span>
            <span>달력</span>
          </button>
          <button className="quick-btn px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600" onClick={() => router.push('/settlements')}>
            <span className="block">💰</span>
            <span>정산</span>
          </button>
        </div>
      </section>
    </div>
  );
}
