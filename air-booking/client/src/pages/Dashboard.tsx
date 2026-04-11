// @TASK P2-S2-T1 - 대시보드 화면
// @SPEC 7일 롤링 달력, 오늘 마감 항목, 바로가기 버튼

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge, type BadgeStatus } from '../components/common/StatusBadge';
import '../styles/dashboard.css';

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

/** NMTL: 3일 전부터, TL: 5일 전부터 표시 */
function isWithinDisplayRange(dateStr: string | null, daysBefore: number): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysBefore;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bspDates, setBspDates] = useState<BspDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0); // index in 7-day strip

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

  // 7일 롤링 달력
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

  // 오늘 마감 항목 (긴급도순)
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
        const order: Record<BadgeStatus, number> = { urgent: 0, imminent: 1, completed: 2, pending: 3 };
        return order[a.urgency] - order[b.urgency];
      });

    return urgentBookings;
  }, [bookings]);

  if (loading) return <LoadingSpinner />;

  if (fetchError) return <div className="error-message">데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</div>;

  const selected = weekDays[selectedDay];

  return (
    <div className="dashboard">
      {/* 7일 롤링 달력 */}
      <section className="dashboard-section">
        <h2 className="section-title">이번 주 일정</h2>
        <div className="week-strip" role="tablist" aria-label="7일 달력">
          {weekDays.map((day, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === selectedDay}
              className={`week-day ${i === selectedDay ? 'active' : ''} ${day.isToday ? 'today' : ''}`}
              onClick={() => setSelectedDay(i)}
            >
              <span className="week-day-name">{day.dayName}</span>
              <span className="week-day-date">{day.label}</span>
              {(day.bookings.length > 0 || day.bspDates.length > 0) && (
                <span className="week-day-dot" aria-label={`${day.bookings.length + day.bspDates.length}건`} />
              )}
            </button>
          ))}
        </div>

        {/* 선택된 날짜 이벤트 */}
        {selected && (
          <div className="day-events">
            {selected.bookings.length === 0 && selected.bspDates.length === 0 ? (
              <p className="empty-message">일정이 없습니다.</p>
            ) : (
              <>
                {selected.bspDates.map((bsp) => {
                  const isBilling = bsp.type === 'billing';
                  const typeLabel = bsp.type === 'billing' ? '청구' : bsp.type === 'report' ? '보고' : '입금';
                  return (
                    <div key={`bsp-${bsp.id}`} className={`event-item event-bsp${isBilling ? ' event-bsp--billing' : ''}`}>
                      <span className={`event-tag tag-bsp tag-bsp--${bsp.type || 'payment'}`}>{typeLabel}</span>
                      <span className="event-text">{bsp.description || `BSP ${typeLabel}일`}{bsp.is_notified ? ' ✓' : ''}</span>
                    </div>
                  );
                })}
                {selected.bookings.map((b) => (
                  <div
                    key={`booking-${b.id}`}
                    className="event-item event-booking"
                    onClick={() => navigate(`/bookings?highlight=${b.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="event-tag tag-booking">{b.airline || 'AIR'}</span>
                    <span className="event-text">
                      {b.name_kr || b.pnr} — {b.flight_number || ''}
                    </span>
                    <StatusBadge status={getUrgency(b.nmtl_date || b.tl_date || b.departure_date)} />
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* 오늘 마감 항목 */}
      <section className="dashboard-section">
        <h2 className="section-title">
          마감 임박 <span className="count-badge">{todayItems.length}</span>
        </h2>
        {todayItems.length === 0 ? (
          <p className="empty-message">긴급 마감 항목이 없습니다.</p>
        ) : (
          <div className="deadline-table-wrap">
            <table className="deadline-table">
              <thead>
                <tr>
                  <th>상태</th>
                  <th>승객</th>
                  <th>유형</th>
                  <th>마감일</th>
                  <th>항공편</th>
                </tr>
              </thead>
              <tbody>
                {todayItems.map((item, i) => (
                  <tr
                    key={i}
                    className="deadline-row"
                    onClick={() => navigate(`/bookings?highlight=${item.booking.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <td><StatusBadge status={item.urgency} /></td>
                    <td className="deadline-name">{item.booking.name_kr || item.booking.pnr}</td>
                    <td><span className={`deadline-type type-${item.type.toLowerCase()}`}>{item.type}</span></td>
                    <td className="deadline-date">{item.date}</td>
                    <td className="deadline-flight">{item.booking.airline} {item.booking.flight_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 바로가기 */}
      <section className="dashboard-section">
        <h2 className="section-title">바로가기</h2>
        <div className="quick-actions">
          <button className="quick-btn" onClick={() => navigate('/bookings')}>
            <span className="quick-icon">✈</span>
            <span>새 예약</span>
          </button>
          <button className="quick-btn" onClick={() => navigate('/calendar')}>
            <span className="quick-icon">📅</span>
            <span>달력</span>
          </button>
          <button className="quick-btn" onClick={() => navigate('/settlements')}>
            <span className="quick-icon">💰</span>
            <span>정산</span>
          </button>
        </div>
      </section>
    </div>
  );
}
