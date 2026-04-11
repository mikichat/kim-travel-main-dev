// js/modules/excelParser.js - 견적서/확정서 엑셀 자동 파싱 모듈

if (typeof XLSX === 'undefined') {
  console.error(
    'XLSX 라이브러리가 로드되지 않았습니다. xlsx.full.min.js를 먼저 로드하세요.'
  );
}

/**
 * 엑셀 워크북을 파싱하여 상품 데이터 추출
 * @param {Object} workbook - XLSX.read()로 읽은 워크북 객체
 * @returns {Object} 파싱된 상품 데이터
 */
export function parseProductExcel(workbook) {
  const sheetNames = workbook.SheetNames;
  const hasDetailSheet = sheetNames.some((name) => name.includes('세부'));

  if (hasDetailSheet) {
    return parseQuotation(workbook);
  } else {
    return parseConfirmation(workbook);
  }
}

// ==================== 헬퍼 함수 ====================

function getCellValue(sheet, cellRef) {
  const cell = sheet[cellRef];
  if (!cell) return '';
  return cell.v !== undefined ? cell.v : '';
}

function getCellText(sheet, cellRef) {
  const cell = sheet[cellRef];
  if (!cell) return '';
  if (cell.w) return cell.w.trim();
  if (cell.v !== undefined) return String(cell.v).replace(/\r\n/g, ' ').trim();
  return '';
}

function getRowText(sheet, row, startCol, endCol) {
  const parts = [];
  for (let c = startCol; c <= endCol; c++) {
    const colLetter = XLSX.utils.encode_col(c);
    const text = getCellText(sheet, `${colLetter}${row}`);
    if (text) parts.push(text);
  }
  return parts.join(' ').trim();
}

/** 공백 제거 후 키워드 비교 */
function normalizeText(text) {
  return text.replace(/\s+/g, '').replace(/▣/g, '').trim();
}

// ==================== 메타데이터 파싱 (스캔 방식) ====================

function parseMetadata(sheet) {
  const meta = {
    destination: '',
    documentDate: '',
    pax: { total: 0, paid: 0, foc: 0 },
    roomConfig: '',
    travelDates: { from: '', to: '' },
    duration: 0,
    groupName: '',
    guide: { name: '', phone: '' },
    inclusions: '',
  };

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const maxScanRow = Math.min(range.e.r + 1, 25); // Row 1~25 스캔

  for (let r = 1; r <= maxScanRow; r++) {
    const colA = getCellText(sheet, `A${r}`);
    const colB = getCellText(sheet, `B${r}`);
    const colG = getCellText(sheet, `G${r}`);
    const normalA = normalizeText(colA);

    // ★ 목적지 감지
    if (colA.includes('★')) {
      let dest = colA.replace(/★/g, '').trim();
      // "베트남_호치민&무이네 3박5일 제안서" → "호치민&무이네"
      dest = dest
        .replace(/\d+박\d+일/g, '')
        .replace(/제안서|확정서|일정표/g, '')
        .trim();
      // "베트남_호치민&무이네" → 언더스코어 뒤
      if (dest.includes('_')) {
        dest = dest.split('_').slice(1).join('_');
      }
      meta.destination = dest.trim();
      continue;
    }

    // DATE 감지
    if (colA.toUpperCase().startsWith('DATE')) {
      meta.documentDate = colA;
      continue;
    }

    // PAX 감지
    if (normalA === 'PAX') {
      // B열에 PAX + 객실 (줄바꿈 있을 수 있음)
      const paxText = colB;
      const paxMatch = paxText.match(/(\d+)\s*\+\s*(\d+)/);
      if (paxMatch) {
        meta.pax.paid = parseInt(paxMatch[1]);
        meta.pax.foc = parseInt(paxMatch[2]);
        meta.pax.total = meta.pax.paid + meta.pax.foc;
      }
      const roomMatch = paxText.match(/\[(.+?)\]/);
      if (roomMatch) {
        meta.roomConfig = roomMatch[1].trim();
      }

      // 같은 행 G열에 여행기간
      if (colG) {
        parseTravelDates(colG, meta);
      }
      continue;
    }

    // 여행기간 별도 행
    if (normalA.includes('여행기간') && colG) {
      parseTravelDates(colG, meta);
      continue;
    }

    // 피켓명 / 단체명
    if (normalA.includes('피켓') || normalA.includes('단체명')) {
      meta.groupName = colB.replace(/^▣\s*/, '').replace(/~+$/, '').trim();
      continue;
    }

    // 가이드
    if (normalA.includes('가이드')) {
      const guideText = colB.replace(/^▣\s*/, '').trim();
      const phoneMatch = guideText.match(/(\+\d[\d\s-]+)/);
      if (phoneMatch) {
        meta.guide.phone = phoneMatch[1].replace(/\s+/g, '');
        meta.guide.name = guideText
          .replace(phoneMatch[0], '')
          .replace(/부장|과장|대리|사원|소장|실장/g, '')
          .trim();
      } else {
        meta.guide.name = guideText;
      }
      continue;
    }

    // 포함사항 시작 (불포함사항 제외)
    if (
      (normalA.includes('포함사항') || normalA === '포함') &&
      !normalA.includes('불포함')
    ) {
      const inclusionParts = [];
      const firstLine = colB.replace(/^▣\s*/, '').trim();
      if (firstLine) inclusionParts.push(firstLine);

      // 뒤따르는 행에서 ▣로 시작하는 라인 수집 (불포함사항 만나면 중단)
      for (let nr = r + 1; nr <= maxScanRow; nr++) {
        const nextA = normalizeText(getCellText(sheet, `A${nr}`));
        const nextB = getCellText(sheet, `B${nr}`);
        if (
          nextA.includes('불포함') ||
          nextA.includes('쇼핑') ||
          nextA.includes('추천옵션') ||
          nextA.includes('REMARK')
        )
          break;
        if (nextA && !nextB) break; // A에 새 카테고리 키워드가 있는데 B가 비어있으면 중단
        if (nextB) inclusionParts.push(nextB.replace(/^▣\s*/, '').trim());
      }
      meta.inclusions = inclusionParts.join(', ');
      continue;
    }
  }

  // 여행 기간 계산
  if (meta.travelDates.from && meta.travelDates.to) {
    const from = new Date(meta.travelDates.from);
    const to = new Date(meta.travelDates.to);
    meta.duration = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
  }

  return meta;
}

