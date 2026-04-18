'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import type { BadgeStatus } from '@/components/common/StatusBadge';

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
}

type StatusFilter = '' | 'pending' | 'confirmed' | 'ticketed' | 'cancelled';
type SortField = 'created_at' | 'departure_date';

const STATUS_MAP: Record<string, BadgeStatus> = {
  pending: 'pending',
  confirmed: 'confirmed',
  ticketed: 'ticketed',
  cancelled: 'cancelled',
};

export default function BookingsPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [pnrModalOpen, setPnrModalOpen] = useState(false);
  const [pnrText, setPnrText] = useState('');
  const [pnrAgency, setPnrAgency] = useState('');
  const [pnrParsing, setPnrParsing] = useState(false);

  // Fetch bookings
  useEffect(() => {
    async function fetchBookings() {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        if (sortField) params.set('sort', sortField);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        const res = await fetch(`/api/bookings?${params}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setBookings(data.data.bookings || []);
        }
      } catch (err) {
        console.error('[bookings] Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, [search, statusFilter, sortField, dateFrom, dateTo]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllCheck = () => {
    if (checkedIds.size === bookings.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(bookings.map((b) => b.id)));
    }
  };

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handlePnrParse = async () => {
    if (!pnrText.trim()) return;
    setPnrParsing(true);
    try {
      const res = await fetch('/api/bookings/parse-pnr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: pnrText }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${data.data.parsed?.length || 0}건의 예약이 등록되었습니다.`);
        setPnrModalOpen(false);
        setPnrText('');
        // Refresh
        window.location.reload();
      } else {
        alert(data.error || 'PNR 파싱에 실패했습니다.');
      }
    } catch (err) {
      console.error('[bookings] PNR parse failed:', err);
      alert('PNR 파싱 중 오류가 발생했습니다.');
    } finally {
      setPnrParsing(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bookings-page p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            ref={searchInputRef}
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="PNR, 이름으로 검색... (Ctrl+K)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">전체 상태</option>
          <option value="pending">대기</option>
          <option value="confirmed">확정</option>
          <option value="ticketed">발권완료</option>
          <option value="cancelled">취소</option>
        </select>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="created_at">등록순</option>
          <option value="departure_date">출발일순</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        />
        <span className="text-gray-400">~</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        />
        <button
          onClick={() => setPnrModalOpen(true)}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          PNR 등록
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={bookings.length > 0 && checkedIds.size === bookings.length}
                  onChange={toggleAllCheck}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">대리점/단체</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">PNR</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">승객</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">항공편</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">구간</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">출발일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">NMTL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">TL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  예약 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(b.id)}
                      onChange={() => toggleCheck(b.id)}
                    />
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer hover:text-blue-600"
                    onClick={() => handleExpand(b.id)}
                  >
                    {b.agency || '-'}
                  </td>
                  <td className="px-4 py-3 font-mono">{b.pnr}</td>
                  <td className="px-4 py-3">
                    {b.pax_count > 1
                      ? `${b.name_en || b.name_kr || '-'} 외 ${b.pax_count - 1}명`
                      : b.name_en || b.name_kr || '-'}
                  </td>
                  <td className="px-4 py-3">{b.airline} {b.flight_number}</td>
                  <td className="px-4 py-3">{b.route_from} → {b.route_to}</td>
                  <td className="px-4 py-3">{b.departure_date || '-'}</td>
                  <td className="px-4 py-3">{b.nmtl_date || '-'}</td>
                  <td className="px-4 py-3">{b.tl_date || '-'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={STATUS_MAP[b.status] || 'pending'} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 text-sm text-gray-500">
        총 {bookings.length}건
      </div>

      {/* PNR Modal */}
      <Modal
        open={pnrModalOpen}
        onClose={() => setPnrModalOpen(false)}
        title="PNR 등록"
        size="xxl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            GDS PNR 텍스트를 붙여넣기 하세요.
            <br />
            <span className="text-xs">여러 PNR은 빈 줄로 구분하면 한 단체로 일괄 등록됩니다.</span>
          </p>
          <textarea
            className="w-full h-40 p-3 border border-gray-300 rounded-lg font-mono text-sm"
            value={pnrText}
            onChange={(e) => setPnrText(e.target.value)}
            placeholder={`1.KIM/GUKJIN MR\n2 KE 631 Y 15MAR ICNLAX HK1 1750 1150\nPNR: ABC123`}
          />
          <div>
            <label className="block text-sm font-medium mb-1">대리점/단체</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={pnrAgency}
              onChange={(e) => setPnrAgency(e.target.value)}
              placeholder="예: 롯데관광 / 김사장 유럽단체"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPnrModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handlePnrParse}
              disabled={pnrParsing || !pnrText.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {pnrParsing ? '파싱 중...' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
