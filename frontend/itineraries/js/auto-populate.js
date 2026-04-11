/**
 * 일정표 자동 입력 모듈
 * 견적서와 항공편 데이터를 일정표에 자동으로 입력
 */

const { showToast, showConfirmModal } = window;

class ItineraryAutoPopulate {
  constructor() {
    this.quoteData = null;
    this.flightData = null;
    this.airportMap = {
      // 한국
      ICN: '인천',
      GMP: '김포',
      PUS: '김해',
      CJU: '제주',
      TAE: '대구',
      KWJ: '광주',
      CJJ: '청주',
      MWX: '무안',
      // 일본
      NRT: '나리타',
      HND: '하네다',
      KIX: '간사이',
      ITM: '이타미',
      NGO: '나고야',
      FUK: '후쿠오카',
      CTS: '삿포로',
      OKA: '오키나와',
      // 중국
      PVG: '상하이',
      SHA: '훙차오',
      PEK: '베이징',
      PKX: '다싱',
      CAN: '광저우',
      SZX: '선전',
      HGH: '항저우',
      // 홍콩/대만
      HKG: '홍콩',
      MFM: '마카오',
      TPE: '타이베이',
      TSA: '쑹산',
      // 태국
      BKK: '방콕',
      DMK: '돈므앙',
      HKT: '푸켓',
      CNX: '치앙마이',
      UTP: '파타야',
      KBV: '끄라비',
      // 베트남
      HAN: '하노이',
      SGN: '호치민',
      DAD: '다낭',
      CXR: '나트랑',
      PQC: '푸꾸옥',
      // 필리핀/인도네시아
      MNL: '마닐라',
      CEB: '세부',
      KLO: '칼리보',
      CGK: '자카르타',
      DPS: '발리',
      // 기타 아시아
      SIN: '싱가포르',
      KUL: '쿠알라룸푸르',
      BKI: '코타키나발루',
      REP: '씨엠립',
      PNH: '프놈펜',
      // 유럽
      LHR: '런던',
      CDG: '파리',
      FRA: '프랑크푸르트',
      FCO: '로마',
      // 미주
      LAX: '로스앤젤레스',
      JFK: '뉴욕',
      SFO: '샌프란시스코',
      // 오세아니아
      SYD: '시드니',
      AKL: '오클랜드',
      GUM: '괌',
      SPN: '사이판',
      // 중동
      DXB: '두바이',
      DOH: '도하',
      // 구식 (호환성)
      SEL: '서울',
    };
  }

  /**
   * 공항 코드를 한글 이름으로 변환
   */
  getAirportName(code, savedName) {
    // 저장된 이름이 "서울"이고 코드가 ICN이면 "인천"으로 수정
    if (savedName === '서울' && code === 'ICN') {
      return '인천';
    }
    // 맵에 있으면 맵의 값 사용
    if (code && this.airportMap[code]) {
      return this.airportMap[code];
    }
    // 저장된 이름이 있으면 그대로 사용
    if (savedName) {
      return savedName;
    }
    // 코드 그대로 반환
    return code || '';
  }

  /**
   * StorageManager를 통해 데이터 로드
   */
  async loadData() {
    try {
      // localStorage에서 직접 읽기 (StorageManager가 없을 수도 있음)
      const quoteDataStr = localStorage.getItem('quote_data');
      if (quoteDataStr) {
        this.quoteData = JSON.parse(quoteDataStr);
      }

      let flightSaves = [];
      if (typeof FlightSyncManager !== 'undefined') {
        flightSaves = await FlightSyncManager.getFlights();
      } else {
        const flightSavesStr = localStorage.getItem('flight_saves_v2');
        if (flightSavesStr) {
          flightSaves = JSON.parse(flightSavesStr);
        }
      }

      if (flightSaves.length > 0) {
        // 견적서와 연결된 항공편 찾기
        if (this.quoteData && this.quoteData.flightId) {
          this.flightData = flightSaves.find(
            (f) => f.id === this.quoteData.flightId
          );
        }

        // 연결된 항공편이 없으면 최신 항공편 사용
        if (!this.flightData) {
          this.flightData = flightSaves[0];
        }
      }

      return {
        hasQuote: !!this.quoteData,
        hasFlight: !!this.flightData,
      };
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      return { hasQuote: false, hasFlight: false };
    }
  }

  /**
   * 데이터가 있는지 확인
   */
  async hasData() {
    const status = await this.loadData();
    return status.hasQuote || status.hasFlight;
  }