function parseTravelDates(text, meta) {
  // "2026.04.20~04.24" 형식
  let match = text.match(/(\d{4})\.(\d{2})\.(\d{2})\s*~\s*(\d{2})\.(\d{2})/);
  if (match) {
    meta.travelDates.from = `${match[1]}-${match[2]}-${match[3]}`;
    meta.travelDates.to = `${match[1]}-${match[4]}-${match[5]}`;
    return;
  }
  // "2026.04.20~2026.04.24" 형식
  match = text.match(
    /(\d{4})\.(\d{2})\.(\d{2})\s*~\s*(\d{4})\.(\d{2})\.(\d{2})/
  );
  if (match) {
    meta.travelDates.from = `${match[1]}-${match[2]}-${match[3]}`;
    meta.travelDates.to = `${match[4]}-${match[5]}-${match[6]}`;
  }
}

// ==================== 견적서 파싱 ====================

function parseQuotation(workbook) {
  const mainSheet = workbook.Sheets[workbook.SheetNames[0]];
  const meta = parseMetadata(mainSheet);

  const detailSheetName = workbook.SheetNames.find((name) =>
    name.includes('세부')
  );
  const costs = {
    hotel: 0,
    meals: 0,
    entrance: 0,
    options: 0,
    guide: 0,
    vehicle: 0,
    other: 0,
    handling: 0,
    total: 0,
    perPerson: 0,
  };
  const hotelInfo = { name: '', roomType: '', rooms: 0, nights: 0 };
  const vehicleInfo = { type: '', count: 0 };

  if (detailSheetName) {
    const ds = workbook.Sheets[detailSheetName];
    const range = XLSX.utils.decode_range(ds['!ref'] || 'A1');
    let currentCategory = '';

    for (let r = range.s.r; r <= range.e.r; r++) {
      const rowNum = r + 1;
      const colA = normalizeText(getCellText(ds, `A${rowNum}`)).toLowerCase();
      const colB = getCellText(ds, `B${rowNum}`);
      const colC = getCellText(ds, `C${rowNum}`);
      const colI = getCellValue(ds, `I${rowNum}`);

      // 카테고리 마커 감지 (A열에 키워드가 있는 행)
      if (colA.includes('호텔') && !colA.includes('합계')) {
        currentCategory = 'hotel';
      } else if (colA.includes('식사') || colA.includes('식비')) {
        currentCategory = 'meals';
      } else if (colA.includes('입장료') || colA.includes('기본')) {
        currentCategory = 'entrance';
      } else if (colA.includes('옵션')) {
        currentCategory = 'options';
      } else if (colA.includes('가이드')) {
        currentCategory = 'guide';
      } else if (colA.includes('차량') || colA.includes('기사')) {
        currentCategory = 'vehicle';
      } else if (colA.includes('핸드링') || colA.includes('핸들링')) {
        currentCategory = 'handling';
      } else if (colA.includes('기타') && !colB.includes('합계')) {
        currentCategory = 'other';
      }

      // 총경비 / 1인당 경비
      const normalB = normalizeText(colB).toLowerCase();
      if (normalB.includes('총경비')) {
        if (typeof colI === 'number') costs.total = colI;
        continue;
      }
      if (normalB.includes('1인당') || normalB.includes('인당경비')) {
        if (typeof colI === 'number') costs.perPerson = colI;
        continue;
      }

      // 합계/소계 행은 건너뛰기 (개별 항목으로 합산)
      if (normalB.includes('합계') || (!colB && !colC)) {
        continue;
      }

      // 카테고리별 개별 비용 합산
      const amount = typeof colI === 'number' ? colI : 0;
      if (currentCategory && amount > 0) {
        costs[currentCategory] = (costs[currentCategory] || 0) + amount;
      }

      // 호텔 상세 정보 (합계가 아닌 개별 행)
      if (currentCategory === 'hotel' && colB && !normalB.includes('합계')) {
        if (!hotelInfo.name) hotelInfo.name = colB;
        const colE = getCellValue(ds, `E${rowNum}`);
        const colG = getCellValue(ds, `G${rowNum}`);
        if (typeof colE === 'number' && colE > 0 && !hotelInfo.rooms)
          hotelInfo.rooms = colE;
        if (typeof colG === 'number' && colG > 0) hotelInfo.nights += colG;
      }

      // 차량 상세 정보
      if (currentCategory === 'vehicle' && colB && !normalB.includes('합계')) {
        const vMatch = colB.match(/(\d+인승)/);
        if (vMatch && !vehicleInfo.type) {
          vehicleInfo.type = vMatch[0] + ' 차량';
          const colE = getCellValue(ds, `E${rowNum}`);
          if (typeof colE === 'number' && colE > 0) vehicleInfo.count = colE;
        }
      }
    }

    // 총경비 없으면 합산
    if (!costs.total) {
      costs.total =
        costs.hotel +
        costs.meals +
        costs.entrance +
        costs.options +
        costs.guide +
        costs.vehicle +
        costs.other +
        costs.handling;
    }
  }

  return {
    type: 'quotation',
    destination: meta.destination,
    travelDates: meta.travelDates,
    duration: meta.duration,
    pax: meta.pax,
    roomConfig: meta.roomConfig,
    groupName: meta.groupName,
    guide: meta.guide,
    hotel: hotelInfo,
    vehicle: vehicleInfo,
    inclusions: meta.inclusions,
    costs,
  };
}

