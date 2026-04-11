// 항공운임증명서 관리 — Legacy migration from air-booking

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

interface BookingListItem {
  id: string;
  pnr: string;
  passenger_name: string;
  passenger_name_en?: string;
  route_from?: string;
  route_to?: string;
  departure_date?: string;
  fare: number;
  pax_count: number;
  cabin_class?: string;
}

interface CertListItem {
  id: string;
  certificate_number: string;
  recipient: string;
  pnr?: string;
  issue_date: string;
  status: 'issued' | 'reissued' | 'cancelled';
}

interface FareForm {
  certificate_number: string;
  issue_date: string;
  recipient: string;
  traveler_name: string;
  pax_count: string;
  cabin_class: string;
  route: string;
  airfare_per_pax: string;
  tax_per_pax: string;
  fuel_surcharge_per_pax: string;
  ticket_fee_per_pax: string;
  valid_until: string;
  remarks: string;
  booking_id: string;
  pnr: string;
}

const EMPTY_FORM: FareForm = {
  certificate_number: '',
  issue_date: new Date().toISOString().slice(0, 10),
  recipient: '',
  traveler_name: '',
  pax_count: '1',
  cabin_class: '일반석(Y)',
  route: '',
  airfare_per_pax: '0',
  tax_per_pax: '0',
  fuel_surcharge_per_pax: '0',
  ticket_fee_per_pax: '0',
  valid_until: '',
  remarks: '',
  booking_id: '',
  pnr: '',
};

type DocMode = 'certificate' | 'quotation';
type SourceTab = 'booking' | 'schedule';

function formatNum(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR');
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  return d.slice(0, 10);
}