  /**
   * 일정표 자동 입력 실행
   */
  autoPopulate() {
    const status = this.loadData();

    if (!status.hasQuote && !status.hasFlight) {
      showToast(
        '저장된 견적서 또는 항공편 데이터가 없습니다. 먼저 견적서를 작성하거나 항공편을 저장해주세요.',
        'info',
        4000
      );
      return false;
    }

    let filledFields = [];

    // 1. 기본 정보 입력 (견적서 또는 항공편에서)
    if (this.quoteData) {
      filledFields = filledFields.concat(this.fillFromQuote());
    } else if (this.flightData) {
      filledFields = filledFields.concat(this.fillFromFlight());
    }

    // 2. 항공편 정보 입력
    if (this.flightData) {
      filledFields = filledFields.concat(this.fillFlightInfo());
    }

    // 3. 미팅 정보 입력
    if (this.flightData && this.flightData.customerInfo) {
      filledFields = filledFields.concat(this.fillMeetingInfo());
    }

    // 성공 메시지
    if (filledFields.length > 0) {
      showToast(`자동 입력 완료! (${filledFields.length}개 필드)`, 'success');

      // 미리보기 업데이트 (있다면)
      if (typeof updatePreview === 'function') {
        updatePreview();
      }

      return true;
    } else {
      showToast('입력할 수 있는 데이터가 없습니다.', 'warning');
      return false;
    }
  }

  /**
   * 견적서 데이터에서 기본 정보 입력
   */
  fillFromQuote() {
    const filled = [];

    if (!this.quoteData) return filled;

    // 단체명/여행지
    if (this.quoteData.group_info) {
      const groupInfo = this.quoteData.group_info;

      // 제목 (단체명 + 목적지)
      const title = groupInfo.group_name || groupInfo.destination || '';
      if (title && this.setFieldValue('title', title)) {
        filled.push('여행 제목');
      }

      // 여행 날짜 추출 (예: "2025년 1월 20일 ~ 1월 25일")
      if (groupInfo.travel_dates) {
        const dates = this.parseTravelDates(groupInfo.travel_dates);
        if (dates.start && this.setFieldValue('startDate', dates.start)) {
          filled.push('출발일');
        }
        if (dates.end && this.setFieldValue('endDate', dates.end)) {
          filled.push('도착일');
        }
      }
    }

    // 가격 정보
    if (this.quoteData.pricing && this.quoteData.pricing.price_amount) {
      const price = this.quoteData.pricing.price_amount.replace(/[^0-9]/g, '');
      if (price && this.setFieldValue('adultPrice', price)) {
        filled.push('성인 가격');
      }
    }

    return filled;
  }

  /**
   * 항공편 데이터에서 기본 정보 입력 (견적서가 없을 때)
   */
  fillFromFlight() {
    const filled = [];

    if (!this.flightData) return filled;

    // 여행명 (항공편 이름 사용)
    if (
      this.flightData.name &&
      this.setFieldValue('title', this.flightData.name)
    ) {
      filled.push('여행 제목');
    }

    // 날짜 정보 (첫 항공편과 마지막 항공편 날짜)
    if (this.flightData.flights && this.flightData.flights.length > 0) {
      const firstFlight = this.flightData.flights[0];
      const lastFlight =
        this.flightData.flights[this.flightData.flights.length - 1];

      const startDate = this.parseFlightDate(firstFlight.date);
      const endDate = this.parseFlightDate(lastFlight.date);

      if (startDate && this.setFieldValue('startDate', startDate)) {
        filled.push('출발일');
      }
      if (endDate && this.setFieldValue('endDate', endDate)) {
        filled.push('도착일');
      }
    }

    return filled;
  }

  /**
   * 출발/도착 시간(HH:MM)으로 비행시간 계산
   * 도착이 출발보다 이르면 익일 도착으로 간주
   */
  calcFlightDuration(depTime, arrTime) {
    if (!depTime || !arrTime) return null;
    const [dh, dm] = depTime.split(':').map(Number);
    const [ah, am] = arrTime.split(':').map(Number);
    if (isNaN(dh) || isNaN(dm) || isNaN(ah) || isNaN(am)) return null;

    let diffMin = ah * 60 + am - (dh * 60 + dm);
    if (diffMin <= 0) diffMin += 24 * 60; // 익일 도착

    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  }

