// 원가 계산서 관리 — Legacy migration from air-booking

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

interface CostCalcItem {
  id: number;
  code: string;
  name: string;
  destination: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  nights: number | null;
  days: number | null;
  adults: number;
  children: number;
  infants: number;
  tc: number;
  margin_amount_1: number | null;
  margin_amount_2: number | null;
  notes_1: string | null;
  notes_2: string | null;
  domestic_vehicle_type: string | null;
  domestic_vehicle_total: number | null;
  created_at: string;
  updated_at: string;
}

interface CostForm {
  name: string;
  destination: string;
  departure_date: string;
  arrival_date: string;
  nights: number;
  days: number;
  adults: number;
  children: number;
  infants: number;
  tc: number;
  margin_amount_1: number;
  margin_amount_2: number;
  notes_1: string;
  notes_2: string;
  domestic_vehicle_type: string;
  domestic_vehicle_total: number;
}

const DEFAULT_FORM: CostForm = {
  name: '', destination: '', departure_date: '', arrival_date: '',
  nights: 0, days: 0, adults: 0, children: 0, infants: 0, tc: 0,
  margin_amount_1: 0, margin_amount_2: 0, notes_1: '', notes_2: '',
  domestic_vehicle_type: '', domestic_vehicle_total: 0,
};

export default function CostCalculationsPage() {
  const [items, setItems] = useState<CostCalcItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<CostCalcItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CostForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/cost-calculations?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items);
        setTotal(data.data.total);
      }
    } catch { showToast('원가 계산서 목록을 불러올 수 없습니다.', 'error'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/cost-calculations/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) { setDetail(data.data.item); setDetailOpen(true); }
    } catch { showToast('원가 계산서를 불러올 수 없습니다.', 'error'); }
  };

  const updateForm = (field: keyof CostForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.name) { showToast('행사명을 입력해 주세요.', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/cost-calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { showToast('등록되었습니다.'); setCreateOpen(false); setForm(DEFAULT_FORM); fetchItems(); }
      else showToast(data.error || '등록에 실패했습니다.', 'error');
    } catch { showToast('등록에 실패했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 원가 계산서를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/cost-calculations/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { showToast('삭제되었습니다.'); fetchItems(); }
      else showToast(data.error || '삭제에 실패했습니다.', 'error');
    } catch { showToast('삭제에 실패했습니다.', 'error'); }
  };

  const formatDate = (d: string | null) => d ? d.slice(0, 10) : '-';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">원가 계산서</h1>
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            + 원가 계산서 등록
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="행사명, 코드, 여행지 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-4">📊</p>
              <p>원가 계산서 데이터가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => openDetail(item.id)}
                  className="border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all bg-white"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-semibold text-indigo-600">{item.code}</span>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >삭제</button>
                  </div>
                  <div className="font-semibold text-gray-900 mb-2">{item.name}</div>
                  <div className="text-sm text-gray-500 space-y-1 mb-3">
                    <div>📍 {item.destination || '미정'}</div>
                    <div>📅 {formatDate(item.departure_date)} ~ {formatDate(item.arrival_date)}</div>
                    {item.nights != null && item.days != null && (
                      <div>{item.nights}박 {item.days}일</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400 pt-3 border-t">
                    <span>성인 {item.adults} / 소아 {item.children} / 유아 {item.infants} / TC {item.tc}</span>
                    <span>{formatDate(item.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 border-t text-sm text-gray-500">총 {total}건</div>
        </div>
      </div>

      {/* 상세 모달 */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail?.name || '원가 계산서 상세'} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
              <div><span className="text-xs text-gray-500">코드</span><div className="font-mono font-semibold">{detail.code}</div></div>
              <div><span className="text-xs text-gray-500">여행지</span><div className="font-medium">{detail.destination || '-'}</div></div>
              <div><span className="text-xs text-gray-500">출발</span><div className="font-medium">{formatDate(detail.departure_date)}</div></div>
              <div><span className="text-xs text-gray-500">귀국</span><div className="font-medium">{formatDate(detail.arrival_date)}</div></div>
              <div><span className="text-xs text-gray-500">성인</span><div className="font-medium">{detail.adults}</div></div>
              <div><span className="text-xs text-gray-500">소아</span><div className="font-medium">{detail.children}</div></div>
              <div><span className="text-xs text-gray-500">유아</span><div className="font-medium">{detail.infants}</div></div>
              <div><span className="text-xs text-gray-500">TC</span><div className="font-medium">{detail.tc}</div></div>
            </div>
            {detail.domestic_vehicle_type && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">국내 이동</div>
                <div>{detail.domestic_vehicle_type}: {(detail.domestic_vehicle_total || 0).toLocaleString()}원</div>
              </div>
            )}
            {(detail.margin_amount_1 || detail.margin_amount_2) && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">마진</div>
                <div className="grid grid-cols-2 gap-2">
                  {detail.margin_amount_1 != null && <div>마진 1: {detail.margin_amount_1.toLocaleString()}원</div>}
                  {detail.margin_amount_2 != null && <div>마진 2: {detail.margin_amount_2.toLocaleString()}원</div>}
                </div>
              </div>
            )}
            {(detail.notes_1 || detail.notes_2) && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">비고</div>
                {detail.notes_1 && <div className="text-sm">{detail.notes_1}</div>}
                {detail.notes_2 && <div className="text-sm mt-1">{detail.notes_2}</div>}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 등록 모달 */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="원가 계산서 등록" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">행사명 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="행사명 입력" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">여행지</label>
            <input type="text" value={form.destination} onChange={(e) => updateForm('destination', e.target.value)} placeholder="예: 일본 오사카" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">출발일</label>
              <input type="date" value={form.departure_date} onChange={(e) => updateForm('departure_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">귀국일</label>
              <input type="date" value={form.arrival_date} onChange={(e) => updateForm('arrival_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">박</label>
              <input type="number" min="0" value={form.nights} onChange={(e) => updateForm('nights', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">일</label>
              <input type="number" min="0" value={form.days} onChange={(e) => updateForm('days', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">성인</label>
              <input type="number" min="0" value={form.adults} onChange={(e) => updateForm('adults', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">소아</label>
              <input type="number" min="0" value={form.children} onChange={(e) => updateForm('children', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유아</label>
              <input type="number" min="0" value={form.infants} onChange={(e) => updateForm('infants', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TC</label>
              <input type="number" min="0" value={form.tc} onChange={(e) => updateForm('tc', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">국내 이동 차량 유형</label>
            <input type="text" value={form.domestic_vehicle_type} onChange={(e) => updateForm('domestic_vehicle_type', e.target.value)} placeholder="예: 대형 버스" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">마진 1 (원)</label>
              <input type="number" min="0" value={form.margin_amount_1} onChange={(e) => updateForm('margin_amount_1', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">마진 2 (원)</label>
              <input type="number" min="0" value={form.margin_amount_2} onChange={(e) => updateForm('margin_amount_2', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고 1</label>
            <textarea value={form.notes_1} onChange={(e) => updateForm('notes_1', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">취소</button>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? '저장 중...' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
