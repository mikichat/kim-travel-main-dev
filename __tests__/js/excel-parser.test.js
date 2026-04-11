// XLSX 글로벌 mock (모듈 로드 전 설정)
global.XLSX = {
  utils: {
    encode_col: (c) => String.fromCharCode(65 + c),
    decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 20, c: 10 } }),
  },
};

const { parseProductExcel, mapToProductData } = require('../../js/modules/excelParser.js');

// ==================== Helper: Make Mock Sheet ====================

/**
 * Helper to create mock XLSX sheet with cells
 * @param {Object} cells - Map of cellRef => value or { v, w } object
 * @returns {Object} Mock sheet
 */
function makeSheet(cells) {
  const sheet = { '!ref': 'A1:I25' };
  Object.entries(cells).forEach(([ref, val]) => {
    if (typeof val === 'number') {
      sheet[ref] = { v: val, w: String(val) };
    } else if (typeof val === 'object' && val !== null) {
      sheet[ref] = val;
    } else {
      sheet[ref] = { v: val, w: String(val) };
    }
  });
  return sheet;
}

// ==================== mapToProductData ====================

describe('mapToProductData', () => {
  const baseParsed = {
    type: 'quotation',
    groupName: '제주 단체여행',
    destination: '제주',
    duration: 3,
    travelDates: { from: '2026-03-01', to: '2026-03-03' },
    pax: { paid: 20, foc: 2, total: 22 },
    roomConfig: 'TWN 10',
    costs: { perPerson: 350000, total: 7000000 },
    hotel: { name: '제주호텔', roomType: 'TWN', rooms: 10 },
    vehicle: { type: '45인승', count: 1 },
    guide: { name: '김가이드', phone: '010-1234-5678' },
    inclusions: '숙박, 식사, 관광',
    itinerary: [],
  };

  test('기본 매핑 — 모든 필드 정상 변환', () => {
    const result = mapToProductData(baseParsed);

    expect(result.name).toBe('제주 단체여행');
    expect(result.destination).toBe('제주');
    expect(result.duration).toBe(3);
    expect(result.price).toBe(350000);
    expect(result.status).toBe('활성');
    expect(result.description).toContain('단체: 제주 단체여행');
    expect(result.description).toContain('기간: 2026-03-01 ~ 2026-03-03');
    expect(result.description).toContain('인원: 22명 (20+2)');
    expect(result.description).toContain('[견적서]');
  });

  test('호텔 정보 매핑', () => {
    const result = mapToProductData(baseParsed);

    expect(result.hotel_name).toBe('제주호텔');
    expect(result.hotel_room_type).toBe('TWN');
    expect(result.hotel_rooms).toBe(10);
    expect(result.hotel_checkin).toBe('2026-03-01');
    expect(result.hotel_checkout).toBe('2026-03-03');
    expect(result.procurement_hotel).toBe(true);
  });

  test('차량/가이드 정보 매핑', () => {
    const result = mapToProductData(baseParsed);

    expect(result.vehicle_type).toBe('45인승');
    expect(result.vehicle_count).toBe(1);
    expect(result.guide_name).toBe('김가이드');
    expect(result.guide_phone).toBe('010-1234-5678');
    expect(result.procurement_vehicle).toBe(true);
    expect(result.procurement_guide).toBe(true);
  });

  test('확정서 타입 → procurement_status in_progress', () => {
    const parsed = { ...baseParsed, type: 'confirmation' };
    const result = mapToProductData(parsed);

    expect(result.description).toContain('[확정서]');
    expect(result.procurement_status).toBe('in_progress');
  });

  test('견적서 타입 → procurement_status pending', () => {
    const result = mapToProductData(baseParsed);
    expect(result.procurement_status).toBe('pending');
  });

  test('groupName 없으면 destination + date로 name 생성', () => {
    const parsed = { ...baseParsed, groupName: '' };
    const result = mapToProductData(parsed);

    expect(result.name).toBe('제주 2026-03-01');
  });

  test('costs 없으면 price 0', () => {
    const parsed = { ...baseParsed, costs: null };
    const result = mapToProductData(parsed);

    expect(result.price).toBe(0);
  });

  test('호텔/차량/가이드 없으면 procurement false', () => {
    const parsed = {
      ...baseParsed,
      hotel: { name: '', roomType: '', rooms: 0 },
      vehicle: { type: '', count: 0 },
      guide: { name: '', phone: '' },
    };
    const result = mapToProductData(parsed);

    expect(result.procurement_hotel).toBe(false);
    expect(result.procurement_vehicle).toBe(false);
    expect(result.procurement_guide).toBe(false);
  });

  test('pax.total 0이면 인원 정보 생략', () => {
    const parsed = { ...baseParsed, pax: { paid: 0, foc: 0, total: 0 } };
    const result = mapToProductData(parsed);

    expect(result.description).not.toContain('인원:');
  });

  test('날짜 없으면 기간 정보 생략', () => {
    const parsed = {
      ...baseParsed,
      travelDates: { from: '', to: '' },
    };
    const result = mapToProductData(parsed);

    expect(result.description).not.toContain('기간:');
    expect(result.hotel_checkin).toBe('');
    expect(result.hotel_checkout).toBe('');
  });

  test('inclusions → procurement_note 매핑', () => {
    const result = mapToProductData(baseParsed);
    expect(result.procurement_note).toBe('숙박, 식사, 관광');
  });

  test('항공편 필드 기본값 빈 문자열', () => {
    const result = mapToProductData(baseParsed);

    expect(result.flight_id).toBe('');
    expect(result.airline).toBe('');
    expect(result.outbound_flight).toBe('');
    expect(result.return_flight).toBe('');
    expect(result.flight_note).toBe('');
    expect(result.procurement_flight).toBe(false);
  });
});

