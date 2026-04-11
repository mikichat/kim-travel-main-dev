// 원가 계산서 관리 — travel_agency.db cost_calculations 테이블

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { useCostForm } from './cost-calculations/useCostForm';
import { CostDetailModal, type CostCalcDetail } from './cost-calculations/CostDetailModal';
import '../styles/cost-calculations.css';

interface CostCalcListItem {
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
  created_at: string;
  updated_at: string;
}

export function CostCalculations() {
  const { toast } = useToast();
  const [items, setItems] = useState<CostCalcListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<CostCalcDetail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
    } catch {
      toast.error('원가 계산서 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const { form, saving, updateForm, handleCreate } = useCostForm({
    onSuccess: () => {
      setCreateOpen(false);
      fetchItems();
    },
  });

  const openDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/cost-calculations/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setDetail(data.data.item);
        setDetailOpen(true);
      }
    } catch {
      toast.error('원가 계산서를 불러올 수 없습니다.');
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 원가 계산서를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/cost-calculations/${id}`, {
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
    <div className="cc-page">
      <div className="cc-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="search-input"
            placeholder="행사명, 코드, 여행지 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="원가 계산서 검색"
          />
        </div>
        <button className="cc-add-btn" onClick={() => setCreateOpen(true)}>
          + 원가 계산서 등록
        </button>
      </div>

      {items.length === 0 ? (
        <div className="cc-empty">원가 계산서 데이터가 없습니다.</div>
      ) : (
        <div className="cc-grid">
          {items.map((item) => (
            <div
              key={item.id}
              className="cc-card"
              onClick={() => openDetail(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openDetail(item.id)}
            >
              <div className="cc-card-header">
                <span className="cc-card-code">{item.code}</span>
                <button
                  className="cc-card-delete"
                  onClick={(e) => handleDelete(item.id, e)}
                  aria-label="삭제"
                >
                  삭제
                </button>
              </div>
              <div className="cc-card-name">{item.name}</div>
              <div className="cc-card-meta">
                <span>{item.destination || '미정'}</span>
                <span>
                  {formatDate(item.departure_date)} ~ {formatDate(item.arrival_date)}
                </span>
                {item.nights != null && item.days != null && (
                  <span>{item.nights}박 {item.days}일</span>
                )}
              </div>
              <div className="cc-card-footer">
                <span className="cc-pax">
                  성인 {item.adults} / 소아 {item.children} / 유아 {item.infants} / TC {item.tc}
                </span>
                <span className="cc-date">{formatDate(item.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="cc-footer">총 {total}건</div>

      <CostDetailModal
        open={detailOpen}
        detail={detail}
        onClose={() => setDetailOpen(false)}
      />

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="원가 계산서 등록"
        size="lg"
      >
        <div className="cc-form">
          <div className="cc-form-section">기본 정보</div>
          <div className="cc-form-row">
            <label>
              행사명 *
              <input type="text" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="행사명 입력" />
            </label>
            <label>
              여행지
              <input type="text" value={form.destination} onChange={(e) => updateForm('destination', e.target.value)} placeholder="예: 일본 오사카" />
            </label>
          </div>
          <div className="cc-form-row cc-form-row-4">
            <label>
              출발일
              <input type="date" value={form.departure_date} onChange={(e) => updateForm('departure_date', e.target.value)} />
            </label>
            <label>
              귀국일
              <input type="date" value={form.arrival_date} onChange={(e) => updateForm('arrival_date', e.target.value)} />
            </label>
            <label>
              박
              <input type="number" min="0" value={form.nights} onChange={(e) => updateForm('nights', e.target.value)} />
            </label>
            <label>
              일
              <input type="number" min="0" value={form.days} onChange={(e) => updateForm('days', e.target.value)} />
            </label>
          </div>

          <div className="cc-form-section">인원</div>
          <div className="cc-form-row cc-form-row-4">
            <label>
              성인
              <input type="number" min="0" value={form.adults} onChange={(e) => updateForm('adults', e.target.value)} />
            </label>
            <label>
              소아
              <input type="number" min="0" value={form.children} onChange={(e) => updateForm('children', e.target.value)} />
            </label>
            <label>
              유아
              <input type="number" min="0" value={form.infants} onChange={(e) => updateForm('infants', e.target.value)} />
            </label>
            <label>
              인솔자(TC)
              <input type="number" min="0" value={form.tc} onChange={(e) => updateForm('tc', e.target.value)} />
            </label>
          </div>

          <div className="cc-form-section">국내 이동</div>
          <div className="cc-form-row">
            <label>
              차량 유형
              <input type="text" value={form.domestic_vehicle_type} onChange={(e) => updateForm('domestic_vehicle_type', e.target.value)} placeholder="예: 대형 버스" />
            </label>
            <label>
              차량 비용
              <input type="number" min="0" value={form.domestic_vehicle_total} onChange={(e) => updateForm('domestic_vehicle_total', e.target.value)} />
            </label>
          </div>

          <div className="cc-form-section">마진 & 비고</div>
          <div className="cc-form-row">
            <label>
              마진 1 (원)
              <input type="number" min="0" value={form.margin_amount_1} onChange={(e) => updateForm('margin_amount_1', e.target.value)} />
            </label>
            <label>
              마진 2 (원)
              <input type="number" min="0" value={form.margin_amount_2} onChange={(e) => updateForm('margin_amount_2', e.target.value)} />
            </label>
          </div>
          <div className="cc-form-row">
            <label>
              비고 1
              <textarea value={form.notes_1} onChange={(e) => updateForm('notes_1', e.target.value)} rows={2} />
            </label>
            <label>
              비고 2
              <textarea value={form.notes_2} onChange={(e) => updateForm('notes_2', e.target.value)} rows={2} />
            </label>
          </div>

          <div className="cc-form-actions">
            <button className="btn-cancel" onClick={() => setCreateOpen(false)}>취소</button>
            <button className="btn-save" onClick={handleCreate} disabled={saving}>
              {saving ? '저장 중...' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
