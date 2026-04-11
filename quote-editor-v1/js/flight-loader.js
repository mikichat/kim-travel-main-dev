/**
 * FlightLoader - 항공편 데이터 로더 클래스
 *
 * 저장된 항공편 목록을 드롭다운에 로드하고,
 * 선택 시 견적서 폼에 자동 입력합니다.
 */

class FlightLoader {
  constructor() {
    this.currentFlightId = null; // 현재 선택된 항공편 ID
    this.init();
  }

  /**
   * 초기화
   */
  init() {
    // DOM 요소 참조
    this.flightSelector = document.getElementById('flight_selector');

    if (!this.flightSelector) {
      console.error('flight_selector 요소를 찾을 수 없습니다.');
      return;
    }

    // 폼 필드 참조
    this.formFields = {
      airlineName: document.getElementById('airline_name'),
      departureFlight: document.getElementById('departure_flight'),
      returnFlight: document.getElementById('return_flight'),
      travelDates: document.getElementById('travel_dates'),
      destination: document.getElementById('destination'),
    };

    // 이벤트 리스너 등록
    this.attachEventListeners();

    // 항공편 목록 로드
    this.loadFlightOptions();
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    this.flightSelector.addEventListener('change', (e) => {
      this.handleFlightSelection(e.target.value);
    });
  }

  /**
   * 항공편 목록을 드롭다운에 로드
   */
  loadFlightOptions() {
    if (typeof StorageManager === 'undefined') {
      console.error('StorageManager가 로드되지 않았습니다.');
      return;
    }

    const flights = StorageManager.getFlightList();

    // 기존 옵션 제거 (첫 번째 "직접 입력" 제외)
    while (this.flightSelector.options.length > 1) {
      this.flightSelector.remove(1);
    }

    // 항공편 목록 추가
    flights.forEach((flight) => {
      const option = document.createElement('option');
      option.value = flight.id;

      // 표시 텍스트 생성: "날짜 | 이름 | 첫 번째 항공편"
      const date = flight.saveDate
        ? new Date(flight.saveDate).toLocaleDateString('ko-KR')
        : '';
      const name = flight.name || '이름 없음';
      const firstFlight =
        flight.flights && flight.flights.length > 0
          ? flight.flights[0].flightNumber
          : '';

      option.textContent = `${date} | ${name} | ${firstFlight}`;
      this.flightSelector.appendChild(option);
    });
  }