// ==================== parseProductExcel ====================

describe('parseProductExcel', () => {
  test('세부 시트 있으면 견적서(quotation) 파싱', () => {
    const mockSheet = {};
    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mockSheet, '세부일정': mockSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.type).toBe('quotation');
  });

  test('세부 시트 없으면 확정서(confirmation) 파싱', () => {
    const mockSheet = {};
    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mockSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.type).toBe('confirmation');
  });
});

// ==================== Internal Function Tests (via parseProductExcel) ====================

describe('Metadata parsing', () => {
  test('파싱: ★목적지 추출 및 형식 정규화', () => {
    // "★베트남_호치민&무이네 3박5일 제안서" → "호치민&무이네"
    const mainSheet = makeSheet({
      A1: '★베트남_호치민&무이네 3박5일 제안서',
      A2: 'PAX',
      B2: '20+2',
      G2: '2026.03.20~03.24',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.destination).toBe('호치민&무이네');
  });

  test('파싱: 여행기간 short format (2026.04.20~04.24)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A2: 'PAX',
      B2: '10+1',
      G2: '2026.04.20~04.24',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.travelDates.from).toBe('2026-04-20');
    expect(result.travelDates.to).toBe('2026-04-24');
  });

  test('파싱: 여행기간 full format (2026.04.20~2026.04.24)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A2: 'PAX',
      B2: '10+1',
      G2: '2026.04.20~2026.04.24',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.travelDates.from).toBe('2026-04-20');
    expect(result.travelDates.to).toBe('2026-04-24');
  });

  test('파싱: PAX 정보 (paid+foc) 및 roomConfig', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A2: 'PAX',
      B2: '20+2 [TWN 10, SGL 2]',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.pax.paid).toBe(20);
    expect(result.pax.foc).toBe(2);
    expect(result.pax.total).toBe(22);
    expect(result.roomConfig).toBe('TWN 10, SGL 2');
  });

  test('파싱: 여행기간 별도 행 (여행기간 키워드 + G열)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A2: 'PAX',
      B2: '10+1 [TWN 5]',
      A3: '여행기간',
      G3: '2026.05.10~05.15',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.travelDates.from).toBe('2026-05-10');
    expect(result.travelDates.to).toBe('2026-05-15');
  });

  test('파싱: 피켓명 추출 및 ▣ 제거', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A4: '피켓명',
      B4: '▣한진관광~',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.groupName).toBe('한진관광');
  });

  test('파싱: 가이드 이름+전화', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A5: '가이드',
      B5: '▣김가이드 부장 +82 10-1234-5678',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.guide.name).toBe('김가이드');
    // Phone keeps hyphens: replace(/\s+/g, '') only removes spaces, not hyphens
    expect(result.guide.phone).toBe('+8210-1234-5678');
  });

  test('파싱: 가이드 이름만 (전화 없음)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A5: '가이드',
      B5: '▣이가이드',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.guide.name).toBe('이가이드');
    expect(result.guide.phone).toBe('');
  });

  test('파싱: 포함사항 다중 행 수집', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A6: '포함사항',
      B6: '▣숙박',
      B7: '▣식사',
      B8: '▣관광',
      A9: '불포함사항',
      B9: '개인경비',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.inclusions).toBe('숙박, 식사, 관광');
  });
});

