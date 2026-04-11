// 고객 관리 — Legacy migration from air-booking

'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

interface Customer {
  id: string;
  name_kr: string;
  name_en: string | null;
  phone: string | null;
  email: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  remarks: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  pnr: string;
  airline: string | null;
  flight_number: string | null;
  route_from: string | null;
  route_to: string | null;
  departure_date: string | null;
  status: string;
}

const emptyForm = {
  name_kr: '',
  name_en: '',
  phone: '',
  email: '',
  passport_number: '',
  passport_expiry: '',
  remarks: '',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-orange-100 text-orange-800',
  ticketed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10);
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data.customers);
        setTotal(data.data.total);
      } else {
        showToast('고객 목록을 불러올 수 없습니다.', 'error');
      }
    } catch (err) {
      console.error('[customers] Failed to fetch customers:', err);
      showToast('고객 목록을 불러올 수 없습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleRowClick = async (customer: Customer) => {
    if (expandedId === customer.id) {
      setExpandedId(null);
      setBookings([]);
      return;
    }
    setExpandedId(customer.id);
    setBookings([]);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`);
      const data = await res.json();
      if (data.success) setBookings(data.data.bookings ?? []);
      else showToast('예약 이력을 불러올 수 없습니다.', 'error');
    } catch {
      showToast('예약 이력을 불러올 수 없습니다.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation();
    setEditingId(c.id);
    setForm({
      name_kr: c.name_kr,
      name_en: c.name_en || '',
      phone: c.phone || '',
      email: c.email || '',
      passport_number: c.passport_number || '',
      passport_expiry: c.passport_expiry ? c.passport_expiry.slice(0, 10) : '',
      remarks: c.remarks || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name_kr.trim()) { showToast('고객 이름(한글)을 입력해주세요.', 'warning'); return; }
    setSaving(true);
    try {
      const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        showToast(editingId ? '고객 정보가 수정되었습니다.' : '고객이 등록되었습니다.');
        setFormOpen(false);
        if (editingId && expandedId === editingId) { setExpandedId(null); setBookings([]); }
        fetchCustomers();
      } else {
        showToast(data.error || '저장에 실패했습니다.', 'error');
      }
    } catch {
      showToast('저장에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' :
          toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>{toast.msg}</div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
          <div className="flex gap-2">
            <button onClick={() => window.open('/api/customers/export/csv', '_blank')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">CSV 내보내기</button>
            <button onClick={openCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ 고객 추가</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex gap-3">
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="이름 또는 여권번호 검색..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-8 p-3"></th>
                  <th className="p-3 text-left font-medium text-gray-600">이름</th>
                  <th className="p-3 text-left font-medium text-gray-600">영문명</th>
                  <th className="p-3 text-left font-medium text-gray-600">전화번호</th>
                  <th className="p-3 text-left font-medium text-gray-600">이메일</th>
                  <th className="p-3 text-left font-medium text-gray-600">여권번호</th>
                  <th className="p-3 text-left font-medium text-gray-600">여권만료일</th>
                  <th className="p-3 text-left font-medium text-gray-600">관리</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400">{search ? `"${search}"에 해당하는 고객이 없습니다.` : '등록된 고객이 없습니다.'}</td></tr>
                ) : customers.map(c => (
                  <Fragment key={c.id}>
                    <tr className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${expandedId === c.id ? 'bg-indigo-50' : ''}`} onClick={() => handleRowClick(c)}>
                      <td className="p-3 text-center text-gray-400 text-xs">{expandedId === c.id ? '▼' : '▶'}</td>
                      <td className="p-3 font-semibold text-gray-900">{c.name_kr}</td>
                      <td className="p-3">{c.name_en || '-'}</td>
                      <td className="p-3">{c.phone || '-'}</td>
                      <td className="p-3">{c.email || '-'}</td>
                      <td className="p-3">{c.passport_number || '-'}</td>
                      <td className="p-3">{formatDate(c.passport_expiry)}</td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <button onClick={e => openEditModal(e, c)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">편집</button>
                      </td>
                    </tr>
                    {expandedId === c.id && (
                      <tr className="border-t border-indigo-100 bg-indigo-50">
                        <td colSpan={8} className="p-4">
                          {c.remarks && <p className="text-sm text-gray-600 mb-2"><span className="font-medium">비고:</span> {c.remarks}</p>}
                          <h4 className="font-semibold text-gray-700 mb-2">예약 이력</h4>
                          {detailLoading ? <p className="text-gray-400 text-sm">불러오는 중...</p> :
                           bookings.length === 0 ? <p className="text-gray-400 text-sm">예약 이력이 없습니다.</p> : (
                            <table className="w-full text-xs bg-white rounded border">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="p-2 text-left">PNR</th><th className="p-2 text-left">항공사</th><th className="p-2 text-left">편명</th>
                                  <th className="p-2 text-left">출발지</th><th className="p-2 text-left">도착지</th><th className="p-2 text-left">출발일</th><th className="p-2 text-left">상태</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bookings.map(b => (
                                  <tr key={b.id} className="border-t cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/bookings?highlight=${b.id}`)}>
                                    <td className="p-2">{b.pnr}</td><td className="p-2">{b.airline || '-'}</td><td className="p-2">{b.flight_number || '-'}</td>
                                    <td className="p-2">{b.route_from || '-'}</td><td className="p-2">{b.route_to || '-'}</td><td className="p-2">{formatDate(b.departure_date)}</td>
                                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>{b.status}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t text-sm text-gray-500">총 {total}건</div>
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? '고객 수정' : '고객 추가'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름(한글) *</label>
            <input type="text" value={form.name_kr} onChange={e => setForm({ ...form, name_kr: e.target.value })} placeholder="홍길동" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">영문명</label>
            <input type="text" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} placeholder="HONG GILDONG" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">여권번호</label>
            <input type="text" value={form.passport_number} onChange={e => setForm({ ...form, passport_number: e.target.value })} placeholder="M12345678" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">여권만료일</label>
            <input type="date" value={form.passport_expiry} onChange={e => setForm({ ...form, passport_expiry: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={3} placeholder="메모 입력..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
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
