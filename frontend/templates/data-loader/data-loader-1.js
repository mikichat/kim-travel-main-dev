/**
 * Document Template 1 - Data Loader Module
 *
 * 이 모듈은 DB 또는 API로부터 문서 데이터를 로딩하여
 * HTML 템플릿에 바인딩할 수 있는 형태로 제공합니다.
 */

function _escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ============================================================================
// Sample Data (실제 DB 연동 전 테스트용)
// ============================================================================

const SAMPLE_DOCUMENT_DATA = {
  doc_id: "doc_001",
  doc_type: "estimate",
  title: "여행 견적서",
  subtitle: "",
  contact_info: "담당자: 김국진 010-2662-9009",
  logo_path: "../assets/images/25년11월중순 광저우 망산-1_hd1.png",
  group_info: {
    group_name: "중국 – 광저우 천저우 고의령 망산 PTY",
    travel_dates: "2025년 11월 14일 ~ 11월 18일",
    destination: "중국 – 광저우 천저우 고의령 망산"
  },
  pricing: {
    airline_name: "아시아나\n항공",
    departure_flight: "인천 (08:40) - 광저우 (11:15)",
    return_flight: "광저우 (12:20) - 인천 (17:00)",
    option_type: "노옵션",
    price_amount: "1,540,000원",
    price_note: "※ 상기 요금은 1인 기준이며 항공 및 세금 변동 시 재확인 필요"
  },
  conditions: [
    {
      condition_type: "airfare",
      content: "전 일정에 명시된 항공료",
      note: "선발권 기준으로 추후에 요금이 변동 될 수 있습니다"
    },
    {
      condition_type: "accommodation",
      content: "일정에 있는 숙박 포함",
      note: "2인 1실 기준"
    },
    {
      condition_type: "meals",
      content: "일정에 있는 식사 포함",
      note: ""
    },
    {
      condition_type: "transport",
      content: "일정에 따른 차량 이용 교통 포함",
      note: "집결지 ↔ 인천국제공항1청사 왕복 리무진 제공"
    },
    {
      condition_type: "attractions",
      content: "일정에 명시된 관광지 입장료",
      note: ""
    },
    {
      condition_type: "guide",
      content: "전 일정 현지 가이드",
      note: ""
    },
    {
      condition_type: "insurance",
      content: "1억원 여행자 보험",
      note: "상해사망 기준"
    }
  ],
  images: [
    {
      image_path: "",
      alt_text: "여행 이미지"
    }
  ],
  footer_note: "본 견적서는 참고용이며, 최종 확정은 계약서를 기준으로 합니다."
};

// ============================================================================
// Data Loader Class
// ============================================================================

class DocumentDataLoader {
  constructor(config = {}) {
    this.apiBaseUrl = config.apiBaseUrl || '/api';
    this.useSampleData = config.useSampleData || false;
  }

  /**
   * 문서 데이터 로딩 (DB/API 또는 샘플 데이터)
   * @param {string} docId - 문서 ID
   * @returns {Promise<Object>} 문서 데이터 객체
   */
  async loadDocument(docId) {
    if (this.useSampleData) {
      return this._loadSampleData(docId);
    }

    return this._loadFromAPI(docId);
  }