  /**
   * 항공편 정보 입력
   */
  fillFlightInfo() {
    const filled = [];

    if (
      !this.flightData ||
      !this.flightData.flights ||
      this.flightData.flights.length === 0
    ) {
      return filled;
    }

    const firstFlight = this.flightData.flights[0];
    const lastFlight =
      this.flightData.flights[this.flightData.flights.length - 1];

    // 출발편 정보
    if (firstFlight) {
      if (firstFlight.departure) {
        const airportName = this.getAirportName(
          firstFlight.departure.code,
          firstFlight.departure.airport
        );
        if (this.setFieldValue('departureAirport', airportName)) {
          filled.push('출발 공항');
        }
      }

      if (firstFlight.arrival) {
        const airportName = this.getAirportName(
          firstFlight.arrival.code,
          firstFlight.arrival.airport
        );
        if (this.setFieldValue('arrivalAirport', airportName)) {
          filled.push('도착 공항');
        }
      }

      if (firstFlight.departure && firstFlight.departure.time) {
        if (this.setFieldValue('departureTime', firstFlight.departure.time)) {
          filled.push('출발 시간');
        }
      }

      if (firstFlight.arrival && firstFlight.arrival.time) {
        if (this.setFieldValue('arrivalTime', firstFlight.arrival.time)) {
          filled.push('도착 시간');
        }
      }

      if (
        firstFlight.flightNumber &&
        this.setFieldValue('departureFlight', firstFlight.flightNumber)
      ) {
        filled.push('출발편 항공편명');
      }

      // 출발편 비행시간 계산
      const depDuration = this.calcFlightDuration(
        firstFlight.departure?.time,
        firstFlight.arrival?.time
      );
      if (
        depDuration &&
        this.setFieldValue('departureFlightDuration', depDuration)
      ) {
        filled.push('출발편 비행시간');
      }
    }

    // 귀국편 정보 (왕복이면)
    if (this.flightData.flights.length > 1) {
      if (lastFlight.departure) {
        const airportName = this.getAirportName(
          lastFlight.departure.code,
          lastFlight.departure.airport
        );
        if (this.setFieldValue('returnDepartureAirport', airportName)) {
          filled.push('귀국 출발 공항');
        }
      }

      if (lastFlight.arrival) {
        const airportName = this.getAirportName(
          lastFlight.arrival.code,
          lastFlight.arrival.airport
        );
        if (this.setFieldValue('returnArrivalAirport', airportName)) {
          filled.push('귀국 도착 공항');
        }
      }

      if (lastFlight.departure && lastFlight.departure.time) {
        if (
          this.setFieldValue('returnDepartureTime', lastFlight.departure.time)
        ) {
          filled.push('귀국 출발 시간');
        }
      }

      if (lastFlight.arrival && lastFlight.arrival.time) {
        if (this.setFieldValue('returnArrivalTime', lastFlight.arrival.time)) {
          filled.push('귀국 도착 시간');
        }
      }

      if (
        lastFlight.flightNumber &&
        this.setFieldValue('returnFlight', lastFlight.flightNumber)
      ) {
        filled.push('귀국편 항공편명');
      }

      // 귀국편 비행시간 계산
      const retDuration = this.calcFlightDuration(
        lastFlight.departure?.time,
        lastFlight.arrival?.time
      );
      if (
        retDuration &&
        this.setFieldValue('returnFlightDuration', retDuration)
      ) {
        filled.push('귀국편 비행시간');
      }
    }

    return filled;
  }

  /**
   * 미팅 정보 입력
   */
  fillMeetingInfo() {
    const filled = [];

    if (!this.flightData || !this.flightData.customerInfo) {
      return filled;
    }

    const customerInfo = this.flightData.customerInfo;

    // 미팅 장소
    if (
      customerInfo.meetingPlace &&
      this.setFieldValue('airportMeetingPlace', customerInfo.meetingPlace)
    ) {
      filled.push('미팅 장소');
    }

    // 미팅 날짜/시간 파싱 (예: "2025.01.20 06:30")
    if (customerInfo.meetingTime) {
      const { date, time } = this.parseMeetingTime(customerInfo.meetingTime);
      if (date && this.setFieldValue('airportMeetingDate', date)) {
        filled.push('미팅 날짜');
      }
      if (time && this.setFieldValue('airportMeetingTime', time)) {
        filled.push('미팅 시간');
      }
    }

    // 담당자 정보
    if (
      customerInfo.name &&
      this.setFieldValue('airportMeetingContactName', customerInfo.name)
    ) {
      filled.push('담당자 이름');
    }

    if (
      customerInfo.phone &&
      this.setFieldValue('airportMeetingPhone', customerInfo.phone)
    ) {
      filled.push('담당자 전화번호');
    }

    // 미팅 체크박스 활성화
    const meetingCheckbox = document.getElementById('airportMeetingInclude');
    if (meetingCheckbox && !meetingCheckbox.checked) {
      meetingCheckbox.checked = true;
      meetingCheckbox.dispatchEvent(new Event('change'));
    }

    return filled;
  }

