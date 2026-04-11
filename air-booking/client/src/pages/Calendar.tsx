// @TASK P2-S4-T1 - 달력 화면
// @SPEC FullCalendar 월간 뷰, 이벤트 색상, 사이드 패널

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import '../styles/calendar.css';

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
  nmtl: '#DC2626',     // 빨강
  tl: '#F59E0B',       // 노랑
  departure: '#16A34A', // 초록
  bsp: '#2563EB',      // 파랑
};

const FILTER_LABELS: Record<FilterType, string> = {
  all: '전체',
  nmtl: 'NMTL 마감',
  tl: 'TL 마감',
  departure: '출발일',
  bsp: 'BSP 입금일',
};

export function Calendar() {
  const navigate = useNavigate();
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
    <div className="calendar-page">
      <div className="calendar-main">
        {/* Filter */}
        <div className="calendar-filter" role="group" aria-label="이벤트 필터">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
            >
              {f !== 'all' && (
                <span className="filter-dot" style={{ background: EVENT_COLORS[f] }} />
              )}
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* FullCalendar */}
        <div className="calendar-wrapper">
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
                navigate(`/bookings?highlight=${event.bookingId}`);
              }
            }}
            contentHeight="auto"
          />
        </div>
      </div>

      {/* Side Panel */}
      {selectedDate && (
        <aside className="calendar-sidebar">
          <div className="sidebar-header">
            <h3>{selectedDate}</h3>
            <button className="sidebar-close" onClick={() => setSelectedDate(null)} aria-label="닫기">
              ×
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="sidebar-empty">이 날짜에 일정이 없습니다.</p>
          ) : (
            <div className="sidebar-events">
              {selectedEvents.map((event) => (
                <div
                  key={event.id}
                  className="sidebar-event"
                  onClick={() => event.bookingId && navigate(`/bookings?highlight=${event.bookingId}`)}
                  role={event.bookingId ? 'button' : undefined}
                  tabIndex={event.bookingId ? 0 : undefined}
                >
                  <span className="sidebar-event-dot" style={{ background: EVENT_COLORS[event.type] }} />
                  <div className="sidebar-event-info">
                    <span className="sidebar-event-title">{event.title}</span>
                    <span className="sidebar-event-type">
                      {event.type === 'nmtl' ? 'NMTL 마감' :
                       event.type === 'tl' ? 'TL 마감' :
                       event.type === 'departure' ? '출발' : 'BSP 입금'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