describe('getCellText and getCellValue branches', () => {
  test('getCellText: cell.w 사용 (trimmed)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A2: 'PAX',
      B2: {
        w: '  20+2  ',
        v: 'ignored',
      },
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.pax.paid).toBe(20);
    expect(result.pax.foc).toBe(2);
  });

  test('getCellText: cell.v 사용 (\\r\\n 치환)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A2: 'PAX',
      B2: {
        v: 'line1\r\nline2',
      },
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    // PAX text becomes "line1 line2" after \r\n replacement
    // No pax match, but should not error
    expect(result.pax.paid).toBe(0);
  });

  test('getCellValue: numeric value extraction', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({
      A1: '호텔',
      B2: '힐튼호텔',
      I2: 500000,
    });

    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.costs.hotel).toBe(500000);
  });
});

describe('parseQuotation: cost parsing', () => {
  test('견적서: 호텔, 식사, 입장료, 가이드 비용 추출', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({
      A1: '호텔',
      B2: '힐튼호텔',
      I2: 500000,
      A4: '식사비',
      B5: '조식',
      I5: 100000,
      A7: '입장료',
      B8: '관광지',
      I8: 50000,
      A10: '가이드비',
      B11: '가이드',
      I11: 200000,
    });

    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.costs.hotel).toBe(500000);
    expect(result.costs.meals).toBe(100000);
    expect(result.costs.entrance).toBe(50000);
    expect(result.costs.guide).toBe(200000);
  });

  test('견적서: 차량 비용 + 차량 정보 추출', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({
      A1: '차량',
      B2: '45인승 버스',
      E2: 1,
      I2: 300000,
    });

    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.costs.vehicle).toBe(300000);
    expect(result.vehicle.type).toContain('45인승');
    expect(result.vehicle.count).toBe(1);
  });

  test('견적서: 핸드링 + 기타 비용', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({
      A1: '핸드링',
      B2: '핸들링비',
      I2: 80000,
      A3: '기타',
      B4: '기타비용',
      I4: 20000,
    });

    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.costs.handling).toBe(80000);
    expect(result.costs.other).toBe(20000);
  });

  test('견적서: 총경비 명시적 값', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({
      A1: '호텔',
      B2: '호텔명',
      I2: 500000,
      B10: '총경비',
      I10: 1230000,
    });

    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.costs.total).toBe(1230000);
  });

  test('견적서: 1인당 경비 명시적 값', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({
      B1: '1인당 경비',
      I1: 55000,
    });

    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.costs.perPerson).toBe(55000);
  });

  test('견적서: 총경비 없으면 자동 합산', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({
      A1: '호텔',
      B2: '호텔',
      I2: 500000,
      A3: '식사비',
      B4: '식사',
      I4: 100000,
      A5: '입장료',
      B6: '입장',
      I6: 50000,
      A7: '가이드비',
      B8: '가이드',
      I8: 200000,
      A9: '차량',
      B10: '차량',
      I10: 300000,
      A11: '핸드링',
      B12: '핸드링',
      I12: 80000,
    });

    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    };

    const result = parseProductExcel(workbook);
    // total = 500000 + 100000 + 50000 + 200000 + 300000 + 80000 = 1230000
    expect(result.costs.total).toBe(1230000);
  });

  test('견적서: 호텔 정보 추출 (이름, 객실수, 박수)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({
      A1: '호텔',
      B2: '빈펄 리조트&스파',
      E2: 10,
      G2: 3,
      I2: 500000,
    });

    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.hotel.name).toBe('빈펄 리조트&스파');
    expect(result.hotel.rooms).toBe(10);
    expect(result.hotel.nights).toBe(3);
  });

  test('견적서: 옵션(옵션) 카테고리 비용', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({
      A1: '옵션',
      B2: '투어비',
      I2: 150000,
    });

    const workbook = {
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.costs.options).toBe(150000);
  });
});

