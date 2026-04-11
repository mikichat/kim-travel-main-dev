const { showToast, showPromptModal } = window;
import { sanitizeHtml } from '../../js/modules/ui.js';
import { StorageManager } from './storage-manager.js';
// eslint-disable-next-line no-unused-vars
import { loadSavedFlights } from './saved-flights.js';
const { getAirlineNameFromFlightNumber } = window;

// 항공편 자동 변환기 JavaScript

// 공항 데이터 저장 변수
let airportData = {};
let airportCodeMap = {};

// 파싱된 항공편 데이터 저장 (저장 기능을 위해 전역 변수로 선언)
let parsedFlights = [];

// 파싱된 승객 목록 저장 (전체 승객 정보 저장을 위해)
let parsedPassengers = [];

// 현재 예약 유형 (auto-detected)
let currentBookingType = 'individual'; // 'group' | 'individual'

// 공항코드/도시명 토글 상태 (localStorage에서 복원)
function isAirportCodeMode() {
  const toggle = document.getElementById('airportCodeToggle');
  return toggle ? toggle.checked : false;
}

// 토글 초기화
function initAirportCodeToggle() {
  const toggle = document.getElementById('airportCodeToggle');
  if (!toggle) return;
  // localStorage에서 복원
  const saved = localStorage.getItem('air1_airport_code_mode');
  if (saved === 'true') {
    toggle.checked = true;
  }
  toggle.addEventListener('change', () => {
    localStorage.setItem('air1_airport_code_mode', toggle.checked);
    // 이미 변환 결과가 있으면 재변환
    const outputSection = document.getElementById('outputSection');
    if (outputSection && !outputSection.classList.contains('hidden')) {
      handleConvert();
    }
  });
}

// 단체/개인 자동 감지
function detectBookingType(inputText) {
  // 패턴 1: 1.C/ 로 시작 = 단체 (회사명)
  if (/(?:^|\n)\s*1\.C\//m.test(inputText)) {
    return 'group';
  }
  // 패턴 2: HK 뒤의 숫자가 10 이상이면 단체
  const hkMatch = inputText.match(/HK(\d+)/);
  if (hkMatch && parseInt(hkMatch[1]) >= 10) {
    return 'group';
  }
  // 패턴 3: 승객 수가 5명 이상이면 단체
  const passengerCount = (inputText.match(/\d+\.\d*[A-Z]/g) || []).length;
  if (passengerCount >= 5) {
    return 'group';
  }
  return 'individual';
}

// 배지 UI 업데이트
function updateBookingTypeBadge(type) {
  const badge = document.getElementById('bookingTypeBadge');
  if (!badge) return;
  currentBookingType = type;
  if (type === 'group') {
    badge.textContent = '단체';
    badge.className = 'booking-type-badge badge-group';
  } else {
    badge.textContent = '개인';
    badge.className = 'booking-type-badge badge-individual';
  }
}

// 단체/개인에 따라 UI 옵션 자동 설정
function applyBookingTypeDefaults(type, passengerCount) {
  const showAllPassengers = document.getElementById('showAllPassengers');
  if (type === 'group') {
    // 단체: 전체 승객 명단 체크, 미팅 장소 체크
    if (showAllPassengers) showAllPassengers.checked = true;
    const showMeetingPlace = document.getElementById('showMeetingPlace');
    if (showMeetingPlace) {
      showMeetingPlace.checked = true;
      const wrapper = document.getElementById('meetingPlaceWrapper');
      if (wrapper) wrapper.classList.remove('hidden');
    }
  } else if (passengerCount > 1) {
    // 개인이어도 2명 이상이면 승객 명단 자동 체크
    if (showAllPassengers) showAllPassengers.checked = true;
  }
}

// JSON 파일에서 공항 데이터 로드
async function loadAirportData() {
  try {
    const response = await fetch('./world_airports_by_region.json');
    if (!response.ok) throw new Error('공항 데이터 로드 실패');
    airportData = await response.json();

    // 공항 코드를 키로 하는 맵 생성 (빠른 조회를 위해)
    airportCodeMap = {};
    for (const region in airportData) {
      airportData[region].forEach((airport) => {
        // 도시명을 우선 사용 (예: 광저우, 나트랑)
        airportCodeMap[airport['공항코드']] = airport['도시'];
      });
    }
  } catch (error) {
    console.error('공항 데이터 로드 실패:', error);
    // 로드 실패 시 기본 데이터 사용
  }
}

// 페이지 로드 시 초기화
loadAirportData();
document.addEventListener('DOMContentLoaded', () => {
  initAirportCodeToggle();
});

// 날짜 변환 함수 (예: 14NOV -> 2026.11.14(금))
function convertDate(dateStr) {
  const monthMap = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10',
    NOV: '11',
    DEC: '12',
  };

  const dayOfWeekMap = ['일', '월', '화', '수', '목', '금', '토'];

  // dateStr 형식: 14NOV
  const day = dateStr.substring(0, 2);
  const monthStr = dateStr.substring(2, 5);
  const month = monthMap[monthStr];

  // 현재 날짜 정보
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정하여 정확한 날짜 비교
  const currentYear = today.getFullYear();

  // 일단 올해 날짜로 생성
  let year = currentYear;
  let date = new Date(`${year}-${month}-${day}`);
  date.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정

  // 생성된 날짜가 오늘 이하(과거 또는 오늘)이면 다음 연도로 설정
  if (date <= today) {
    year = currentYear + 1;
    date = new Date(`${year}-${month}-${day}`);
  }

  const dayOfWeek = dayOfWeekMap[date.getDay()];

  return `${year}.${month}.${day}(${dayOfWeek})`;
}

// 시간 변환 함수 (예: 0820 -> 08:20)
function convertTime(timeStr) {
  if (!timeStr || timeStr.length !== 4) return timeStr;
  return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
}

// 공항 코드를 한글 또는 코드로 변환 (토글 상태에 따라)
window.getAirportName = getAirportName;
function getAirportName(code) {
  // 공항코드 모드이면 코드 그대로 반환
  if (isAirportCodeMode()) {
    return code;
  }

  // 실무 우선 매핑 (JSON보다 우선)
  const overrideMap = {
    ICN: '인천',
    GMP: '김포',
  };
  if (overrideMap[code]) return overrideMap[code];

  // JSON 데이터가 로드되었으면 사용
  if (airportCodeMap[code]) {
    return airportCodeMap[code];
  }

  // 백업용 기본 데이터
  const airportMap = {
    ICN: '인천',
    CAN: '광저우',
    PVG: '상하이',
    PEK: '베이징',
    NRT: '나리타',
    HND: '하네다',
    KIX: '간사이',
    BKK: '방콕',
    SIN: '싱가포르',
    HKG: '홍콩',
    TPE: '타이페이',
    SEL: '서울',
    GMP: '김포',
    MNL: '마닐라',
    CRK: '클라크',
  };
  return airportMap[code] || code;
}

// 터미널 정보 가져오기 (향후 확장용)
// eslint-disable-next-line no-unused-vars
function getTerminalInfo(airportCode) {
  const terminalMap = {
    ICN: '터미널 1',
    CAN: '터미널 2',
    PVG: '터미널 2',
    PEK: '터미널 3',
    NRT: '터미널 1',
    KIX: '터미널 1',
    BKK: '터미널 1',
  };
  return terminalMap[airportCode] || '';
}

