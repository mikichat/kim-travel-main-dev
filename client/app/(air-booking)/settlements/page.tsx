// 정산 관리 — Legacy migration from air-booking

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';

interface Settlement {
  id: string;
  booking_id: string;
  vendor_id: string | null;
  payment_type: string | null;
  amount: number | null;
  status: string;
  payment_date: string | null;
  remarks: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  pnr: string;
  name_kr: string | null;
  fare: number | null;
  status: string;
}

interface Vendor {
  id: string;
  name: string;
  type: string | null;
}

type StatusFilter = '' | 'unpaid' | 'paid' | 'partial';

export default function SettlementsPage() {
  const router = useRouter();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Settlement | null>(null);
  const [paymentForm, setPaymentForm] = useState({ status: 'paid', payment_date: '', amount: 0 });
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<Settlement | null>(null);
  const [invoiceCreating, setInvoiceCreating] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<{ id: string; invoice_number: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const [settlRes, bookRes, vendRes] = await Promise.all([
        fetch(`/api/settlements?${params}`),
        fetch('/api/bookings?limit=200'),
        fetch('/api/vendors'),
      ]);
      const settlData = await settlRes.json();
      const bookData = await bookRes.json();
      const vendData = await vendRes.json();
      if (settlData.success) setSettlements(settlData.data.settlements);
      if (bookData.success) setBookings(bookData.data.bookings);
      if (vendData.success) setVendors(vendData.data.vendors);
    } catch (err) {
      console.error('[settlements] Failed to fetch data:', err);
      showToast('정산 데이터를 불러올 수 없습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary = useMemo(() => {
    const unpaid = settlements.filter(s => s.status === 'unpaid').reduce((sum, s) => sum + (s.amount || 0), 0);
    const paid = settlements.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.amount || 0), 0);
    const partial = settlements.filter(s => s.status === 'partial').reduce((sum, s) => sum + (s.amount || 0), 0);
    return { unpaid, paid, partial };
  }, [settlements]);

  const getBooking = (id: string) => bookings.find(b => b.id === id);
  const getVendor = (id: string | null) => id ? vendors.find(v => v.id === id) : null;

  const openPaymentModal = (s: Settlement) => {
    setPaymentTarget(s);
    setPaymentForm({ status: 'paid', payment_date: new Date().toISOString().slice(0, 10), amount: s.amount || 0 });
    setPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentTarget) return;
    try {
      const res = await fetch(`/api/settlements/${paymentTarget.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paymentForm) });
      const data = await res.json();
      if (data.success) { showToast('결제 정보가 업데이트되었습니다.'); setPaymentModal(false); fetchData(); }
    } catch { showToast('결제 업데이트에 실패했습니다.', 'error'); }
  };

  const openInvoiceModal = (s: Settlement) => {
    setInvoiceTarget(s);
    setCreatedInvoice(null);
    setInvoiceModal(true);
  };

  const handleInvoiceCreate = async () => {
    if (!invoiceTarget) return;
    setInvoiceCreating(true);
    try {
      const booking = getBooking(invoiceTarget.booking_id);
      const res = await fetch('/api/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          settlement_id: invoiceTarget.id,
          total_amount: invoiceTarget.amount,
          items_json: JSON.stringify([{ desc: booking ? `${booking.pnr} - ${booking.name_kr || ''}` : '항공권', amount: invoiceTarget.amount }]),
        }),
      });
      const data = await res.json();
      if (data.success) { showToast(`인보이스 ${data.data.invoice.invoice_number} 생성 완료`); setCreatedInvoice({ id: data.data.invoice.id, invoice_number: data.data.invoice.invoice_number }); }
    } catch { showToast('인보이스 생성에 실패했습니다.', 'error'); }
    finally { setInvoiceCreating(false); }
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
          <h1 className="text-2xl font-bold text-gray-900">정산 관리</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-xs text-red-600 font-medium">미수금</div>
            <div className="text-xl font-bold text-red-700">{summary.unpaid.toLocaleString()}원</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-xs text-green-600 font-medium">입금 완료</div>
            <div className="text-xl font-bold text-green-700">{summary.paid.toLocaleString()}원</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-xs text-yellow-600 font-medium">부분 입금</div>
            <div className="text-xl font-bold text-yellow-700">{summary.partial.toLocaleString()}원</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">전체</option><option value="unpaid">미수</option><option value="paid">입금완료</option><option value="partial">부분입금</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-600">예약 (PNR)</th>
                  <th className="p-3 text-left font-medium text-gray-600">승객</th>
                  <th className="p-3 text-left font-medium text-gray-600">거래처</th>
                  <th className="p-3 text-left font-medium text-gray-600">금액</th>
                  <th className="p-3 text-left font-medium text-gray-600">결제유형</th>
                  <th className="p-3 text-left font-medium text-gray-600">결제일</th>
                  <th className="p-3 text-left font-medium text-gray-600">상태</th>
                </tr>
              </thead>
              <tbody>
                {settlements.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">정산 데이터가 없습니다.</td></tr>
                ) : settlements.map(s => {
                  const booking = getBooking(s.booking_id);
                  const vendor = getVendor(s.vendor_id);
                  return (
                    <>
                      <tr key={s.id} className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${expandedId === s.id ? 'bg-blue-50' : ''}`} onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                        <td className="p-3">{booking?.pnr || '-'}</td>
                        <td className="p-3">{booking?.name_kr || '-'}</td>
                        <td className="p-3">{vendor?.name || '-'}</td>
                        <td className="p-3">{s.amount ? `${s.amount.toLocaleString()}원` : '-'}</td>
                        <td className="p-3">{s.payment_type || '-'}</td>
                        <td className="p-3">{s.payment_date || '-'}</td>
                        <td className="p-3"><StatusBadge status={s.status === 'unpaid' ? 'urgent' : s.status === 'paid' ? 'completed' : 'imminent'} /></td>
                      </tr>
                      {expandedId === s.id && (
                        <tr key={`${s.id}-detail`} className="bg-blue-50 border-t border-blue-100">
                          <td colSpan={7} className="p-4">
                            <div className="flex flex-wrap gap-2 items-center">
                              {booking && <span className="text-sm text-gray-600">운임: {booking.fare ? `${booking.fare.toLocaleString()}원` : '-'}</span>}
                              {s.remarks && <span className="text-sm text-gray-600">비고: {s.remarks}</span>}
                              <button onClick={(e) => { e.stopPropagation(); openPaymentModal(s); }} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">결제 처리</button>
                              <button onClick={(e) => { e.stopPropagation(); openInvoiceModal(s); }} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700">인보이스 생성</button>
                              <button onClick={(e) => { e.stopPropagation(); router.push(`/bookings?highlight=${s.booking_id}`); }} className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700">예약 이동</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="결제 처리" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">결제 상태</label>
            <select value={paymentForm.status} onChange={e => setPaymentForm({ ...paymentForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="paid">입금완료</option><option value="partial">부분입금</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">결제일</label>
            <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">금액</label>
            <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setPaymentModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">취소</button>
            <button onClick={handlePaymentSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">저장</button>
          </div>
        </div>
      </Modal>

      {/* Invoice Modal */}
      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title={createdInvoice ? '인보이스 생성 완료' : '인보이스 생성'} size="sm">
        <div className="space-y-4">
          {createdInvoice ? (
            <>
              <p>인보이스 <strong>{createdInvoice.invoice_number}</strong>이 생성되었습니다.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setInvoiceModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">닫기</button>
                <a href={`/api/invoices/${createdInvoice.id}/pdf`} download className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">PDF 다운로드</a>
              </div>
            </>
          ) : (
            <>
              {invoiceTarget && <p>금액: {invoiceTarget.amount?.toLocaleString() || 0}원 / 예약: {getBooking(invoiceTarget.booking_id)?.pnr || '-'}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setInvoiceModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">취소</button>
                <button onClick={handleInvoiceCreate} disabled={invoiceCreating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{invoiceCreating ? '생성 중...' : '생성'}</button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