describe('parseConfirmation: itinerary parsing', () => {
  test('확정서: 일차별 일정 파싱', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A15: '일자',
      A16: '1일차',
      E16: '인천출발',
      A17: '2일차',
      E17: '호치민도착',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.itinerary.length).toBe(2);
    expect(result.itinerary[0].day).toBe(1);
    expect(result.itinerary[1].day).toBe(2);
  });

  test('확정서: 호텔 정보 (HOTEL: 패턴)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A15: '일자',
      A16: '1일차',
      E16: 'HOTEL: 빈펄 리조트&스파 나트랑베이 디럭스룸',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.hotel.name).toBe('빈펄 리조트&스파 나트랑베이');
    expect(result.hotel.roomType).toBe('디럭스룸');
  });

  test('확정서: 호텔 정보 (룸타입 없음)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A15: '일자',
      A16: '1일차',
      E16: 'HOTEL: 그랜드하얏트',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.hotel.name).toBe('그랜드하얏트');
    expect(result.hotel.roomType).toBe('');
  });

  test('확정서: 차량 정보 (일정에서 인승 패턴)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A15: '일자',
      A16: '1일차',
      E16: '버스타고',
      F16: '45인승',
      G16: '출발',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.vehicle.type).toBe('45인승');
    expect(result.vehicle.count).toBe(1);
  });

  test('확정서: 차량 정보 (포함사항에서)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A6: '포함사항',
      B6: '▣25인승',
      A15: '일자',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.vehicle.type).toBe('25인승');
    expect(result.vehicle.count).toBe(1);
  });

  test('확정서: 객실수 계산 (roomConfig에서)', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A2: 'PAX',
      B2: '25+0 [TWN 5, SGL 2]',
      A15: '일자',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.hotel.rooms).toBe(7); // 5 + 2
  });

  test('확정서: 호텔 박수 = duration - 1', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A2: 'PAX',
      B2: '10+1 [TWN 5]',
      G2: '2026.03.20~03.24',
      A15: '일자',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.duration).toBe(5);
    expect(result.hotel.nights).toBe(4); // 5 - 1
  });
});

describe('normalizeText: whitespace and ▣ removal', () => {
  test('정규화: 공백 제거', () => {
    const mainSheet = makeSheet({
      A1: '제목',
      A2: '  포  함  사  항  ',
      B2: '▣숙박',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.inclusions).toBe('숙박');
  });

  test('정규화: ▣ 제거 (normalizeText는 colA에만 적용)', () => {
    // Note: normalizeText() is applied to colA only for keyword matching
    // The ▣ in colB values are stripped by replace(/^▣\s*/, '') during inclusion parsing
    const mainSheet = makeSheet({
      A1: '제목',
      A6: '포함사항',
      B6: '▣숙박',
      B7: '▣식사',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.inclusions).toBe('숙박, 식사');
  });
});

describe('Edge cases', () => {
  test('빈 시트 처리', () => {
    const emptySheet = makeSheet({});
    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': emptySheet },
    };

    const result = parseProductExcel(workbook);
    expect(result.type).toBe('confirmation');
    expect(result.destination).toBe('');
    expect(result.pax.total).toBe(0);
  });

  test('기본값 대조: quotation vs confirmation', () => {
    const mainSheet = makeSheet({
      A1: '제목',
    });
    const detailSheet = makeSheet({});

    const quotation = parseProductExcel({
      SheetNames: ['표지', '세부일정'],
      Sheets: { '표지': mainSheet, '세부일정': detailSheet },
    });

    const confirmation = parseProductExcel({
      SheetNames: ['표지'],
      Sheets: { '표지': mainSheet },
    });

    expect(quotation.type).toBe('quotation');
    expect(confirmation.type).toBe('confirmation');
    expect(quotation.itinerary).toBeUndefined();
    expect(confirmation.itinerary).toBeDefined();
    expect(Array.isArray(confirmation.itinerary)).toBe(true);
  });

  test('DATE 필드 감지', () => {
    const mainSheet = makeSheet({
      A1: 'DATE 2026.03.15',
    });

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: { 'Sheet1': mainSheet },
    };

    const result = parseProductExcel(workbook);
    expect(result).toBeDefined();
  });
});