// 항공편 정보 파싱 및 변환
function parseFlightInfo(line) {
  // 다섯 가지 형식 지원:
  // 형식1: "1 OZ 369T 14NOV 5 ICNCAN HK6 0820 1130 HRS"
  // 형식2: "1  KE 711 U 03FEB 2 ICNNRT DK9  1325 1555  03FEB  E  0 73J L"
  // 형식3: "2 QV 923K 14DEC 7 VTEICN SS1  2350  0705   15DEC 1 /DCQV /E"
  // 형식4: "1 7C1301M 17JAN 6 ICNKIX SS1  0700  0900  /DC7C /E" (항공편명이 붙어있는 경우)
  // 형식5: "1 KE123 25MAR ICNNRT HK1 0900 1200" (요일 없이 7개 파트, 간소화 형식)

  const parts = line.split(/\s+/).filter(Boolean);

  // 형식5 체크: 7개 파트, 요일 정보 없는 간소화 형식
  // 패턴: 번호 항공편 날짜 경로 상태 출발시간 도착시간
  if (parts.length === 7) {
    // parts[2]가 날짜(예: 25MAR)이고 parts[3]가 경로(예: ICNNRT)인지 확인
    const isDate = /^\d{2}[A-Z]{3}$/.test(parts[2]);
    const isRoute = /^[A-Z]{6}$/.test(parts[3]);

    if (isDate && isRoute) {
      let flightNumber = parts[1];

      // 항공사 코드와 번호 분리 (예: KE123 -> KE 123)
      const match = flightNumber.match(/^([A-Z0-9]{2})(\d+)[A-Z]?$/);
      if (match) {
        flightNumber = match[1] + ' ' + match[2];
      }

      return {
        flightNumber,
        date: parts[2],
        departure: parts[3].substring(0, 3),
        arrival: parts[3].substring(3, 6),
        departureTime: parts[5],
        arrivalTime: parts[6],
        arrivalDate: null,
      };
    }
  }

  if (parts.length < 8) {
    return null;
  }

  let flightNumber, dateIndex, routeIndex, departureTimeIndex, arrivalTimeIndex;
  let arrivalDate = null; // 도착일 정보 (있는 경우만)

  // 형식4: parts[2]가 날짜인 경우 (항공편명이 하나로 붙어있음)
  if (/^\d{2}[A-Z]{3}$/.test(parts[2])) {
    // 형식4: "1 7C1301M 17JAN 6 ICNKIX SS1  0700  0900  /DC7C /E"
    flightNumber = parts[1]; // 7C1301M

    // 항공사 코드와 번호 분리 (예: 7C1301M -> 7C 1301)
    // 2글자 항공사 코드 + 숫자 형태를 찾음
    const match = flightNumber.match(/^([A-Z0-9]{2})(\d+)[A-Z]?$/);
    if (match) {
      flightNumber = match[1] + ' ' + match[2]; // 7C 1301
    }

    dateIndex = 2;
    routeIndex = 4;
    departureTimeIndex = 6;
    arrivalTimeIndex = 7;

    // 도착일 확인
    if (parts.length > 8 && /^\d{2}[A-Z]{3}$/.test(parts[8])) {
      arrivalDate = parts[8];
    }
  }
  // 형식1 또는 형식2/형식3: parts[3]을 확인
  else if (/^\d{2}[A-Z]{3}$/.test(parts[3])) {
    // 형식1: "1 OZ 369T 14NOV 5 ICNCAN HK6 0820 1130 HRS"
    flightNumber = parts[1] + ' ' + parts[2]; // OZ 369T

    // 항공편명에서 클래스 코드 제거 (예: OZ 112Q -> OZ 112)
    flightNumber = flightNumber.replace(/(\d+)[A-Z]$/, '$1');

    dateIndex = 3;
    routeIndex = 5;
    departureTimeIndex = 7;
    arrivalTimeIndex = 8;

    // 도착일 확인
    if (parts.length > 9 && /^\d{2}[A-Z]{3}$/.test(parts[9])) {
      arrivalDate = parts[9];
    }
  } else {
    // 형식2: "1  KE 711 U 03FEB 2 ICNNRT DK9  1325 1555  03FEB  E  0 73J L"
    flightNumber = parts[1] + ' ' + parts[2]; // KE 711

    dateIndex = 4;
    routeIndex = 6;
    departureTimeIndex = 8;
    arrivalTimeIndex = 9;

    // 도착일 확인
    if (parts.length > 10 && /^\d{2}[A-Z]{3}$/.test(parts[10])) {
      arrivalDate = parts[10];
    }
  }

  const date = parts[dateIndex];
  const route = parts[routeIndex];
  const departure = route.substring(0, 3);
  const arrival = route.substring(3, 6);
  const departureTime = parts[departureTimeIndex];
  const arrivalTime = parts[arrivalTimeIndex];

  return {
    flightNumber,
    date,
    departure,
    arrival,
    departureTime,
    arrivalTime,
    arrivalDate,
  };
}

// ========================================
// 승객 이름 파싱 함수 (Phase 1.1)
// ========================================

/**
 * 승객 이름에서 호칭(MR/MS/MSTR/MISS) 제거
 * @param {string} name - 원본 이름 (예: "KIM/YONGKUMR", "박/영근", "권/형수 MR")
 * @returns {string} - 호칭이 제거된 이름
 */
function cleanPassengerName(name) {
  // 호칭(MR, MS, MSTR, MISS) 제거 - 끝에 붙어있거나 띄어쓰기로 분리된 경우 모두 처리
  // 예: "KIM/YONGKUMR" -> "KIM/YONGKU"
  // 예: "권/형수 MR" -> "권/형수"
  return name.replace(/\s*(MR|MS|MSTR|MISS)\s*$/i, '').trim();
}

// 호칭 추출 (MR/MS/MISS/MSTR)
function extractTitle(name) {
  const match = name.match(/(MR|MS|MSTR|MISS)\s*$/i);
  return match ? match[1].toUpperCase() : '';
}

/**
 * 입력 텍스트에서 승객 이름 파싱
 * 지원 형식:
 * - 형식 1: "1.KIM/YONGKUMR" (영문 붙임)
 * - 형식 2: "1.1SO/JAEWANMR" (숫자.숫자+이름)
 * - 형식 3: "1.박/영근" (한글)
 * - 형식 4: "1.권/형수 MR" (한글+호칭 띄어쓰기)
 *
 * @param {string} inputText - 전체 입력 텍스트
 * @returns {Array} - 파싱된 이름 배열 [{index: 1, name: "KIM/YONGKU"}, ...]
 */
function parsePassengerNames(inputText) {
  const names = [];
  const isGroup = currentBookingType === 'group';

  // 패턴 1: 영문 이름 (기존)
  // 예: 1.KIM/YONGKUMR, 1.1LEE/HEERYANGMR
  const englishRegex = /(\d+)\.(\d*[A-Z][A-Z/]+[A-Z]*)/g;

  // 패턴 2: 한글 이름 (슬래시 포함)
  // 예: 1.박/영근, 1.권/형수 MR
  // 번호 누락 허용: " .소/옥란" → 1번으로 처리 (아바쿠스 GDS 복사 시 잘림)
  const koreanRegex =
    /(\d*)\.([\uAC00-\uD7AF]+\/[\uAC00-\uD7AF]+(?:\s*(?:MR|MS|MSTR|MISS))?)/gi;

  let match;

  // 영문 이름 파싱
  while ((match = englishRegex.exec(inputText)) !== null) {
    let fullName = match[2];
    const idx = parseInt(match[1]);

    // 단체 모드: 1번은 회사명 (C/OZ/22CTW/IN 등) → 건너뛰기
    if (isGroup && idx === 1 && /^C\//.test(fullName)) {
      continue;
    }

    // 형식 2의 경우 앞의 숫자 제거 (예: 1SO -> SO)
    fullName = fullName.replace(/^\d+/, '');

    const title = extractTitle(fullName);
    names.push({
      index: idx,
      name: cleanPassengerName(fullName),
      title: title,
    });
  }

  // 한글 이름 파싱
  let koreanIndex = 0;
  while ((match = koreanRegex.exec(inputText)) !== null) {
    const fullName = match[2];
    const title = extractTitle(fullName);
    // 번호가 없으면 (아바쿠스 잘림) 순서대로 번호 부여
    const idx = match[1] ? parseInt(match[1]) : (++koreanIndex);
    if (match[1]) koreanIndex = parseInt(match[1]);

    names.push({
      index: idx,
      name: cleanPassengerName(fullName),
      title: title,
    });
  }

  // 중복 제거 (같은 인덱스가 있으면 첫 번째 것만 유지)
  const uniqueNames = [];
  const seenIndices = new Set();
  for (const item of names) {
    if (!seenIndices.has(item.index)) {
      seenIndices.add(item.index);
      uniqueNames.push(item);
    }
  }

  // 승객 번호 순서대로 정렬
  return uniqueNames.sort((a, b) => a.index - b.index);
}

