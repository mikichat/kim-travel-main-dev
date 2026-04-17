'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plane,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  FileText,
  Users,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBadge, type BadgeStatus } from '@/components/common/StatusBadge';
import { StatsCard } from '@/components/common/StatsCard';
import { QuickSearchModal } from '@/components/common/QuickSearchModal';

interface Booking {
  id: string;
  pnr: string;
  name_kr: string;
  name_en: string;
  agency: string;
  airline: string;
  flight_number: string;
  route_from: string;
  route_to: string;
  departure_date: string | null;
  nmtl_date: string | null;
  tl_date: string | null;
  status: string;
  pax_count: number;
  fare: number | null;
  created_at: string;
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

interface SearchResult {
  id: string;
  type: 'booking' | 'customer' | 'invoice';
  title: string;
  subtitle: string;
  metadata?: string;
  onClick: () => void;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return `${date.getMonth() + 1}/${date.getDate()} (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
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

function getDaysUntil(dateStr: string | null): string {
  if (!dateStr) return '-';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '지남';
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '내일';
  return `${diffDays}일 후`;
}

export default function AirBookingDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bspDates, setBspDates] = useState<BspDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);

  // Keyboard shortcut for quick search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, bspRes] = await Promise.all([
          fetch('/api/bookings?limit=500', { credentials: 'include' }),
          fetch('/api/bsp-dates', { credentials: 'include' }),
        ]);
        const bookingsData = await bookingsRes.json();
        const bspData = await bspRes.json();

        if (bookingsData.success) setBookings(bookingsData.data.bookings || []);
        if (bspData.success) setBspDates(bspData.data.bspDates || []);
      } catch (err) {
        console.error('[dashboard] Failed to fetch data:', err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Quick search handler
  const handleQuickSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    bookings.forEach((b) => {
      const matches =
        b.pnr.toLowerCase().includes(lowerQuery) ||
        (b.name_kr && b.name_kr.toLowerCase().includes(lowerQuery)) ||
        (b.name_en && b.name_en.toLowerCase().includes(lowerQuery)) ||
        (b.agency && b.agency.toLowerCase().includes(lowerQuery)) ||
        b.flight_number.toLowerCase().includes(lowerQuery);

      if (matches) {
        results.push({
          id: b.id,
          type: 'booking',
          title: `${b.pnr} - ${b.name_kr || b.name_en || 'No Name'}`,
          subtitle: `${b.airline} ${b.flight_number} | ${b.route_from} → ${b.route_to}`,
          metadata: `${b.agency || ''} | ${b.departure_date || '-'}`,
          onClick: () => router.push(`/bookings?highlight=${b.id}`),
        });
      }
    });

    return results.slice(0, 10);
  }, [bookings, router]);

  // Statistics
  const stats = useMemo(() => {
    const today = formatDate(new Date());
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const ticketed = bookings.filter((b) => b.status === 'ticketed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;

    const urgentCount = bookings.filter((b) => {
      const nmtlUrgent = b.nmtl_date && isWithinDisplayRange(b.nmtl_date, 3) && getUrgency(b.nmtl_date, 3) === 'urgent';
      const tlUrgent = b.tl_date && isWithinDisplayRange(b.tl_date, 5) && getUrgency(b.tl_date, 5) === 'urgent';
      const depUrgent = b.departure_date && getUrgency(b.departure_date) === 'urgent';
      return nmtlUrgent || tlUrgent || depUrgent;
    }).length;

    const imminentCount = bookings.filter((b) => {
      const nmtlImminent = b.nmtl_date && isWithinDisplayRange(b.nmtl_date, 3) && getUrgency(b.nmtl_date, 3) === 'imminent';
      const tlImminent = b.tl_date && isWithinDisplayRange(b.tl_date, 5) && getUrgency(b.tl_date, 5) === 'imminent';
      const depImminent = b.departure_date && getUrgency(b.departure_date) === 'imminent';
      return nmtlImminent || tlImminent || depImminent;
    }).length;

    const totalPax = bookings.reduce((sum, b) => sum + (b.pax_count || 1), 0);
    const totalFare = bookings.reduce((sum, b) => sum + (b.fare || 0), 0);

    return {
      total: bookings.length,
      pending,
      confirmed,
      ticketed,
      cancelled,
      urgentCount,
      imminentCount,
      totalPax,
      totalFare,
    };
  }, [bookings]);

  // 7-day calendar
  const weekDays = useMemo<DayItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = formatDate(date);

      const dayBookings = bookings.filter((b) => {
        if (!b) return false;
        const nmtlMatch = b.nmtl_date === dateStr && isWithinDisplayRange(b.nmtl_date, 3);
        const tlMatch = b.tl_date === dateStr && isWithinDisplayRange(b.tl_date, 5);
        return nmtlMatch || tlMatch || b.departure_date === dateStr;
      });

      const dayBsp = bspDates.filter((d) => d && d.payment_date === dateStr);

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

  // Urgent items for today
  const urgentItems = useMemo(() => {
    const items: {
      booking: Booking;
      type: string;
      date: string;
      urgency: BadgeStatus;
      daysUntil: string;
    }[] = [];

    bookings.forEach((b) => {
      if (b.status === 'cancelled') return;

      if (b.nmtl_date && isWithinDisplayRange(b.nmtl_date, 3)) {
        const urgency = getUrgency(b.nmtl_date, 3);
        if (urgency === 'urgent' || urgency === 'imminent') {
          items.push({
            booking: b,
            type: 'NMTL',
            date: b.nmtl_date,
            urgency,
            daysUntil: getDaysUntil(b.nmtl_date),
          });
        }
      }

      if (b.tl_date && isWithinDisplayRange(b.tl_date, 5)) {
        const urgency = getUrgency(b.tl_date, 5);
        if (urgency === 'urgent' || urgency === 'imminent') {
          items.push({
            booking: b,
            type: 'TL',
            date: b.tl_date,
            urgency,
            daysUntil: getDaysUntil(b.tl_date),
          });
        }
      }

      if (b.departure_date) {
        const urgency = getUrgency(b.departure_date);
        if (urgency === 'urgent' || urgency === 'imminent') {
          items.push({
            booking: b,
            type: '출발',
            date: b.departure_date,
            urgency,
            daysUntil: getDaysUntil(b.departure_date),
          });
        }
      }
    });

    const urgencyOrder: Record<BadgeStatus, number> = {
      urgent: 0,
      imminent: 1,
      confirmed: 2,
      ticketed: 3,
      pending: 4,
      completed: 5,
      cancelled: 6,
    };

    return items.sort((a, b) => {
      const orderDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (orderDiff !== 0) return orderDiff;
      return a.date.localeCompare(b.date);
    });
  }, [bookings]);

  // Recent bookings
  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [bookings]);

  if (loading) return <LoadingSpinner />;

  if (fetchError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-500" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">데이터를 불러올 수 없습니다</h3>
          <p className="text-red-600 mb-4">잠시 후 다시 시도해 주세요.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  const selected = weekDays[selectedDay];
  const urgentTotal = stats.urgentCount + stats.imminentCount;

  return (
    <div className="dashboard p-6 space-y-6">
      {/* Header with Quick Search */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">항공 예약 대시보드</h1>
          <p className="text-gray-500 mt-1">예약 현황을 한눈에 확인하세요</p>
        </div>
        <button
          onClick={() => setQuickSearchOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Search className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">빠른 검색</span>
          <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="전체 예약"
          value={stats.total}
          subtitle={`${stats.totalPax}명`}
          icon={<Plane className="w-5 h-5" />}
          variant="default"
          onClick={() => router.push('/bookings')}
        />
        <StatsCard
          title="확정/발권"
          value={stats.confirmed + stats.ticketed}
          subtitle={`확정 ${stats.confirmed} | 발권 ${stats.ticketed}`}
          icon={<CheckCircle className="w-5 h-5" />}
          variant="success"
        />
        <StatsCard
          title="대기 중"
          value={stats.pending}
          icon={<Clock className="w-5 h-5" />}
          variant="default"
        />
        <StatsCard
          title="긴급 마감"
          value={urgentTotal}
          subtitle={`긴급 ${stats.urgentCount} | 임박 ${stats.imminentCount}`}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant={urgentTotal > 0 ? 'danger' : 'success'}
          onClick={() => {
            document.querySelector('#urgent-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>

      {/* 7-Day Calendar */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            이번 주 일정
          </h2>
          <span className="text-sm text-gray-500">클릭하여 상세 보기</span>
        </div>
        <div className="week-strip flex gap-2 overflow-x-auto pb-2">
          {weekDays.map((day, i) => (
            <button
              key={i}
              className={`flex-shrink-0 px-4 py-3 rounded-xl transition-all ${
                i === selectedDay ? 'bg-blue-500 text-white shadow-lg scale-105' : ''
              } ${day.isToday && i !== selectedDay ? 'border-2 border-blue-500' : ''} ${
                !day.isToday && i !== selectedDay ? 'bg-gray-50 hover:bg-gray-100' : ''
              }`}
              onClick={() => setSelectedDay(i)}
            >
              <span className={`block text-sm ${i === selectedDay ? 'text-blue-100' : 'text-gray-500'}`}>
                {day.dayName}
              </span>
              <span className={`block text-lg font-bold ${i === selectedDay ? 'text-white' : 'text-gray-900'}`}>
                {day.label}
              </span>
              <span className={`block text-xs mt-1 ${i === selectedDay ? 'text-blue-100' : 'text-gray-400'}`}>
                {day.bookings.length}건
              </span>
              {day.bspDates.length > 0 && (
                <span className={`block text-xs ${i === selectedDay ? 'text-yellow-200' : 'text-purple-500'}`}>
                  BSP {day.bspDates.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Selected Day Details */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {selected?.isToday ? '오늘' : selected?.label} 일정 ({selected?.bookings.length + (selected?.bspDates.length || 0)}건)
          </h3>
          {selected && (selected.bookings.length > 0 || selected.bspDates.length > 0) ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {/* BSP Dates */}
              {selected.bspDates.map((bsp) => {
                const isBilling = bsp.type === 'billing';
                const typeLabel = isBilling ? '청구' : bsp.type === 'report' ? '보고' : '입금';
                return (
                  <div
                    key={`bsp-${bsp.id}`}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isBilling ? 'bg-purple-50 border border-purple-100' : 'bg-green-50 border border-green-100'
                    }`}
                  >
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      isBilling ? 'bg-purple-200 text-purple-700' : 'bg-green-200 text-green-700'
                    }`}>
                      {typeLabel}
                    </span>
                    <span className="flex-1 text-sm text-gray-700">
                      {bsp.description || `BSP ${typeLabel}일`}
                    </span>
                    {bsp.is_notified === 1 && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                );
              })}
              {/* Bookings */}
              {selected.bookings.map((b) => (
                <div
                  key={`booking-${b.id}`}
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => router.push(`/bookings?highlight=${b.id}`)}
                >
                  <span className="px-2 py-1 text-xs font-medium bg-blue-200 text-blue-700 rounded">
                    {b.airline || 'AIR'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {b.name_kr || b.name_en || b.pnr}
                    </p>
                    <p className="text-xs text-gray-500">
                      {b.flight_number} | {b.route_from} → {b.route_to}
                    </p>
                  </div>
                  <StatusBadge status={getUrgency(b.nmtl_date || b.tl_date || b.departure_date)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4 text-center">일정이 없습니다.</p>
          )}
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Urgent Section */}
        <section id="urgent-section" className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${urgentTotal > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              마감 임박
              {urgentTotal > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                  {urgentTotal}
                </span>
              )}
            </h2>
          </div>
          {urgentItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="text-gray-500">긴급 마감 항목이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {urgentItems.slice(0, 10).map((item, i) => (
                <div
                  key={`${item.booking.id}-${item.type}-${i}`}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    item.urgency === 'urgent' ? 'bg-red-50 hover:bg-red-100' : 'bg-orange-50 hover:bg-orange-100'
                  }`}
                  onClick={() => router.push(`/bookings?highlight=${item.booking.id}`)}
                >
                  <StatusBadge status={item.urgency} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.booking.name_kr || item.booking.name_en || item.booking.pnr}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.booking.airline} {item.booking.flight_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      item.type === 'NMTL' ? 'bg-orange-200 text-orange-700' :
                      item.type === 'TL' ? 'bg-yellow-200 text-yellow-700' :
                      'bg-green-200 text-green-700'
                    }`}>
                      {item.type}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{item.daysUntil}</p>
                  </div>
                </div>
              ))}
              {urgentItems.length > 10 && (
                <button
                  onClick={() => router.push('/bookings?filter=urgent')}
                  className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  더 보기 ({urgentItems.length - 10}건)
                </button>
              )}
            </div>
          )}
        </section>

        {/* Recent Bookings */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              최근 등록
            </h2>
            <button
              onClick={() => router.push('/bookings?sort=created_at')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              전체 보기 →
            </button>
          </div>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">등록된 예약이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => router.push(`/bookings?highlight=${b.id}`)}
                >
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Users className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {b.name_kr || b.name_en || b.pnr}
                    </p>
                    <p className="text-xs text-gray-500">
                      {b.agency || '없음'} | {b.departure_date || '-'}
                    </p>
                  </div>
                  <StatusBadge status={b.status as BadgeStatus} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick Actions */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/bookings?action=new')}
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <div className="p-3 bg-blue-500 rounded-xl">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">새 예약</span>
          </button>
          <button
            onClick={() => router.push('/calendar')}
            className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
          >
            <div className="p-3 bg-green-500 rounded-xl">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">달력</span>
          </button>
          <button
            onClick={() => router.push('/settlements')}
            className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
          >
            <div className="p-3 bg-purple-500 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">정산</span>
          </button>
          <button
            onClick={() => router.push('/customers')}
            className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <div className="p-3 bg-orange-500 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">고객 관리</span>
          </button>
        </div>
      </section>

      {/* Quick Search Modal */}
      <QuickSearchModal
        open={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
        onSearch={handleQuickSearch}
        placeholder="PNR, 승객명, 대리점 검색... (Ctrl+K)"
      />
    </div>
  );
}
