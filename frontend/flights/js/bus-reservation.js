const { showToast } = window;
import { StorageManager } from './storage-manager.js';

/**
 * BusReservationManager - 버스 예약 관리 클래스
 *
 * 버스 예약 정보를 관리하고 미리보기, 복사 기능을 제공합니다.
 */

class BusReservationManager {
  constructor() {
    this.init();
  }

  /**
   * 초기화
   */
  init() {
    // DOM 요소 참조
    this.elements = {
      fromLocation: document.getElementById('busFromLocation'),
      fromDateTime: document.getElementById('busFromDateTime'),
      toLocation: document.getElementById('busToLocation'),
      toDateTime: document.getElementById('busToDateTime'),
      busType: document.getElementById('busType'),
      busCount: document.getElementById('busCount'),
      passengers: document.getElementById('busPassengers'),
      showDriverContact: document.getElementById('showBusDriverContact'),
      driverContactWrapper: document.getElementById('busDriverContactWrapper'),
      driverContact: document.getElementById('busDriverContact'),
      showCustomerInfo: document.getElementById('showBusCustomerInfo'),
      customerInfoWrapper: document.getElementById('busCustomerInfoWrapper'),
      customerName: document.getElementById('busCustomerName'),
      customerPhone: document.getElementById('busCustomerPhone'),
      remarks: document.getElementById('busRemarks'),
      previewBtn: document.getElementById('busPreviewBtn'),
      previewSection: document.getElementById('busPreviewSection'),
      previewContent: document.getElementById('busPreviewContent'),
      copyBtn: document.getElementById('busCopyBtn'),
    };

    // 이벤트 리스너 등록
    this.attachEventListeners();
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    // 미리보기 버튼
    this.elements.previewBtn.addEventListener('click', () =>
      this.handlePreview()
    );

    // 복사 버튼
    this.elements.copyBtn.addEventListener('click', () => this.handleCopy());

    // 기사님 연락처 체크박스
    this.elements.showDriverContact.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.elements.driverContactWrapper.classList.remove('hidden');
      } else {
        this.elements.driverContactWrapper.classList.add('hidden');
      }
    });

    // 대표고객 정보 체크박스
    this.elements.showCustomerInfo.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.elements.customerInfoWrapper.classList.remove('hidden');
      } else {
        this.elements.customerInfoWrapper.classList.add('hidden');
      }
    });
  }

  /**
   * 폼 데이터 수집
   * @returns {Object} - 버스 예약 데이터
   */
  collectData() {
    return {
      departure: {
        location: this.elements.fromLocation.value.trim(),
        datetime: this.elements.fromDateTime.value.trim(),
      },
      arrival: {
        location: this.elements.toLocation.value.trim(),
        datetime: this.elements.toDateTime.value.trim(),
      },
      busInfo: {
        type: this.elements.busType.value,
        count: parseInt(this.elements.busCount.value) || 1,
      },
      passengers: parseInt(this.elements.passengers.value) || 0,
      showDriverContact: this.elements.showDriverContact.checked,
      driverContact: this.elements.showDriverContact.checked
        ? this.elements.driverContact.value.trim()
        : '',
      showCustomerInfo: this.elements.showCustomerInfo.checked,
      customerInfo: this.elements.showCustomerInfo.checked
        ? {
            name: this.elements.customerName.value.trim(),
            phone: this.elements.customerPhone.value.trim(),
          }
        : { name: '', phone: '' },
      remarks: this.elements.remarks.value.trim(),
    };
  }

  /**
   * 데이터 유효성 검증
   * @param {Object} data - 검증할 데이터
   * @returns {Object} - {valid: boolean, message: string}
   */
  validateData(data) {
    if (!data.departure.location) {
      return { valid: false, message: '출발지를 입력해주세요.' };
    }
    if (!data.departure.datetime) {
      return { valid: false, message: '출발 일시를 입력해주세요.' };
    }
    if (!data.arrival.location) {
      return { valid: false, message: '도착지를 입력해주세요.' };
    }
    if (!data.passengers || data.passengers <= 0) {
      return { valid: false, message: '탑승 인원을 입력해주세요.' };
    }

    return { valid: true };
  }

  /**
   * 버스 예약 정보 포맷팅
   * @param {Object} data - 버스 예약 데이터
   * @returns {string} - 포맷팅된 텍스트
   */
  formatBusInfo(data) {
    let output = '━━━━━━━━━━━━━━━━━━━━━━━━\n';
    output += '🚌 버스 예약 정보\n';
    output += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    output += '■ 운행 정보\n';
    output += `  출발: ${data.departure.location}\n`;
    output += `  일시: ${data.departure.datetime}\n\n`;

    output += `  도착: ${data.arrival.location}\n`;
    if (data.arrival.datetime) {
      output += `  예정: ${data.arrival.datetime}\n`;
    }
    output += '\n';

    output += '■ 차량 정보\n';
    output += `  버스: ${data.busInfo.type}`;
    if (data.busInfo.count > 1) {
      output += ` × ${data.busInfo.count}대`;
    }
    output += '\n';
    output += `  인원: ${data.passengers}명\n`;

    if (data.showDriverContact && data.driverContact) {
      output += `\n■ 기사님 연락처\n`;
      output += `  ${data.driverContact}\n`;
    }

    if (
      data.showCustomerInfo &&
      data.customerInfo &&
      (data.customerInfo.name || data.customerInfo.phone)
    ) {
      output += `\n■ 대표고객 정보\n`;
      if (data.customerInfo.name) {
        output += `  이름: ${data.customerInfo.name}\n`;
      }
      if (data.customerInfo.phone) {
        output += `  전화번호: ${data.customerInfo.phone}\n`;
      }
    }

    if (data.remarks) {
      output += '\n■ 특이사항\n';
      output += `  ${data.remarks}\n`;
    }

    output += '\n━━━━━━━━━━━━━━━━━━━━━━━━';

    return output;
  }

  /**
   * 미리보기 처리
   */
  handlePreview() {
    const data = this.collectData();
    const validation = this.validateData(data);

    if (!validation.valid) {
      showToast(validation.message, 'warning');
      return;
    }

    // 포맷팅된 텍스트 생성
    const formattedText = this.formatBusInfo(data);

    // 미리보기 영역에 표시
    this.elements.previewContent.textContent = formattedText;
    this.elements.previewSection.classList.remove('hidden');

    // 미리보기 영역으로 스크롤
    this.elements.previewSection.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }

  /**
   * 복사 처리
   */
  async handleCopy() {
    const text = this.elements.previewContent.textContent;

    if (!text) {
      showToast('먼저 미리보기를 생성해주세요.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      // 버튼 텍스트 일시 변경
      const originalText = this.elements.copyBtn.innerHTML;
      this.elements.copyBtn.innerHTML = '✓ 복사 완료!';
      this.elements.copyBtn.classList.add('bg-green-700');

      setTimeout(() => {
        this.elements.copyBtn.innerHTML = originalText;
        this.elements.copyBtn.classList.remove('bg-green-700');
      }, 2000);
    } catch (error) {
      showToast('복사에 실패했습니다.', 'error');
    }
  }

  /**
   * localStorage에 저장
   */
  async saveBusReservation() {
    const data = this.collectData();
    const validation = this.validateData(data);

    if (!validation.valid) {
      showToast(validation.message, 'warning');
      return false;
    }

    const result = await StorageManager.saveBusReservation(data);

    if (result.success) {
      showToast('버스 예약 정보가 저장되었습니다.', 'success');
      return true;
    } else {
      showToast('저장에 실패했습니다.', 'error');
      return false;
    }
  }

  /**
   * 폼 초기화
   */
  resetForm() {
    this.elements.fromLocation.value = '';
    this.elements.fromDateTime.value = '';
    this.elements.toLocation.value = '';
    this.elements.toDateTime.value = '';
    this.elements.busType.selectedIndex = 2; // 45인승 기본값 (0: 25인승, 1: 28인승, 2: 45인승)
    this.elements.busCount.value = '1';
    this.elements.passengers.value = '';
    this.elements.showDriverContact.checked = false;
    this.elements.driverContactWrapper.classList.add('hidden');
    this.elements.driverContact.value = '';
    this.elements.showCustomerInfo.checked = false;
    this.elements.customerInfoWrapper.classList.add('hidden');
    this.elements.customerName.value = '';
    this.elements.customerPhone.value = '';
    this.elements.remarks.value = '';
    this.elements.previewSection.classList.add('hidden');
  }
}

export { BusReservationManager };
window.BusReservationManager = BusReservationManager;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  // StorageManager가 로드되었는지 확인
  if (typeof StorageManager === 'undefined') {
    console.error('StorageManager가 로드되지 않았습니다.');
    return;
  }

  // BusReservationManager 인스턴스 생성 (중복 방지)
  if (!window.busReservationManager) {
    window.busReservationManager = new BusReservationManager();
  }
});