// 변환 처리
function handleConvert() {
  const input = document.getElementById('inputText').value.trim();

  if (!input) {
    showToast('항공편 정보를 입력해주세요.', 'warning');
    return;
  }

  const lines = input.split(/\n/).filter((l) => l.trim() !== '');

  if (lines.length < 1) {
    showToast('항공편 정보를 입력해주세요.', 'warning');
    return;
  }

  // ========================================
  // 단체/개인 자동 감지
  // ========================================
  const detectedType = detectBookingType(input);
  updateBookingTypeBadge(detectedType);
  // applyBookingTypeDefaults는 승객 파싱 후 호출

  // ========================================
  // PNR 자동 추출 (다중 PNR 지원)
  // ========================================
  const allPnrs = new Set();

  // 형식 1: 독립된 6자리 PNR 라인 (예: "FWJGD2")
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const pnrMatch = line.match(/^([A-Z0-9]{5,6})$/);
    if (pnrMatch && !/^\d+$/.test(line)) {
      allPnrs.add(pnrMatch[1].toUpperCase());
      lines.splice(i, 1); // PNR 줄 제거
    }
  }

  // 형식 2: < PNR - XXXXXX >
  const pnrBracketMatches = input.matchAll(/<\s*PNR\s*-\s*([A-Z0-9]{6})\s*>/gi);
  for (const m of pnrBracketMatches) allPnrs.add(m[1].toUpperCase());

  // 형식 3: 항공사/PNR (예: KE/FWJGD2)
  const airlinePnrMatches = input.matchAll(/\s[A-Z]{2}\/([A-Z0-9]{5,6})(?:\s|$)/g);
  for (const m of airlinePnrMatches) allPnrs.add(m[1].toUpperCase());

  // 형식 4: /DC항공사*PNR (예: /DCOZ*EJS5CC)
  const dcMatches = input.matchAll(/\/DC[A-Z]{2}\*([A-Z0-9]{6})/gi);
  for (const m of dcMatches) allPnrs.add(m[1].toUpperCase());

  const autoPnr = [...allPnrs].join(', ');

  // PNR이 자동 추출되면 체크박스 선택하고 입력 필드에 채우기
  if (autoPnr) {
    document.getElementById('showPnr').checked = true;
    document.getElementById('pnrInput').value = autoPnr;
    document.getElementById('pnrInputWrapper').classList.remove('hidden');
  }

  // ========================================
  // 승객 이름 자동 파싱 (Phase 1.2)
  // ========================================
  const passengerNames = parsePassengerNames(input);

  // 전역 변수에 저장 (저장 시 사용)
  parsedPassengers = passengerNames;

  // 단체/개인에 따라 UI 자동 설정 (승객 수 반영)
  applyBookingTypeDefaults(detectedType, passengerNames.length);

  if (passengerNames.length > 0) {
    // 첫 번째 승객을 대표자로 자동 설정
    const representativeName = passengerNames[0].name;
    const nameInput = document.getElementById('nameInput');
    if (nameInput) {
      nameInput.value = representativeName;
      // 입력 이벤트 트리거 (실시간 업데이트를 위해)
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 총 인원수 자동 계산 및 설정
    const totalPeopleInput = document.getElementById('totalPeopleInput');
    if (totalPeopleInput) {
      // "명" 중복 방지를 위해 숫자만 입력
      totalPeopleInput.value = passengerNames.length;
      // 입력 이벤트 트리거 (실시간 업데이트를 위해)
      totalPeopleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // 모든 항공편 정보 파싱 (ARNK = Surface segment 건너뛰기)
  // 이름 줄 필터링: 한글이름(가/나) 또는 영문이름(KIM/YU)이 포함된 승객 줄은 항공편이 아님
  const allFlights = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/\bARNK\b/.test(trimmed)) continue;
    // 승객 이름 줄 건너뛰기: "1.소/옥란", "1.KIM/YONGKU" 등
    if (/^\s*\d*\.\s*[\uAC00-\uD7AF]+\/[\uAC00-\uD7AF]/.test(trimmed)) continue;
    if (/^\s*\d+\.\d*[A-Z]+\/[A-Z]/.test(trimmed) && !/\s+HK\d/.test(trimmed)) continue;
    // < PNR - XXXXXX > 줄 건너뛰기
    if (/^<\s*PNR\s*-/i.test(trimmed)) continue;
    const flightInfo = parseFlightInfo(trimmed);
    if (flightInfo) {
      allFlights.push(flightInfo);
    }
  }

  if (allFlights.length === 0) {
    showToast('항공편 정보 형식이 올바르지 않습니다.', 'error');
    return;
  }

  // 다중 PNR 중복 제거: 같은 편명+날짜+구간은 1번만 표시 (왕복)
  const seen = new Set();
  const flights = allFlights.filter(f => {
    const key = `${f.flightNumber}|${f.date}|${f.departure}${f.arrival}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 전역 변수에 저장 (저장 버튼에서 사용)
  parsedFlights = flights;

  // 예약번호 가져오기
  const showPnr = document.getElementById('showPnr').checked;
  const pnr = showPnr ? document.getElementById('pnrInput').value.trim() : '';

  // 결과 생성
  let output = '';

  // 예약번호 및 금액 정보
  const showPriceAdult = document.getElementById('showPriceAdult').checked;
  const showPriceChild = document.getElementById('showPriceChild').checked;
  const showPriceInfant = document.getElementById('showPriceInfant').checked;

  const priceAdult = showPriceAdult
    ? document.getElementById('priceAdultInput').value.trim()
    : '';
  const priceChild = showPriceChild
    ? document.getElementById('priceChildInput').value.trim()
    : '';
  const priceInfant = showPriceInfant
    ? document.getElementById('priceInfantInput').value.trim()
    : '';

  // 추가 인원 요금 수집
  const additionalPrices = [];
  const additionalInputs = document.querySelectorAll('.additional-price-item');
  additionalInputs.forEach((item) => {
    const labelInput = item.querySelector('.additional-price-label');
    const priceInput = item.querySelector('.additional-price-value');
    if (labelInput && priceInput && labelInput.value && priceInput.value) {
      additionalPrices.push({
        label: labelInput.value.trim(),
        price: priceInput.value.trim(),
      });
    }
  });

  // 거래처 정보
  const showClient = document.getElementById('showClient').checked;
  const clientName = showClient
    ? document.getElementById('clientInput').value.trim()
    : '';

  // 거래처, 예약번호, 금액이 하나라도 있으면 박스 표시
  if (
    clientName ||
    pnr ||
    priceAdult ||
    priceChild ||
    priceInfant ||
    additionalPrices.length > 0
  ) {
    output += `<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>`;
    if (clientName) {
      output += `<div>🏢 거래처: ${sanitizeHtml(clientName)}</div>`;
    }
    if (pnr) {
      output += `<div>📌 예약번호: ${sanitizeHtml(pnr)}</div>`;
    }
    if (priceAdult) {
      output += `<div>💰 성인 1인: ₩${sanitizeHtml(priceAdult)}원</div>`;
    }
    if (priceChild) {
      output += `<div>💰 아동 1인: ₩${sanitizeHtml(priceChild)}원</div>`;
    }
    if (priceInfant) {
      output += `<div>💰 유아 1인: ₩${sanitizeHtml(priceInfant)}원</div>`;
    }
    additionalPrices.forEach((item) => {
      output += `<div>💰 ${sanitizeHtml(item.label)}: ₩${sanitizeHtml(item.price)}원</div>`;
    });
    output += `<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div><br>`;
  }

  // 구간 라벨 결정
  const getSegmentLabel = (index, total) => {
    if (total === 1) return '출발';
    if (total === 2) return index === 0 ? '출발' : '도착';
    // 3구간 이상
    if (index === 0) return '출발';
    if (index === total - 1) return '도착';
    return '경유';
  };

  // 모든 구간 처리
  flights.forEach((flight, index) => {
    const label = getSegmentLabel(index, flights.length);
    const date = convertDate(flight.date);
    const departureAirport = getAirportName(flight.departure);
    const arrivalAirport = getAirportName(flight.arrival);
    const departureTime = convertTime(flight.departureTime);
    const arrivalTime = convertTime(flight.arrivalTime);

    if (index > 0) output += '<br><br>';

    output += `<div>`;
    output += `<div>${sanitizeHtml(label)} : ${sanitizeHtml(date)} - ${sanitizeHtml(departureAirport)}: ${sanitizeHtml(departureTime)} - ${sanitizeHtml(arrivalAirport)}: ${sanitizeHtml(arrivalTime)} - ${sanitizeHtml(flight.flightNumber)}</div>`;

    // 도착일 표시 (PNR 파싱에서 도착일이 확인된 경우만)
    if (flight.arrivalDate && flight.arrivalDate !== flight.date) {
      const arrivalDateFormatted = convertDate(flight.arrivalDate);
      output += `<div style="color: #dc2626; font-weight: bold; margin-top: 4px; font-size: 0.875rem; text-align: right;">⚠️ [도착일: ${arrivalDateFormatted}]</div>`;
    }

    output += `</div>`;
  });

  // 고객 정보 추가
  const name = document.getElementById('nameInput').value.trim();
  const totalPeopleInput = document.getElementById('totalPeopleInput');
  const totalPeople = totalPeopleInput ? totalPeopleInput.value.trim() : '';
  const phone = document.getElementById('phoneInput').value.trim();
  const showMeetingPlace = document.getElementById('showMeetingPlace').checked;
  const meetingTimeInput = document.getElementById('meetingTimeInput');
  const meetingTime =
    showMeetingPlace && meetingTimeInput ? meetingTimeInput.value.trim() : '';
  const meetingPlace = showMeetingPlace
    ? document.getElementById('meetingPlaceInput').value.trim()
    : '';
  const showRemarksCheckbox = document.getElementById('showRemarks');
  const showRemarks = showRemarksCheckbox ? showRemarksCheckbox.checked : false;
  const remarksInput = document.getElementById('remarksInput');
  const remarks = showRemarks && remarksInput ? remarksInput.value.trim() : '';
  const showMealDeparture =
    document.getElementById('showMealDeparture').checked;
  const showMealArrival = document.getElementById('showMealArrival').checked;

  const nameLabelRadio = document.querySelector(
    'input[name="nameLabel"]:checked'
  );
  const nameLabel = nameLabelRadio ? nameLabelRadio.value : '대표명';

  const mealDepartureRadio = document.querySelector(
    'input[name="mealDeparture"]:checked'
  );
  const mealArrivalRadio = document.querySelector(
    'input[name="mealArrival"]:checked'
  );
  const mealDeparture =
    showMealDeparture && mealDepartureRadio ? mealDepartureRadio.value : '';
  const mealArrival =
    showMealArrival && mealArrivalRadio ? mealArrivalRadio.value : '';

  // 고객 정보 표시 (단체가 아닐 때만)
  if (currentBookingType !== 'group') {
    if (
      name ||
      totalPeople ||
      phone ||
      meetingTime ||
      meetingPlace ||
      remarks ||
      mealDeparture ||
      mealArrival
    ) {
      output += '<br><br><div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
      output +=
        '<div style="font-weight: bold; color: #1f2937;">📋 고객 정보</div>';
      output += '<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
      if (name) output += `<div>👤 ${sanitizeHtml(nameLabel)}: ${sanitizeHtml(name)}</div>`;
      if (totalPeople) output += `<div>👥 총인원: ${sanitizeHtml(totalPeople)}</div>`;
      if (phone) output += `<div>📞 전화번호: ${sanitizeHtml(phone)}</div>`;
      if (meetingTime) output += `<div>🕒 미팅 시간: ${sanitizeHtml(meetingTime)}</div>`;
      if (meetingPlace) output += `<div>📍 미팅 장소: ${sanitizeHtml(meetingPlace)}</div>`;
      if (mealDeparture) output += `<div>🍽️ 출발편 식사: ${sanitizeHtml(mealDeparture)}</div>`;
      if (mealArrival) output += `<div>🍽️ 도착편 식사: ${sanitizeHtml(mealArrival)}</div>`;
      if (remarks)
        output += `<div>📝 비고사항: ${sanitizeHtml(remarks).replace(/\n/g, '<br>')}</div>`;
      output += '<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
    }
  }

  // 승객 명단 표시 (전체 승객 명단 체크 시)
  const showAllPassengersForOutput = document.getElementById('showAllPassengers');
  if (showAllPassengersForOutput && showAllPassengersForOutput.checked && parsedPassengers.length > 0) {
    output += '<br><div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
    output += '<div style="font-weight: bold; color: #1f2937;">👥 승객 명단</div>';
    output += '<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
    output += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 12px; font-size: 0.8em;">';
    parsedPassengers.forEach((p) => {
      output += `<div>${sanitizeHtml(String(p.index))}. ${sanitizeHtml(p.name)}${sanitizeHtml(p.title || '')}</div>`;
    });
    output += '</div>';
    output += '<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
  }

  // 결과 표시
  const preElement = document.getElementById('outputText').querySelector('pre');
  preElement.innerHTML = output;
  preElement.style.whiteSpace = 'normal';
  document.getElementById('outputSection').classList.remove('hidden');

  // 스크롤 이동
  document
    .getElementById('outputSection')
    .scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 복사 기능
function handleCopy() {
  const preElement = document.getElementById('outputText').querySelector('pre');
  // HTML 태그를 제거하고 텍스트만 추출
  const output = preElement.innerText || preElement.textContent;
  const name = document.getElementById('nameInput').value;
  const totalPeopleInput = document.getElementById('totalPeopleInput');
  const totalPeople = totalPeopleInput ? totalPeopleInput.value : '';
  const phone = document.getElementById('phoneInput').value;

  const showMeetingPlace = document.getElementById('showMeetingPlace').checked;
  const meetingTimeInput = document.getElementById('meetingTimeInput');
  const meetingTime =
    showMeetingPlace && meetingTimeInput ? meetingTimeInput.value : '';
  const meetingPlace = showMeetingPlace
    ? document.getElementById('meetingPlaceInput').value
    : '';
  const showRemarksCheckbox = document.getElementById('showRemarks');
  const showRemarks = showRemarksCheckbox ? showRemarksCheckbox.checked : false;
  const remarksInput = document.getElementById('remarksInput');
  const remarks = showRemarks && remarksInput ? remarksInput.value : '';

  const showMealDeparture =
    document.getElementById('showMealDeparture').checked;
  const showMealArrival = document.getElementById('showMealArrival').checked;

  const nameLabelRadio = document.querySelector(
    'input[name="nameLabel"]:checked'
  );
  const nameLabel = nameLabelRadio ? nameLabelRadio.value : '대표명';

  const mealDepartureRadio = document.querySelector(
    'input[name="mealDeparture"]:checked'
  );
  const mealArrivalRadio = document.querySelector(
    'input[name="mealArrival"]:checked'
  );
  const mealDeparture =
    showMealDeparture && mealDepartureRadio ? mealDepartureRadio.value : '';
  const mealArrival =
    showMealArrival && mealArrivalRadio ? mealArrivalRadio.value : '';

  let copyText = output;

  if (
    name ||
    totalPeople ||
    phone ||
    meetingTime ||
    meetingPlace ||
    remarks ||
    mealDeparture ||
    mealArrival
  ) {
    copyText += '\n\n--- 고객 정보 ---';
    if (name) copyText += `\n${nameLabel}: ${name}`;
    if (totalPeople) copyText += `\n총인원: ${totalPeople}`;
    if (phone) copyText += `\n전화번호: ${phone}`;
    if (meetingTime) copyText += `\n미팅 시간: ${meetingTime}`;
    if (meetingPlace) copyText += `\n미팅 장소: ${meetingPlace}`;
    if (mealDeparture) copyText += `\n출발편 식사: ${mealDeparture}`;
    if (mealArrival) copyText += `\n도착편 식사: ${mealArrival}`;
    if (remarks) copyText += `\n비고사항: ${remarks}`;
  }

  navigator.clipboard
    .writeText(copyText)
    .then(() => {
      // 복사 성공 알림
      const btn = document.getElementById('copyBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML =
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>복사됨!';
      btn.classList.add('bg-green-50', 'border-green-500', 'text-green-700');

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove(
          'bg-green-50',
          'border-green-500',
          'text-green-700'
        );
      }, 2000);
    })
    .catch((_err) => {
      showToast('복사에 실패했습니다.', 'error');
    });
}

/**
 * PNG Blob을 클립보드에 복사
 */
async function copyImageToClipboard(blob) {
  // 1차: Clipboard API (HTTPS 또는 localhost에서만 동작)
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    }
  } catch { /* HTTPS 아니면 실패 — 폴백으로 진행 */ }

  // 2차: 새 탭에 이미지 표시 (HTTP 내부망용 — 우클릭/길게눌러 복사 가능)
  try {
    const url = URL.createObjectURL(blob);
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(`
        <!DOCTYPE html>
        <html><head><title>이미지 복사</title>
        <style>body{margin:0;display:flex;flex-direction:column;align-items:center;background:#f1f5f9;padding:20px;font-family:sans-serif}
        .hint{background:#1e40af;color:white;padding:12px 24px;border-radius:8px;margin-bottom:16px;font-size:14px;text-align:center}
        img{max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15)}</style></head>
        <body>
          <div class="hint">📋 이미지를 우클릭(PC) 또는 길게 눌러(모바일) 복사하세요</div>
          <img src="${url}" alt="예약 이미지">
        </body></html>
      `);
      newTab.document.close();
      return 'tab';
    }
  } catch { /* 팝업 차단 시 다운로드로 폴백 */ }

  return false;
}

/**
 * Blob을 파일로 다운로드 (폴백용)
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * #captureArea를 PNG Blob으로 캡처
 */
async function captureOutputArea() {
  const captureArea = document.getElementById('captureArea');
  const hiddenElements = [];

  const convertResultTitle = document.getElementById('convertResultTitle');
  if (convertResultTitle) {
    convertResultTitle.style.display = 'none';
    hiddenElements.push(convertResultTitle);
  }
  const customerInfoForm = captureArea.querySelector('.border-t');
  if (customerInfoForm) {
    customerInfoForm.style.display = 'none';
    hiddenElements.push(customerInfoForm);
  }

  try {
    const canvas = await html2canvas(captureArea, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });
    return new Promise((resolve) => canvas.toBlob(resolve));
  } finally {
    hiddenElements.forEach((el) => { el.style.display = ''; });
  }
}

/**
 * reservation.html을 iframe에 렌더링 후 PNG Blob으로 캡처
 */
async function captureMobileCard() {
  const reservationData = collectReservationData();

  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position: fixed; left: -9999px; top: 0; width: 430px; height: 932px; border: none;';
  document.body.appendChild(iframe);

  const dataParam = encodeURIComponent(JSON.stringify(reservationData));
  iframe.src = `reservation.html?data=${dataParam}`;

  await new Promise((resolve, reject) => {
    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc.fonts && iframeDoc.fonts.ready) await iframeDoc.fonts.ready;
        setTimeout(resolve, 1500);
      } catch (_e) {
        setTimeout(resolve, 2000);
      }
    };
    iframe.onerror = reject;
    setTimeout(() => reject(new Error('Iframe load timeout')), 15000);
  });

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  const canvas = await html2canvas(iframeDoc.body, {
    backgroundColor: '#F8FAFC',
    scale: 2,
    logging: false,
    useCORS: true,
    width: 430,
    height: iframeDoc.body.scrollHeight,
    windowWidth: 430,
    windowHeight: iframeDoc.body.scrollHeight,
  });

  document.body.removeChild(iframe);
  return new Promise((resolve) => canvas.toBlob(resolve));
}

// 이미지 클립보드 복사 (단체/거래처용)
async function handleImageCopy() {
  const imageBtn = document.getElementById('imageBtn');
  const originalText = imageBtn.innerHTML;

  try {
    imageBtn.disabled = true;
    imageBtn.innerHTML =
      '<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="hidden sm:inline">생성중...</span>';

    const blob = await captureOutputArea();
    const copied = await copyImageToClipboard(blob);

    if (copied === true) {
      showToast('이미지가 클립보드에 복사되었습니다.\n카톡에서 Ctrl+V로 붙여넣으세요.', 'success', 4000);
      imageBtn.innerHTML =
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span class="hidden sm:inline">복사됨!</span>';
    } else if (copied === 'tab') {
      showToast('새 탭에 이미지가 열렸습니다.\n우클릭 → 이미지 복사 해주세요.', 'success', 4000);
      imageBtn.innerHTML =
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span class="hidden sm:inline">열림!</span>';
    } else {
      const dateStr = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `flight-schedule-${dateStr}.png`);
      showToast('이미지가 저장되었습니다.', 'success');
      imageBtn.innerHTML =
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span class="hidden sm:inline">저장됨!</span>';
    }

    imageBtn.classList.remove('border-purple-300', 'bg-purple-50', 'hover:bg-purple-100', 'text-purple-700');
    imageBtn.classList.add('border-green-500', 'bg-green-50', 'text-green-700');

    setTimeout(() => {
      imageBtn.innerHTML = originalText;
      imageBtn.classList.remove('border-green-500', 'bg-green-50', 'text-green-700');
      imageBtn.classList.add('border-purple-300', 'bg-purple-50', 'hover:bg-purple-100', 'text-purple-700');
      imageBtn.disabled = false;
    }, 2000);
  } catch {
    showToast('이미지 생성에 실패했습니다.', 'error');
    imageBtn.innerHTML = originalText;
    imageBtn.disabled = false;
  }
}

// 모바일 이미지 클립보드 복사 (개인 고객용)
async function handleMobileCopy() {
  const mobileImageBtn = document.getElementById('mobileImageBtn');
  const originalText = mobileImageBtn.innerHTML;

  const flights =
    parsedFlights && parsedFlights.length > 0
      ? parsedFlights
      : window.parsedFlights;
  if (!flights || flights.length === 0) {
    showToast('먼저 항공편을 변환해주세요.', 'warning');
    return;
  }

  try {
    mobileImageBtn.disabled = true;
    mobileImageBtn.innerHTML =
      '<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="hidden sm:inline">생성중...</span>';

    const blob = await captureMobileCard();
    const copied = await copyImageToClipboard(blob);

    if (copied === true) {
      showToast('모바일 이미지가 클립보드에 복사되었습니다.\n카톡에서 Ctrl+V로 붙여넣으세요.', 'success', 4000);
      mobileImageBtn.innerHTML =
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span class="hidden sm:inline">복사됨!</span>';
    } else if (copied === 'tab') {
      showToast('새 탭에 이미지가 열렸습니다.\n우클릭 → 이미지 복사 해주세요.', 'success', 4000);
      mobileImageBtn.innerHTML =
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span class="hidden sm:inline">열림!</span>';
    } else {
      const dateStr = new Date().toISOString().split('T')[0];
      const customerName = document.getElementById('nameInput').value.trim();
      const suffix = customerName ? `-${customerName.replace(/[/\\]/g, '_')}` : '';
      downloadBlob(blob, `reservation-mobile${suffix}-${dateStr}.png`);
      showToast('이미지가 저장되었습니다.', 'success');
      mobileImageBtn.innerHTML =
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span class="hidden sm:inline">저장됨!</span>';
    }

    mobileImageBtn.classList.remove('border-teal-300', 'bg-teal-50', 'hover:bg-teal-100', 'text-teal-700');
    mobileImageBtn.classList.add('border-green-500', 'bg-green-50', 'text-green-700');

    setTimeout(() => {
      mobileImageBtn.innerHTML = originalText;
      mobileImageBtn.classList.remove('border-green-500', 'bg-green-50', 'text-green-700');
      mobileImageBtn.classList.add('border-teal-300', 'bg-teal-50', 'hover:bg-teal-100', 'text-teal-700');
      mobileImageBtn.disabled = false;
    }, 2000);
  } catch {
    showToast('모바일 이미지 생성에 실패했습니다.', 'error');
    mobileImageBtn.innerHTML = originalText;
    mobileImageBtn.disabled = false;
  }
}

// 예약 데이터 수집 함수 (모바일 이미지용)
function collectReservationData() {
  const showClient = document.getElementById('showClient').checked;
  const clientName = showClient ? document.getElementById('clientInput').value.trim() : '';
  const showPnr = document.getElementById('showPnr').checked;
  const pnr = showPnr ? document.getElementById('pnrInput').value.trim() : '';
  const name = document.getElementById('nameInput').value.trim();
  const phone = document.getElementById('phoneInput').value.trim();
  const totalPeopleInput = document.getElementById('totalPeopleInput');
  const totalPeople = totalPeopleInput ? totalPeopleInput.value.trim() : '';
  // 숫자만 추출 (중복 "명" 방지)
  const totalPeopleNum = totalPeople.replace(/[^0-9]/g, '');

  const showMeetingPlace = document.getElementById('showMeetingPlace').checked;
  const meetingTimeInput = document.getElementById('meetingTimeInput');
  const meetingTime =
    showMeetingPlace && meetingTimeInput ? meetingTimeInput.value.trim() : '';
  const meetingPlace = showMeetingPlace
    ? document.getElementById('meetingPlaceInput').value.trim()
    : '';

  const showMealDeparture =
    document.getElementById('showMealDeparture').checked;
  const showMealArrival = document.getElementById('showMealArrival').checked;
  const mealDepartureRadio = document.querySelector(
    'input[name="mealDeparture"]:checked'
  );
  const mealArrivalRadio = document.querySelector(
    'input[name="mealArrival"]:checked'
  );
  const departureMeal =
    showMealDeparture && mealDepartureRadio ? mealDepartureRadio.value : '';
  const arrivalMeal =
    showMealArrival && mealArrivalRadio ? mealArrivalRadio.value : '';

  const showRemarksCheckbox = document.getElementById('showRemarks');
  const showRemarks = showRemarksCheckbox ? showRemarksCheckbox.checked : false;
  const remarksInput = document.getElementById('remarksInput');
  const remarks = showRemarks && remarksInput ? remarksInput.value.trim() : '';

  // 항공편 데이터 변환 (로컬 변수 또는 window 변수 사용)
  // 빈 배열은 truthy이므로 length 체크 필요
  const flightData =
    parsedFlights && parsedFlights.length > 0
      ? parsedFlights
      : window.parsedFlights || [];
  const flights = flightData.map((flight) => {
    // 날짜가 이미 변환된 형식인지 확인 (2025.11.14(금) vs 14NOV)
    const dateStr = flight.date;
    let isoDate = '';

    // 이미 변환된 형식인지 확인
    const alreadyConverted = /^\d{4}\.\d{2}\.\d{2}/.test(dateStr);
    if (alreadyConverted) {
      // 이미 변환된 형식: 2025.11.14(금) -> 2025-11-14
      const dateMatch = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      isoDate = dateMatch
        ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
        : '';
    } else {
      // 원본 형식: 14NOV -> 변환 후 추출
      const convertedDate = convertDate(dateStr);
      const dateMatch = convertedDate.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      isoDate = dateMatch
        ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
        : '';
    }

    // 도착일 처리
    let arrivalIsoDate = isoDate;
    let nextDay = false;
    if (flight.arrivalDate) {
      const arrivalAlreadyConverted = /^\d{4}\.\d{2}\.\d{2}/.test(
        flight.arrivalDate
      );
      if (arrivalAlreadyConverted) {
        const arrivalMatch = flight.arrivalDate.match(
          /(\d{4})\.(\d{2})\.(\d{2})/
        );
        arrivalIsoDate = arrivalMatch
          ? `${arrivalMatch[1]}-${arrivalMatch[2]}-${arrivalMatch[3]}`
          : isoDate;
      } else {
        const arrivalConverted = convertDate(flight.arrivalDate);
        const arrivalMatch = arrivalConverted.match(
          /(\d{4})\.(\d{2})\.(\d{2})/
        );
        arrivalIsoDate = arrivalMatch
          ? `${arrivalMatch[1]}-${arrivalMatch[2]}-${arrivalMatch[3]}`
          : isoDate;
      }
      nextDay = true;
    }

    // 출발/도착 정보 처리 (저장된 형식 vs 파싱된 형식)
    const departureAirport = flight.departure?.code || flight.departure || '';
    const arrivalAirport = flight.arrival?.code || flight.arrival || '';
    const departureTime =
      flight.departure?.time || convertTime(flight.departureTime) || '';
    const arrivalTime =
      flight.arrival?.time || convertTime(flight.arrivalTime) || '';

    return {
      flightNo: flight.flightNumber,
      departure: {
        airport: departureAirport,
        time: departureTime,
        date: isoDate,
      },
      arrival: {
        airport: arrivalAirport,
        time: arrivalTime,
        date: arrivalIsoDate,
        nextDay: nextDay,
      },
    };
  });

  // 비용 정보 수집
  const showPriceAdult = document.getElementById('showPriceAdult').checked;
  const showPriceChild = document.getElementById('showPriceChild').checked;
  const showPriceInfant = document.getElementById('showPriceInfant').checked;
  const priceAdult = showPriceAdult
    ? document.getElementById('priceAdultInput').value.trim()
    : '';
  const priceChild = showPriceChild
    ? document.getElementById('priceChildInput').value.trim()
    : '';
  const priceInfant = showPriceInfant
    ? document.getElementById('priceInfantInput').value.trim()
    : '';

  // 전체 승객 명단 표시 옵션
  const showAllPassengersCheckbox =
    document.getElementById('showAllPassengers');
  const showAllPassengers = showAllPassengersCheckbox
    ? showAllPassengersCheckbox.checked
    : false;

  // 승객 명단 준비 (parsedPassengers 또는 window.parsedPassengers 사용)
  const passengersList =
    parsedPassengers && parsedPassengers.length > 0
      ? parsedPassengers
      : window.parsedPassengers || [];

  const passengers = showAllPassengers
    ? passengersList.map((p) => ({ index: p.index, name: p.name, title: p.title || '' }))
    : [];

  return {
    clientName: clientName,
    pnr: pnr || '-',
    name: name || '-',
    phone: phone || '-',
    totalPeople: totalPeopleNum ? `${totalPeopleNum}명` : '-',
    flights: flights,
    meetingTime: meetingTime,
    meetingPlace: meetingPlace,
    departureMeal: departureMeal,
    arrivalMeal: arrivalMeal,
    remarks: remarks,
    priceAdult: priceAdult,
    priceChild: priceChild,
    priceInfant: priceInfant,
    showAllPassengers: showAllPassengers,
    passengers: passengers,
  };
}

// 카카오톡 공유 기능
// PDF 저장 기능
function handlePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const preElement = document.getElementById('outputText').querySelector('pre');
  const output = preElement.innerText || preElement.textContent;
  const name = document.getElementById('nameInput').value;
  const totalPeopleInput = document.getElementById('totalPeopleInput');
  const totalPeople = totalPeopleInput ? totalPeopleInput.value : '';
  const phone = document.getElementById('phoneInput').value;

  const showMeetingPlace = document.getElementById('showMeetingPlace').checked;
  const meetingTimeInput = document.getElementById('meetingTimeInput');
  const meetingTime =
    showMeetingPlace && meetingTimeInput ? meetingTimeInput.value : '';
  const meetingPlace = showMeetingPlace
    ? document.getElementById('meetingPlaceInput').value
    : '';
  const showRemarksCheckbox = document.getElementById('showRemarks');
  const showRemarks = showRemarksCheckbox ? showRemarksCheckbox.checked : false;
  const remarksInput = document.getElementById('remarksInput');
  const remarks = showRemarks && remarksInput ? remarksInput.value : '';

  const showMealDeparture =
    document.getElementById('showMealDeparture').checked;
  const showMealArrival = document.getElementById('showMealArrival').checked;

  const nameLabelRadio = document.querySelector(
    'input[name="nameLabel"]:checked'
  );
  const nameLabel = nameLabelRadio ? nameLabelRadio.value : '대표명';

  const mealDepartureRadio = document.querySelector(
    'input[name="mealDeparture"]:checked'
  );
  const mealArrivalRadio = document.querySelector(
    'input[name="mealArrival"]:checked'
  );
  const mealDeparture =
    showMealDeparture && mealDepartureRadio ? mealDepartureRadio.value : '';
  const mealArrival =
    showMealArrival && mealArrivalRadio ? mealArrivalRadio.value : '';

  // 제목
  doc.setFontSize(18);
  doc.text('Flight Schedule', 20, 20);

  doc.setFontSize(12);
  let yPos = 40;

  // 항공편 정보
  const lines = output.split('\n');
  lines.forEach((line) => {
    // 한글 지원을 위한 처리 (jsPDF는 한글을 직접 지원하지 않음)
    // 영문으로 변환하거나 이미지로 저장하는 방법 필요
    doc.text(line, 20, yPos);
    yPos += 10;
  });

  // 고객 정보
  if (
    name ||
    totalPeople ||
    phone ||
    meetingTime ||
    meetingPlace ||
    remarks ||
    mealDeparture ||
    mealArrival
  ) {
    yPos += 10;
    doc.text('--- Customer Information ---', 20, yPos);
    yPos += 10;

    if (name) {
      doc.text(`${nameLabel}: ${name}`, 20, yPos);
      yPos += 10;
    }
    if (totalPeople) {
      doc.text(`Total People: ${totalPeople}`, 20, yPos);
      yPos += 10;
    }
    if (phone) {
      doc.text(`Phone: ${phone}`, 20, yPos);
      yPos += 10;
    }
    if (meetingTime) {
      doc.text(`Meeting Time: ${meetingTime}`, 20, yPos);
      yPos += 10;
    }
    if (meetingPlace) {
      doc.text(`Meeting Place: ${meetingPlace}`, 20, yPos);
      yPos += 10;
    }
    if (mealDeparture) {
      doc.text(`Departure Meal: ${mealDeparture}`, 20, yPos);
      yPos += 10;
    }
    if (mealArrival) {
      doc.text(`Arrival Meal: ${mealArrival}`, 20, yPos);
      yPos += 10;
    }
    if (remarks) {
      doc.text(`Remarks: ${remarks}`, 20, yPos);
      yPos += 10;
    }
  }

  // 날짜 생성
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // PDF 저장
  doc.save(`flight-schedule-${dateStr}.pdf`);

  // PDF 저장 성공 알림
  const btn = document.getElementById('pdfBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML =
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>저장됨!';
  btn.classList.remove('bg-gray-700', 'hover:bg-gray-800');
  btn.classList.add('bg-green-600', 'hover:bg-green-700');

  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.classList.remove('bg-green-600', 'hover:bg-green-700');
    btn.classList.add('bg-gray-700', 'hover:bg-gray-800');
  }, 2000);
}

// 금액 포맷팅 함수 (천 단위 콤마)
function formatPrice(value) {
  // 숫자만 추출
  const numbers = value.replace(/[^\d]/g, '');
  // 천 단위 콤마 추가
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 추가 인원 카운터
let additionalPriceCounter = 0;

// 추가 인원 필드 생성
function addAdditionalPriceField() {
  additionalPriceCounter++;
  const container = document.getElementById('additionalPricesContainer');

  const itemDiv = document.createElement('div');
  itemDiv.className = 'additional-price-item space-y-2';
  itemDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <label class="block text-xs text-gray-600">추가 인원 ${additionalPriceCounter}</label>
            <button type="button" class="remove-price-btn text-red-500 hover:text-red-700 text-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
        <input
            type="text"
            class="additional-price-label w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="인원 구분 (예: 경로자, 동반자 등)"
        />
        <div class="relative">
            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold">₩</span>
            <input
                type="text"
                class="additional-price-value w-full pl-8 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder="요금을 입력하세요"
            />
            <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600">원</span>
        </div>
    `;

  container.appendChild(itemDiv);

  // 삭제 버튼 이벤트
  const removeBtn = itemDiv.querySelector('.remove-price-btn');
  removeBtn.addEventListener('click', () => {
    itemDiv.remove();
    updateCustomerInfo(); // 실시간 업데이트
  });

  // 라벨 입력 시 실시간 업데이트
  const labelInput = itemDiv.querySelector('.additional-price-label');
  labelInput.addEventListener('input', updateCustomerInfo);

  // 자동 콤마 추가
  const priceInput = itemDiv.querySelector('.additional-price-value');
  priceInput.addEventListener('input', (e) => {
    const cursorPosition = e.target.selectionStart;
    const oldValue = e.target.value;
    const oldLength = oldValue.length;

    const formatted = formatPrice(oldValue);
    e.target.value = formatted;

    const newLength = formatted.length;
    const diff = newLength - oldLength;
    e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);

    updateCustomerInfo(); // 실시간 업데이트
  });
}

// 고객 정보 및 금액 정보 업데이트 함수
function updateCustomerInfo() {
  const outputSection = document.getElementById('outputSection');
  if (outputSection.classList.contains('hidden')) return; // 결과가 없으면 업데이트 안 함

  const preElement = document.getElementById('outputText').querySelector('pre');
  let output = preElement.innerHTML;

  // 기존 예약번호/금액 박스 제거
  const boxPattern = '<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
  const firstBoxStart = output.indexOf(boxPattern);
  if (firstBoxStart === 0) {
    // 두 번째 구분선(박스의 끝)을 찾기
    const secondBoxPattern = output.indexOf(boxPattern + '<br>', 10);
    if (secondBoxPattern !== -1) {
      // 박스 끝 구분선 다음부터 시작
      output = output.substring(
        secondBoxPattern + boxPattern.length + '<br>'.length
      );
    }
  }

  // 기존 고객 정보 섹션 제거
  const customerInfoMarker = '<div style="font-weight: bold; color: #1f2937;">📋 고객 정보</div>';
  const customerInfoMarkerIdx = output.indexOf(customerInfoMarker);
  if (customerInfoMarkerIdx !== -1) {
    // 고객 정보 마커 앞의 <br><br><div>━━ 부분부터 시작점 찾기
    const searchBack = '<br><br>' + boxPattern;
    const customerInfoStart = output.lastIndexOf(searchBack, customerInfoMarkerIdx);
    // 고객 정보 마커 이후 첫 번째 닫는 구분선 찾기
    const afterMarker = customerInfoMarkerIdx + customerInfoMarker.length;
    // 고객 정보 내용 뒤의 두 번째 구분선 (첫 번째는 마커 바로 다음)
    const closingBoxIdx = output.indexOf(boxPattern, afterMarker + boxPattern.length);
    if (customerInfoStart !== -1 && closingBoxIdx !== -1) {
      output =
        output.substring(0, customerInfoStart) +
        output.substring(closingBoxIdx + boxPattern.length);
    }
  }

  // 거래처 정보 수집
  const showClient = document.getElementById('showClient').checked;
  const clientName = showClient ? document.getElementById('clientInput').value.trim() : '';

  // 예약번호 및 금액 정보 수집
  const showPnr = document.getElementById('showPnr').checked;
  const pnr = showPnr ? document.getElementById('pnrInput').value.trim() : '';

  const showPriceAdult = document.getElementById('showPriceAdult').checked;
  const showPriceChild = document.getElementById('showPriceChild').checked;
  const showPriceInfant = document.getElementById('showPriceInfant').checked;

  const priceAdult = showPriceAdult
    ? document.getElementById('priceAdultInput').value.trim()
    : '';
  const priceChild = showPriceChild
    ? document.getElementById('priceChildInput').value.trim()
    : '';
  const priceInfant = showPriceInfant
    ? document.getElementById('priceInfantInput').value.trim()
    : '';

  // 추가 인원 요금 수집
  const additionalPrices = [];
  const additionalInputs = document.querySelectorAll('.additional-price-item');
  additionalInputs.forEach((item) => {
    const labelInput = item.querySelector('.additional-price-label');
    const priceInput = item.querySelector('.additional-price-value');
    if (labelInput && priceInput && labelInput.value && priceInput.value) {
      additionalPrices.push({
        label: labelInput.value.trim(),
        price: priceInput.value.trim(),
      });
    }
  });

  // 예약번호/금액 박스 생성
  let priceBox = '';
  if (
    clientName ||
    pnr ||
    priceAdult ||
    priceChild ||
    priceInfant ||
    additionalPrices.length > 0
  ) {
    priceBox += `<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>`;
    if (clientName) {
      priceBox += `<div>🏢 거래처: ${sanitizeHtml(clientName)}</div>`;
    }
    if (pnr) {
      priceBox += `<div>📌 예약번호: ${pnr}</div>`;
    }
    if (priceAdult) {
      priceBox += `<div>💰 성인 1인: ₩${priceAdult}원</div>`;
    }
    if (priceChild) {
      priceBox += `<div>💰 아동 1인: ₩${priceChild}원</div>`;
    }
    if (priceInfant) {
      priceBox += `<div>💰 유아 1인: ₩${priceInfant}원</div>`;
    }
    additionalPrices.forEach((item) => {
      priceBox += `<div>💰 ${item.label}: ₩${item.price}원</div>`;
    });
    priceBox += `<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div><br>`;
  }

  // 예약번호/금액 박스를 맨 앞에 추가
  output = priceBox + output;

  // 고객 정보 수집
  const name = document.getElementById('nameInput').value.trim();
  const totalPeopleInput = document.getElementById('totalPeopleInput');
  const totalPeople = totalPeopleInput ? totalPeopleInput.value.trim() : '';
  const phone = document.getElementById('phoneInput').value.trim();
  const showMeetingPlace = document.getElementById('showMeetingPlace').checked;
  const meetingTimeInput = document.getElementById('meetingTimeInput');
  const meetingTime =
    showMeetingPlace && meetingTimeInput ? meetingTimeInput.value.trim() : '';
  const meetingPlace = showMeetingPlace
    ? document.getElementById('meetingPlaceInput').value.trim()
    : '';
  const showRemarksCheckbox = document.getElementById('showRemarks');
  const showRemarks = showRemarksCheckbox ? showRemarksCheckbox.checked : false;
  const remarksInput = document.getElementById('remarksInput');
  const remarks = showRemarks && remarksInput ? remarksInput.value.trim() : '';
  const showMealDeparture =
    document.getElementById('showMealDeparture').checked;
  const showMealArrival = document.getElementById('showMealArrival').checked;

  const nameLabelRadio = document.querySelector(
    'input[name="nameLabel"]:checked'
  );
  const nameLabel = nameLabelRadio ? nameLabelRadio.value : '대표명';

  const mealDepartureRadio = document.querySelector(
    'input[name="mealDeparture"]:checked'
  );
  const mealArrivalRadio = document.querySelector(
    'input[name="mealArrival"]:checked'
  );
  const mealDeparture =
    showMealDeparture && mealDepartureRadio ? mealDepartureRadio.value : '';
  const mealArrival =
    showMealArrival && mealArrivalRadio ? mealArrivalRadio.value : '';

  // 고객 정보 표시 (단체가 아닐 때만)
  if (currentBookingType !== 'group') {
    if (
      name ||
      totalPeople ||
      phone ||
      meetingTime ||
      meetingPlace ||
      remarks ||
      mealDeparture ||
      mealArrival
    ) {
      output += '<br><br><div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
      output +=
        '<div style="font-weight: bold; color: #1f2937;">📋 고객 정보</div>';
      output += '<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
      if (name) output += `<div>👤 ${sanitizeHtml(nameLabel)}: ${sanitizeHtml(name)}</div>`;
      if (totalPeople) output += `<div>👥 총인원: ${sanitizeHtml(totalPeople)}</div>`;
      if (phone) output += `<div>📞 전화번호: ${sanitizeHtml(phone)}</div>`;
      if (meetingTime) output += `<div>🕒 미팅 시간: ${sanitizeHtml(meetingTime)}</div>`;
      if (meetingPlace) output += `<div>📍 미팅 장소: ${sanitizeHtml(meetingPlace)}</div>`;
      if (mealDeparture) output += `<div>🍽️ 출발편 식사: ${sanitizeHtml(mealDeparture)}</div>`;
      if (mealArrival) output += `<div>🍽️ 도착편 식사: ${sanitizeHtml(mealArrival)}</div>`;
      if (remarks)
        output += `<div>📝 비고사항: ${sanitizeHtml(remarks).replace(/\n/g, '<br>')}</div>`;
      output += '<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
    }
  }

  preElement.innerHTML = output;
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  document
    .getElementById('convertBtn')
    .addEventListener('click', handleConvert);
  document.getElementById('copyBtn').addEventListener('click', handleCopy);
  document.getElementById('imageBtn').addEventListener('click', handleImageCopy);
  document
    .getElementById('mobileImageBtn')
    .addEventListener('click', handleMobileCopy);
  document.getElementById('pdfBtn').addEventListener('click', handlePDF);

  // 예약번호 체크박스 토글 기능
  // 거래처 체크박스 토글
  document.getElementById('showClient').addEventListener('change', (e) => {
    const wrapper = document.getElementById('clientInputWrapper');
    if (e.target.checked) {
      wrapper.classList.remove('hidden');
    } else {
      wrapper.classList.add('hidden');
    }
    updateCustomerInfo();
  });

  document
    .getElementById('clientInput')
    .addEventListener('input', updateCustomerInfo);

  document.getElementById('showPnr').addEventListener('change', (e) => {
    const wrapper = document.getElementById('pnrInputWrapper');
    if (e.target.checked) {
      wrapper.classList.remove('hidden');
    } else {
      wrapper.classList.add('hidden');
    }
    updateCustomerInfo(); // 실시간 업데이트
  });

  // 예약번호 입력 시 실시간 업데이트
  document
    .getElementById('pnrInput')
    .addEventListener('input', updateCustomerInfo);

  // 성인 금액 체크박스 토글 기능
  document.getElementById('showPriceAdult').addEventListener('change', (e) => {
    const wrapper = document.getElementById('priceAdultWrapper');
    if (e.target.checked) {
      wrapper.classList.remove('hidden');
    } else {
      wrapper.classList.add('hidden');
    }
    updateCustomerInfo(); // 실시간 업데이트
  });

  // 아동 금액 체크박스 토글 기능
  document.getElementById('showPriceChild').addEventListener('change', (e) => {
    const wrapper = document.getElementById('priceChildWrapper');
    if (e.target.checked) {
      wrapper.classList.remove('hidden');
    } else {
      wrapper.classList.add('hidden');
    }
    updateCustomerInfo(); // 실시간 업데이트
  });

  // 유아 금액 체크박스 토글 기능
  document.getElementById('showPriceInfant').addEventListener('change', (e) => {
    const wrapper = document.getElementById('priceInfantWrapper');
    if (e.target.checked) {
      wrapper.classList.remove('hidden');
    } else {
      wrapper.classList.add('hidden');
    }
    updateCustomerInfo(); // 실시간 업데이트
  });

  // 성인 요금 입력 시 자동 콤마 추가
  document.getElementById('priceAdultInput').addEventListener('input', (e) => {
    const cursorPosition = e.target.selectionStart;
    const oldValue = e.target.value;
    const oldLength = oldValue.length;

    const formatted = formatPrice(oldValue);
    e.target.value = formatted;

    // 커서 위치 조정
    const newLength = formatted.length;
    const diff = newLength - oldLength;
    e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);

    updateCustomerInfo(); // 실시간 업데이트
  });

  // 아동 요금 입력 시 자동 콤마 추가
  document.getElementById('priceChildInput').addEventListener('input', (e) => {
    const cursorPosition = e.target.selectionStart;
    const oldValue = e.target.value;
    const oldLength = oldValue.length;

    const formatted = formatPrice(oldValue);
    e.target.value = formatted;

    // 커서 위치 조정
    const newLength = formatted.length;
    const diff = newLength - oldLength;
    e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);

    updateCustomerInfo(); // 실시간 업데이트
  });

  // 유아 요금 입력 시 자동 콤마 추가
  document.getElementById('priceInfantInput').addEventListener('input', (e) => {
    const cursorPosition = e.target.selectionStart;
    const oldValue = e.target.value;
    const oldLength = oldValue.length;

    const formatted = formatPrice(oldValue);
    e.target.value = formatted;

    // 커서 위치 조정
    const newLength = formatted.length;
    const diff = newLength - oldLength;
    e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);

    updateCustomerInfo(); // 실시간 업데이트
  });

  // 인원 추가 버튼 이벤트
  document
    .getElementById('addPriceBtn')
    .addEventListener('click', addAdditionalPriceField);

  // 미팅 장소 체크박스 토글 기능
  document
    .getElementById('showMeetingPlace')
    .addEventListener('change', (e) => {
      const wrapper = document.getElementById('meetingPlaceWrapper');
      if (e.target.checked) {
        wrapper.classList.remove('hidden');
      } else {
        wrapper.classList.add('hidden');
      }
      updateCustomerInfo(); // 실시간 업데이트
    });

  // 비고사항 체크박스 토글 기능
  document.getElementById('showRemarks').addEventListener('change', (e) => {
    const wrapper = document.getElementById('remarksWrapper');
    if (e.target.checked) {
      wrapper.classList.remove('hidden');
    } else {
      wrapper.classList.add('hidden');
    }
    updateCustomerInfo(); // 실시간 업데이트
  });

  // 미팅 시간 입력 시 실시간 업데이트
  document
    .getElementById('meetingTimeInput')
    .addEventListener('input', updateCustomerInfo);

  // 미팅 장소 입력 시 실시간 업데이트
  document
    .getElementById('meetingPlaceInput')
    .addEventListener('input', updateCustomerInfo);

  // 이름 입력 시 실시간 업데이트
  document
    .getElementById('nameInput')
    .addEventListener('input', updateCustomerInfo);

  // 총인원 입력 시 실시간 업데이트
  document
    .getElementById('totalPeopleInput')
    .addEventListener('input', updateCustomerInfo);

  // 전화번호 입력 시 실시간 업데이트
  document
    .getElementById('phoneInput')
    .addEventListener('input', updateCustomerInfo);

  // 비고사항 입력 시 실시간 업데이트
  document
    .getElementById('remarksInput')
    .addEventListener('input', updateCustomerInfo);

  // 이름 라벨 변경 시 실시간 업데이트
  document.querySelectorAll('input[name="nameLabel"]').forEach((radio) => {
    radio.addEventListener('change', updateCustomerInfo);
  });

  // 식사 체크박스 토글 기능
  document
    .getElementById('showMealDeparture')
    .addEventListener('change', (e) => {
      const options = document.getElementById('mealDepartureOptions');
      if (e.target.checked) {
        options.classList.remove('hidden');
      } else {
        options.classList.add('hidden');
      }
      updateCustomerInfo(); // 실시간 업데이트
    });

  document.getElementById('showMealArrival').addEventListener('change', (e) => {
    const options = document.getElementById('mealArrivalOptions');
    if (e.target.checked) {
      options.classList.remove('hidden');
    } else {
      options.classList.add('hidden');
    }
    updateCustomerInfo(); // 실시간 업데이트
  });

  // 식사 옵션 변경 시 실시간 업데이트
  document.querySelectorAll('input[name="mealDeparture"]').forEach((radio) => {
    radio.addEventListener('change', updateCustomerInfo);
  });
  document.querySelectorAll('input[name="mealArrival"]').forEach((radio) => {
    radio.addEventListener('change', updateCustomerInfo);
  });

  // Enter 키로 변환 실행
  document.getElementById('inputText').addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleConvert();
    }
  });

  // 엑셀 불러오기 버튼
  document.getElementById('excelImportBtn').addEventListener('click', () => {
    document.getElementById('excelFileInput').click();
  });

  // 엑셀 파일 선택 시
  document
    .getElementById('excelFileInput')
    .addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: '',
        });

        if (rows.length === 0) {
          showToast('파일에 데이터가 없습니다.', 'warning');
          return;
        }

        // 모든 행을 합쳐서 텍스트로 변환
        let combinedText = '';
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // 각 행의 첫 번째 열 가져오기
          const firstCol = String(row[0] || '').trim();
          if (firstCol) {
            combinedText += firstCol + '\n';
          }
        }

        if (combinedText) {
          // 텍스트 영역에 삽입
          document.getElementById('inputText').value = combinedText.trim();
          showToast(
            `엑셀 파일에서 ${rows.length}줄을 불러왔습니다. "자동 변환하기" 버튼을 눌러 변환하세요.`,
            'success',
            4000
          );
        } else {
          showToast('파일에서 항공편 정보를 찾을 수 없습니다.', 'warning');
        }
      } catch (error) {
        showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
      }

      // 파일 입력 초기화
      e.target.value = '';
    });

  // 탭 전환 기능
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // "항공편 관리" 탭은 이미 onclick으로 처리되므로 건너뛰기
      if (!targetTab) return;

      // 모든 탭 버튼과 콘텐츠에서 active 클래스 제거
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      tabContents.forEach((content) => content.classList.remove('active'));

      // 선택된 탭 버튼과 콘텐츠에 active 클래스 추가
      button.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });

  // URL 해시 처리 (다른 페이지에서 특정 탭으로 이동)
  function activateTabFromHash() {
    const hash = window.location.hash.slice(1); // # 제거
    if (hash) {
      const targetButton = document.querySelector(`[data-tab="${hash}"]`);
      if (targetButton) {
        // 모든 탭 버튼과 콘텐츠에서 active 클래스 제거
        tabButtons.forEach((btn) => btn.classList.remove('active'));
        tabContents.forEach((content) => content.classList.remove('active'));

        // 해시에 해당하는 탭 활성화
        targetButton.classList.add('active');
        const targetContent = document.getElementById(`tab-${hash}`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      }
    }
  }

  // 페이지 로드 시 해시 확인
  activateTabFromHash();

  // 해시 변경 시 탭 전환
  window.addEventListener('hashchange', activateTabFromHash);

  // 항공편 저장 버튼
  const saveFlightBtn = document.getElementById('saveFlightBtn');
  if (saveFlightBtn) {
    saveFlightBtn.addEventListener('click', async () => {
      // 변환 결과가 있는지 확인
      if (!parsedFlights || parsedFlights.length === 0) {
        showToast('먼저 항공편을 변환해주세요.', 'warning');
        return;
      }

      // 항공편 이름 입력 받기
      const flightName = await showPromptModal(
        '항공편 저장',
        '',
        '이 항공편의 이름을 입력하세요 (예: 방콕여행, 제주도 골프)'
      );
      if (!flightName) {
        showToast('이름을 입력하지 않아 저장이 취소되었습니다.', 'info');
        return;
      }

      // 저장할 데이터 구성
      const flightData = {
        name: flightName.trim(),
        pnr: document.getElementById('pnrInput').value.trim() || null,
        originalPnrText: document.getElementById('inputText').value.trim() || null,
        flights: parsedFlights.map((flight) => {
          // 날짜 변환 (14NOV -> 2025.11.14(금))
          const convertedDate = convertDate(flight.date);
          // 도착일 변환 (익일 도착 등)
          const convertedArrivalDate = flight.arrivalDate ? convertDate(flight.arrivalDate) : convertedDate;

          return {
            flightNumber: flight.flightNumber,
            airline:
              getAirlineNameFromFlightNumber(flight.flightNumber) ||
              flight.flightNumber.split(' ')[0] ||
              '', // 항공사명 자동 추출 (예: OZ361 -> 아시아나항공)
            date: convertedDate,
            arrivalDate: convertedArrivalDate,
            departure: {
              airport: getAirportName(flight.departure),
              code: flight.departure,
              time: convertTime(flight.departureTime),
            },
            arrival: {
              airport: getAirportName(flight.arrival),
              code: flight.arrival,
              time: convertTime(flight.arrivalTime),
            },
          };
        }),
        customerInfo: {
          name: document.getElementById('nameInput').value.trim() || null,
          phone: document.getElementById('phoneInput').value.trim() || null,
          meetingPlace:
            document.getElementById('meetingPlaceInput')?.value.trim() || null,
          meetingTime:
            document.getElementById('meetingTimeInput')?.value.trim() || null,
          totalPeople:
            document.getElementById('totalPeopleInput')?.value.trim() || null,
          // 전체 승객 목록 저장 (Phase 2 - Task 3)
          passengers: parsedPassengers.map((p) => ({
            index: p.index,
            name: p.name,
          })),
        },
      };

      // StorageManager를 통해 저장
      if (typeof StorageManager === 'undefined') {
        showToast('StorageManager를 찾을 수 없습니다.', 'error');
        return;
      }

      const result = await StorageManager.saveFlightData(flightData);

      if (result.success) {
        showToast(result.message || '항공편이 저장되었습니다!', 'success');
      } else {
        showToast(result.message || '저장에 실패했습니다.', 'error');
      }
    });
  }
});
