// @TASK P2-R1-T1 - PNR Parser Service
// @SPEC PNR 텍스트에서 항공사/편명/구간/날짜/승객명 추출
// Based on air1/js/main.js parsing logic (5 flight formats, 3 PNR formats)

export interface PnrSegment {
  airline: string;
  flight_number: string;
  route_from: string;
  route_to: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
}

export interface PnrParseResult {
  airline: string;
  flight_number: string;
  route_from: string;
  route_to: string;
  departure_date: string;
  pnr: string;
  nmtl_date?: string;
  tl_date?: string;
  remarks?: string;
  status?: 'pending' | 'confirmed' | 'ticketed' | 'cancelled';
  pax_count: number;
  passengers: { name_en: string; name_kr: string; title: string; gender: string }[];
  segments?: PnrSegment[];
}

function titleToGender(title: string): string {
  switch (title) {
    case 'MR': case 'MSTR': return 'M';
    case 'MS': case 'MRS': case 'MISS': return 'F';
    default: return '';
  }
}

const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04',
  MAY: '05', JUN: '06', JUL: '07', AUG: '08',
  SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/** GDS 날짜 (15MAR) → YYYY-MM-DD */
function convertGdsDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{1,2})([A-Z]{3})$/i);
  if (!match) return '';
  const day = match[1].padStart(2, '0');
  const month = MONTH_MAP[match[2].toUpperCase()];
  if (!month) return '';

  const now = new Date();
  const currentYear = now.getFullYear();
  const candidate = new Date(`${currentYear}-${month}-${day}T00:00:00`);
  // 과거 날짜면 다음 해
  const year = candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
    ? currentYear + 1
    : currentYear;
  return `${year}-${month}-${day}`;
}

// ─── PNR CODE EXTRACTION ───

/** 4가지 형식으로 PNR 코드 추출 (우선순위: 독립코드 > 괄호 > 키워드 > 인라인) */
function extractPnrCode(text: string, lines: string[]): string {
  // Format 1 (최우선): 첫 5줄에서 5~8자리 영숫자 (독립 또는 줄 앞부분)
  // DYMLDN 또는 DYMLDN      1.이/수아 MS (PNR + 승객이 같은 줄)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const standalone = lines[i].match(/^([A-Z0-9]{5,8})(?:\s|$)/);
    if (standalone) return standalone[1];
  }

  // Format 2: < PNR - DKFT4M > 또는 <PNR-DKFT4M>
  const bracketMatch = text.match(/<\s*PNR\s*-\s*([A-Z0-9]{5,8})\s*>/i);
  if (bracketMatch) return bracketMatch[1].toUpperCase();

  // Format 3: PNR: ABC123 / RECORD LOCATOR: ABC123 / RL: ABC123
  for (const line of lines) {
    const pnrMatch = line.match(/(?:PNR|RECORD\s*LOCATOR|RL)\s*[:\s]\s*([A-Z0-9]{5,8})/i);
    if (pnrMatch) return pnrMatch[1].toUpperCase();
  }

  // Format 4: /DCOZ*EJS5CC 또는 KE/DZ3LEF (항공사 내부 PNR, 최후수단)
  const dcMatch = text.match(/\/DC[A-Z]{2}\*([A-Z0-9]{5,8})/i);
  if (dcMatch) return dcMatch[1].toUpperCase();

  const airlinePnrMatch = text.match(/\s([A-Z]{2})\/([A-Z0-9]{5,8})(?:\s|$)/);
  if (airlinePnrMatch) return airlinePnrMatch[2].toUpperCase();

  return '';
}

// ─── PASSENGER NAME EXTRACTION ───

interface Passenger {
  index: number;
  name: string;
  name_kr: string;
  title: string;
  gender: string;
}

