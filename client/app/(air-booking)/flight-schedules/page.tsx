// 항공 스케줄 관리 — travel_agency.db flight_schedules 테이블 조회/생성/삭제

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

interface FlightSchedule {
  id: string;
  group_id: string | null;
  group_name: string | null;
  airline: string;
  flight_number: string | null;
  departure_date: string;
  departure_airport: string;
  departure_time: string;
  arrival_date: string;
  arrival_airport: string;
  arrival_time: string;
  passengers: number;
  created_at: string;
}

interface CreateForm {
  group_name: string;
  airline: string;
  flight_number: string;
  departure_date: string;
  departure_airport: string;
  departure_time: string;
  arrival_date: string;
  arrival_airport: string;
  arrival_time: string;
  passengers: string;
}

const EMPTY_FORM: CreateForm = {
  group_name: '',
  airline: '',
  flight_number: '',
  departure_date: '',
  departure_airport: '',
  departure_time: '',
  arrival_date: '',
  arrival_airport: '',
  arrival_time: '',
  passengers: '0',
};

export default function FlightSchedulesPage() {
  const router = useRouter();

  const [schedules, setSchedules] = useState<FlightSchedule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departureFrom, setDepartureFrom] = useState('');
  const [departureTo, setDepartureTo] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'bookings'>('schedule');
  const [relatedBookings, setRelatedBookings] = useState<{
    id: string;
    pnr: string;
    airline: string;
    flight_number: string;
    departure_date: string;
    status: string;
    pax_count: number;
  }[]>([]);

  const fetchSchedules = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (departureFrom) params.set('departure_from', departureFrom);
      if (departureTo) params.set('departure_to', departureTo);

      const res = await fetch(`/api/flight-schedules?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data.schedules || []);
        setTotal(data.data.total || 0);
      }
    } catch {
      console.error('항공 스케줄 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [search, departureFrom, departureTo]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = async () => {
    if (
      !form.airline ||
      !form.departure_date ||
      !form.departure_airport ||
      !form.departure_time ||
      !form.arrival_date ||
      !form.arrival_airport ||
      !form.arrival_time
    ) {
      alert('필수 항목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/flight-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          passengers: Number(form.passengers) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('항공 스케줄이 등록되었습니다.');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        fetchSchedules();
      } else {
        alert(data.error || '등록에 실패했습니다.');
      }
    } catch {
      alert('항공 스케줄 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 스케줄을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/flight-schedules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        alert('삭제되었습니다.');
        fetchSchedules();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return d.slice(0, 10);
  };

  const updateForm = (field: keyof CreateForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fetchRelatedBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('sort', 'departure_date');
      params.set('order', 'desc');
      params.set('limit', '50');
      const res = await fetch(`/api/bookings?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRelatedBookings(data.data.bookings || []);
    } catch {
      // ignore
    }
  }, [search]);

  useEffect(() => {
    if (activeTab === 'bookings') fetchRelatedBookings();
  }, [activeTab, fetchRelatedBookings]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 2탭 탭바 */}
      <div className="flex gap-0 border-b-2 border-gray-200 mb-3">
        {([
          { id: 'schedule' as const, label: '스케줄' },
          { id: 'bookings' as const, label: '예약장부' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 text-sm border-none mb-[-2px] cursor-pointer transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-600 font-semibold'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' ? (
        <div>
          <div className="mb-3 text-sm text-gray-500">{relatedBookings.length}건의 예약</div>
          {relatedBookings.length === 0 ? (
            <div className="py-10 text-center text-gray-400">관련 예약이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PNR</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">항공사</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">편명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">출발일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">인원</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {relatedBookings.map((b) => (
                    <tr
                      key={b.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/bookings?highlight=${b.id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{b.pnr}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{b.airline}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{b.flight_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{b.departure_date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{b.status}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{b.pax_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex flex-wrap gap-2 flex-1">
              <input
                type="text"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-64"
                placeholder="단체명, 항공사, 편명, 공항 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <input
                type="date"
                value={departureFrom}
                onChange={(e) => setDepartureFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="date"
                value={departureTo}
                onChange={(e) => setDepartureTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push('/converter')}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                PNR 변환기
              </button>
              <button
                onClick={() => window.open('/api/flight-schedules/export/csv', '_blank')}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
              >
                CSV 내보내기
              </button>
              <button
                onClick={() => setCreateOpen(true)}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium"
              >
                + 스케줄 등록
              </button>
            </div>
          </div>

          {/* Table */}
          {schedules.length === 0 ? (
            <div className="py-12 text-center text-gray-400 bg-white rounded-lg border border-gray-200">
              항공 스케줄 데이터가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">단체명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">항공사</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">편명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">출발</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">출발시간</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">도착</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">도착시간</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">인원</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.group_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.airline}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.flight_number || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="font-semibold text-gray-900">{s.departure_airport}</span>
                        <span className="ml-1 text-gray-500 text-xs">{formatDate(s.departure_date)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.departure_time}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="font-semibold text-gray-900">{s.arrival_airport}</span>
                        <span className="ml-1 text-gray-500 text-xs">{formatDate(s.arrival_date)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.arrival_time}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.passengers}명</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">총 {total}건</div>
        </>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="항공 스케줄 등록"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">단체명</label>
              <input
                type="text"
                value={form.group_name}
                onChange={(e) => updateForm('group_name', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">항공사 *</label>
              <input
                type="text"
                value={form.airline}
                onChange={(e) => updateForm('airline', e.target.value)}
                placeholder="예: 대한항공"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">편명</label>
              <input
                type="text"
                value={form.flight_number}
                onChange={(e) => updateForm('flight_number', e.target.value)}
                placeholder="예: KE001"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">출발일 *</label>
              <input
                type="date"
                value={form.departure_date}
                onChange={(e) => updateForm('departure_date', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">출발공항 *</label>
              <input
                type="text"
                value={form.departure_airport}
                onChange={(e) => updateForm('departure_airport', e.target.value)}
                placeholder="예: ICN"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">출발시간 *</label>
              <input
                type="time"
                value={form.departure_time}
                onChange={(e) => updateForm('departure_time', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">도착일 *</label>
              <input
                type="date"
                value={form.arrival_date}
                onChange={(e) => updateForm('arrival_date', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">도착공항 *</label>
              <input
                type="text"
                value={form.arrival_airport}
                onChange={(e) => updateForm('arrival_airport', e.target.value)}
                placeholder="예: NRT"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">도착시간 *</label>
              <input
                type="time"
                value={form.arrival_time}
                onChange={(e) => updateForm('arrival_time', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">인원</label>
              <input
                type="number"
                min="0"
                value={form.passengers}
                onChange={(e) => updateForm('passengers', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {saving ? '저장 중...' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
