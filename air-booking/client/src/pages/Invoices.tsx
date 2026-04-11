// 인보이스 관리 — 조회/편집/삭제 (생성은 예약장부에서)

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { InvoiceModal } from '../components/invoice/InvoiceModal';
import { useToast } from '../components/common/Toast';
import '../styles/invoices.css';

interface InvoiceListItem {
  id: string;
  invoice_number: string;
  recipient: string;
  invoice_date: string;
  description: string | null;
  total_amount: number;
  calculation_mode: string | null;
  created_at: string;
}

function formatNum(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR');
}

export function Invoices() {
  const { toast } = useToast();
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [editPnr, setEditPnr] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/invoices?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setItems(data.data.invoices);
        setTotal(data.data.total);
      }
    } catch {
      toast.error('인보이스 목록��� 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 인보이스를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('삭제되었습니다.');
        fetchItems();
      } else {
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const formatDate = (d: string | null) => d ? d.slice(0, 10) : '-';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="inv-page">
      <div className="inv-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="search-input"
            placeholder="수신인, 인보이스 번호, 설명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="인보이스 검색"
          />
        </div>
        <div className="inv-toolbar-info">인보이스 생성은 ���약장부에서</div>
      </div>

      {items.length === 0 ? (
        <div className="inv-empty">인보이스 데이터가 없습니다.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="inv-table">
            <thead>
              <tr>
                <th>인보이스 번호</th>
                <th>수신인</th>
                <th>발행일</th>
                <th>설명</th>
                <th>모드</th>
                <th>총액</th>
                <th>등록일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => { setEditInvoiceId(item.id); setEditPnr(item.invoice_number); }} className="inv-row-click">
                  <td className="inv-number">{item.invoice_number}</td>
                  <td>{item.recipient}</td>
                  <td>{formatDate(item.invoice_date)}</td>
                  <td className="inv-desc">{item.description || '-'}</td>
                  <td>
                    <span className={`inv-mode-badge ${item.calculation_mode || 'simple'}`}>
                      {item.calculation_mode === 'advanced' ? '상세' : '간편'}
                    </span>
                  </td>
                  <td className="inv-amount">{formatNum(item.total_amount)}원</td>
                  <td>{formatDate(item.created_at)}</td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="inv-delete-btn"
                      style={{ background: '#000666', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); window.open(`/api/invoices/${item.id}/pdf`, '_blank'); }}
                      aria-label="PDF 인쇄"
                    >
                      PDF
                    </button>
                    <button
                      className="inv-delete-btn"
                      onClick={(e) => handleDelete(item.id, e)}
                      aria-label="삭제"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="inv-footer">총 {total}��</div>

      {/* 인보이스 편집 모달 */}
      {editInvoiceId && (
        <InvoiceModal
          invoiceId={editInvoiceId}
          bookingPnr={editPnr}
          open={true}
          onClose={() => { setEditInvoiceId(null); fetchItems(); }}
        />
      )}
    </div>
  );
}
