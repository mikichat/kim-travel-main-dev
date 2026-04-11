const { AirportDatabase } = require('../../js/airport-database.js');

describe('AirportDatabase.getAirportByCode', () => {
  test('ICN → 인천, 국내', () => {
    const result = AirportDatabase.getAirportByCode('ICN');
    expect(result).not.toBeNull();
    expect(result.name).toBe('인천');
    expect(result.region).toBe('국내');
  });

  test('BKK → 방콕, 동남아', () => {
    const result = AirportDatabase.getAirportByCode('BKK');
    expect(result).not.toBeNull();
    expect(result.name).toBe('방콕');
    expect(result.region).toBe('동남아');
  });

  test('NRT → 도쿄, 일본', () => {
    const result = AirportDatabase.getAirportByCode('NRT');
    expect(result).not.toBeNull();
    expect(result.name).toBe('도쿄');
    expect(result.airport).toBe('나리타공항');
  });

  test('없는 코드 → null', () => {
    expect(AirportDatabase.getAirportByCode('ZZZ')).toBeNull();
  });

  test('반환값에 region 포함', () => {
    const result = AirportDatabase.getAirportByCode('LAX');
    expect(result).toHaveProperty('region', '미주');
    expect(result).toHaveProperty('code', 'LAX');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('airport');
  });
});

describe('AirportDatabase.getAirportsByCity', () => {
  test('도쿄 → NRT, HND 2개', () => {
    const results = AirportDatabase.getAirportsByCity('도쿄');
    expect(results).toHaveLength(2);
    const codes = results.map((a) => a.code);
    expect(codes).toContain('NRT');
    expect(codes).toContain('HND');
  });

  test('방콕 → BKK, DMK 2개', () => {
    const results = AirportDatabase.getAirportsByCity('방콕');
    expect(results).toHaveLength(2);
  });

  test('없는 도시 → 빈 배열', () => {
    expect(AirportDatabase.getAirportsByCity('없는도시')).toEqual([]);
  });

  test('반환값에 region 포함', () => {
    const results = AirportDatabase.getAirportsByCity('인천');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toHaveProperty('region');
  });
});

describe('AirportDatabase.getAirportsByRegion', () => {
  test('국내 → 5개', () => {
    const results = AirportDatabase.getAirportsByRegion('국내');
    expect(results).toHaveLength(5);
  });

  test('일본 → 13개', () => {
    const results = AirportDatabase.getAirportsByRegion('일본');
    expect(results).toHaveLength(13);
  });

  test('없는 지역 → 빈 배열', () => {
    expect(AirportDatabase.getAirportsByRegion('없는지역')).toEqual([]);
  });
});

describe('AirportDatabase.formatAirportName', () => {
  test('ICN → "인천 (ICN)"', () => {
    expect(AirportDatabase.formatAirportName('ICN')).toBe('인천 (ICN)');
  });

  test('NRT → "도쿄 (NRT)"', () => {
    expect(AirportDatabase.formatAirportName('NRT')).toBe('도쿄 (NRT)');
  });

  test('없는 코드 → 원본 반환', () => {
    expect(AirportDatabase.formatAirportName('ZZZ')).toBe('ZZZ');
  });
});

describe('AirportDatabase.isKoreanAirport', () => {
  test('ICN → true', () => {
    expect(AirportDatabase.isKoreanAirport('ICN')).toBe(true);
  });

  test('GMP → true', () => {
    expect(AirportDatabase.isKoreanAirport('GMP')).toBe(true);
  });

  test('CJU → true', () => {
    expect(AirportDatabase.isKoreanAirport('CJU')).toBe(true);
  });

  test('BKK → false', () => {
    expect(AirportDatabase.isKoreanAirport('BKK')).toBe(false);
  });

  test('NRT → false', () => {
    expect(AirportDatabase.isKoreanAirport('NRT')).toBe(false);
  });
});

describe('AirportDatabase.getAllAirportCodes', () => {
  test('전체 공항 코드 70개 이상', () => {
    const codes = AirportDatabase.getAllAirportCodes();
    expect(codes.length).toBeGreaterThanOrEqual(70);
  });

  test('주요 공항 코드 포함', () => {
    const codes = AirportDatabase.getAllAirportCodes();
    expect(codes).toContain('ICN');
    expect(codes).toContain('NRT');
    expect(codes).toContain('BKK');
    expect(codes).toContain('LAX');
  });

  test('배열 타입 반환', () => {
    expect(Array.isArray(AirportDatabase.getAllAirportCodes())).toBe(true);
  });
});

describe('AirportDatabase.search', () => {
  test('코드로 검색: ICN', () => {
    const results = AirportDatabase.search('ICN');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].code).toBe('ICN');
  });

  test('도시명으로 검색: 도쿄', () => {
    const results = AirportDatabase.search('도쿄');
    expect(results).toHaveLength(2);
  });

  test('공항명으로 검색: 나리타', () => {
    const results = AirportDatabase.search('나리타');
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('NRT');
  });

  test('소문자 코드 검색도 동작', () => {
    const results = AirportDatabase.search('icn');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('검색 결과에 region 포함', () => {
    const results = AirportDatabase.search('ICN');
    expect(results[0]).toHaveProperty('region');
  });
});