  /**
   * 필드에 값 설정
   */
  setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  /**
   * 여행 날짜 파싱 (예: "2025년 1월 20일 ~ 1월 25일" → { start: "2025-01-20", end: "2025-01-25" })
   */
  parseTravelDates(dateStr) {
    const result = { start: null, end: null };

    try {
      // 패턴: "2025년 1월 20일 ~ 1월 25일"
      const match = dateStr.match(
        /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*~\s*(\d{1,2})월\s*(\d{1,2})일/
      );
      if (match) {
        const year = match[1];
        const startMonth = match[2].padStart(2, '0');
        const startDay = match[3].padStart(2, '0');
        const endMonth = match[4].padStart(2, '0');
        const endDay = match[5].padStart(2, '0');

        result.start = `${year}-${startMonth}-${startDay}`;
        result.end = `${year}-${endMonth}-${endDay}`;
      }
    } catch (error) {
      console.error('날짜 파싱 오류:', error);
    }

    return result;
  }

  /**
   * 항공편 날짜 파싱 (예: "2025.01.20(월)" → "2025-01-20")
   */
  parseFlightDate(dateStr) {
    if (!dateStr) return null;

    try {
      // "2025.01.20(월)" 형식
      const match = dateStr.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      console.error('항공편 날짜 파싱 오류:', error);
    }

    return null;
  }

  /**
   * 미팅 시간 파싱 (예: "2025.01.20 06:30" → { date: "2025-01-20", time: "06:30" })
   */
  parseMeetingTime(timeStr) {
    const result = { date: null, time: null };

    try {
      // "2025.01.20 06:30" 형식
      const match = timeStr.match(
        /(\d{4})\.(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2})/
      );
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        const hour = match[4].padStart(2, '0');
        const minute = match[5];

        result.date = `${year}-${month}-${day}`;
        result.time = `${hour}:${minute}`;
      }
    } catch (error) {
      console.error('미팅 시간 파싱 오류:', error);
    }

    return result;
  }

  /**
   * 데이터 미리보기 (테스트용)
   */
  previewData() {
    const status = this.loadData();

    return {
      quote: this.quoteData,
      flight: this.flightData,
      status: status,
    };
  }
}

// 전역 인스턴스 생성
window.itineraryAutoPopulate = new ItineraryAutoPopulate();

// 자동 입력 실행 함수 (버튼에서 호출)
function autoPopulateItinerary() {
  if (window.itineraryAutoPopulate) {
    // 데이터 선택 대화상자 표시
    showDataSelectionDialog();
  } else {
    showToast('자동 입력 모듈을 찾을 수 없습니다.', 'error');
  }
}

/**
 * 데이터 선택 대화상자 표시
 */
