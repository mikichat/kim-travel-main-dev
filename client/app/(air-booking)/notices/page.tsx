// 안내문 관리

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

interface NoticeItem {
  id: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export default function NoticesPage() {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-notices', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setItems(data.data.items || []);
    } catch { showToast('안내문 조회 실패', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSave = async () => {
    try {
      const url = editId ? `/api/saved-notices/${editId}` : '/api/saved-notices';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ data: editData }),
      });
      const d = await res.json();
      if (d.success) { showToast(editId ? '수정 완료' : '등록 완료'); setEditId(null); setCreating(false); setEditData(''); fetchItems(); }
      else showToast(d.error || '저장 실패', 'error');
    } catch { showToast('저장 실패', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/saved-notices/${id}`, { method: 'DELETE', credentials: 'include' });
      const d = await res.json();
      if (d.success) { showToast('삭제 완료'); fetchItems(); }
    } catch { showToast('삭제 실패', 'error'); }
  };

  const parseData = (raw: string): Record<string, unknown> => {
    try { return JSON.parse(raw); } catch { return {}; }
  };

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

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-900">안내문 관리</h1>
        <span className="text-sm text-gray-500">{items.length}건</span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {items.length === 0 ? (
          <div className="py-12 text-center text-gray-400">등록된 안내문이 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {items.map(item => {
              const d = parseData(item.data);
              return (
                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-gray-900">{(d.title as string) || '안내문'}</span>
                    <span className="ml-3 text-sm text-gray-400">
                      {new Date(item.updated_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditId(item.id); setEditData(item.data); }}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                    >
                      편집
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 text-xs border border-red-200 rounded text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => { setCreating(true); setEditData('{\n  "title": "",\n  "content": "",\n  "type": "general"\n}'); }}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
      >
        + 안내문 등록
      </button>

      {(editId || creating) && (
        <Modal
          open={true}
          title={editId ? '안내문 편집' : '안내문 등록'}
          onClose={() => { setEditId(null); setCreating(false); }}
          size="lg"
        >
          <textarea
            value={editData}
            onChange={(e) => setEditData(e.target.value)}
            className="w-full min-h-[200px] font-mono text-sm p-3 border border-gray-300 rounded-md"
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => { setEditId(null); setCreating(false); }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              저장
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}