// ==================== 확정서 파싱 ====================

function parseConfirmation(workbook) {
  const mainSheet = workbook.Sheets[workbook.SheetNames[0]];
  const meta = parseMetadata(mainSheet);

  const itinerary = [];
  const hotelInfo = { name: '', roomType: '', rooms: 0, nights: 0 };
  const vehicleInfo = { type: '', count: 0 };

  // 일정표 시작점 찾기 (A열에 "일자"가 있는 행)
  const range = XLSX.utils.decode_range(mainSheet['!ref'] || 'A1');
  let scheduleStart = 20;
  for (let r = 15; r <= 25; r++) {
    if (normalizeText(getCellText(mainSheet, `A${r}`)).includes('일자')) {
      scheduleStart = r + 1;
      break;
    }
  }

  for (let r = scheduleStart; r <= range.e.r + 1; r++) {
    const colA = getCellText(mainSheet, `A${r}`);
    const colE = getCellText(mainSheet, `E${r}`);
    const fullRow = getRowText(mainSheet, r, 0, 9);

    if (!fullRow) continue;

    // 일자 패턴: "1일차", "2일차 02/20 (금)" 등
    const dayMatch = colA.match(/(\d+)\s*일차/);
    if (dayMatch) {
      itinerary.push({
        day: parseInt(dayMatch[1]),
        content: getRowText(mainSheet, r, 4, 9), // E~I열
      });
    }

    // HOTEL 패턴 (E열에서 주로 발견)
    const hotelPattern =
      colE.match(/HOTEL\s*[:：]\s*(.+)/i) ||
      fullRow.match(/HOTEL\s*[:：]\s*(.+?)(?:\s{3,}|$)/i);
    if (hotelPattern && !hotelInfo.name) {
      const hotelStr = hotelPattern[1].trim();
      // "빈펄 리조트&스파 나트랑베이 디럭스룸" → 호텔명 + 객실타입 분리
      const rtMatch = hotelStr.match(
        /(디럭스|슈페리어|스탠다드|스위트|프리미어|트윈|더블|싱글)/i
      );
      if (rtMatch) {
        hotelInfo.roomType = hotelStr
          .substring(hotelStr.indexOf(rtMatch[0]))
          .trim();
        hotelInfo.name = hotelStr
          .substring(0, hotelStr.indexOf(rtMatch[0]))
          .trim();
      } else {
        hotelInfo.name = hotelStr;
      }
    }

    // 차량 정보 (포함사항이나 일정에서 추출)
    const vMatch = fullRow.match(/(\d+인승)/);
    if (vMatch && !vehicleInfo.type) {
      vehicleInfo.type = vMatch[0];
      vehicleInfo.count = 1;
    }
  }

  // 포함사항에서도 차량 추출
  if (!vehicleInfo.type && meta.inclusions) {
    const vMatch = meta.inclusions.match(/(\d+인승)/);
    if (vMatch) {
      vehicleInfo.type = vMatch[0];
      vehicleInfo.count = 1;
    }
  }

  // 호텔 박수
  if (meta.duration > 0) {
    hotelInfo.nights = meta.duration - 1;
  }
  // 객실수 = roomConfig에서 추출
  if (meta.roomConfig) {
    const nums = meta.roomConfig.match(/(\d+)/g);
    if (nums) hotelInfo.rooms = nums.reduce((s, n) => s + parseInt(n), 0);
  }

  return {
    type: 'confirmation',
    destination: meta.destination,
    travelDates: meta.travelDates,
    duration: meta.duration,
    pax: meta.pax,
    roomConfig: meta.roomConfig,
    groupName: meta.groupName,
    guide: meta.guide,
    hotel: hotelInfo,
    vehicle: vehicleInfo,
    inclusions: meta.inclusions,
    itinerary,
  };
}

