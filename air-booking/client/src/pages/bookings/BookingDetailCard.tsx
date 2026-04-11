// @TASK P2-S3-T1 - 예약 상세 카드 (Stitch 디자인)
// @SPEC 항공편 구간, 탑승객 목록, 예약 정보, 공유/액션 버튼

import React, { useState, useCallback } from 'react';
import { BookingEditFields } from './BookingEditFields';
import { parseSegments } from './utils';
import { STATUS_LABEL, PAX_THRESHOLD } from './types';
import type { Booking, Segment } from './types';
import { useToast } from '../../components/common/Toast';

export interface BookingDetailCardProps {
  booking: Booking;
  cardRef?: React.RefObject<HTMLDivElement>;
  onSave: (b: Partial<Booking> & { id: string }) => void;
  onCopyText: () => void;
  onCopyImage: () => void;
  onOpenNotice: () => void;
  onTicketing: () => void;
  onDelete: () => void;
  onNavigateCustomer: () => void;
  onNavigateSettlement: () => void;
  onViewAllPax: () => void;
  onViewTickets: () => void;
  onInvoice: () => void;
  ticketPanelOpen: boolean;
}

export function BookingDetailCard({
  booking: b,
  cardRef,
  onSave,
  onCopyText,
  onCopyImage,
  onOpenNotice,
  onTicketing,
  onDelete,
  onNavigateCustomer,
  onNavigateSettlement,
  onViewAllPax,
  onViewTickets,
  onInvoice,
  ticketPanelOpen,
}: BookingDetailCardProps) {
  const { toast } = useToast();
  const [segments, setSegments] = useState<Segment[]>(() => parseSegments(b));
  const passengers = b.passengers || [];
  const paxCount = passengers.length || b.pax_count || 1;
  const hasMany = paxCount > PAX_THRESHOLD;

  const handleTimeChange = useCallback(async (segIndex: number, field: 'departureTime' | 'arrivalTime', value: string) => {
    const seg = segments[segIndex];
    if (!seg?.id) return;

    const prev = [...segments];
    const updated = [...segments];
    updated[segIndex] = { ...seg, [field]: value };
    setSegments(updated);

    // DB 저장
    try {
      const res = await fetch(`/api/bookings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          segments: [{ id: seg.id, departure_time: field === 'departureTime' ? value : seg.departureTime, arrival_time: field === 'arrivalTime' ? value : seg.arrivalTime }],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `서버 오류 (${res.status})`);
      }
    } catch (err) {
      console.error('[BookingDetailCard] 시간 저장 실패:', err);
      setSegments(prev);
      toast.error(err instanceof Error ? err.message : '시간 변경 저장에 실패했습니다.');
    }
  }, [segments, b.id, toast]);

  return (
    <div className="booking-card" ref={cardRef}>
      {/* ── 카드 헤더 ── */}
      <div className="card-header">
        <div className="card-pnr">
          <span className="card-pnr-label">PNR</span>
          <span className="card-pnr-code">{b.pnr}</span>
        </div>
        <div className="card-header-right">
          <span className={`card-status-badge card-status-${b.status}`}>
            {STATUS_LABEL[b.status] || b.status}
          </span>
        </div>
      </div>

      {/* ── 항공편 구간 카드들 ── */}
      <div className="card-segments">
        {segments.map((seg, i) => (
          <div key={i} className="card-route">
            {/* 편명 + 날짜 라벨 행 */}
            <div className="route-top-row">
              <div className="route-flight-label">
                <span className="route-flight-name">{seg.flight}</span>
                <span className="route-flight-tag">FLIGHT NUMBER</span>
              </div>
              <span className="route-date">{seg.date}</span>
            </div>
            {/* 공항 코드 + flight path 행 */}
            <div className="route-path-row">
              <div className="route-point">
                <span className="route-code">{seg.from}</span>
                <input
                  type="time"
                  className="route-time-input"
                  value={seg.departureTime || ''}
                  onChange={(e) => handleTimeChange(i, 'departureTime', e.target.value)}
                  title="출발 시간"
                />
                <span className="route-label">{i === 0 ? '출발' : '출발(귀국)'}</span>
              </div>
              <div className="route-path">
                <div className="route-path-line">
                  <div className="path-line-bar" />
                  <span className="path-plane-icon" aria-hidden="true">&#9992;</span>
                  <div className="path-line-bar" />
                </div>
              </div>
              <div className="route-point">
                <span className="route-code">{seg.to}</span>
                <input
                  type="time"
                  className="route-time-input"
                  value={seg.arrivalTime || ''}
                  onChange={(e) => handleTimeChange(i, 'arrivalTime', e.target.value)}
                  title="도착 시간"
                />
                <span className="route-label">도착</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 하단 2컬럼: 탑승객 | 예약정보 ── */}
      <div className="card-detail-grid">
        {/* 좌: 탑승객 리스트 */}
        <div className="card-detail-col card-detail-left">
          <div className="card-col-header">
            <span className="card-col-title">탑승객</span>
            <span className="card-col-count">{paxCount}명</span>
          </div>
          <div className={`passengers-list${hasMany ? ' passengers-scroll' : ''}`}>
            {passengers.length > 0 ? (
              passengers.map((p, i) => (
                <div key={p.id} className="passenger-item">
                  <span className={`passenger-badge${i === 0 ? ' badge-primary' : ' badge-gray'}`}>
                    {i + 1}
                  </span>
                  <span className="passenger-name">{p.name_en || p.name_kr || '-'}</span>
                  {p.title && (
                    <span className={`passenger-title ${p.title === 'MR' || p.title === 'MSTR' ? 'title-m' : 'title-f'}`}>
                      {p.title}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="passenger-item">
                <span className="passenger-badge badge-primary">1</span>
                <span className="passenger-name">{b.name_en || b.name_kr || '-'}</span>
              </div>
            )}
          </div>
          {hasMany && (
            <button
              className="view-all-pax-btn"
              onClick={(e) => { e.stopPropagation(); onViewAllPax(); }}
            >
              전체 탑승객 보기 (View All Passengers) →
            </button>
          )}
        </div>

        {/* 우: 예약정보 테이블 (또는 편집폼) */}
        <div className="card-detail-col card-detail-right">
          <BookingEditFields booking={b} onSave={onSave} />
        </div>
      </div>

      {/* ── 원본 PNR ── */}
      {b.original_pnr_text && (
        <div style={{ margin: '8px 16px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#475569', marginBottom: '6px' }}>원본 PNR</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{b.original_pnr_text}</pre>
        </div>
      )}

      {/* ── 카드 푸터 (다크) ── */}
      <div className="card-footer-dark">
        <div className="card-footer-contact">
          <span className="footer-phone-icon" aria-hidden="true">&#9743;</span>
          <span className="footer-phone">063-271-9090</span>
        </div>
        <div className="card-footer-agency">
          <span>Agency: 여행세상</span>
        </div>
      </div>

      {/* ── 공유 버튼 ── */}
      <div className="card-share">
        <button
          className="share-btn share-text"
          onClick={(e) => { e.stopPropagation(); onCopyText(); }}
        >
          텍스트 복사
        </button>
        <button
          className="share-btn share-image"
          onClick={(e) => { e.stopPropagation(); onCopyImage(); }}
        >
          이미지 복사
        </button>
        <button
          className="share-btn share-email"
          onClick={(e) => { e.stopPropagation(); onOpenNotice(); }}
        >
          이메일 발송
        </button>
      </div>

      {/* ── 액션 버튼 ── */}
      <div className="card-actions">
        {b.status !== 'ticketed' && b.status !== 'cancelled' && (
          <button
            className="action-btn action-ticketing"
            onClick={(e) => { e.stopPropagation(); onTicketing(); }}
          >
            발권 처리
          </button>
        )}
        {b.customer_id && (
          <button
            className="action-btn"
            onClick={(e) => { e.stopPropagation(); onNavigateCustomer(); }}
          >
            고객 정보
          </button>
        )}
        <button
          className="action-btn"
          onClick={(e) => { e.stopPropagation(); onNavigateSettlement(); }}
        >
          정산 이동
        </button>
        <button
          className={`action-btn${ticketPanelOpen ? ' action-ticketing' : ''}`}
          onClick={(e) => { e.stopPropagation(); onViewTickets(); }}
        >
          🎫 티켓 관리
        </button>
        <button
          className="action-btn"
          onClick={(e) => { e.stopPropagation(); onInvoice(); }}
        >
          📋 인보이스 작성
        </button>
        <button
          className="action-btn action-danger"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
