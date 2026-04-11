/**
 * 자유여행 예약 시스템 (travel-free.html / preview-free.html) 단위 테스트
 *
 * 인라인 함수를 추출하여 테스트합니다.
 */

// ============================================================
//  함수 추출 (travel-free.html 에서)
// ============================================================

/** 원가 계산기 — 통화 문자열 → 숫자 */
function parseCurrencyVal(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}

/** 원가 계산기 — 숫자 → "N원" */
function fmtWon(n) {
  return Number(n).toLocaleString('ko-KR') + '원';
}

/** HTML 이스케이프 (travel-free.html) */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 오늘 날짜 ISO (travel-free.html) */
function today() {
  return new Date().toISOString().split('T')[0];
}

// ============================================================
//  함수 추출 (preview-free.html 에서)
// ============================================================

/** HTML 이스케이프 (preview-free.html 의 esc) */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 금액 포맷 (preview-free.html) */
function fmtMoney(amount) {
  const n = Number(String(amount || '0').replace(/[^\d]/g, ''));
  return isNaN(n) ? '0' : n.toLocaleString('ko-KR');
}

/** 항공편 그룹 정규화 (preview-free.html) */
function normalizeFlightGroups(flights) {
  if (!Array.isArray(flights)) return [];

  // 이미 그룹 형식인지 확인 (legs 속성 있으면 그룹)
  if (flights[0] && flights[0].legs) return flights;

  // 탑승객 없이 단일 항공편 배열이면 하나의 그룹으로
  if (flights[0] && (flights[0].flightNo || flights[0].dep)) {
    return [
      {
        paxNames: [],
        paxLabel: '',
        legs: flights,
      },
    ];
  }

  // 탑승객별 그룹 구조 (passengers 배열)
  return flights.map(function (f) {
    return {
      paxNames: f.passengers || f.paxNames || [],
      paxLabel: f.paxLabel || (f.passengers || []).join(' & '),
      legs: f.legs || f.itinerary || [],
    };
  });
}

/** 에디터 형식 → 미리보기 형식 정규화 (preview-free.html) */
function normalizeEditorData(data) {
  if (data.sections) return data;

  data.sections = {
    flights: data.flightsInclude !== false,
    hotels: data.hotelsInclude !== false,
    rentcar: data.rentcarInclude !== false,
    golf: data.golfInclude !== false,
    payment: data.paymentInclude !== false,
    company: data.companyInclude !== false,
  };

  if (data.passengerGroups && !data.flights) {
    data.flights = data.passengerGroups.map(function (pg) {
      var rawPax = pg.passengers || [];
      var names = rawPax
        .map(function (p) {
          return typeof p === 'object' && p !== null
            ? p.name || ''
            : String(p || '');
        })
        .filter(Boolean);
      return {
        paxNames: names,
        paxLabel: pg.label || names.join(' & '),
        legs: pg.legs || [],
      };
    });
  }

  if (Array.isArray(data.customSections)) {
    data.customSections = data.customSections.filter(function (cs) {
      return cs.include !== false;
    });
  }

  return data;
}

// ============================================================
//  테스트
// ============================================================

describe('parseCurrencyVal', () => {
  test('통화 문자열에서 숫자 추출', () => {
    expect(parseCurrencyVal('1,234,567')).toBe(1234567);
  });

  test('원 단위 포함 문자열', () => {
    expect(parseCurrencyVal('500,000원')).toBe(500000);
  });

  test('빈 문자열 → 0', () => {
    expect(parseCurrencyVal('')).toBe(0);
  });

  test('null → 0', () => {
    expect(parseCurrencyVal(null)).toBe(0);
  });

  test('undefined → 0', () => {
    expect(parseCurrencyVal(undefined)).toBe(0);
  });

  test('순수 숫자 문자열', () => {
    expect(parseCurrencyVal('12345')).toBe(12345);
  });

  test('숫자 타입 입력', () => {
    expect(parseCurrencyVal(99000)).toBe(99000);
  });

  test('비숫자 문자만 → 0', () => {
    expect(parseCurrencyVal('abc')).toBe(0);
  });
});

describe('fmtWon', () => {
  test('천 단위 구분 + 원', () => {
    expect(fmtWon(1234567)).toBe('1,234,567원');
  });

  test('0원', () => {
    expect(fmtWon(0)).toBe('0원');
  });

  test('음수', () => {
    expect(fmtWon(-5000)).toBe('-5,000원');
  });
});

