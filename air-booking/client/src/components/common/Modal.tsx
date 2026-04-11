// @TASK P1-S0-T1 - Modal 컴포넌트 (sm/md/lg, backdrop 클릭, ESC 닫기)
// @TASK P2-T2 - Ctrl+Enter onConfirm 지원
import React, { useEffect, useRef } from 'react';
import '../../styles/components.css';

export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: ModalSize;
  children: React.ReactNode;
  /** Ctrl+Enter 로 호출되는 확인/저장 콜백 */
  onConfirm?: () => void;
}

export function Modal({ open, onClose, title, size = 'md', children, onConfirm }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC 키 닫기 + Ctrl+Enter 확인
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Ctrl+Enter (Mac: Cmd+Enter)
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const ctrlHeld = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlHeld && e.key === 'Enter' && onConfirm) {
        e.preventDefault();
        onConfirm();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onConfirm]);

  // 포커스 트랩 (접근성)
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      data-testid="modal-backdrop"
      onClick={handleBackdropClick}
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        className={`modal-dialog modal-${size}`}
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">
            {title}
          </h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="모달 닫기"
            type="button"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
