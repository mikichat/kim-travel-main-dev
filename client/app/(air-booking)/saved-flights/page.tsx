// 저장된 항공편 관리

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

interface SavedFlight {
  id: string;
  pnr: string;
  airline: string;
  flight_number: string;
  route_from: string;
  route_to: string;
  departure_date: string;
  return_date: string;
  name_kr: string;
  name_en: string;
  original_pnr_text: string;
  pax_count: number;
  agency: string;
  created_at: string;
  source: string;
}

export default function SavedFlightsPage() {
  const [flights, setFlights] = useState<SavedFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFlights = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('sort', 'created_at');
      params.set('order', 'desc');
      params.set('limit', '100');
      const res = await fetch(`/api/bookings?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setFlights(data.data.bookings || []);
    } catch { showToast('저장된 항공편 조회 실패', 'error'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchFlights(); }, [fetchFlights]);

  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isAbPrefix = (id: string) => id.startsWith('AB-');

  const deleteById = async (id: string): Promise<boolean> => {
    if (id.startsWith('FLIGHT-')) {
      const res = await fetch(`/api/bookings/delete-saved/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
      return res.ok;
    }
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    return data.success;
  };

  const handleDelete = async (id: string) => {
    try {
      const ok = await deleteById(id);
      if (ok) { showToast('삭제되었습니다.'); fetchFlights(); }
      else showToast('삭제 실패', 'error');
    } catch { showToast('삭제 중 오류', 'error'); }
    setDeleteConfirm(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(checkedIds);
    if (ids.length === 0) { showToast('삭제할 항목을 선택해주세요.', 'warning'); return; }
    const failures: string[] = [];
    for (const id of ids) {
      try {
        const ok = await deleteById(id);
        if (!ok) failures.push(id);
      } catch { failures.push(id); }
    }
    if (failures.length > 0) {
      showToast(`${ids.length - failures.length}건 삭제, ${failures.length}건 실패`, 'warning');
    } else {
      showToast(`${ids.length}건 삭제 완료`);
    }
    setCheckedIds(new Set());
    fetchFlights();
  };

  const handleMerge = async () => {
    const ids = Array.from(checkedIds);
    if (ids.length < 2) { showToast('2개 이상 선택해주세요.', 'warning'); return; }
    const first = flights.find(f => f.id === ids[0]);
    if (!first) { showToast('선택된 항공편을 찾을 수 없습니다.', 'error'); return; }
    try {
      const failures: string[] = [];
      for (const id of ids) {
        const res = await fetch(`/api/bookings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ group_id: first.id }),
        });
        if (!res.ok) failures.push(id);
      }
      if (failures.length > 0) {
        showToast(`${ids.length - failures.length}건 병합, ${failures.length}건 실패`, 'warning');
      } else {
        showToast(`${ids.length}건이 팀으로 병합되었습니다.`);
      }
      setCheckedIds(new Set());
      setMergeOpen(false);
      fetchFlights();
    } catch { showToast('병합 실패', 'error'); }
  };

  const filtered = flights.filter(f => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (f.pnr?.toLowerCase().includes(s) ||
      f.airline?.toLowerCase().includes(s) ||
      f.flight_number?.toLowerCase().includes(s) ||
      f.route_from?.toLowerCase().includes(s) ||
      f.route_to?.toLowerCase().includes(s) ||
      f.agency?.toLowerCase().includes(s));
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' :
          toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {toast.msg}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-900 mb-4">저장된 항공편</h1>

      {/* Toolbar */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="PNR, 항공사, 경로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
        />
        {checkedIds.size > 0 && (
          <>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
            >
              선택 삭제 ({checkedIds.size}건)
            </button>
            <button
              onClick={() => setMergeOpen(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600"
            >
              팀 병합
            </button>
          </>
        )}
      </div>

      {/* Card List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400 bg-white rounded-lg shadow">저장된 항공편이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(f => (
            <div
              key={f.id}
              className={`rounded-xl p-4 border ${isAbPrefix(f.id) ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}
            >
              {/* Checkbox */}
              <div className="flex justify-end mb-2">
                <input
                  type="checkbox"
                  checked={checkedIds.has(f.id)}
                  onChange={() => toggleCheck(f.id)}
                />
              </div>

              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <strong className="text-base">{f.airline} {f.flight_number}</strong>
                {f.agency && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{f.agency}</span>}
                {isAbPrefix(f.id) && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">내부</span>}
              </div>

              {/* Route + Date */}
              <div className="text-sm text-gray-600 mb-1">{f.route_from || '?'} → {f.route_to || '?'}</div>
              <div className="text-xs text-gray-400 mb-1">
                출발: {f.departure_date || '-'} {f.return_date ? `| 귀국: ${f.return_date}` : ''}
              </div>
              <div className="text-xs text-gray-400 mb-3">
                PNR: {f.pnr} · {f.pax_count || 1}명 · {new Date(f.created_at).toLocaleDateString('ko-KR')}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="flex-1 px-3 py-1.5 text-xs border border-blue-300 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                  불러오기
                </button>
                <button
                  onClick={() => isAbPrefix(f.id) ? showToast('AB- 항목은 삭제할 수 없습니다.', 'warning') : setDeleteConfirm(f.id)}
                  disabled={isAbPrefix(f.id)}
                  className={`px-3 py-1.5 text-xs border rounded ${isAbPrefix(f.id) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal open={true} title="항공편 삭제" onClose={() => setDeleteConfirm(null)}>
          <p>정말 삭제하시겠습니까?</p>
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">삭제</button>
          </div>
        </Modal>
      )}

      {/* Merge Modal */}
      {mergeOpen && (
        <Modal open={true} title="팀 병합" onClose={() => setMergeOpen(false)}>
          <p>{checkedIds.size}개 항공편을 하나의 단체로 합칩니다.</p>
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setMergeOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
            <button onClick={handleMerge} className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">병합</button>
          </div>
        </Modal>
      )}
    </div>
  );
}