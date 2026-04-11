// @TASK P2-S4-T1 - 달력 화면
// @SPEC FullCalendar 월간 뷰, 이벤트 색상, 사이드 패널

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Booking {
  id: string;
  pnr: string;
  name_kr: string | null;
  airline: string | null;
  flight_number: string | null;
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

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  color: string;
  type: 'nmtl' | 'tl' | 'departure' | 'bsp';
  bookingId?: string;
  bspId?: string;
}

type FilterType = 'all' | 'nmtl' | 'tl' | 'departure' | 'bsp';

const EVENT_COLORS = {
  nmtl: '#DC2626',
  tl: '#F59E0B',
  departure: '#16A34A',
  bsp: '#2563EB',
};

const FILTER_LABELS: Record<FilterType, string> = {
  all: '전체',
  nmtl: 'NMTL 마감',
  tl: 'TL 마감',
  departure: '출발일',
  bsp: 'BSP 입금일',
};

export default function CalendarPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bspDates, setBspDates] = useState<BspDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, bspRes] = await Promise.all([
          fetch('/api/bookings?limit=500', { credentials: 'include' }),
          fetch('/api/bsp-dates', { credentials: 'include' }),
        ]);
        const bookingsData = await bookingsRes.json();
        const bspData = await bspRes.json();

        if (bookingsData.success) setBookings(bookingsData.data.bookings);
        if (bspData.success) setBspDates(bspData.data.bspDates);
      } catch {
        // error handled silently
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [];

    for (const b of bookings) {
      if (b.status === 'cancelled') continue;

      if (b.nmtl_date && (filter === 'all' || filter === 'nmtl')) {
        result.push({
          id: `nmtl-${b.id}`,
          title: `NMTL ${b.name_kr || b.pnr}`,
          date: b.nmtl_date,
          color: EVENT_COLORS.nmtl,
          type: 'nmtl',
          bookingId: b.id,
        });
      }
      if (b.tl_date && (filter === 'all' || filter === 'tl')) {
        result.push({
          id: `tl-${b.id}`,
          title: `TL ${b.name_kr || b.pnr}`,
          date: b.tl_date,
          color: EVENT_COLORS.tl,
          type: 'tl',
          bookingId: b.id,
        });
      }
      if (b.departure_date && (filter === 'all' || filter === 'departure')) {
        result.push({
          id: `dep-${b.id}`,
          title: `${b.airline || ''} ${b.name_kr || b.pnr}`,
          date: b.departure_date,
          color: EVENT_COLORS.departure,
          type: 'departure',
          bookingId: b.id,
        });
      }
    }

    if (filter === 'all' || filter === 'bsp') {
      for (const bsp of bspDates) {
        const typeLabel = bsp.type === 'billing' ? '청구' : bsp.type === 'report' ? '보고' : '입금';
        const isPayment = bsp.type === 'payment' || !bsp.type;
        result.push({
          id: `bsp-${bsp.id}`,
          title: `BSP ${typeLabel} ${bsp.description || ''}${bsp.is_notified ? ' ✓' : ''}`.trim(),
          date: bsp.payment_date,
          color: bsp.type === 'billing' ? '#1d4ed8' : isPayment ? '#ea580c' : '#ca8a04',
          type: 'bsp',
          bspId: bsp.id,
        });
      }
    }

    return result;
  }, [bookings, bspDates, filter]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => e.date === selectedDate);
  }, [events, selectedDate]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex gap-6">
        {/* Main Calendar Area */}
        <div className="flex-1">
          {/* Filter */}
          <div className="flex gap-2 mb-4" role="group" aria-label="이벤트 필터">
            {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {f !== 'all' && (
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ background: EVENT_COLORS[f] }}
                  />
                )}
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {/* FullCalendar */}
          <div className="bg-white rounded-lg shadow p-4">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="ko"
              headerToolbar={{
                left: 'prev',
                center: 'title',
                right: 'next today',
              }}
              height="auto"
              events={events.map((e) => ({
                id: e.id,
                title: e.title,
                date: e.date,
                backgroundColor: e.color,
                borderColor: e.color,
              }))}
              dateClick={(info) => setSelectedDate(info.dateStr)}
              eventClick={(info) => {
                const event = events.find((e) => e.id === info.event.id);
                if (event?.bookingId) {
                  router.push(`/bookings?highlight=${event.bookingId}`);
                }
              }}
              contentHeight="auto"
            />
          </div>
        </div>

        {/* Side Panel */}
        {selectedDate && (
          <aside className="w-80 bg-white rounded-lg shadow p-4 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedDate}</h3>
              <button
                onClick={() => setSelectedDate(null)}
                aria-label="닫기"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              >
                ×
              </button>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">이 날짜에 일정이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => event.bookingId && router.push(`/bookings?highlight=${event.bookingId}`)}
                    role={event.bookingId ? 'button' : undefined}
                    tabIndex={event.bookingId ? 0 : undefined}
                    className={`p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors ${
                      event.bookingId ? '' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                        style={{ background: EVENT_COLORS[event.type] }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">
                          {event.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {event.type === 'nmtl' ? 'NMTL 마감' :
                           event.type === 'tl' ? 'TL 마감' :
                           event.type === 'departure' ? '출발' : 'BSP 입금'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
