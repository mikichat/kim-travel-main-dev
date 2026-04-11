'use client';

import { useState, useEffect } from 'react';

interface FlightSchedule {
  id: string;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  status: string;
  pnr?: string;
  gate?: string;
}

export default function FlightSchedulePage() {
  const [schedules, setSchedules] = useState<FlightSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterAirline, setFilterAirline] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FlightSchedule | null>(null);

  useEffect(() => {
    async function fetchSchedules() {
      try {
        const params = new URLSearchParams();
        if (filterAirline) params.set('airline', filterAirline);
        if (filterDate) params.set('date', filterDate);

        const res = await fetch(`/api/flight-schedules?${params}`);
        const data = await res.json();
        if (data.success) {
          setSchedules(data.data || []);
        }
      } catch (err) {
        console.error('[flight-schedule] Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedules();
  }, [filterAirline, filterDate]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === schedules.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(schedules.map((s) => s.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      scheduled: { label: '예정', className: 'bg-blue-100 text-blue-800' },
      boarding: { label: '탑승중', className: 'bg-yellow-100 text-yellow-800' },
      departed: { label: '출발', className: 'bg-green-100 text-green-800' },
      delayed: { label: '지연', className: 'bg-red-100 text-red-800' },
      cancelled: { label: '취소', className: 'bg-gray-100 text-gray-800' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100' };
    return <span className={`px-2 py-1 text-xs rounded ${config.className}`}>{config.label}</span>;
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/flight-schedules/${id}`, { method: 'DELETE' })
        )
      );
      setSchedules((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('[flight-schedule] Delete failed:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">항공 스케줄 관리</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="항공사 검색..."
            value={filterAirline}
            onChange={(e) => setFilterAirline(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={() => {
              setFilterAirline('');
              setFilterDate('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            초기화
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-blue-600 font-semibold">
          {selectedIds.size > 0 && `${selectedIds.size}건 선택됨`}
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              삭제
            </button>
          )}
          <button
            onClick={() => {
              setEditingSchedule(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            + 새 항공편
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={schedules.length > 0 && selectedIds.size === schedules.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">항공사</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">편명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">출발지</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">도착지</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">출발일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">출발시간</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">도착시간</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PNR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">게이트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                    데이터가 없습니다
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(schedule.id)}
                        onChange={() => toggleSelect(schedule.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600">{schedule.airline}</td>
                    <td className="px-4 py-3">{schedule.flight_number}</td>
                    <td className="px-4 py-3">{schedule.departure_airport}</td>
                    <td className="px-4 py-3">{schedule.arrival_airport}</td>
                    <td className="px-4 py-3">{schedule.departure_date}</td>
                    <td className="px-4 py-3 font-mono">{schedule.departure_time}</td>
                    <td className="px-4 py-3 font-mono">{schedule.arrival_time}</td>
                    <td className="px-4 py-3 font-mono">{schedule.pnr || '-'}</td>
                    <td className="px-4 py-3">{schedule.gate || '-'}</td>
                    <td className="px-4 py-3">{getStatusBadge(schedule.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - simplified, would need full implementation */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">새 항공편 추가</h2>
            <p className="text-gray-500 mb-4">항공편 추가 기능은準備中입니다.</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
