// 거래처 관리 — Legacy migration from air-booking

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

interface Vendor {
  id: string;
  name: string;
  type: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  remarks: string | null;
  created_at: string;
}

type TypeFilter = '' | '항공사' | '여행사';

const emptyForm = { name: '', type: '', contact_name: '', phone: '', email: '', remarks: '' };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchVendors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/vendors?${params}`);
      const data = await res.json();
      if (data.success) { setVendors(data.data.vendors); setTotal(data.data.total); }
    } catch { showToast('거래처 목록을 불러올 수 없습니다.', 'error'); }
    finally { setLoading(false); }
  }, [typeFilter, search]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const openCreateModal = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
  const openEditModal = (v: Vendor) => {
    setEditingId(v.id);
    setForm({ name: v.name, type: v.type || '', contact_name: v.contact_name || '', phone: v.phone || '', email: v.email || '', remarks: v.remarks || '' });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('거래처 이름을 입력해주세요.', 'warning'); return; }
    setSaving(true);
    try {
      const url = editingId ? `/api/vendors/${editingId}` : '/api/vendors';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { showToast(editingId ? '거래처가 수정되었습니다.' : '거래처가 등록되었습니다.'); setFormOpen(false); fetchVendors(); }
    } catch { showToast('저장에 실패했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('거래처가 삭제되었습니다.'); fetchVendors(); }
      else showToast(data.error || '삭제에 실패했습니다.', 'error');
    } catch { showToast('삭제에 실패했습니다.', 'error'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">거래처 관리</h1>
          <button onClick={openCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ 거래처 추가</button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex gap-3">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="거래처명 검색..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">전체</option><option value="항공사">항공사</option><option value="여행사">여행사</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-600">거래처명</th><th className="p-3 text-left font-medium text-gray-600">유형</th>
                  <th className="p-3 text-left font-medium text-gray-600">담당자</th><th className="p-3 text-left font-medium text-gray-600">연락처</th>
                  <th className="p-3 text-left font-medium text-gray-600">이메일</th><th className="p-3 text-left font-medium text-gray-600">비고</th>
                  <th className="p-3 text-left font-medium text-gray-600">관리</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">거래처 데이터가 없습니다.</td></tr>
                ) : vendors.map(v => (
                  <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{v.name}</td>
                    <td className="p-3">{v.type || '-'}</td>
                    <td className="p-3">{v.contact_name || '-'}</td>
                    <td className="p-3">{v.phone || '-'}</td>
                    <td className="p-3">{v.email || '-'}</td>
                    <td className="p-3 text-gray-500 text-xs max-w-xs truncate">{v.remarks || '-'}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => openEditModal(v)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">편집</button>
                      <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t text-sm text-gray-500">총 {total}건</div>
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? '거래처 수정' : '거래처 추가'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">거래처명 *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="거래처명" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">선택</option><option value="항공사">항공사</option><option value="여행사">여행사</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
            <input type="text" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">취소</button>
            <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
