const { showToast } = window;
import { StorageManager } from './storage-manager.js';

/**
 * NoticeWriter - 안내문 작성 관리 클래스
 *
 * 템플릿 기반 안내문 작성 및 변수 치환 기능을 제공합니다.
 */

class NoticeWriter {
  constructor() {
    // 템플릿 정의
    this.templates = {
      'pre-departure': {
        name: '출발 전 안내',
        content: `안녕하세요, {단체명} 여행을 담당하고 있는 {담당자}입니다.

{출발일}에 출발하는 여행 일정에 대해 안내드립니다.

■ 출발 정보
- 항공편: {항공편}
- 미팅 장소: {미팅장소}
- 출발 시간: {출발시간}

■ 준비사항
1. 여권 유효기간 확인 (출발일 기준 6개월 이상 남아있어야 함)
2. 항공권 및 여행자 보험 확인
3. 현지 날씨에 맞는 복장 준비
4. 필요한 약품 및 개인 용품 준비

■ 공항 체크인 안내
- 국제선은 출발 2-3시간 전 공항 도착 권장
- 수하물 무게 제한: 이코노미 23kg, 기내 반입 10kg
- 액체류는 100ml 이하 용기에 담아 지퍼백에 보관

궁금하신 사항이 있으시면 언제든지 연락주세요.
감사합니다.

담당자: {담당자}`,
      },
      meeting: {
        name: '공항 미팅 안내',
        content: `{단체명} 여행객 여러분께

공항 미팅 안내드립니다.

■ 미팅 정보
- 일시: {출발일}
- 장소: {미팅장소}
- 항공편: {항공편}

■ 미팅 시 확인사항
1. 담당자를 찾아 본인 확인
2. 여권 및 항공권 준비
3. 수하물 개수 확인
4. 단체 일정 및 주의사항 청취

■ 연락처
담당자: {담당자}

정시 도착 부탁드리며, 안전한 여행 되시기 바랍니다.

감사합니다.`,
      },
      preparation: {
        name: '여행 준비물 안내',
        content: `{단체명} 여행 준비물 안내

{출발일} 출발 예정인 여행을 위한 준비물을 안내드립니다.

■ 필수 준비물
□ 여권 (유효기간 6개월 이상)
□ 항공권 (모바일 또는 출력본)
□ 신용카드 및 현금
□ 여행자 보험 증권
□ 긴급 연락처 메모

■ 개인 용품
□ 세면도구 (샴푸, 바디워시, 칫솔, 치약)
□ 상비약 (감기약, 소화제, 진통제 등)
□ 선글라스, 선크림
□ 우산 또는 우비
□ 충전기 및 어댑터

■ 의류
□ 현지 날씨에 맞는 옷
□ 편한 신발 (도보 이동 많음)
□ 여벌 옷 (기내 반입용)

■ 기타
□ 카메라, 배터리
□ 여행 가이드북
□ 간식 (기호에 따라)

항공편: {항공편}
미팅 장소: {미팅장소}

문의: {담당자}`,
      },
    };

    this.init();
  }

  /**
   * 초기화
   */
  init() {
    // DOM 요소 참조
    this.elements = {
      templateSelect: document.getElementById('noticeTemplate'),
      groupName: document.getElementById('noticeGroupName'),
      departureDate: document.getElementById('noticeDepartureDate'),
      departureFlight: document.getElementById('noticeDepartureFlight'),
      meetingPlace: document.getElementById('noticeMeetingPlace'),
      managerName: document.getElementById('noticeManagerName'),
      content: document.getElementById('noticeContent'),
      loadFromFlightBtn: document.getElementById('noticeLoadFromFlightBtn'),
      copyBtn: document.getElementById('noticeCopyBtn'),
    };

    // 필수 요소가 없으면 초기화 중단 (다른 페이지에서 로드된 경우)
    if (!this.elements.templateSelect || !this.elements.content) {
      return;
    }

    // 이벤트 리스너 등록
    this.attachEventListeners();
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    // 템플릿 선택 변경
    this.elements.templateSelect.addEventListener('change', (e) => {
      this.loadTemplate(e.target.value);
    });

    // 변수 입력 필드 변경 시 실시간 치환
    [
      'groupName',
      'departureDate',
      'departureFlight',
      'meetingPlace',
      'managerName',
    ].forEach((field) => {
      this.elements[field].addEventListener('input', () => {
        if (this.elements.templateSelect.value) {
          this.applyVariables();
        }
      });
    });

    // 항공편 정보 불러오기
    if (this.elements.loadFromFlightBtn) {
      this.elements.loadFromFlightBtn.addEventListener('click', () => {
        this.loadFromFlight();
      });
    } else {
      console.error(
        '항공편 불러오기 버튼을 찾을 수 없습니다 (noticeLoadFromFlightBtn)'
      );
    }

    // 복사 버튼
    this.elements.copyBtn.addEventListener('click', () => {
      this.handleCopy();
    });
  }

  /**
   * 템플릿 로드
   * @param {string} templateKey - 템플릿 키
   */
  loadTemplate(templateKey) {
    if (!templateKey) {
      // 직접 작성 선택 시 비우기
      this.elements.content.value = '';
      return;
    }

    const template = this.templates[templateKey];
    if (!template) return;

    // 템플릿 내용을 textarea에 설정
    this.elements.content.value = template.content;

    // 변수 치환 적용
    this.applyVariables();
  }