export default function FareCertificatesPage() {
  const [docMode, setDocMode] = useState<DocMode>('certificate');
  const [sourceTab, setSourceTab] = useState<SourceTab>('booking');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  // Booking source
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [search, setSearch] = useState('');

  // Cert list
  const [certificates, setCertificates] = useState<CertListItem[]>([]);

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FareForm>(EMPTY_FORM);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/bookings?${params}`);
      const data = await res.json();
      if (data.success) setBookings(data.data.bookings ?? []);
    } catch { showToast('예약 목록을 불러올 수 없습니다.', 'error'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const fetchCertificates = useCallback(async () => {
    try {
      const res = await fetch('/api/fare-certificates');
      const data = await res.json();
      if (data.success) setCertificates(data.data.certificates ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);

  const openCreateModal = (booking?: BookingListItem) => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      issue_date: new Date().toISOString().slice(0, 10),
      booking_id: booking?.id || '',
      pnr: booking?.pnr || '',
      traveler_name: booking?.passenger_name || '',
      route: booking ? `${booking.route_from || ''} → ${booking.route_to || ''}` : '',
      cabin_class: booking?.cabin_class || '일반석(Y)',
      pax_count: String(booking?.pax_count || 1),
      airfare_per_pax: String(booking?.fare || 0),
    });
    setFormOpen(true);
  };

  const openEditModal = async (cert: CertListItem) => {
    try {
      const res = await fetch(`/api/fare-certificates/${cert.id}`);
      const data = await res.json();
      if (data.success) {
        const certData = data.data.certificate;
        setEditingId(cert.id);
        setForm({
          certificate_number: certData.certificate_number || '',
          issue_date: certData.issue_date?.slice(0, 10) || '',
          recipient: certData.recipient || '',
          traveler_name: certData.traveler_name || '',
          pax_count: String(certData.pax_count || 1),
          cabin_class: certData.cabin_class || '일반석(Y)',
          route: certData.route || '',
          airfare_per_pax: String(certData.airfare_per_pax || 0),
          tax_per_pax: String(certData.tax_per_pax || 0),
          fuel_surcharge_per_pax: String(certData.fuel_surcharge_per_pax || 0),
          ticket_fee_per_pax: String(certData.ticket_fee_per_pax || 0),
          valid_until: certData.valid_until?.slice(0, 10) || '',
          remarks: certData.remarks || '',
          booking_id: certData.booking_id || '',
          pnr: certData.pnr || cert.pnr || '',
        });
        setFormOpen(true);
      }
    } catch { showToast('증명서 정보를 불러올 수 없습니다.', 'error'); }
  };

  const handleSubmit = async () => {
    if (!form.recipient.trim()) { showToast('수신자를 입력해주세요.', 'warning'); return; }
    setSaving(true);
    try {
      const url = editingId ? `/api/fare-certificates/${editingId}` : '/api/fare-certificates';
      const method = editingId ? 'PATCH' : 'POST';
      const payload = {
        ...form,
        pax_count: Number(form.pax_count),
        airfare_per_pax: Number(form.airfare_per_pax),
        tax_per_pax: Number(form.tax_per_pax),
        fuel_surcharge_per_pax: Number(form.fuel_surcharge_per_pax),
        ticket_fee_per_pax: Number(form.ticket_fee_per_pax),
      };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { showToast(editingId ? '증명서가 수정되었습니다.' : '증명서가 등록되었습니다.'); setFormOpen(false); fetchCertificates(); }
      else showToast(data.error || '저장에 실패했습니다.', 'error');
    } catch { showToast('저장에 실패했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/fare-certificates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('삭제되었습니다.'); fetchCertificates(); }
      else showToast(data.error || '삭제에 실패했습니다.', 'error');
    } catch { showToast('삭제에 실패했습니다.', 'error'); }
  };

  const handleDownloadPdf = async (cert: CertListItem) => {
    try {
      window.open(`/api/fare-certificates/${cert.id}/pdf`, '_blank');
    } catch { showToast('PDF 생성에 실패했습니다.', 'error'); }
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
          <h1 className="text-2xl font-bold text-gray-900">항공운임증명서</h1>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setDocMode('certificate')} className={`px-4 py-2 rounded-lg text-sm font-medium ${docMode === 'certificate' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}>운임증명서</button>
          <button onClick={() => setDocMode('quotation')} className={`px-4 py-2 rounded-lg text-sm font-medium ${docMode === 'quotation' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}>견적서</button>
        </div>

        {/* Source Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button onClick={() => setSourceTab('booking')} className={`px-4 py-2 border-b-2 text-sm font-medium ${sourceTab === 'booking' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>예약에서 선택</button>
          <button onClick={() => setSourceTab('schedule')} className={`px-4 py-2 border-b-2 text-sm font-medium ${sourceTab === 'schedule' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>스케줄에서 선택</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Source List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="PNR, 승객명 검색..." className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="overflow-y-auto max-h-96">
              {bookings.length === 0 ? (
                <div className="p-8 text-center text-gray-400">예약 데이터가 없습니다.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">PNR</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">승객</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">노선</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">출발일</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">요금</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{b.pnr}</td>
                        <td className="p-3">{b.passenger_name}</td>
                        <td className="p-3 text-xs">{b.route_from} → {b.route_to}</td>
                        <td className="p-3 text-xs">{formatDate(b.departure_date)}</td>
                        <td className="p-3 font-semibold">{b.fare.toLocaleString()}원</td>
                        <td className="p-3">
                          <button onClick={() => openCreateModal(b)} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700">선택</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: Certificate List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-semibold text-gray-700">등록된 증명서</span>
            </div>
            <div className="overflow-y-auto max-h-96">
              {certificates.length === 0 ? (
                <div className="p-8 text-center text-gray-400">증명서 데이터가 없습니다.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">증명서 번호</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">수신자</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">PNR</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">발행일</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500">상태</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map(c => (
                      <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{c.certificate_number}</td>
                        <td className="p-3">{c.recipient}</td>
                        <td className="p-3 text-xs">{c.pnr || '-'}</td>
                        <td className="p-3 text-xs">{formatDate(c.issue_date)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {c.status === 'issued' ? '발급' : c.status === 'reissued' ? '재발급' : '취소'}
                          </span>
                        </td>
                        <td className="p-3 flex gap-1">
                          <button onClick={() => openEditModal(c)} className="text-indigo-600 hover:text-indigo-800 text-xs">편집</button>
                          <button onClick={() => handleDownloadPdf(c)} className="text-blue-600 hover:text-blue-800 text-xs">PDF</button>
                          <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-xs">삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? '증명서 수정' : '증명서 발급'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">증명서 번호</label>
              <input type="text" value={form.certificate_number} onChange={e => setForm({ ...form, certificate_number: e.target.value })} placeholder="자동 생성" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">발행일</label>
              <input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">수신자 *</label>
            <input type="text" value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} placeholder="수신자 이름" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">여행자명</label>
              <input type="text" value={form.traveler_name} onChange={e => setForm({ ...form, traveler_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PNR</label>
              <input type="text" value={form.pnr} onChange={e => setForm({ ...form, pnr: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">인원</label>
              <input type="number" value={form.pax_count} onChange={e => setForm({ ...form, pax_count: e.target.value })} min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">舱位</label>
              <input type="text" value={form.cabin_class} onChange={e => setForm({ ...form, cabin_class: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">노선</label>
            <input type="text" value={form.route} onChange={e => setForm({ ...form, route: e.target.value })} placeholder="ICN → DAD" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">항공운임 (1인)</label>
              <input type="number" value={form.airfare_per_pax} onChange={e => setForm({ ...form, airfare_per_pax: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">세금 (1인)</label>
              <input type="number" value={form.tax_per_pax} onChange={e => setForm({ ...form, tax_per_pax: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유류할증료 (1인)</label>
              <input type="number" value={form.fuel_surcharge_per_pax} onChange={e => setForm({ ...form, fuel_surcharge_per_pax: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">티켓비용 (1인)</label>
              <input type="number" value={form.ticket_fee_per_pax} onChange={e => setForm({ ...form, ticket_fee_per_pax: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유효기간</label>
            <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
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
