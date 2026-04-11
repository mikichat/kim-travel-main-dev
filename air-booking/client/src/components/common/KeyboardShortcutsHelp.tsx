// @TASK P2-T2 - 키보드 단축키 도움말 오버레이
import React, { useEffect, useRef } from 'react';
import '../../styles/components.css';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: '네비게이션',
    items: [
      { keys: ['Alt', '1'], description: '대시보드' },
      { keys: ['Alt', '2'], description: '예약장부' },
      { keys: ['Alt', '3'], description: '캘린더' },
      { keys: ['Alt', '4'], description: '정산' },
      { keys: ['Alt', '5'], description: '고객' },
      { keys: ['Alt', '6'], description: '공급사' },
      { keys: ['Alt', '7'], description: '설정' },
    ],
  },
  {
    title: '일반',
    items: [
      { keys: ['?'], description: '단축키 도움말 토글' },
      { keys: ['Esc'], description: '모달 / 패널 닫기' },
    ],
  },
  {
    title: '예약장부',
    items: [
      { keys: ['Ctrl', 'K'], description: '검색 포커스' },
      { keys: ['/'], description: '검색 포커스' },
      { keys: ['Ctrl', 'Shift', 'N'], description: 'PNR 등록 모달 열기' },
      { keys: ['Ctrl', 'Enter'], description: '확인 / 저장' },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 포커스
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="shortcuts-overlay"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="shortcuts-title"
    >
      <div
        ref={dialogRef}
        className="shortcuts-dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-header">
          <h2 id="shortcuts-title" className="shortcuts-title">키보드 단축키</h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="단축키 도움말 닫기"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="shortcuts-body">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.title} className="shortcuts-category">
              <h3 className="shortcuts-category-title">{category.title}</h3>
              <ul className="shortcuts-list">
                {category.items.map((item) => (
                  <li key={item.description} className="shortcuts-item">
                    <span className="shortcuts-keys">
                      {item.keys.map((k, i) => (
                        <React.Fragment key={k}>
                          {i > 0 && <span className="shortcuts-plus">+</span>}
                          <kbd className="shortcut-key">{k}</kbd>
                        </React.Fragment>
                      ))}
                    </span>
                    <span className="shortcuts-desc">{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <span className="shortcuts-hint">
            <kbd className="shortcut-key">?</kbd> 를 눌러 이 창을 닫을 수 있습니다.
          </span>
        </div>
      </div>
    </div>
  );
}
