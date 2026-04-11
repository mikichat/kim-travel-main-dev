// PNR 파싱 서비스 — PnrConverter.tsx 에서 추출된 순수 파싱 로직

// ─── Types ───────────────────────────────────────────────

export interface ParsedFlight {
  flightNumber: string;
  date: string; // raw: "14NOV"
  departure: string; // airport code
  arrival: string;
  departureTime: string; // raw: "0820"
  arrivalTime: string;
  arrivalDate: string | null; // raw: "15DEC" or null
}

export interface ParsedPassenger {
  index: number;
  name: string;
  title: string; // MR, MS, MSTR, MISS
}

export interface ParseResult {
  bookingType: 'group' | 'individual';
  pnr: string;
  flights: ParsedFlight[];
  passengers: ParsedPassenger[];
}

// ─── Airport code → 한글 맵 (fallback) ───────────────────

export const AIRPORT_MAP: Record<string, string> = {
  ICN: '인천', CAN: '광저우', PVG: '상하이', PEK: '베이징',
  NRT: '나리타', HND: '하네다', KIX: '간사이', BKK: '방콕',
  SIN: '싱가포르', HKG: '홍콩', TPE: '타이페이', GMP: '김포',
  MNL: '마닐라', CRK: '클라크', SGN: '호치민', HAN: '하노이',
  DAD: '다낭', CXR: '나트랑', PNH: '프놈펜', REP: '시엠립',
  RGN: '양곤', VTE: '비엔티안', LPQ: '루앙프라방',
  DPS: '발리', CGK: '자카르타', KUL: '쿠알라룸푸르',
  CEB: '세부', KLO: '칼리보', PUS: '부산', CJU: '제주',
  TAE: '대구', FUK: '후쿠오카', NGO: '나고야', CTS: '삿포로',
  OKA: '오키나와', LAX: '로스앤젤레스', JFK: '뉴욕',
  SFO: '샌프란시스코', CDG: '파리', LHR: '런던', FRA: '프랑크푸르트',
  FCO: '로마', BCN: '바르셀로나', IST: '이스탄불', SYD: '시드니',
  AKL: '오클랜드', DEL: '델리', BOM: '뭄바이', DXB: '두바이',
};

// ─── Runtime airport data (populated by loadAirportData) ─

let airportCodeMap: Record<string, string> = {};
let airportDataLoaded = false;

export async function loadAirportData(): Promise<void> {
  if (airportDataLoaded) return;
  try {
    const res = await fetch('/air1/world_airports_by_region.json');
    if (!res.ok) throw new Error('load failed');
    const data = await res.json();
    for (const region in data) {
      for (const airport of data[region]) {
        airportCodeMap[airport['공항코드']] = airport['도시'];
      }
    }
    airportDataLoaded = true;
  } catch {
    // fallback: AIRPORT_MAP 사용
  }
}

export function getAirportName(code: string): string {
  return airportCodeMap[code] || AIRPORT_MAP[code] || code;
}

// ─── Date / Time helpers ─────────────────────────────────

export const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export function convertDate(dateStr: string): string {
  const day = dateStr.substring(0, 2);
  const month = MONTH_MAP[dateStr.substring(2, 5)];
  if (!month) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let year = today.getFullYear();
  let date = new Date(`${year}-${month}-${day}`);
  date.setHours(0, 0, 0, 0);

  if (date <= today) {
    year++;
    date = new Date(`${year}-${month}-${day}`);
  }
  return `${year}.${month}.${day}(${DAY_NAMES[date.getDay()]})`;
}

export function convertDateISO(dateStr: string): string {
  const day = dateStr.substring(0, 2);
  const month = MONTH_MAP[dateStr.substring(2, 5)];
  if (!month) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let year = today.getFullYear();
  let date = new Date(`${year}-${month}-${day}`);
  date.setHours(0, 0, 0, 0);

  if (date <= today) year++;
  return `${year}-${month}-${day}`;
}

export function convertTime(timeStr: string): string {
  if (!timeStr || timeStr.length !== 4) return timeStr;
  return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
}

// ─── PNR Parsing ─────────────────────────────────────────