async function showDataSelectionDialog() {
  try {
    // 항공편 데이터 로드
    const quoteData = localStorage.getItem('quote_data');

    let flightSaves = [];
    if (typeof FlightSyncManager !== 'undefined') {
      flightSaves = await FlightSyncManager.getFlights();
    } else {
      const flightSavesStr = localStorage.getItem('flight_saves_v2');
      if (flightSavesStr) {
        flightSaves = JSON.parse(flightSavesStr);
      }
    }

    // 선택 가능한 옵션 생성
    const options = [];

    // 1. 견적서 + 연결된 항공편
    if (quoteData) {
      const quote = JSON.parse(quoteData);
      const groupName = quote.group_info?.group_name || '이름 없음';
      const flightId = quote.flightId;

      let optionText = `📋 견적서: ${groupName}`;
      if (flightId) {
        const linkedFlight = flightSaves.find((f) => f.id === flightId);
        if (linkedFlight) {
          optionText += ` (항공편: ${linkedFlight.name || linkedFlight.id})`;
        }
      }
      options.push({
        type: 'quote',
        text: optionText,
        data: quote,
      });
    }

    // 2. 저장된 항공편 목록 (지난 스케줄 제외)
    const todayStr = new Date().toISOString().split('T')[0];
    flightSaves = flightSaves.filter((f) => {
      if (!f.flights || f.flights.length === 0) return true;
      let lastDate = '';
      f.flights.forEach((leg) => {
        const d = (leg.date || '')
          .replace(/(\d{4})\.(\d{1,2})\.(\d{1,2}).*/, '$1-$2-$3')
          .replace(/-(\d)(?=-|$)/g, '-0$1');
        if (d && d > lastDate) lastDate = d;
      });
      return !lastDate || lastDate >= todayStr;
    });

    if (flightSaves.length > 0) {
      flightSaves.forEach((flight, _index) => {
        const date = flight.saveDate
          ? new Date(flight.saveDate).toLocaleDateString('ko-KR')
          : '';
        const name = flight.name || '이름 없음';
        const firstFlightNo = flight.flights?.[0]?.flightNumber || '';

        options.push({
          type: 'flight',
          text: `✈️ 항공편: ${name} (${firstFlightNo}) - ${date}`,
          data: flight,
        });
      });
    }

    // 데이터가 없는 경우
    if (options.length === 0) {
      showToast('저장된 견적서 또는 항공편 데이터가 없습니다.', 'info', 4000);
      return;
    }

    // 선택 모달 생성
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText =
      'background:#fff;border-radius:12px;padding:24px;min-width:320px;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,0.2);';

    modal.innerHTML = `
            <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;">자동 입력할 데이터를 선택하세요</h3>
            <div id="_apOptionList" style="display:flex;flex-direction:column;gap:8px;"></div>
            <div style="margin-top:16px;display:flex;justify-content:flex-end;">
                <button id="_apCancelBtn" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;">취소</button>
            </div>
        `;

    const listEl = modal.querySelector('#_apOptionList');
    options.forEach((option, _index) => {
      const btn = document.createElement('button');
      btn.textContent = option.text;
      btn.style.cssText =
        'text-align:left;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;background:#f8f9fa;cursor:pointer;font-size:14px;';
      btn.onmouseover = () => {
        btn.style.background = '#e8f0fe';
      };
      btn.onmouseout = () => {
        btn.style.background = '#f8f9fa';
      };
      btn.onclick = () => {
        document.body.removeChild(overlay);
        executeAutoPopulateWithData(option);
      };
      listEl.appendChild(btn);
    });

    modal.querySelector('#_apCancelBtn').onclick = () => {
      document.body.removeChild(overlay);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    };

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  } catch (error) {
    showToast('데이터 선택 중 오류가 발생했습니다: ' + error.message, 'error');
  }
}

/**
 * 선택한 데이터로 자동 입력 실행
 */
async function executeAutoPopulateWithData(selected) {
  if (!window.itineraryAutoPopulate) {
    showToast('자동 입력 모듈을 찾을 수 없습니다.', 'error');
    return;
  }

  const populator = window.itineraryAutoPopulate;

  if (selected.type === 'quote') {
    // 견적서 데이터 사용
    populator.quoteData = selected.data;

    // 연결된 항공편 로드
    if (selected.data.flightId) {
      let flightSaves = [];
      if (typeof FlightSyncManager !== 'undefined') {
        flightSaves = await FlightSyncManager.getFlights();
      } else {
        const flightSavesStr = localStorage.getItem('flight_saves_v2');
        if (flightSavesStr) {
          flightSaves = JSON.parse(flightSavesStr);
        }
      }
      populator.flightData = flightSaves.find(
        (f) => f.id === selected.data.flightId
      );
    }
  } else if (selected.type === 'flight') {
    // 항공편 데이터만 사용
    populator.flightData = selected.data;
    populator.quoteData = null; // 견적서는 사용 안 함
  }

  // 자동 입력 실행
  populator.autoPopulate();
}

// Expose for onclick attributes
window.autoPopulateItinerary = autoPopulateItinerary;

// 페이지 로드 시 데이터 확인 및 제안
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(async () => {
    if (
      window.itineraryAutoPopulate &&
      await window.itineraryAutoPopulate.hasData()
    ) {
      const shouldAutoFill = await showConfirmModal(
        '자동 입력',
        '저장된 견적서 또는 항공편 데이터가 있습니다. 자동으로 입력하시겠습니까?'
      );

      if (shouldAutoFill) {
        showDataSelectionDialog();
      }
    }
  }, 1000); // 페이지 완전 로드 대기
});