// ==================== DB 매핑 ====================

export function mapToProductData(parsed) {
  const descParts = [];
  if (parsed.groupName) descParts.push(`단체: ${parsed.groupName}`);
  if (parsed.travelDates.from)
    descParts.push(
      `기간: ${parsed.travelDates.from} ~ ${parsed.travelDates.to}`
    );
  if (parsed.pax.total)
    descParts.push(
      `인원: ${parsed.pax.total}명 (${parsed.pax.paid}+${parsed.pax.foc})`
    );
  if (parsed.roomConfig) descParts.push(`객실: ${parsed.roomConfig}`);
  descParts.push(parsed.type === 'quotation' ? '[견적서]' : '[확정서]');

  return {
    name:
      parsed.groupName ||
      `${parsed.destination} ${parsed.travelDates.from || ''}`.trim(),
    destination: parsed.destination,
    duration: parsed.duration || 0,
    price: parsed.costs ? Math.round(parsed.costs.perPerson) : 0,
    status: '활성',
    description: descParts.join(' | '),

    hotel_name: parsed.hotel.name || '',
    hotel_room_type: parsed.hotel.roomType || '',
    hotel_rooms: parsed.hotel.rooms || 0,
    hotel_checkin: parsed.travelDates.from || '',
    hotel_checkout: parsed.travelDates.to || '',
    hotel_note: '',

    vehicle_type: parsed.vehicle.type || '',
    vehicle_count: parsed.vehicle.count || 0,
    vehicle_company: '',
    vehicle_note: '',

    guide_name: parsed.guide.name || '',
    guide_phone: parsed.guide.phone || '',
    guide_language: '',
    guide_note: '',

    procurement_hotel: !!parsed.hotel.name,
    procurement_vehicle: !!parsed.vehicle.type,
    procurement_guide: !!parsed.guide.name,
    procurement_flight: false,
    procurement_visa: false,
    procurement_insurance: false,
    procurement_status:
      parsed.type === 'confirmation' ? 'in_progress' : 'pending',
    procurement_note: parsed.inclusions || '',

    flight_id: '',
    airline: '',
    outbound_flight: '',
    return_flight: '',
    flight_note: '',
  };
}

// CJS export (테스트용)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseProductExcel, mapToProductData };
}
