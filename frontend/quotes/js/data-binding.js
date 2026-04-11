/**
 * 여행 견적서 데이터 바인딩 시스템
 * Phase 1: 1페이지 (견적서) 편집 기능
 */

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==================================================================
// 데이터 스키마 정의
// ==================================================================

/**
 * 견적서 데이터 구조
 * @typedef {Object} QuoteData
 * @property {string} quote_id - 견적서 고유 ID
 * @property {GroupInfo} group_info - 단체 정보
 * @property {PricingInfo} pricing - 요금 정보
 * @property {string} contact_info - 담당자 정보
 */

/**
 * 단체 정보
 * @typedef {Object} GroupInfo
 * @property {string} group_name - 단체명
 * @property {string} travel_dates - 여행 일자
 * @property {string} destination - 여행지
 */

/**
 * 요금 정보
 * @typedef {Object} PricingInfo
 * @property {string} airline_name - 항공사명 (줄바꿈 포함 가능)
 * @property {string} departure_flight - 출발편 정보
 * @property {string} return_flight - 귀국편 정보
 * @property {string} option_type - 옵션 타입 (노옵션/전일옵션/반일옵션)
 * @property {string} price_amount - 1인 요금 (예: "1,540,000원")
 * @property {string} price_note - 요금 안내 문구
 */

// ==================================================================
// 기본 데이터
// ==================================================================

const DEFAULT_QUOTE_DATA = {
  quote_id: '',
  group_info: {
    group_name: '중국 – 광저우 천저우 고의령 망산 PTY',
    travel_dates: '2025년 11월 14일 ~ 11월 18일',
    destination: '중국 – 광저우 천저우 고의령 망산',
  },
  pricing: {
    airline_name: '아시아나<br />항공',
    departure_flight: '인천 (08:40) - 광저우 (11:15)',
    return_flight: '광저우 (12:20) - 인천 (17:00)',
    option_type: '노옵션',
    price_amount: '1,540,000원',
    price_note: '※ 상기 요금은 1인 기준이며 항공 및 세금 변동 시 재확인 필요',
  },
  contact_info: '담당자: 김국진 010-2662-9009',
};

// ==================================================================
// 데이터 바인딩 함수
// ==================================================================

/**
 * 특정 필드에 데이터 바인딩
 * @param {string} fieldName - data-field 속성 값
 * @param {string} value - 바인딩할 값
 */
function bindField(fieldName, value) {
  const elements = document.querySelectorAll(`[data-field="${fieldName}"]`);

  if (elements.length === 0) {
    console.warn(`[bindField] No element found with data-field="${fieldName}"`);
    return;
  }

  elements.forEach((element) => {
    // escape 후 줄바꿈만 <br>로 변환 (안전한 HTML 렌더링)
    const escaped = escapeHtml(value);
    element.innerHTML = escaped.replace(/\n/g, '<br>');
  });
}

/**
 * 모든 데이터를 한번에 바인딩
 * @param {QuoteData} data - 견적서 데이터 객체
 */
function bindAllData(data) {
  // 단체 정보 바인딩
  if (data.group_info) {
    bindField('group_name', data.group_info.group_name);
    bindField('travel_dates', data.group_info.travel_dates);
    bindField('destination', data.group_info.destination);
  }

  // 요금 정보 바인딩
  if (data.pricing) {
    bindField('airline_name', data.pricing.airline_name);
    bindField('departure_flight', data.pricing.departure_flight);
    bindField('return_flight', data.pricing.return_flight);
    bindField('option_type', data.pricing.option_type);
    bindField('price_amount', data.pricing.price_amount);
    bindField('price_note', data.pricing.price_note);
  }

  // 담당자 정보 바인딩
  if (data.contact_info) {
    bindField('contact_info', data.contact_info);
  }
}

/**
 * 데이터 객체를 JSON 형식으로 변환
 * @param {QuoteData} data - 견적서 데이터 객체
 * @returns {string} JSON 문자열
 */
function serializeData(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * JSON 문자열을 데이터 객체로 변환
 * @param {string} jsonString - JSON 문자열
 * @returns {QuoteData|null} 견적서 데이터 객체 또는 null (파싱 실패 시)
 */
function deserializeData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    return data;
  } catch (error) {
    console.error('[deserializeData] JSON parsing failed:', error);
    return null;
  }
}

