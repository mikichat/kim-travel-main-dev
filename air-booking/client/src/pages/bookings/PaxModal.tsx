// @TASK P2-S3-T1 - 전체 탑승객 명단 모달
// @SPEC 3열 그리드 탑승객 표시, 이미지 복사, 인쇄

import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import type { Booking } from './types';

interface PaxModalProps {
  open: boolean;
  booking: Booking;
  onClose: () => void;
}

export function PaxModal({ open, booking, onClose }: PaxModalProps) {
  const passengers = booking.passengers || [];
  const paxCount = passengers.length || booking.pax_count || 1;
  const paxContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const handleCopyPaxImage = async () => {
    if (!paxContentRef.current) return;
    try {
      const clone = paxContentRef.current.cloneNode(true) as HTMLElement;
      // 버튼 영역 제거
      clone.querySelectorAll('.pax-modal-actions').forEach(el => el.remove());
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '720px';
      clone.style.background = '#ffffff';
      clone.style.padding = '32px';
      clone.style.borderRadius = '12px';
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        removeContainer: false,
      });
      document.body.removeChild(clone);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) { toast.error('이미지 생성 실패'); return; }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        toast.success('탑승객 명단 이미지 복사됨!');
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passengers-${booking.pnr}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('이미지가 다운로드되었습니다.');
      }
    } catch (err) {
      console.error('[bookings] Pax image capture failed:', err);
      toast.error('이미지 캡처에 실패했습니다.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="" size="lg">
      <div className="pax-modal" ref={paxContentRef}>
        {/* 헤더 */}
        <div className="pax-modal-header">
          <div className="pax-modal-title-group">
            <span className="pax-modal-icon" aria-hidden="true">&#9992;</span>
            <h2 className="pax-modal-title">전체 탑승객 명단</h2>
          </div>
        </div>

        {/* 부제 + 버튼들 */}
        <div className="pax-modal-meta">
          <p className="pax-modal-count">
            총 <strong>{paxCount}명</strong>의 탑승객이 확인되었습니다.
          </p>
          <div className="pax-modal-meta-btns">
            <button className="pax-print-btn" onClick={handleCopyPaxImage}>
              이미지 복사
            </button>
            <button className="pax-print-btn" onClick={handlePrint}>
              인쇄
            </button>
          </div>
        </div>

        {/* 3열 그리드 */}
        {passengers.length > 0 ? (
          <div className="pax-grid">
            {passengers.map((p, i) => (
              <div key={p.id} className="pax-grid-card">
                <span className="pax-grid-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="pax-grid-name">{p.name_en || p.name_kr || '-'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="pax-grid">
            <div className="pax-grid-card">
              <span className="pax-grid-num">01</span>
              <span className="pax-grid-name">{booking.name_en || booking.name_kr || '-'}</span>
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="pax-modal-actions">
          <button className="pax-back-btn" onClick={onClose}>
            ← 예약 상세로 돌아가기
          </button>
        </div>
      </div>
    </Modal>
  );
}
