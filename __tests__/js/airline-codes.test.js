const {
  AIRLINE_CODES,
  extractAirlineCode,
  getAirlineName,
  getAirlineNameFromFlightNumber,
} = require('../../js/airline-codes.js');

describe('AIRLINE_CODES 데이터', () => {
  test('주요 한국 항공사 코드 존재', () => {
    expect(AIRLINE_CODES['KE']).toBe('대한항공');
    expect(AIRLINE_CODES['OZ']).toBe('아시아나항공');
    expect(AIRLINE_CODES['7C']).toBe('제주항공');
    expect(AIRLINE_CODES['LJ']).toBe('진에어');
  });

  test('주요 외국 항공사 코드 존재', () => {
    expect(AIRLINE_CODES['NH']).toBe('전일본공수');
    expect(AIRLINE_CODES['SQ']).toBe('싱가포르항공');
    expect(AIRLINE_CODES['DL']).toBe('델타항공');
  });

  test('전체 코드 수 70개 이상', () => {
    expect(Object.keys(AIRLINE_CODES).length).toBeGreaterThanOrEqual(70);
  });
});

describe('extractAirlineCode', () => {
  test('2글자 코드 추출: KE123 → KE', () => {
    expect(extractAirlineCode('KE123')).toBe('KE');
  });

  test('2글자 코드 추출: OZ361 → OZ', () => {
    expect(extractAirlineCode('OZ361')).toBe('OZ');
  });

  test('숫자+문자 코드 추출: 7C101 → 7C', () => {
    expect(extractAirlineCode('7C101')).toBe('7C');
  });

  test('문자+숫자 코드 추출: U2456 → U2', () => {
    expect(extractAirlineCode('U2456')).toBe('U2');
  });

  test('소문자 입력도 대문자로 변환', () => {
    expect(extractAirlineCode('ke123')).toBe('KE');
  });

  test('공백 포함 입력 처리', () => {
    expect(extractAirlineCode('  KE123  ')).toBe('KE');
  });

  test('null 입력 → null', () => {
    expect(extractAirlineCode(null)).toBeNull();
  });

  test('빈 문자열 → null', () => {
    expect(extractAirlineCode('')).toBeNull();
  });

  test('숫자 타입 입력 → null', () => {
    expect(extractAirlineCode(123)).toBeNull();
  });

  test('잘못된 형식 → null', () => {
    expect(extractAirlineCode('ABC')).toBeNull();
  });
});

describe('getAirlineName', () => {
  test('유효 코드 → 한글명', () => {
    expect(getAirlineName('KE')).toBe('대한항공');
    expect(getAirlineName('OZ')).toBe('아시아나항공');
  });

  test('소문자 입력도 한글명 반환', () => {
    expect(getAirlineName('ke')).toBe('대한항공');
  });

  test('없는 코드 → 원본 반환', () => {
    expect(getAirlineName('XX')).toBe('XX');
  });

  test('null 입력 → 빈 문자열', () => {
    expect(getAirlineName(null)).toBe('');
  });
});

describe('getAirlineNameFromFlightNumber', () => {
  test('KE123 → 대한항공', () => {
    expect(getAirlineNameFromFlightNumber('KE123')).toBe('대한항공');
  });

  test('7C101 → 제주항공', () => {
    expect(getAirlineNameFromFlightNumber('7C101')).toBe('제주항공');
  });

  test('잘못된 형식 → 빈 문자열', () => {
    expect(getAirlineNameFromFlightNumber('ABC')).toBe('');
  });

  test('null 입력 → 빈 문자열', () => {
    expect(getAirlineNameFromFlightNumber(null)).toBe('');
  });
});