  /**
   * 변수 값 수집
   * @returns {Object} - 변수 객체
   */
  collectVariables() {
    return {
      단체명: this.elements.groupName.value.trim() || '{단체명}',
      출발일: this.elements.departureDate.value.trim() || '{출발일}',
      항공편: this.elements.departureFlight.value.trim() || '{항공편}',
      미팅장소: this.elements.meetingPlace.value.trim() || '{미팅장소}',
      담당자: this.elements.managerName.value.trim() || '{담당자}',
      출발시간: this.extractDepartureTime() || '{출발시간}',
    };
  }

  /**
   * 출발 시간 추출 (출발일에서)
   * @returns {string} - 출발 시간
   */
  extractDepartureTime() {
    const dateTimeStr = this.elements.departureDate.value.trim();
    // "2025.01.15 14:00" 형식에서 시간 추출 시도
    const timeMatch = dateTimeStr.match(/(\d{1,2}:\d{2})/);
    return timeMatch ? timeMatch[1] : '';
  }

  /**
   * 변수 치환 적용
   */
  applyVariables() {
    const templateKey = this.elements.templateSelect.value;
    if (!templateKey) return;

    const template = this.templates[templateKey];
    if (!template) return;

    const variables = this.collectVariables();
    let content = template.content;

    // 모든 변수 치환
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      content = content.replace(regex, value);
    }

    this.elements.content.value = content;
  }

  /**
   * 항공편 정보에서 데이터 불러오기
   */
  async loadFromFlight() {
    // StorageManager 확인
    if (typeof StorageManager === 'undefined') {
      showToast('시스템 오류: StorageManager를 찾을 수 없습니다.', 'error');
      return;
    }

    // 최근 항공편 정보 가져오기
    const flights = await StorageManager.getFlightList();

    if (flights.length === 0) {
      showToast(
        '저장된 항공편 정보가 없습니다. 먼저 항공편 탭에서 항공편 정보를 저장해주세요.',
        'info',
        4000
      );
      return;
    }

    // 최신 항공편 선택
    const latestFlight = flights[0];

    // 변수 필드에 자동 입력
    if (latestFlight.name) {
      this.elements.groupName.value = latestFlight.name;
    }

    if (latestFlight.flights && latestFlight.flights.length > 0) {
      const firstFlight = latestFlight.flights[0];

      // 항공편 번호
      if (firstFlight.flightNumber) {
        this.elements.departureFlight.value = firstFlight.flightNumber;
      }

      // 출발일 (날짜 + 시간)
      if (
        firstFlight.date &&
        firstFlight.departure &&
        firstFlight.departure.time
      ) {
        this.elements.departureDate.value = `${firstFlight.date} ${firstFlight.departure.time}`;
      } else if (firstFlight.date) {
        this.elements.departureDate.value = firstFlight.date;
      }
    }

    if (latestFlight.customerInfo) {
      // 미팅 장소
      if (latestFlight.customerInfo.meetingPlace) {
        this.elements.meetingPlace.value =
          latestFlight.customerInfo.meetingPlace;
      }

      // 담당자 이름 (고객명을 담당자로 사용)
      if (latestFlight.customerInfo.name) {
        // 담당자 필드가 비어있을 때만
        if (!this.elements.managerName.value) {
          this.elements.managerName.value = latestFlight.customerInfo.name;
        }
      }
    }

    // 템플릿이 선택되어 있으면 변수 치환
    if (this.elements.templateSelect.value) {
      this.applyVariables();
    }

    showToast('항공편 정보를 불러왔습니다.', 'success');
  }

  /**
   * 복사 처리
   */
  async handleCopy() {
    const text = this.elements.content.value;

    if (!text.trim()) {
      showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      // 버튼 텍스트 일시 변경
      const originalText = this.elements.copyBtn.innerHTML;
      this.elements.copyBtn.innerHTML = '✓ 복사 완료!';
      this.elements.copyBtn.classList.add('bg-green-800');

      setTimeout(() => {
        this.elements.copyBtn.innerHTML = originalText;
        this.elements.copyBtn.classList.remove('bg-green-800');
      }, 2000);
    } catch (error) {
      showToast('복사에 실패했습니다.', 'error');
    }
  }

  /**
   * localStorage에 저장
   */
  async saveNotice() {
    const noticeData = {
      template: this.elements.templateSelect.value,
      variables: this.collectVariables(),
      content: this.elements.content.value,
    };

    const result = await StorageManager.saveNotice(noticeData);

    if (result.success) {
      showToast('안내문이 저장되었습니다.', 'success');
      return true;
    } else {
      showToast('저장에 실패했습니다.', 'error');
      return false;
    }
  }
}

export { NoticeWriter };

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  // StorageManager가 로드되었는지 확인
  if (typeof StorageManager === 'undefined') {
    console.error('StorageManager가 로드되지 않았습니다.');
    return;
  }

  // NoticeWriter 인스턴스 생성
  window.noticeWriter = new NoticeWriter();
});
