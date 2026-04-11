import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';

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

interface SavedFlightsProps {
  onLoadToConverter?: (pnrText: string) => void;
}

export function SavedFlights({ onLoadToConverter }: SavedFlightsProps) {
  const { toast } = useToast();
  const [flights, setFlights] = useState<SavedFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

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
    } catch {
      toast.error('저장된 항공편 조회 실패');
    } finally {
      setLoading(false);
    }
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
    // FLIGHT- 항목은 flight_saves 전용 삭제
    if (id.startsWith('FLIGHT-')) {
      const res = await fetch(`/api/bookings/delete-saved/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
      return res.ok;
    }
    // air_bookings 항목 삭제 (flight_saves AB- 캐시도 함께 정리됨)
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    return data.success;
  };

  const handleDelete = async (id: string) => {
    try {
      const ok = await deleteById(id);
      if (ok) { toast.success('삭제되었습니다.'); fetchFlights(); }
      else toast.error('삭제 실패');
    } catch { toast.error('삭제 중 오류'); }
    setDeleteConfirm(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(checkedIds);
    if (ids.length === 0) { toast.warning('삭제할 항목을 선택해주세요.'); return; }
    const failures: string[] = [];
    for (const id of ids) {
      try {
        const ok = await deleteById(id);
        if (!ok) failures.push(id);
      } catch { failures.push(id); }
    }
    if (failures.length > 0) {
      toast.warning(`${ids.length - failures.length}건 삭제, ${failures.length}건 실패`);
    } else {
      toast.success(`${ids.length}건 삭제 완료`);
    }
    setCheckedIds(new Set());
    fetchFlights();
  };

  const handleLoad = (f: SavedFlight) => {
    if (onLoadToConverter && f.original_pnr_text) {
      onLoadToConverter(f.original_pnr_text);
      toast.success('변환기에 PNR 텍스트를 불러왔습니다.');
    } else {
      toast.warning('원본 PNR 텍스트가 없습니다.');
    }
  };

  const handleMerge = async () => {
    const ids = Array.from(checkedIds);
    if (ids.length < 2) { toast.warning('2개 이상 선택해주세요.'); return; }
    const first = flights.find(f => f.id === ids[0]);
    if (!first) { toast.error('선택된 항공편을 찾을 수 없습니다.'); return; }
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
        toast.warning(`${ids.length - failures.length}건 병합, ${failures.length}건 실패`);
      } else {
        toast.success(`${ids.length}건이 팀으로 병합되었습니다.`);
      }
      setCheckedIds(new Set());
      setMergeOpen(false);
      fetchFlights();
    } catch { toast.error('병합 실패'); }
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

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>;

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="PNR, 항공사, 경로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
        />
        {checkedIds.size > 0 && (
          <>
            <button onClick={handleBulkDelete} style={{ padding: '8px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
              선택 삭제 ({checkedIds.size}건)
            </button>
            <button onClick={() => setMergeOpen(true)} style={{ padding: '8px 14px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
              팀 병합
            </button>
          </>
        )}
      </div>

      {/* Card List */}
      {filtered.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>저장된 항공편이 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {filtered.map(f => (
            <div key={f.id} style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px',
              background: isAbPrefix(f.id) ? '#fefce8' : '#fff',
              position: 'relative',
            }}>
              {/* Checkbox */}
              <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                <input type="checkbox" checked={checkedIds.has(f.id)} onChange={() => toggleCheck(f.id)} />
              </div>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <strong style={{ fontSize: '15px' }}>{f.airline} {f.flight_number}</strong>
                {f.agency && <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>{f.agency}</span>}
                {isAbPrefix(f.id) && <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px' }}>내부</span>}
              </div>

              {/* Route + Date */}
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                {f.route_from || '?'} → {f.route_to || '?'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                출발: {f.departure_date || '-'} {f.return_date ? `| 귀국: ${f.return_date}` : ''}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                PNR: {f.pnr} · {f.pax_count || 1}명 · {new Date(f.created_at).toLocaleDateString('ko-KR')}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleLoad(f)} style={{ flex: 1, padding: '6px', border: '1px solid #3b82f6', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  불러오기
                </button>
                <button
                  onClick={() => isAbPrefix(f.id) ? toast.warning('AB- 항목은 삭제할 수 없습니다.') : setDeleteConfirm(f.id)}
                  style={{ padding: '6px 10px', border: '1px solid #fca5a5', background: isAbPrefix(f.id) ? '#f5f5f5' : '#fef2f2', color: isAbPrefix(f.id) ? '#ccc' : '#dc2626', borderRadius: '4px', cursor: isAbPrefix(f.id) ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                  disabled={isAbPrefix(f.id)}
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
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>삭제</button>
          </div>
        </Modal>
      )}

      {/* Merge Modal */}
      {mergeOpen && (
        <Modal open={true} title="팀 병합" onClose={() => setMergeOpen(false)}>
          <p>{checkedIds.size}개 항공편을 하나의 단체로 합칩니다.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button onClick={() => setMergeOpen(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
            <button onClick={handleMerge} style={{ padding: '8px 16px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>병합</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