function parsePassengers(lines: string[]): Passenger[] {
  const passengers: Passenger[] = [];
  const seenIndexes = new Set<number>();

  for (const line of lines) {
    // Pass 1: 영문명 수집
    const englishRegex = /(\d+)\.(\d*[A-Z][A-Z/]+[A-Z]*)/g;
    let match;
    while ((match = englishRegex.exec(line)) !== null) {
      const idx = parseInt(match[1], 10);
      let fullName = match[2];
      if (/^C\//.test(fullName)) continue;
      fullName = fullName.replace(/^\d+/, '');
      if (!fullName.includes('/')) continue;

      const titleMatch = fullName.match(/\s*(MR|MS|MRS|MSTR|MISS|CHD|INF)\s*$/i);
      const title = titleMatch ? titleMatch[1].toUpperCase() : '';
      const cleanName = fullName.replace(/\s*(MR|MS|MRS|MSTR|MISS|CHD|INF)\s*$/i, '').trim();

      if (!seenIndexes.has(idx)) {
        seenIndexes.add(idx);
        passengers.push({ index: idx, name: cleanName, name_kr: '', title, gender: titleToGender(title) });
      }
    }

    // Pass 2: 한글명 수집 — 같은 index면 name_kr에 추가, 없으면 새 항목
    const koreanRegex = /(\d+)\.([\uAC00-\uD7AF]+\/[\uAC00-\uD7AF]+(?:\s*(?:MR|MS|MRS|MSTR|MISS))?)/gi;
    while ((match = koreanRegex.exec(line)) !== null) {
      const idx = parseInt(match[1], 10);
      let fullName = match[2];
      const titleMatch = fullName.match(/\s*(MR|MS|MRS|MSTR|MISS)\s*$/i);
      const title = titleMatch ? titleMatch[1].toUpperCase() : '';
      fullName = fullName.replace(/\s*(MR|MS|MRS|MSTR|MISS)\s*$/i, '').trim();

      const existing = passengers.find(p => p.index === idx);
      if (existing) {
        existing.name_kr = fullName;
        if (!existing.title && title) { existing.title = title; existing.gender = titleToGender(title); }
      } else if (!seenIndexes.has(idx)) {
        seenIndexes.add(idx);
        passengers.push({ index: idx, name: fullName, name_kr: fullName, title, gender: titleToGender(title) });
      }
    }

    // Pass 3: 괄호 한글명 — "1.KIM/GUKJIN MR(이/국진)" 패턴
    const bracketKoreanRegex = /(\d+)\.[A-Z][A-Z/\s]+(?:MR|MS|MRS|MSTR|MISS)?\s*\(([\uAC00-\uD7AF]+\/[\uAC00-\uD7AF]+)\)/gi;
    while ((match = bracketKoreanRegex.exec(line)) !== null) {
      const idx = parseInt(match[1], 10);
      const krName = match[2];
      const existing = passengers.find(p => p.index === idx);
      if (existing) {
        existing.name_kr = krName;
      }
    }
  }

  return passengers.sort((a, b) => a.index - b.index);
}

// ─── FLIGHT SEGMENT EXTRACTION ───

interface FlightSegment {
  airline: string;
  flightNumber: string;
  routeFrom: string;
  routeTo: string;
  departureDate: string;
  arrivalDate: string;
  departureTime: string;
  arrivalTime: string;
  gdsStatus: string; // HK, HL, PN, KK, KL, SS, DK 등
}

/** GDS 상태코드 → booking status 매핑 */
function normalizeGdsTime(raw: string): string {
  const stripped = raw.replace(/[+-]\d+$/, '');

  // HH:MM 형식
  const colonMatch = stripped.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const hh = parseInt(colonMatch[1], 10);
    const mm = parseInt(colonMatch[2], 10);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
    return '';
  }

  // HHMM 형식
  if (/^\d{4}$/.test(stripped)) {
    const hh = parseInt(stripped.substring(0, 2), 10);
    const mm = parseInt(stripped.substring(2, 4), 10);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${stripped.substring(0, 2)}:${stripped.substring(2, 4)}`;
    }
    return '';
  }

  return '';
}

function gdsStatusToBookingStatus(gdsStatus: string): 'confirmed' | 'pending' {
  const confirmed = ['HK', 'KK', 'KL', 'SS', 'DK', 'RR', 'TK'];
  return confirmed.includes(gdsStatus.toUpperCase()) ? 'confirmed' : 'pending';
}

function parseFlightSegments(lines: string[]): FlightSegment[] {
  const segments: FlightSegment[] = [];

  for (const line of lines) {
    // ARNK (surface segment) 스킵
    if (/\bARNK\b/.test(line)) continue;

    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 7) continue;

    // 첫 파트가 숫자(세그먼트 번호)인지 확인
    if (!/^\d+$/.test(parts[0])) continue;

    let airline = '';
    let flightNum = '';
    let dateStr = '';
    let routeStr = '';
    let gdsStatus = '';

    // ─── Format 1/2: 분리된 항공사+편명 ───
    // 1 KE 631 Y 15MAR ICNLAX HK1 1750 1150
    // 1 KE 711 U 03FEB 2 ICNNRT DK9 1325 1555
    if (parts.length >= 8 && /^[A-Z0-9]{2}$/i.test(parts[1])) {
      airline = parts[1].toUpperCase();

      // parts[3]이 날짜인지 확인 (클래스 코드가 있으면 parts[4])
      if (/^\d{1,2}[A-Z]{3}$/i.test(parts[3])) {
        // Format: idx airline flight class date [dow] route status depTime arrTime
        flightNum = parts[2].replace(/[A-Z]$/i, ''); // 클래스 코드 제거 369T → 369
        dateStr = parts[3];
        // route 찾기: 6자리 대문자 (ICNLAX)
        for (let i = 4; i < Math.min(parts.length, 8); i++) {
          if (/^[A-Z]{6}$/i.test(parts[i])) {
            routeStr = parts[i];
            break;
          }
        }
      } else if (/^\d{1,2}[A-Z]{3}$/i.test(parts[4])) {
        // Format 2: idx airline flight class date [dow] route
        flightNum = parts[2].replace(/[A-Z]$/i, '');
        dateStr = parts[4];
        for (let i = 5; i < Math.min(parts.length, 9); i++) {
          if (/^[A-Z]{6}$/i.test(parts[i])) {
            routeStr = parts[i];
            break;
          }
        }
      }
    }

    // ─── Format 3: 합체된 편명 (KE1613, 7C1301M) ───
    // 1 7C1301M 17JAN 6 ICNKIX SS1 0700 0900
    // 2 KE1613 K 02APR 4 KWJCJU HK1 1435 1530 (클래스 코드 포함)
    if (!routeStr && parts.length >= 7) {
      const compactMatch = parts[1].match(/^([A-Z0-9]{2})(\d+)[A-Z]?$/i);
      if (compactMatch) {
        airline = compactMatch[1].toUpperCase();
        flightNum = compactMatch[2];

        // 날짜 위치 탐색: parts[2] 또는 parts[3] (클래스 코드가 있는 경우)
        if (/^\d{1,2}[A-Z]{3}$/i.test(parts[2])) {
          dateStr = parts[2];
        } else if (parts.length >= 8 && /^\d{1,2}[A-Z]{3}$/i.test(parts[3])) {
          dateStr = parts[3];
        }

        if (dateStr) {
          // route 찾기: 6자리 대문자
          for (let i = 3; i < Math.min(parts.length, 8); i++) {
            if (/^[A-Z]{6}$/i.test(parts[i])) {
              routeStr = parts[i];
              break;
            }
          }
        }
      }
    }

    if (!airline || !dateStr || !routeStr) continue;

    // GDS 상태코드 추출: route 뒤의 HK25, HL1, PN3 등에서 영문부분
    if (!gdsStatus) {
      for (const p of parts) {
        const statusMatch = p.match(/^(HK|HL|HN|PN|KK|KL|SS|DK|RR|TK|UC|UN|NO)\d*$/i);
        if (statusMatch) {
          gdsStatus = statusMatch[1].toUpperCase();
          break;
        }
      }
    }

    const departureDate = convertGdsDate(dateStr);
    if (!departureDate) continue;

    // 시간 추출: HHMM, HH:MM, HHMM+1 등 다양한 GDS 형식 지원
    let departureTime = '';
    let arrivalTime = '';
    const times: string[] = [];
    for (const p of parts) {
      const normalized = normalizeGdsTime(p);
      if (normalized) {
        times.push(normalized);
      }
    }
    if (times.length >= 2) {
      departureTime = times[0];
      arrivalTime = times[1];
    } else if (times.length === 1) {
      departureTime = times[0];
    }

    // 도착일 추출: 시간 뒤에 날짜 형식(DDMMM)이 있으면 도착일
    let arrivalDate = departureDate;
    for (let pi = 0; pi < parts.length; pi++) {
      const p = parts[pi];
      // 이미 출발 날짜로 사용된 것은 건너뛰기
      if (p === dateStr) continue;
      // DDMMM 형식 (예: 01MAY, 26APR)
      if (/^\d{2}[A-Z]{3}$/i.test(p)) {
        const converted = convertGdsDate(p);
        if (converted && converted !== departureDate) {
          arrivalDate = converted;
          break;
        }
      }
    }

    segments.push({
      airline,
      flightNumber: `${airline}${flightNum}`,
      routeFrom: routeStr.substring(0, 3).toUpperCase(),
      routeTo: routeStr.substring(3, 6).toUpperCase(),
      departureDate,
      arrivalDate,
      departureTime,
      arrivalTime,
      gdsStatus: gdsStatus || 'HK',
    });
  }

  return segments;
}

// ─── PHONE EXTRACTION ───

function parsePhones(lines: string[]): string[] {
  const phones: string[] = [];
  let inPhoneSection = false;

  for (const line of lines) {
    if (/^PHONES/i.test(line)) { inPhoneSection = true; continue; }
    if (inPhoneSection) {
      // SELT*063-271-9090 CTW GJ/KIM  or  SELM*010-3680-2242
      const phoneMatch = line.match(/SEL[A-Z]\*([0-9-]+)\s*(.*)/i);
      if (phoneMatch) {
        const number = phoneMatch[1];
        const note = phoneMatch[2]?.trim() || '';
        phones.push(note ? `${number} (${note})` : number);
      } else if (/^\d+\./.test(line)) {
        // 다른 섹션의 번호 라인이면 무시
        if (!/SEL/i.test(line)) { inPhoneSection = false; }
      } else {
        inPhoneSection = false;
      }
    }
  }
  return phones;
}

// ─── TKT TIME LIMIT (ADTK) EXTRACTION ───

function parseTktTimeLimit(text: string): string {
  // SSR ADTK ... BY 12MAR 1600 ... OTHERWISE WILL BE XLD
  const adtkMatch = text.match(/ADTK[^]*?BY\s+(\d{1,2})([A-Z]{3})\s+(\d{4})/i);
  if (adtkMatch) {
    return convertGdsDate(`${adtkMatch[1]}${adtkMatch[2]}`);
  }
  // TAW 직접 날짜: TAW/25FEB
  const tawMatch = text.match(/TAW\/(\d{1,2}[A-Z]{3})/i);
  if (tawMatch) {
    return convertGdsDate(tawMatch[1]);
  }
  return '';
}

// ─── GENERAL FACTS: NMTL / TL EXTRACTION ───
// SSR OTHS 1B 05APR/0830 - NAME TL 100 PERCENT /RC  → NMTL
// SSR OTHS 1B 28APR/2255 - TICKET TL /RC             → TL
// SSR TKTL OZ 28APR                                   → TL (fallback)
// 중복 시 가장 마지막 번호(최신 협의분) 사용

interface TimeLimits {
  nmtl: string;
  tl: string;
}

function parseGeneralFactsLimits(lines: string[]): TimeLimits {
  let nmtl = '';
  let tl = '';

  for (const line of lines) {
    // SSR OTHS ... NAME TL: NMTL
    const nmtlMatch = line.match(/SSR\s+OTHS\s+\S+\s+(\d{1,2}[A-Z]{3})\/\d+\s*-\s*NAME\s+TL/i);
    if (nmtlMatch) {
      nmtl = convertGdsDate(nmtlMatch[1]);
      continue;
    }

    // SSR OTHS ... TICKET TL: TL
    const tlMatch = line.match(/SSR\s+OTHS\s+\S+\s+(\d{1,2}[A-Z]{3})\/\d+\s*-\s*TICKET\s+TL/i);
    if (tlMatch) {
      tl = convertGdsDate(tlMatch[1]);
      continue;
    }

    // SSR TKTL OZ 28APR: TL (fallback)
    const tktlMatch = line.match(/SSR\s+TKTL\s+\S+\s+(\d{1,2}[A-Z]{3})/i);
    if (tktlMatch) {
      tl = convertGdsDate(tktlMatch[1]);
    }
  }

  return { nmtl, tl };
}

// ─── MULTI-PNR SPLITTER ───

/** 여러 PNR이 붙여넣기된 텍스트를 개별 PNR 블록으로 분리 */
function splitPnrBlocks(text: string): string[] {
  // \r\n → \n 정규화
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const blocks: string[][] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) { current.push(lines[i]); continue; }

    // PNR 블록 구분: 5~8자리 영숫자만 있는 독립 라인 (또는 뒤에 승객번호 연결)
    // 예: "AWRDUK", "LUEUQZ", "DYMLDN      1.이/수아 MS"
    const isPnrLine = /^[A-Z0-9]{5,8}(\s|$)/.test(trimmed) &&
                       !/^\d+\s/.test(trimmed);  // 세그먼트 라인 제외 (숫자+공백으로 시작)

    if (isPnrLine && current.length > 0) {
      // 현재 블록에 세그먼트 또는 승객 라인이 있으면 분리
      const hasContent = current.some(l => {
        const t = l.trim();
        // 세그먼트: "1 OZ 521V...", "2 KE1613..."
        if (/^\d+\s+[A-Z0-9]{2}[\s\d]/.test(t)) return true;
        // 승객: "1.1JEONG/...", "1.이/수아"
        if (/^\d+\.\d*[A-Z\uAC00-\uD7AF]/.test(t)) return true;
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

// ─── SINGLE PNR PARSER ───

function parseSinglePnr(text: string): PnrParseResult | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const pnrCode = extractPnrCode(text, lines);
  const passengers = parsePassengers(lines);
  const segments = parseFlightSegments(lines);
  const phones = parsePhones(lines);
  const tktLimit = parseTktTimeLimit(text);
  const gfLimits = parseGeneralFactsLimits(lines);

  if (segments.length === 0) return null;

  // 비고: 전화번호만 (구간 상세는 segments 필드로 전달)
  const remarksParts: string[] = [];
  if (phones.length > 0) remarksParts.push(`연락처: ${phones.join(' / ')}`);
  const remarks = remarksParts.length > 0 ? remarksParts.join(' | ') : undefined;

  const pax = passengers.map(p => ({ name_en: p.name.toUpperCase(), name_kr: p.name_kr || '', title: p.title, gender: p.gender }));
  return {
    airline: segments[0].airline,
    flight_number: segments.map(s => s.flightNumber).join(' / '),
    route_from: segments[0].routeFrom,
    route_to: segments[segments.length - 1].routeTo,
    departure_date: segments[0].departureDate,
    pnr: pnrCode || 'UNKNOWN',
    pax_count: passengers.length || 1,
    passengers: pax,
    segments: segments.map(s => ({
      airline: s.airline,
      flight_number: s.flightNumber,
      route_from: s.routeFrom,
      route_to: s.routeTo,
      departure_date: s.departureDate,
      arrival_date: s.arrivalDate || s.departureDate,
      departure_time: s.departureTime || '',
      arrival_time: s.arrivalTime || '',
    })),
    status: segments.some(s => gdsStatusToBookingStatus(s.gdsStatus) === 'pending') ? 'pending' : 'confirmed',
    ...(( gfLimits.nmtl || tktLimit) && { nmtl_date: gfLimits.nmtl || tktLimit }),
    ...(gfLimits.tl && { tl_date: gfLimits.tl }),
    ...(remarks && { remarks }),
  };
}

// ─── MAIN PARSER (다중 PNR 지원) ───

export function parsePnr(text: string): PnrParseResult[] {
  const blocks = splitPnrBlocks(text);
  const results: PnrParseResult[] = [];

  for (const block of blocks) {
    const result = parseSinglePnr(block);
    if (result) results.push(result);
  }

  // 같은 단체의 다중 PNR: 세그먼트 통일
  // 첫 PNR의 세그먼트를 기준으로 나머지도 동일하게 맞춤
  if (results.length > 1) {
    const refSegs = results[0].segments;
    if (refSegs && refSegs.length > 0) {
      const refKey = refSegs.map(s => `${s.flight_number}|${s.route_from}→${s.route_to}|${s.departure_date}`).join(',');
      for (let i = 1; i < results.length; i++) {
        const r = results[i];
        // 세그먼트가 동일한 구간인지 확인 (편명+구간+날짜)
        if (r.segments && r.segments.length > 0) {
          const rKey = r.segments.map(s => `${s.flight_number}|${s.route_from}→${s.route_to}|${s.departure_date}`).join(',');
          if (rKey === refKey) {
            // 동일 스케줄 → 기본 필드도 통일
            r.airline = results[0].airline;
            r.flight_number = results[0].flight_number;
            r.route_from = results[0].route_from;
            r.route_to = results[0].route_to;
            r.departure_date = results[0].departure_date;
          }
        }
      }
    }
  }

  return results;
}