export function detectBookingType(input: string): 'group' | 'individual' {
  if (/(?:^|\n)\s*1\.C\//m.test(input)) return 'group';
  const hkMatch = input.match(/HK(\d+)/);
  if (hkMatch && parseInt(hkMatch[1]) >= 10) return 'group';
  const passengerCount = (input.match(/\d+\.\d*[A-Z]/g) || []).length;
  if (passengerCount >= 5) return 'group';
  return 'individual';
}

export function extractPnr(input: string, lines: string[]): string {
  // 형식 2: < PNR - XXXXXX >
  const bracketMatch = input.match(/<\s*PNR\s*-\s*([A-Z0-9]{6})\s*>/i);
  if (bracketMatch) return bracketMatch[1].toUpperCase();

  // 형식 1: 독립된 6자리 PNR (첫 5줄)
  const searchLines = Math.min(lines.length, 5);
  for (let i = 0; i < searchLines; i++) {
    const line = lines[i].trim();
    const pnrMatch = line.match(/^([A-Z0-9]{6})$/);
    if (pnrMatch) return pnrMatch[1];
  }

  // 형식 3: /DC항공사*PNR
  const dcMatch = input.match(/\/DC[A-Z]{2}\*([A-Z0-9]{6})/i);
  if (dcMatch) return dcMatch[1].toUpperCase();

  // 형식 4: 항공사/PNR
  const airlinePnrMatch = input.match(/\s([A-Z]{2})\/([A-Z0-9]{6})(?:\s|$)/);
  if (airlinePnrMatch) return airlinePnrMatch[2].toUpperCase();

  return '';
}

export function parseFlightInfo(line: string): ParsedFlight | null {
  const parts = line.split(/\s+/).filter(Boolean);

  // 형식5: 7개 파트 (간소화)
  if (parts.length === 7) {
    const isDate = /^\d{2}[A-Z]{3}$/.test(parts[2]);
    const isRoute = /^[A-Z]{6}$/.test(parts[3]);
    if (isDate && isRoute) {
      let flightNumber = parts[1];
      const match = flightNumber.match(/^([A-Z0-9]{2})(\d+)[A-Z]?$/);
      if (match) flightNumber = match[1] + ' ' + match[2];
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

  if (parts.length < 8) return null;

  let flightNumber: string, dateIndex: number, routeIndex: number,
    departureTimeIndex: number, arrivalTimeIndex: number;
  let arrivalDate: string | null = null;

  // 형식4: parts[2]가 날짜 (항공편명 붙어있음)
  if (/^\d{2}[A-Z]{3}$/.test(parts[2])) {
    flightNumber = parts[1];
    const match = flightNumber.match(/^([A-Z0-9]{2})(\d+)[A-Z]?$/);
    if (match) flightNumber = match[1] + ' ' + match[2];
    dateIndex = 2; routeIndex = 4;
    departureTimeIndex = 6; arrivalTimeIndex = 7;
    if (parts.length > 8 && /^\d{2}[A-Z]{3}$/.test(parts[8])) arrivalDate = parts[8];
  }
  // 형식1: parts[3]가 날짜
  else if (/^\d{2}[A-Z]{3}$/.test(parts[3])) {
    flightNumber = parts[1] + ' ' + parts[2];
    flightNumber = flightNumber.replace(/(\d+)[A-Z]$/, '$1');
    dateIndex = 3; routeIndex = 5;
    departureTimeIndex = 7; arrivalTimeIndex = 8;
    if (parts.length > 9 && /^\d{2}[A-Z]{3}$/.test(parts[9])) arrivalDate = parts[9];
  }
  // 형식2
  else {
    flightNumber = parts[1] + ' ' + parts[2];
    dateIndex = 4; routeIndex = 6;
    departureTimeIndex = 8; arrivalTimeIndex = 9;
    if (parts.length > 10 && /^\d{2}[A-Z]{3}$/.test(parts[10])) arrivalDate = parts[10];
  }

  const date = parts[dateIndex];
  const route = parts[routeIndex];
  if (!route || route.length < 6) return null;

  return {
    flightNumber,
    date,
    departure: route.substring(0, 3),
    arrival: route.substring(3, 6),
    departureTime: parts[departureTimeIndex],
    arrivalTime: parts[arrivalTimeIndex],
    arrivalDate,
  };
}

export function cleanPassengerName(name: string): string {
  return name.replace(/\s*(MR|MS|MSTR|MISS)\s*$/i, '').trim();
}

export function extractTitle(name: string): string {
  const match = name.match(/(MR|MS|MSTR|MISS)\s*$/i);
  return match ? match[1].toUpperCase() : '';
}

export function parsePassengerNames(inputText: string, isGroup: boolean): ParsedPassenger[] {
  const names: ParsedPassenger[] = [];

  // 영문
  const englishRegex = /(\d+)\.(\d*[A-Z][A-Z/]+[A-Z]*)/g;
  let match;
  while ((match = englishRegex.exec(inputText)) !== null) {
    let fullName = match[2];
    const idx = parseInt(match[1]);
    if (isGroup && idx === 1 && /^C\//.test(fullName)) continue;
    fullName = fullName.replace(/^\d+/, '');
    names.push({ index: idx, name: cleanPassengerName(fullName), title: extractTitle(fullName) });
  }

  // 한글
  const koreanRegex = /(\d+)\.([\uAC00-\uD7AF]+\/[\uAC00-\uD7AF]+(?:\s*(?:MR|MS|MSTR|MISS))?)/gi;
  while ((match = koreanRegex.exec(inputText)) !== null) {
    const fullName = match[2];
    names.push({ index: parseInt(match[1]), name: cleanPassengerName(fullName), title: extractTitle(fullName) });
  }

  // 중복 제거 + 정렬
  const seen = new Set<number>();
  return names
    .filter(n => { if (seen.has(n.index)) return false; seen.add(n.index); return true; })
    .sort((a, b) => a.index - b.index);
}

/** 다중 PNR 텍스트를 개별 블록으로 분리 */
function splitPnrBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const blocks: string[][] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) { current.push(lines[i]); continue; }

    // PNR 코드: 5~8자리 영숫자 독립 라인, 세그먼트 번호(숫자+공백) 제외
    const isPnrLine = /^[A-Z0-9]{5,8}(\s|$)/.test(trimmed) && !/^\d+\s/.test(trimmed);

    if (isPnrLine && current.length > 0) {
      const hasContent = current.some(l => {
        const t = l.trim();
        if (/^\d+\s+[A-Z0-9]{2}[\s\d]/.test(t)) return true; // 세그먼트
        if (/^\d+\.\d*[A-Z\uAC00-\uD7AF]/.test(t)) return true; // 승객
        return false;
      });
      if (hasContent) {
        blocks.push(current);
        current = [];
      }
    }
    current.push(lines[i]);
  }
  if (current.length > 0) blocks.push(current);

  if (blocks.length <= 1) return [normalized];
  return blocks.map(b => b.join('\n'));
}

function parseSinglePnrInput(input: string): ParseResult | null {
  const lines = input.split(/\n/).filter(l => l.trim() !== '');
  if (lines.length < 1) return null;

  const bookingType = detectBookingType(input);
  const pnr = extractPnr(input, lines);

  const flights: ParsedFlight[] = [];
  for (const line of lines) {
    if (/\bARNK\b/.test(line)) continue;
    const f = parseFlightInfo(line);
    if (f) flights.push(f);
  }

  if (flights.length === 0) return null;

  const passengers = parsePassengerNames(input, bookingType === 'group');

  return { bookingType, pnr, flights, passengers };
}

/** 단일 PNR 파싱 (기존 호환) */
export function parsePnrInput(input: string): ParseResult | null {
  const blocks = splitPnrBlocks(input);
  // 첫 번째 블록만 반환 (기존 단건 인터페이스 유지)
  return parseSinglePnrInput(blocks[0]);
}

/** 다중 PNR 파싱 — 여러 PNR을 배열로 반환 */
export function parseMultiplePnrInputs(input: string): ParseResult[] {
  const blocks = splitPnrBlocks(input);
  const results: ParseResult[] = [];
  for (const block of blocks) {
    const result = parseSinglePnrInput(block);
    if (result) results.push(result);
  }
  return results;
}

export function getSegmentLabel(index: number, total: number): string {
  if (total === 1) return '출발';
  if (total === 2) return index === 0 ? '출발' : '도착';
  if (index === 0) return '출발';
  if (index === total - 1) return '도착';
  return '경유';
}