  /**
   * 항공편 선택 처리
   * @param {string} flightId - 선택된 항공편 ID
   */
  handleFlightSelection(flightId) {
    if (!flightId) {
      // "직접 입력" 선택 시
      this.currentFlightId = null;
      return;
    }

    const flight = StorageManager.getFlightById(flightId);

    if (!flight) {
      showToast('선택한 항공편 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    // 현재 항공편 ID 저장
    this.currentFlightId = flightId;

    // 폼에 자동 입력
    this.populateFormFromFlight(flight);
  }

  /**
   * 항공편 데이터를 견적서 폼에 매핑
   * @param {Object} flight - 항공편 데이터
   */
  populateFormFromFlight(flight) {
    if (!flight.flights || flight.flights.length === 0) {
      showToast('항공편 정보가 없습니다.', 'error');
      return;
    }

    // 첫 번째 항공편 (출발편)
    const firstFlight = flight.flights[0];

    // 마지막 항공편 (귀국편)
    const lastFlight = flight.flights[flight.flights.length - 1];

    // 1. 항공사명 추출
    const airlineName = this.extractAirlineName(firstFlight);
    if (airlineName && this.formFields.airlineName) {
      this.formFields.airlineName.value = airlineName;
    }

    // 2. 출발편 정보
    if (this.formFields.departureFlight) {
      this.formFields.departureFlight.value =
        this.formatFlightRoute(firstFlight);
    }

    // 3. 귀국편 정보
    if (this.formFields.returnFlight && flight.flights.length > 1) {
      this.formFields.returnFlight.value = this.formatFlightRoute(lastFlight);
    }

    // 4. 여행 일자 계산
    if (this.formFields.travelDates) {
      const travelDates = this.calculateTravelDates(firstFlight, lastFlight);
      if (travelDates) {
        this.formFields.travelDates.value = travelDates;
      }
    }

    // 5. 여행지 (도착 공항)
    if (this.formFields.destination && firstFlight.arrival) {
      this.formFields.destination.value = firstFlight.arrival.airport;
    }

    // 미리보기 업데이트 (견적서 편집기의 updatePreview 함수 호출)
    if (typeof updatePreview === 'function') {
      updatePreview();
    }
  }

  /**
   * 항공사명 추출
   * @param {Object} flight - 항공편 객체
   * @returns {string} - 항공사명
   */
  extractAirlineName(flight) {
    // 항공편 번호에서 항공사 코드 추출 (예: "OZ 123" -> "OZ")
    if (!flight.flightNumber) return '';

    const airlineCode = flight.flightNumber.split(' ')[0];

    // 항공사 코드 매핑
    const airlineMap = {
      OZ: '아시아나 항공',
      KE: '대한항공',
      TW: '티웨이항공',
      LJ: '진에어',
      BX: '에어부산',
      '7C': '제주항공',
      ZE: '이스타항공',
      RS: '에어서울',
      TG: '타이항공',
      VN: '베트남항공',
      CZ: '중국남방항공',
      MU: '중국동방항공',
      CA: '중국국제항공',
      NH: 'ANA',
      JL: 'JAL',
    };

    return airlineMap[airlineCode] || airlineCode;
  }

  /**
   * 항공편 경로 포맷팅
   * @param {Object} flight - 항공편 객체
   * @returns {string} - "인천 (08:40) - 방콕 (12:30)" 형식
   */
  formatFlightRoute(flight) {
    if (!flight.departure || !flight.arrival) return '';

    const depAirport = flight.departure.airport || '';
    const depTime = flight.departure.time || '';
    const arrAirport = flight.arrival.airport || '';
    const arrTime = flight.arrival.time || '';

    return `${depAirport} (${depTime}) - ${arrAirport} (${arrTime})`;
  }

  /**
   * 여행 일자 계산
   * @param {Object} firstFlight - 출발 항공편
   * @param {Object} lastFlight - 귀국 항공편
   * @returns {string} - "2025년 11월 14일 ~ 11월 18일" 형식
   */
  calculateTravelDates(firstFlight, lastFlight) {
    if (!firstFlight.date || !lastFlight.date) return '';

    // 날짜 파싱: "2025.11.14(금)" -> "2025년 11월 14일"
    const depDate = this.parseDateString(firstFlight.date);
    const arrDate = this.parseDateString(lastFlight.date);

    if (!depDate || !arrDate) return '';

    return `${depDate} ~ ${arrDate}`;
  }

  /**
   * 날짜 문자열 파싱
   * @param {string} dateStr - "2025.11.14(금)" 형식
   * @returns {string} - "2025년 11월 14일" 형식
   */
  parseDateString(dateStr) {
    // "2025.11.14(금)" -> "2025년 11월 14일"
    const match = dateStr.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    if (!match) return '';

    const year = match[1];
    const month = match[2];
    const day = match[3];

    return `${year}년 ${month}월 ${day}일`;
  }

  /**
   * 현재 선택된 항공편 ID를 반환
   * @returns {string|null} - 항공편 ID 또는 null
   */
  getCurrentFlightId() {
    return this.currentFlightId;
  }
}

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  // StorageManager가 로드되었는지 확인
  if (typeof StorageManager === 'undefined') {
    console.error(
      'StorageManager가 로드되지 않았습니다. flight-loader.js를 먼저 로드해야 합니다.'
    );
    return;
  }

  // FlightLoader 인스턴스 생성
  window.flightLoader = new FlightLoader();
});

// ==================================================================
// ESM Export
// ==================================================================
export { FlightLoader };
