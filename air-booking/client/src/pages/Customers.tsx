// @TASK P4-S1-T1 - 고객 관리 화면
// @SPEC 검색(디바운스 300ms), 고객 테이블, 추가/편집 모달, 행 클릭 예약 이력 확장

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { StatusBadge, type BadgeStatus } from '../components/common/StatusBadge';
import '../styles/customers.css';

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

const STATUS_MAP: Record<string, BadgeStatus> = {
  pending: 'pending',
  confirmed: 'imminent',
  ticketed: 'completed',
  cancelled: 'urgent',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10);
}

export function Customers() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Expandable row state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/customers?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data.customers);
        setTotal(data.data.total);
      } else {
        toast.error('고객 목록을 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('[customers] Failed to fetch customers:', err);
      toast.error('고객 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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
      const res = await fetch(`/api/customers/${customer.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setBookings(data.data.bookings ?? []);
      } else {
        toast.error('예약 이력을 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('[customers] Failed to fetch bookings:', err);
      toast.error('예약 이력을 불러올 수 없습니다.');
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
    if (!form.name_kr.trim()) {
      toast.warning('고객 이름(한글)을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(editingId ? '고객 정보가 수정되었습니다.' : '고객이 등록되었습니다.');
        setFormOpen(false);
        // If the expanded row was this customer, refresh its detail
        if (editingId && expandedId === editingId) {
          setExpandedId(null);
          setBookings([]);
        }
        fetchCustomers();
      } else {
        toast.error(data.error || '저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('[customers] Failed to save customer:', err);
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleBookingClick = (bookingId: string) => {
    navigate(`/bookings?highlight=${bookingId}`);
  };

  const COLS = 8; // 이름, 영문명, 전화번호, 이메일, 여권번호, 여권만료일, 관리 + 확장 아이콘

  if (loading) return <LoadingSpinner />;

  return (
    <div className="customers-page">
      {/* Toolbar */}
      <div className="customers-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="이름 또는 여권번호 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="고객 검색"
        />
        <button className="add-btn" onClick={() => window.open('/api/customers/export/csv', '_blank')} style={{ background: '#059669' }}>
          CSV 내보내기
        </button>
        <button className="add-btn" onClick={openCreateModal}>
          고객 추가
        </button>
      </div>

      {/* Table */}
      <div className="customers-table-wrapper">
        <table className="customers-table">
          <thead>
            <tr>
              <th className="col-expand" aria-hidden="true" />
              <th>이름</th>
              <th>영문명</th>
              <th>전화번호</th>
              <th>이메일</th>
              <th>여권번호</th>
              <th>여권만료일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={COLS} className="empty-cell">
                  {search ? `"${search}"에 해당하는 고객이 없습니다.` : '등록된 고객이 없습니다.'}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <Fragment key={c.id}>
                  <tr
                    className={`customer-row${expandedId === c.id ? ' customer-row--expanded' : ''}`}
                    onClick={() => handleRowClick(c)}
                    aria-expanded={expandedId === c.id}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleRowClick(c)}
                  >
                    <td className="col-expand">
                      <span className={`expand-icon${expandedId === c.id ? ' expand-icon--open' : ''}`}>
                        ▶
                      </span>
                    </td>
                    <td className="customer-name">{c.name_kr}</td>
                    <td>{c.name_en || '-'}</td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.email || '-'}</td>
                    <td className="passport-number">{c.passport_number || '-'}</td>
                    <td>{formatDate(c.passport_expiry)}</td>
                    <td
                      className="customer-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="action-btn-sm"
                        onClick={(e) => openEditModal(e, c)}
                        aria-label={`${c.name_kr} 편집`}
                      >
                        편집
                      </button>
                    </td>
                  </tr>

                  {expandedId === c.id && (
                    <tr className="customer-detail-row">
                      <td colSpan={COLS} className="customer-detail-cell">
                        <div className="customer-detail">
                          {c.remarks && (
                            <p className="customer-remarks">
                              <span className="detail-label">비고:</span> {c.remarks}
                            </p>
                          )}
                          <h4 className="detail-section-title">예약 이력</h4>
                          {detailLoading ? (
                            <p className="detail-loading">불러오는 중...</p>
                          ) : bookings.length === 0 ? (
                            <p className="detail-empty">예약 이력이 없습니다.</p>
                          ) : (
                            <table className="bookings-history-table">
                              <thead>
                                <tr>
                                  <th>PNR</th>
                                  <th>항공사</th>
                                  <th>편명</th>
                                  <th>출발지</th>
                                  <th>도착지</th>
                                  <th>출발일</th>
                                  <th>상태</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bookings.map((b) => (
                                  <tr
                                    key={b.id}
                                    className="booking-history-row"
                                    onClick={() => handleBookingClick(b.id)}
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && handleBookingClick(b.id)}
                                    aria-label={`예약 ${b.pnr} 상세 보기`}
                                  >
                                    <td className="booking-pnr">{b.pnr}</td>
                                    <td>{b.airline || '-'}</td>
                                    <td>{b.flight_number || '-'}</td>
                                    <td>{b.route_from || '-'}</td>
                                    <td>{b.route_to || '-'}</td>
                                    <td>{formatDate(b.departure_date)}</td>
                                    <td>
                                      <StatusBadge
                                        status={STATUS_MAP[b.status] ?? 'pending'}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="customers-footer">총 {total}건</div>

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? '고객 수정' : '고객 추가'}
        size="md"
      >
        <div className="customer-form">
          <div className="form-group">
            <label htmlFor="customer-name-kr">이름(한글) *</label>
            <input
              id="customer-name-kr"
              type="text"
              value={form.name_kr}
              onChange={(e) => setForm({ ...form, name_kr: e.target.value })}
              placeholder="홍길동"
            />
          </div>
          <div className="form-group">
            <label htmlFor="customer-name-en">영문명</label>
            <input
              id="customer-name-en"
              type="text"
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              placeholder="HONG GILDONG"
            />
          </div>
          <div className="form-group">
            <label htmlFor="customer-phone">전화번호</label>
            <input
              id="customer-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="010-0000-0000"
            />
          </div>
          <div className="form-group">
            <label htmlFor="customer-email">이메일</label>
            <input
              id="customer-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="example@email.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="customer-passport-number">여권번호</label>
            <input
              id="customer-passport-number"
              type="text"
              value={form.passport_number}
              onChange={(e) => setForm({ ...form, passport_number: e.target.value })}
              placeholder="M12345678"
            />
          </div>
          <div className="form-group">
            <label htmlFor="customer-passport-expiry">여권만료일</label>
            <input
              id="customer-passport-expiry"
              type="date"
              value={form.passport_expiry}
              onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="customer-remarks">비고</label>
            <textarea
              id="customer-remarks"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={3}
              placeholder="메모 입력..."
            />
          </div>
          <div className="modal-actions">
            <button onClick={() => setFormOpen(false)} className="cancel-btn">
              취소
            </button>
            <button onClick={handleSubmit} className="submit-btn" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