/**
 * DOM에서 현재 표시된 데이터를 추출
 * @returns {QuoteData} 현재 DOM의 데이터
 */
function extractDataFromDOM() {
  const data = {
    quote_id: '',
    group_info: {
      group_name: getFieldValue('group_name'),
      travel_dates: getFieldValue('travel_dates'),
      destination: getFieldValue('destination'),
    },
    pricing: {
      airline_name: getFieldValue('airline_name'),
      departure_flight: getFieldValue('departure_flight'),
      return_flight: getFieldValue('return_flight'),
      option_type: getFieldValue('option_type'),
      price_amount: getFieldValue('price_amount'),
      price_note: getFieldValue('price_note'),
    },
    contact_info: getFieldValue('contact_info'),
  };

  return data;
}

/**
 * 특정 필드의 값 가져오기
 * @param {string} fieldName - data-field 속성 값
 * @returns {string} 필드 값
 */
function getFieldValue(fieldName) {
  const element = document.querySelector(`[data-field="${fieldName}"]`);

  if (!element) {
    console.warn(
      `[getFieldValue] No element found with data-field="${fieldName}"`
    );
    return '';
  }

  // innerHTML을 사용하여 <br /> 등의 태그도 포함
  return element.innerHTML.trim();
}

// ==================================================================
// 데이터 검증
// ==================================================================

/**
 * 견적서 데이터 유효성 검사
 * @param {QuoteData} data - 검증할 데이터
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validateQuoteData(data) {
  const errors = [];

  // 단체 정보 검증
  if (!data.group_info) {
    errors.push('단체 정보가 없습니다.');
  } else {
    if (
      !data.group_info.group_name ||
      data.group_info.group_name.trim() === ''
    ) {
      errors.push('단체명을 입력해주세요.');
    }
    if (
      !data.group_info.travel_dates ||
      data.group_info.travel_dates.trim() === ''
    ) {
      errors.push('여행 일자를 입력해주세요.');
    }
    if (
      !data.group_info.destination ||
      data.group_info.destination.trim() === ''
    ) {
      errors.push('여행지를 입력해주세요.');
    }
  }

  // 요금 정보 검증
  if (!data.pricing) {
    errors.push('요금 정보가 없습니다.');
  } else {
    if (!data.pricing.airline_name || data.pricing.airline_name.trim() === '') {
      errors.push('항공사명을 입력해주세요.');
    }
    if (
      !data.pricing.departure_flight ||
      data.pricing.departure_flight.trim() === ''
    ) {
      errors.push('출발편 정보를 입력해주세요.');
    }
    if (
      !data.pricing.return_flight ||
      data.pricing.return_flight.trim() === ''
    ) {
      errors.push('귀국편 정보를 입력해주세요.');
    }
    if (!data.pricing.option_type || data.pricing.option_type.trim() === '') {
      errors.push('옵션 타입을 입력해주세요.');
    }
    if (!data.pricing.price_amount || data.pricing.price_amount.trim() === '') {
      errors.push('1인 요금을 입력해주세요.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

// ==================================================================
// 초기화
// ==================================================================

/**
 * 페이지 로드 시 기본 데이터 바인딩
 */
function initializeBindings() {
  // 기본 데이터는 이미 HTML에 하드코딩되어 있으므로
  // 별도 초기화 불필요 (편집기에서 로드 시 bindAllData 호출됨)
}

// DOM 로드 완료 후 초기화
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBindings);
  } else {
    initializeBindings();
  }
}

// ==================================================================
// Window Exposure (HTML inline scripts / onclick handlers)
// ==================================================================
window.DEFAULT_QUOTE_DATA = DEFAULT_QUOTE_DATA;
window.bindField = bindField;
window.bindAllData = bindAllData;
window.serializeData = serializeData;
window.deserializeData = deserializeData;
window.extractDataFromDOM = extractDataFromDOM;
window.getFieldValue = getFieldValue;
window.validateQuoteData = validateQuoteData;
window.initializeBindings = initializeBindings;

// ==================================================================
// ESM Export
// ==================================================================
export {
  DEFAULT_QUOTE_DATA,
  bindField,
  bindAllData,
  serializeData,
  deserializeData,
  extractDataFromDOM,
  getFieldValue,
  validateQuoteData,
  initializeBindings,
};
