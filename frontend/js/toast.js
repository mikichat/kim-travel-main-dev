/**
 * 전역 토스트 알림 시스템
 * alert()/prompt()/confirm() 대체
 * 모든 페이지에서 <script src="/js/toast.js"> 로 사용
 */
(function () {
  // CSS 주입
  const style = document.createElement('style');
  style.textContent = `
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        }
        .toast-item {
            pointer-events: auto;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: toastIn 0.3s ease;
            max-width: 400px;
            word-break: keep-all;
            line-height: 1.5;
        }
        .toast-item.removing {
            animation: toastOut 0.3s ease forwards;
        }
        .toast-success { background: #10b981; }
        .toast-error { background: #ef4444; }
        .toast-info { background: #3b82f6; }
        .toast-warning { background: #f59e0b; color: #1a1a1a; }
        @keyframes toastIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        /* Prompt/Confirm 모달 */
        .toast-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        }
        .toast-modal {
            background: white;
            border-radius: 12px;
            padding: 24px;
            min-width: 340px;
            max-width: 480px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: scaleIn 0.2s ease;
        }
        .toast-modal h3 {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: #1e293b;
        }
        .toast-modal p {
            margin: 0 0 16px 0;
            font-size: 14px;
            color: #64748b;
            line-height: 1.6;
            white-space: pre-line;
        }
        .toast-modal input {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 16px;
        }
        .toast-modal input:focus { border-color: #3b82f6; }
        .toast-modal-buttons {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }
        .toast-modal-btn {
            padding: 8px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
        }
        .toast-modal-btn-cancel {
            background: #f1f5f9;
            color: #64748b;
        }
        .toast-modal-btn-cancel:hover { background: #e2e8f0; }
        .toast-modal-btn-confirm {
            background: #3b82f6;
            color: white;
        }
        .toast-modal-btn-confirm:hover { background: #2563eb; }
        .toast-modal-btn-danger {
            background: #ef4444;
            color: white;
        }
        .toast-modal-btn-danger:hover { background: #dc2626; }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `;
  document.head.appendChild(style);

  // 토스트 컨테이너
  let container = null;
  function getContainer() {
    if (!container || !document.body.contains(container)) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * 토스트 메시지 표시
   * @param {string} message - 메시지
   * @param {string} type - 'success'|'error'|'info'|'warning'
   * @param {number} duration - 표시 시간(ms)
   */
  window.showToast = function (message, type = 'info', duration = 3000) {
    const el = document.createElement('div');
    el.className = `toast-item toast-${type}`;
    el.textContent = message;
    getContainer().appendChild(el);

    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    }, duration);
  };

  /**
   * 모달 포커스 트래핑 설정 (WCAG 2.1 AA)
   * @param {HTMLElement} overlay - 모달 오버레이
   * @returns {Function} 포커스 복원 함수
   */
  function setupFocusTrap(overlay) {
    const previousFocus = document.activeElement;
    const modal = overlay.querySelector('.toast-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    function handleTab(e) {
      if (e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll('input, button');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    overlay.addEventListener('keydown', handleTab);

    return function restoreFocus() {
      overlay.removeEventListener('keydown', handleTab);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    };
  }

  /**
   * prompt() 대체 - 입력 모달
   * @param {string} title - 제목
   * @param {string} defaultValue - 기본값
   * @param {string} message - 추가 설명 (선택)
   * @returns {Promise<string|null>}
   */
  window.showPromptModal = function (title, defaultValue = '', message = '') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'toast-modal-overlay';
      overlay.innerHTML = `
                <div class="toast-modal">
                    <h3>${title}</h3>
                    ${message ? `<p>${message}</p>` : ''}
                    <input type="text" class="toast-modal-input" value="${defaultValue.replace(/"/g, '&quot;')}">
                    <div class="toast-modal-buttons">
                        <button type="button" class="toast-modal-btn toast-modal-btn-cancel">취소</button>
                        <button type="button" class="toast-modal-btn toast-modal-btn-confirm">확인</button>
                    </div>
                </div>
            `;
      document.body.appendChild(overlay);
      const restoreFocus = setupFocusTrap(overlay);

      const input = overlay.querySelector('.toast-modal-input');
      const btnCancel = overlay.querySelector('.toast-modal-btn-cancel');
      const btnConfirm = overlay.querySelector('.toast-modal-btn-confirm');

      input.focus();
      input.select();

      function close(value) {
        overlay.remove();
        restoreFocus();
        resolve(value);
      }

      btnCancel.addEventListener('click', () => close(null));
      btnConfirm.addEventListener('click', () => close(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') close(input.value);
        if (e.key === 'Escape') close(null);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
    });
  };

  /**
   * confirm() 대체 - 확인 모달
   * @param {string} title - 제목
   * @param {string} message - 메시지
   * @param {Object} options - { confirmText, cancelText, danger }
   * @returns {Promise<boolean>}
   */
  window.showConfirmModal = function (title, message = '', options = {}) {
    const {
      confirmText = '확인',
      cancelText = '취소',
      danger = false,
    } = options;
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'toast-modal-overlay';
      overlay.innerHTML = `
                <div class="toast-modal">
                    <h3>${title}</h3>
                    ${message ? `<p>${message}</p>` : ''}
                    <div class="toast-modal-buttons">
                        <button type="button" class="toast-modal-btn toast-modal-btn-cancel">${cancelText}</button>
                        <button type="button" class="toast-modal-btn ${danger ? 'toast-modal-btn-danger' : 'toast-modal-btn-confirm'}">${confirmText}</button>
                    </div>
                </div>
            `;
      document.body.appendChild(overlay);
      const restoreFocus = setupFocusTrap(overlay);

      const btnCancel = overlay.querySelector('.toast-modal-btn-cancel');
      const btnConfirm = overlay.querySelector(
        `.toast-modal-btn-${danger ? 'danger' : 'confirm'}`
      );

      btnConfirm.focus();

      function close(value) {
        overlay.remove();
        restoreFocus();
        resolve(value);
      }

      btnCancel.addEventListener('click', () => close(false));
      btnConfirm.addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
      document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
          close(false);
          document.removeEventListener('keydown', handler);
        }
        if (e.key === 'Enter') {
          close(true);
          document.removeEventListener('keydown', handler);
        }
      });
    });
  };
})();
