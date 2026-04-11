// @TASK P3-S1-T1 - 정산 관리 화면
// @SPEC 요약 카드, 상태 필터, 정산 목록 테이블, 결제 모달, 인보이스 모달

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge, type BadgeStatus } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import '../styles/settlements.css';

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

const STATUS_MAP: Record<string, BadgeStatus> = {
  unpaid: 'urgent',
  partial: 'imminent',
  paid: 'completed',
};

export function Settlements() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Settlement | null>(null);
  const [paymentForm, setPaymentForm] = useState({ status: 'paid', payment_date: '', amount: 0 });

  // Invoice modal
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<Settlement | null>(null);
  const [invoiceCreating, setInvoiceCreating] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<{ id: string; invoice_number: string } | null>(null);

  const bookingId = searchParams.get('booking');

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (bookingId) params.set('booking_id', bookingId);

      const [settlRes, bookRes, vendRes] = await Promise.all([
        fetch(`/api/settlements?${params}`, { credentials: 'include' }),
        fetch('/api/bookings?limit=200', { credentials: 'include' }),
        fetch('/api/vendors', { credentials: 'include' }),
      ]);

      const settlData = await settlRes.json();
      const bookData = await bookRes.json();
      const vendData = await vendRes.json();

      if (settlData.success) setSettlements(settlData.data.settlements);
      if (bookData.success) setBookings(bookData.data.bookings);
      if (vendData.success) setVendors(vendData.data.vendors);
    } catch (err) {
      console.error('[settlements] Failed to fetch data:', err);
      toast.error('정산 데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, bookingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = useMemo(() => {
    const unpaid = settlements.filter((s) => s.status === 'unpaid').reduce((sum, s) => sum + (s.amount || 0), 0);
    const paid = settlements.filter((s) => s.status === 'paid').reduce((sum, s) => sum + (s.amount || 0), 0);
    const partial = settlements.filter((s) => s.status === 'partial').reduce((sum, s) => sum + (s.amount || 0), 0);
    return { unpaid, paid, partial };
  }, [settlements]);

  const getBooking = (id: string) => bookings.find((b) => b.id === id);
  const getVendor = (id: string | null) => (id ? vendors.find((v) => v.id === id) : null);

  const openPaymentModal = (s: Settlement) => {
    setPaymentTarget(s);
    setPaymentForm({
      status: 'paid',
      payment_date: new Date().toISOString().slice(0, 10),
      amount: s.amount || 0,
    });
    setPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentTarget) return;
    try {
      const res = await fetch(`/api/settlements/${paymentTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(paymentForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('결제 정보가 업데이트되었습니다.');
        setPaymentModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('[settlements] Payment update failed:', err);
      toast.error('결제 업데이트에 실패했습니다.');
    }
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settlement_id: invoiceTarget.id,
          total_amount: invoiceTarget.amount,
          items_json: JSON.stringify([
            { desc: booking ? `${booking.pnr} - ${booking.name_kr || ''}` : '항공권', amount: invoiceTarget.amount },
          ]),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`인보이스 ${data.data.invoice.invoice_number} 생성 완료`);
        setCreatedInvoice({ id: data.data.invoice.id, invoice_number: data.data.invoice.invoice_number });
      }
    } catch (err) {
      console.error('[settlements] Invoice create failed:', err);
      toast.error('인보이스 생성에 실패했습니다.');
    } finally {
      setInvoiceCreating(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="settlements-page">
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="stat-card stat-unpaid">
          <span className="stat-label">미수금</span>
          <span className="stat-value">{summary.unpaid.toLocaleString()}원</span>
        </div>
        <div className="stat-card stat-paid">
          <span className="stat-label">입금 완료</span>
          <span className="stat-value">{summary.paid.toLocaleString()}원</span>
        </div>
        <div className="stat-card stat-partial">
          <span className="stat-label">부분 입금</span>
          <span className="stat-value">{summary.partial.toLocaleString()}원</span>
        </div>
      </div>

      {/* Filter */}
      <div className="settlements-toolbar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="상태 필터"
        >
          <option value="">전체</option>
          <option value="unpaid">미수</option>
          <option value="paid">입금완료</option>
          <option value="partial">부분입금</option>
        </select>
      </div>

      {/* Table */}
      <div className="settlements-table-wrapper">
        <table className="settlements-table">
          <thead>
            <tr>
              <th>예약 (PNR)</th>
              <th>승객</th>
              <th>거래처</th>
              <th>금액</th>
              <th>결제유형</th>
              <th>결제일</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {settlements.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">정산 데이터가 없습니다.</td>
              </tr>
            ) : (
              settlements.map((s) => {
                const booking = getBooking(s.booking_id);
                const vendor = getVendor(s.vendor_id);
                return (
                  <tr
                    key={s.id}
                    className={`settlement-row ${expandedId === s.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <td>{booking?.pnr || '-'}</td>
                    <td>{booking?.name_kr || '-'}</td>
                    <td>{vendor?.name || '-'}</td>
                    <td>{s.amount ? `${s.amount.toLocaleString()}원` : '-'}</td>
                    <td>{s.payment_type || '-'}</td>
                    <td>{s.payment_date || '-'}</td>
                    <td><StatusBadge status={STATUS_MAP[s.status] || 'pending'} /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded detail actions */}
      {expandedId && (() => {
        const s = settlements.find((x) => x.id === expandedId);
        if (!s) return null;
        const booking = getBooking(s.booking_id);
        return (
          <div className="settlement-detail" data-testid="settlement-actions">
            <div className="settlement-detail-info">
              {booking && (
                <>
                  <span className="detail-item">운임: {booking.fare ? `${booking.fare.toLocaleString()}원` : '-'}</span>
                  <span className="detail-item">예약상태: {booking.status || '-'}</span>
                </>
              )}
              {s.remarks && <span className="detail-item">비고: {s.remarks}</span>}
            </div>
            <div className="settlement-actions">
              <button onClick={(e) => { e.stopPropagation(); openPaymentModal(s); }} className="action-btn">
                결제 처리
              </button>
              <button onClick={(e) => { e.stopPropagation(); openInvoiceModal(s); }} className="action-btn">
                인보이스 생성
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/bookings?highlight=${s.booking_id}`); }}
                className="action-btn"
              >
                예약 이동
              </button>
            </div>
          </div>
        );
      })()}

      {/* Payment Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="결제 처리" size="sm">
        <div className="payment-form">
          <div className="form-group">
            <label htmlFor="pay-status">결제 상태</label>
            <select
              id="pay-status"
              value={paymentForm.status}
              onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}
            >
              <option value="paid">입금완료</option>
              <option value="partial">부분입금</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="pay-date">결제일</label>
            <input
              id="pay-date"
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="pay-amount">금액</label>
            <input
              id="pay-amount"
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
            />
          </div>
          <div className="modal-actions">
            <button onClick={() => setPaymentModal(false)} className="cancel-btn">취소</button>
            <button onClick={handlePaymentSubmit} className="submit-btn">저장</button>
          </div>
        </div>
      </Modal>

      {/* Invoice Modal */}
      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title={createdInvoice ? '인보이스 생성 완료' : '인보이스 생성'} size="sm">
        <div className="invoice-confirm">
          {createdInvoice ? (
            <>
              <p>인보이스 <strong>{createdInvoice.invoice_number}</strong>이 생성되었습니다.</p>
              <div className="modal-actions">
                <button onClick={() => setInvoiceModal(false)} className="cancel-btn">닫기</button>
                <a
                  href={`/api/invoices/${createdInvoice.id}/pdf`}
                  className="submit-btn invoice-download-btn"
                  download
                >
                  PDF 다운로드
                </a>
              </div>
            </>
          ) : (
            <>
              {invoiceTarget && (
                <>
                  <p>금액: {invoiceTarget.amount?.toLocaleString() || 0}원</p>
                  <p>예약: {getBooking(invoiceTarget.booking_id)?.pnr || '-'}</p>
                </>
              )}
              <div className="modal-actions">
                <button onClick={() => setInvoiceModal(false)} className="cancel-btn">취소</button>
                <button onClick={handleInvoiceCreate} className="submit-btn" disabled={invoiceCreating}>
                  {invoiceCreating ? '생성 중...' : '생성'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
