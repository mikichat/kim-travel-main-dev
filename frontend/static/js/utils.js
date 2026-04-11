/**
 * 공통 유틸리티 함수
 */

// ============================================
// 날짜/시간 포맷팅
// ============================================

/**
 * 날짜를 한국 형식으로 포맷팅
 * @param {string|Date} dateString - 날짜 문자열 또는 Date 객체
 * @param {string} format - 포맷 ('YYYY-MM-DD', 'YYYY년 MM월 DD일', etc.)
 * @returns {string} 포맷팅된 날짜 문자열
 */
function formatDate(dateString, format = 'YYYY년 MM월 DD일') {
    if (!dateString) return '';

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('년', '년 ')
        .replace('월', '월 ')
        .replace('일', '일');
}

/**
 * 날짜와 시간을 한국 형식으로 포맷팅
 */
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';

    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환
 */
function dateToYYYYMMDD(date) {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// ============================================
// 숫자 포맷팅
// ============================================

/**
 * 숫자를 통화 형식으로 포맷팅
 */
function formatCurrency(value) {
    if (value === null || value === undefined) return '0원';

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0원';

    return `${Math.floor(numValue).toLocaleString('ko-KR')}원`;
}

/**
 * 숫자를 천 단위 구분 형식으로 포맷팅
 */
function formatNumber(value) {
    if (value === null || value === undefined) return '0';

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';

    return numValue.toLocaleString('ko-KR');
}

/**
 * 통화 문자열을 숫자로 변환
 */
function parseCurrency(currencyString) {
    if (!currencyString) return 0;

    return parseInt(currencyString.replace(/[^0-9]/g, '')) || 0;
}

// ============================================
// HTML 이스케이프
// ============================================

/**
 * XSS 방지를 위한 HTML 이스케이프
 */
function escapeHtml(text) {
    if (!text) return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * HTML 태그 제거
 */
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

// ============================================
// 상태 관리
// ============================================

/**
 * 상태 배지 HTML 생성
 */
function renderStatusBadge(status) {
    const statusMap = {
        estimate: { label: '견적', class: 'badge-estimate' },
        contract: { label: '계약', class: 'badge-contract' },
        confirmed: { label: '확정', class: 'badge-confirmed' },
    };

    const statusInfo = statusMap[status] || { label: status, class: '' };
    return `<span class="badge ${statusInfo.class}">${statusInfo.label}</span>`;
}

/**
 * 자동/수동 배지 HTML 생성
 */
function renderManualBadge(isManual) {
    if (isManual) {
        return '<span class="badge badge-manual">수동</span>';
    } else {
        return '<span class="badge badge-auto">자동</span>';
    }
}

// ============================================
// 알림 (Toast)
// ============================================

/**
 * 토스트 알림 표시
 */
function showToast(message, type = 'info', duration = 3000) {
    // 토스트 컨테이너 확인/생성
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // 토스트 엘리먼트 생성
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // 자동 제거
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            container.removeChild(toast);
            if (container.children.length === 0) {
                document.body.removeChild(container);
            }
        }, 300);
    }, duration);
}

/**
 * 성공 알림
 */
function showSuccess(message) {
    showToast(message, 'success');
}

/**
 * 오류 알림
 */
function showError(message) {
    showToast(message, 'error', 5000);
}

/**
 * 경고 알림
 */
function showWarning(message) {
    showToast(message, 'warning', 4000);
}

/**
 * 정보 알림
 */
function showInfo(message) {
    showToast(message, 'info');
}

// ============================================
// 모달
// ============================================

/**
 * 확인 모달 표시
 */
function showConfirm(title, message, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${escapeHtml(title)}</h2>
                <span class="modal-close">&times;</span>
            </div>
            <div class="modal-body">
                <p>${escapeHtml(message)}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">취소</button>
                <button class="btn btn-primary modal-confirm">확인</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 이벤트 리스너
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
    };

    modal.querySelector('.modal-close').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    modal.querySelector('.modal-cancel').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    modal.querySelector('.modal-confirm').addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });

    // 배경 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
            if (onCancel) onCancel();
        }
    });
}

// ============================================
// 로딩
// ============================================

/**
 * 로딩 표시
 */
function showLoading(container) {
    if (typeof container === 'string') {
        container = document.querySelector(container);
    }

    if (!container) return;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading show';
    loadingDiv.innerHTML = '<div class="spinner"></div><p>로딩 중...</p>';

    container.innerHTML = '';
    container.appendChild(loadingDiv);
}

/**
 * 로딩 숨기기
 */
function hideLoading(container) {
    if (typeof container === 'string') {
        container = document.querySelector(container);
    }

    if (!container) return;

    const loadingDiv = container.querySelector('.loading');
    if (loadingDiv) {
        loadingDiv.classList.remove('show');
    }
}

// ============================================
// 유효성 검증
// ============================================

/**
 * 필수 입력 확인
 */
function validateRequired(value, fieldName) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        throw new Error(`${fieldName}은(는) 필수 입력 항목입니다.`);
    }
    return true;
}

/**
 * 숫자 유효성 검증
 */
function validateNumber(value, fieldName, min = null, max = null) {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
        throw new Error(`${fieldName}은(는) 올바른 숫자여야 합니다.`);
    }

    if (min !== null && num < min) {
        throw new Error(`${fieldName}은(는) ${min} 이상이어야 합니다.`);
    }

    if (max !== null && num > max) {
        throw new Error(`${fieldName}은(는) ${max} 이하여야 합니다.`);
    }

    return true;
}

/**
 * 날짜 유효성 검증
 */
function validateDate(dateString, fieldName) {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        throw new Error(`${fieldName}은(는) 올바른 날짜 형식이어야 합니다.`);
    }

    return true;
}

/**
 * 날짜 범위 검증
 */
function validateDateRange(startDate, endDate, startFieldName = '시작일', endFieldName = '종료일') {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
        throw new Error(`${endFieldName}은(는) ${startFieldName}보다 이후여야 합니다.`);
    }

    return true;
}

// ============================================
// 폼 처리
// ============================================

/**
 * 폼 데이터를 객체로 변환
 */
function formToObject(form) {
    const formData = new FormData(form);
    const obj = {};

    for (const [key, value] of formData.entries()) {
        obj[key] = value;
    }

    return obj;
}

/**
 * 폼 입력 에러 표시
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add('is-invalid');

    // 기존 에러 메시지 제거
    const existingError = field.parentElement.querySelector('.invalid-feedback');
    if (existingError) {
        existingError.remove();
    }

    // 새 에러 메시지 추가
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    field.parentElement.appendChild(errorDiv);
}

/**
 * 폼 입력 에러 제거
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('is-invalid');

    const errorDiv = field.parentElement.querySelector('.invalid-feedback');
    if (errorDiv) {
        errorDiv.remove();
    }
}

/**
 * 모든 폼 에러 제거
 */
function clearAllFieldErrors(form) {
    const fields = form.querySelectorAll('.is-invalid');
    fields.forEach(field => {
        field.classList.remove('is-invalid');
    });

    const errors = form.querySelectorAll('.invalid-feedback');
    errors.forEach(error => error.remove());
}

// ============================================
// Debounce
// ============================================

/**
 * Debounce 함수
 */
function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// URL 파라미터
// ============================================

/**
 * URL에서 파라미터 추출
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 현재 URL의 경로에서 ID 추출
 * 예: /groups/123 -> 123
 */
function getIdFromPath(index = -1) {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    return pathParts[pathParts.length + index] || null;
}