describe('escapeHtml (travel-free)', () => {
  test('& 이스케이프', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  test('< > 이스케이프', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  test('" 이스케이프', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  test('빈 문자열', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('숫자 입력 → 문자열 반환', () => {
    expect(escapeHtml(123)).toBe('123');
  });

  test('특수문자 없는 문자열은 그대로', () => {
    expect(escapeHtml('안녕하세요')).toBe('안녕하세요');
  });
});

describe('esc (preview-free)', () => {
  test('& < > 이스케이프', () => {
    expect(esc('<div>A & B</div>')).toBe('&lt;div&gt;A &amp; B&lt;/div&gt;');
  });

  test('undefined → 빈 문자열', () => {
    expect(esc(undefined)).toBe('');
  });

  test('null → 빈 문자열', () => {
    expect(esc(null)).toBe('');
  });

  test('빈 문자열', () => {
    expect(esc('')).toBe('');
  });

  test('일반 텍스트는 그대로', () => {
    expect(esc('제주도 여행')).toBe('제주도 여행');
  });
});

describe('fmtMoney', () => {
  test('숫자 → 천 단위 구분', () => {
    expect(fmtMoney(2542600)).toBe('2,542,600');
  });

  test('문자열 숫자', () => {
    expect(fmtMoney('1000000')).toBe('1,000,000');
  });

  test('통화 형식 문자열', () => {
    expect(fmtMoney('1,500,000원')).toBe('1,500,000');
  });

  test('0', () => {
    expect(fmtMoney(0)).toBe('0');
  });

  test('빈 문자열', () => {
    expect(fmtMoney('')).toBe('0');
  });

  test('null', () => {
    expect(fmtMoney(null)).toBe('0');
  });

  test('undefined', () => {
    expect(fmtMoney(undefined)).toBe('0');
  });

  test('비숫자 → 0', () => {
    expect(fmtMoney('abc')).toBe('0');
  });
});

describe('normalizeFlightGroups', () => {
  test('null → 빈 배열', () => {
    expect(normalizeFlightGroups(null)).toEqual([]);
  });

  test('undefined → 빈 배열', () => {
    expect(normalizeFlightGroups(undefined)).toEqual([]);
  });

  test('빈 배열 → 빈 배열', () => {
    expect(normalizeFlightGroups([])).toEqual([]);
  });

  test('이미 그룹 형식 (legs 속성) → 그대로', () => {
    const input = [{ paxNames: ['홍길동'], legs: [{ flightNo: 'KE123' }] }];
    expect(normalizeFlightGroups(input)).toEqual(input);
  });

  test('단일 항공편 배열 (flightNo) → 하나의 그룹', () => {
    const input = [
      { flightNo: 'KE123', dep: 'ICN', arr: 'CJU' },
      { flightNo: 'KE124', dep: 'CJU', arr: 'ICN' },
    ];
    const result = normalizeFlightGroups(input);
    expect(result).toHaveLength(1);
    expect(result[0].paxNames).toEqual([]);
    expect(result[0].legs).toEqual(input);
  });

  test('단일 항공편 배열 (dep 속성) → 하나의 그룹', () => {
    const input = [{ dep: 'ICN', arr: 'CJU' }];
    const result = normalizeFlightGroups(input);
    expect(result).toHaveLength(1);
    expect(result[0].legs).toEqual(input);
  });

  test('passengers 배열 구조 → 그룹 변환', () => {
    const input = [
      {
        passengers: ['홍길동', '김철수'],
        paxLabel: '그룹 1',
        itinerary: [{ flightNo: 'OZ361' }],
      },
    ];
    const result = normalizeFlightGroups(input);
    expect(result).toHaveLength(1);
    expect(result[0].paxNames).toEqual(['홍길동', '김철수']);
    expect(result[0].paxLabel).toBe('그룹 1');
    expect(result[0].legs).toEqual([{ flightNo: 'OZ361' }]);
  });

  test('passengers → paxLabel 자동 생성 (legs 없을 때)', () => {
    const input = [
      {
        passengers: ['A', 'B'],
      },
    ];
    const result = normalizeFlightGroups(input);
    expect(result[0].paxLabel).toBe('A & B');
    expect(result[0].paxNames).toEqual(['A', 'B']);
    expect(result[0].legs).toEqual([]);
  });

  test('paxNames 대신 passengers 사용', () => {
    const input = [{ paxNames: ['홍길동'], legs: [] }];
    // 첫 항목에 legs 있으므로 이미 그룹 형식
    const result = normalizeFlightGroups(input);
    expect(result).toEqual(input);
  });
});

describe('normalizeEditorData', () => {
  test('sections 이미 있으면 그대로 반환', () => {
    const data = { sections: { flights: true, hotels: false } };
    const result = normalizeEditorData(data);
    expect(result.sections).toEqual({ flights: true, hotels: false });
  });

  test('include 플래그 → sections 변환', () => {
    const data = {
      flightsInclude: true,
      hotelsInclude: false,
      rentcarInclude: true,
      golfInclude: false,
      paymentInclude: true,
      companyInclude: false,
    };
    const result = normalizeEditorData({ ...data });
    expect(result.sections.flights).toBe(true);
    expect(result.sections.hotels).toBe(false);
    expect(result.sections.rentcar).toBe(true);
    expect(result.sections.golf).toBe(false);
    expect(result.sections.payment).toBe(true);
    expect(result.sections.company).toBe(false);
  });

  test('include 미지정 → 기본 true', () => {
    const data = {};
    const result = normalizeEditorData({ ...data });
    expect(result.sections.flights).toBe(true);
    expect(result.sections.hotels).toBe(true);
  });

  test('passengerGroups → flights 변환 (문자열 passengers)', () => {
    const data = {
      passengerGroups: [
        {
          passengers: ['홍길동', '김철수'],
          label: '그룹A',
          legs: [{ flightNo: 'KE123' }],
        },
      ],
    };
    const result = normalizeEditorData({ ...data });
    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].paxNames).toEqual(['홍길동', '김철수']);
    expect(result.flights[0].paxLabel).toBe('그룹A');
    expect(result.flights[0].legs).toEqual([{ flightNo: 'KE123' }]);
  });

  test('passengerGroups → flights 변환 (객체 passengers)', () => {
    const data = {
      passengerGroups: [
        {
          passengers: [
            { name: '홍길동', color: 'blue' },
            { name: '김철수', color: 'red' },
          ],
          legs: [],
        },
      ],
    };
    const result = normalizeEditorData({ ...data });
    expect(result.flights[0].paxNames).toEqual(['홍길동', '김철수']);
  });

  test('passengerGroups에 빈 이름 객체 필터링', () => {
    const data = {
      passengerGroups: [
        {
          passengers: [{ name: '', color: 'blue' }, { name: '김철수' }],
          legs: [],
        },
      ],
    };
    const result = normalizeEditorData({ ...data });
    expect(result.flights[0].paxNames).toEqual(['김철수']);
  });

  test('customSections include=false 필터링', () => {
    const data = {
      customSections: [
        { id: '1', type: 'tour', include: true, items: [] },
        { id: '2', type: 'meal', include: false, items: [] },
        { id: '3', type: 'ticket', include: true, items: [] },
      ],
    };
    const result = normalizeEditorData({ ...data });
    expect(result.customSections).toHaveLength(2);
    expect(result.customSections[0].id).toBe('1');
    expect(result.customSections[1].id).toBe('3');
  });

  test('flights 이미 존재 시 passengerGroups 무시', () => {
    const data = {
      passengerGroups: [{ passengers: ['A'], legs: [] }],
      flights: [{ paxNames: ['B'], legs: [] }],
    };
    const result = normalizeEditorData({ ...data });
    expect(result.flights[0].paxNames).toEqual(['B']);
  });
});

describe('today', () => {
  test('YYYY-MM-DD 형식 반환', () => {
    const result = today();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('오늘 날짜와 일치', () => {
    const now = new Date();
    const expected = now.toISOString().split('T')[0];
    expect(today()).toBe(expected);
  });
});

describe('edge cases', () => {
  test('fmtMoney에 음수 (숫자 외 제거 특성)', () => {
    // fmtMoney은 비숫자를 제거하므로 -는 사라짐
    expect(fmtMoney(-1000)).toBe('1,000');
  });

  test('parseCurrencyVal에 소수점', () => {
    // 소수점은 비숫자로 제거됨
    expect(parseCurrencyVal('1,234.56')).toBe(123456);
  });

  test('esc에 숫자 입력', () => {
    expect(esc(42)).toBe('42');
  });

  test('escapeHtml에 null', () => {
    expect(escapeHtml(null)).toBe('null');
  });

  test('normalizeFlightGroups — 문자열 입력', () => {
    expect(normalizeFlightGroups('not an array')).toEqual([]);
  });

  test('normalizeEditorData — 빈 passengerGroups', () => {
    const data = { passengerGroups: [] };
    const result = normalizeEditorData({ ...data });
    expect(result.flights).toEqual([]);
  });

  test('normalizeEditorData — customSections 미존재', () => {
    const data = {};
    const result = normalizeEditorData({ ...data });
    expect(result.customSections).toBeUndefined();
  });
});
