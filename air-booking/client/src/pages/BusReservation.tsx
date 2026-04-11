import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';

interface BusItem {
  id: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export function BusReservation() {
  const { toast } = useToast();
  const [items, setItems] = useState<BusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/bus-reservations', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setItems(data.data.items || []);
    } catch { toast.error('버스예약 조회 실패'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSave = async () => {
    try {
      const url = editId ? `/api/bus-reservations/${editId}` : '/api/bus-reservations';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ data: editData }),
      });
      const d = await res.json();
      if (d.success) { toast.success(editId ? '수정 완료' : '등록 완료'); setEditId(null); setCreating(false); setEditData(''); fetchItems(); }
      else toast.error(d.error);
    } catch { toast.error('저장 실패'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/bus-reservations/${id}`, { method: 'DELETE', credentials: 'include' });
      const d = await res.json();
      if (d.success) { toast.success('삭제 완료'); fetchItems(); }
    } catch { toast.error('삭제 실패'); }
  };

  const parseData = (raw: string): Record<string, unknown> => {
    try { return JSON.parse(raw); } catch { return {}; }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>;

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', color: '#64748b' }}>{items.length}건</span>
        <button onClick={() => { setCreating(true); setEditData('{\n  "company": "",\n  "date": "",\n  "route": "",\n  "passengers": 0,\n  "price": 0\n}'); }}
          style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          + 버스예약 등록
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>등록된 버스예약이 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(item => {
            const d = parseData(item.data);
            return (
              <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{(d.company as string) || (d.route as string) || '버스예약'}</strong>
                    <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>
                      {new Date(item.updated_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setEditId(item.id); setEditData(item.data); }} style={{ padding: '4px 10px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>편집</button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: '4px 10px', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', background: '#fef2f2' }}>삭제</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(editId || creating) && (
        <Modal open={true} title={editId ? '버스예약 편집' : '버스예약 등록'} onClose={() => { setEditId(null); setCreating(false); }}>
          <textarea value={editData} onChange={(e) => setEditData(e.target.value)}
            style={{ width: '100%', minHeight: '200px', fontFamily: 'monospace', fontSize: '13px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button onClick={() => { setEditId(null); setCreating(false); }} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
            <button onClick={handleSave} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>저장</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