  /**
   * 샘플 데이터 로딩
   * @private
   */
  async _loadSampleData(_docId) {
    // 샘플 데이터 반환 (비동기 시뮬레이션)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(SAMPLE_DOCUMENT_DATA);
      }, 100);
    });
  }

  /**
   * API로부터 데이터 로딩
   * @private
   */
  async _loadFromAPI(docId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/documents/${docId}`);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to load document data');
      }

      return result.data;
    } catch (error) {
      console.error('Error loading document:', error);
      throw error;
    }
  }

  /**
   * 조건 데이터를 타입별로 매핑
   * @param {Array} conditions - 조건 배열
   * @returns {Object} 타입별 조건 객체
   */
  mapConditions(conditions) {
    const mapped = {};

    conditions.forEach(condition => {
      const type = condition.condition_type;
      mapped[type] = {
        content: condition.content || '',
        note: condition.note || ''
      };
    });

    return mapped;
  }

  /**
   * NULL/빈 값 처리
   * @param {any} value - 처리할 값
   * @param {string} defaultValue - 기본값
   * @returns {string} 처리된 값
   */
  sanitizeValue(value, defaultValue = '') {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return String(value);
  }

  /**
   * 이미지 경로 처리
   * @param {string} imagePath - 이미지 경로
   * @returns {string} 처리된 이미지 경로
   */
  sanitizeImagePath(imagePath) {
    if (!imagePath || imagePath === '') {
      return ''; // 빈 경로는 placeholder로 표시됨 (CSS에서 처리)
    }
    return imagePath;
  }
}

// ============================================================================
// Data Binding Utilities
// ============================================================================

/**
 * HTML 템플릿에 데이터 바인딩
 * @param {Object} data - 문서 데이터
 * @param {DocumentDataLoader} loader - 데이터 로더 인스턴스
 */
function bindDataToTemplate(data, loader) {
  // 조건 데이터 매핑
  const conditions = loader.mapConditions(data.conditions);

  // 각 data-field 속성을 가진 요소에 데이터 바인딩
  bindTextField('logo_path', loader.sanitizeImagePath(data.logo_path), true);
  bindTextField('contact_info', loader.sanitizeValue(data.contact_info));
  bindTextField('doc_title', loader.sanitizeValue(data.title));

  // Group Info
  bindTextField('group_name', loader.sanitizeValue(data.group_info.group_name));
  bindTextField('travel_dates', loader.sanitizeValue(data.group_info.travel_dates));
  bindTextField('destination', loader.sanitizeValue(data.group_info.destination));

  // Pricing
  bindTextField('airline_name', loader.sanitizeValue(data.pricing.airline_name));
  bindTextField('departure_flight', loader.sanitizeValue(data.pricing.departure_flight));
  bindTextField('return_flight', loader.sanitizeValue(data.pricing.return_flight));
  bindTextField('option_type', loader.sanitizeValue(data.pricing.option_type));
  bindTextField('price_amount', loader.sanitizeValue(data.pricing.price_amount));
  bindTextField('price_note', loader.sanitizeValue(data.pricing.price_note));

  // Conditions
  bindTextField('conditions_title', '여 행 조 건');
  bindTextField('airfare_included', conditions.airfare?.content || '');
  bindTextField('airfare_note', conditions.airfare?.note || '');
  bindTextField('accommodation_included', conditions.accommodation?.content || '');
  bindTextField('accommodation_note', conditions.accommodation?.note || '');
  bindTextField('meals_included', conditions.meals?.content || '');
  bindTextField('meals_note', conditions.meals?.note || '');
  bindTextField('transport_included', conditions.transport?.content || '');
  bindTextField('transport_note', conditions.transport?.note || '');
  bindTextField('attractions_included', conditions.attractions?.content || '');
  bindTextField('attractions_note', conditions.attractions?.note || '');
  bindTextField('guide_included', conditions.guide?.content || '');
  bindTextField('guide_note', conditions.guide?.note || '');
  bindTextField('insurance_included', conditions.insurance?.content || '');
  bindTextField('insurance_note', conditions.insurance?.note || '');

  // Images
  if (data.images && data.images.length > 0) {
    bindImageField('main_image', loader.sanitizeImagePath(data.images[0].image_path));
  }

  // Footer
  bindTextField('footer_note', loader.sanitizeValue(data.footer_note));
}

/**
 * 텍스트 필드 바인딩
 * @param {string} fieldName - data-field 속성 값
 * @param {string} value - 바인딩할 값
 * @param {boolean} isAttribute - 속성으로 바인딩 여부
 */
function bindTextField(fieldName, value, isAttribute = false) {
  const elements = document.querySelectorAll(`[data-field="${fieldName}"]`);

  elements.forEach(element => {
    if (isAttribute && element.tagName === 'IMG') {
      element.src = value;
    } else {
      // 줄바꿈 처리
      if (value.includes('\n')) {
        element.innerHTML = value.split('\n').map(line => `<span>${_escapeHtml(line)}</span>`).join('<br>');
      } else {
        element.textContent = value;
      }
    }
  });
}

/**
 * 이미지 필드 바인딩
 * @param {string} fieldName - data-field 속성 값
 * @param {string} imagePath - 이미지 경로
 */
function bindImageField(fieldName, imagePath) {
  const elements = document.querySelectorAll(`[data-field="${fieldName}"]`);

  elements.forEach(element => {
    const img = element.querySelector('img') || element;
    if (img.tagName === 'IMG') {
      img.src = imagePath;
    }
  });
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * 문서 로딩 및 바인딩 초기화
 * @param {Object} config - 설정 객체
 */
async function initializeDocument(config = {}) {
  try {
    const loader = new DocumentDataLoader(config);
    const docId = config.docId || 'doc_001';

    const data = await loader.loadDocument(docId);

    bindDataToTemplate(data, loader);
  } catch (error) {
    console.error('Failed to initialize document:', error);
    showToast('문서 로딩에 실패했습니다.', 'error');
  }
}

// ============================================================================
// Export (모듈로 사용 시)
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DocumentDataLoader,
    bindDataToTemplate,
    initializeDocument,
    SAMPLE_DOCUMENT_DATA
  };
}
