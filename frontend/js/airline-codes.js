/**
 * 항공사 코드 매핑 데이터베이스
 * IATA 2-letter airline codes → 항공사 한글명
 *
 * Created: 2025-12-29
 * Purpose: 항공편 번호에서 항공사 자동 추출
 */

const AIRLINE_CODES = {
  // 대한민국 항공사
  KE: '대한항공',
  OZ: '아시아나항공',
  LJ: '진에어',
  BX: '에어부산',
  TW: '티웨이항공',
  ZE: '이스타항공',
  RS: '에어서울',
  '7C': '제주항공',
  YP: '에어프레미아',
  LW: '플라이강원',
  RF: '플라이에어',

  // 일본 항공사
  NH: '전일본공수', // ANA
  JL: '일본항공', // JAL
  '6J': '젯스타재팬',
  MM: '피치항공',
  BC: '스카이마크',
  GK: '젯스타일본',
  JW: '바닐라에어',

  // 중국 항공사
  CA: '중국국제항공',
  MU: '중국동방항공',
  CZ: '중국남방항공',
  HU: '하이난항공',
  MF: '샤먼항공',
  SC: '산둥항공',
  '3U': '쓰촨항공',
  CX: '캐세이퍼시픽',
  KA: '캐세이드래곤',
  HX: '홍콩항공',
  UO: '홍콩익스프레스',

  // 대만 항공사
  CI: '중화항공',
  BR: '에바항공',
  IT: '타이거항공타이완',
  AE: '만다린항공',

  // 동남아시아 항공사
  TG: '타이항공',
  SQ: '싱가포르항공',
  MI: '실크에어',
  TR: '스쿠트',
  '3K': '젯스타아시아',
  FD: '에어아시아',
  AK: '에어아시아',
  D7: '에어아시아X',
  VN: '베트남항공',
  VJ: '비엣젯항공',
  BL: '젯스타퍼시픽',
  PG: '방콕항공',
  SL: '타이라이온에어',
  GA: '가루다인도네시아',
  QZ: '에어아시아인도네시아',
  MH: '말레이시아항공',
  PR: '필리핀항공',
  '5J': '세부퍼시픽',
  Z2: '필리핀에어아시아',
  RJ: '로열요르단항공',
  QR: '카타르항공',
  EK: '에미레이트항공',
  EY: '에티하드항공',

  // 미주 항공사
  AA: '아메리칸항공',
  UA: '유나이티드항공',
  DL: '델타항공',
  HA: '하와이안항공',
  AC: '에어캐나다',
  AS: '알래스카항공',
  WN: '사우스웨스트항공',

  // 유럽 항공사
  LH: '루프트한자',
  BA: '브리티시에어웨이즈',
  AF: '에어프랑스',
  KL: '네덜란드항공', // KLM
  AZ: '알이탈리아',
  IB: '이베리아항공',
  SU: '아에로플로트',
  OS: '오스트리아항공',
  LX: '스위스항공',
  SK: '스칸디나비아항공',
  AY: '핀에어',
  TP: '포르투갈항공',
  FR: '라이언에어',
  U2: '이지젯',

  // 오세아니아 항공사
  QF: '콴타스항공',
  JQ: '젯스타항공',
  VA: '버진오스트레일리아',
  NZ: '뉴질랜드항공',

  // 기타 주요 항공사
  TK: '터키항공',
  EL: '에어아스타나',
  BI: '로얄브루나이항공',
  UL: '스리랑카항공',
  PK: '파키스탄항공',
  AI: '에어인디아',
  '6E': '인디고',
  SG: '스파이스젯',
  ET: '에티오피아항공',
  MS: '이집트항공',
  SA: '남아프리카항공',
  LA: '라탐항공',
  AM: '아에로멕시코',

  // 저비용항공사(LCC)
  VZ: '타이베트젯에어',
  QG: '시티링크',
  XJ: '타이에어아시아X',
  XT: '인도네시아에어아시아X',
  FY: '파이어플라이',
  I5: '아이플라이',
  IX: '에어인디아익스프레스',
  G8: '고에어',
};

/**
 * 항공편 번호에서 항공사 코드 추출
 * @param {string} flightNumber - 항공편 번호 (예: "OZ361", "KE123")
 * @returns {string|null} - 항공사 코드 (예: "OZ", "KE") 또는 null
 */
function extractAirlineCode(flightNumber) {
  if (!flightNumber || typeof flightNumber !== 'string') {
    return null;
  }

  // 공백 제거 및 대문자 변환
  const cleaned = flightNumber.trim().toUpperCase();

  // 패턴 1: 2글자 코드 + 숫자 (예: KE123, OZ361)
  const match2Letter = cleaned.match(/^([A-Z]{2})\d+/);
  if (match2Letter) {
    return match2Letter[1];
  }

  // 패턴 2: 1글자 + 1숫자 코드 (예: 7C101, 3K123)
  const match1Letter1Number = cleaned.match(/^(\d[A-Z])\d+/);
  if (match1Letter1Number) {
    return match1Letter1Number[1];
  }

  // 패턴 3: 2숫자 코드 (드물지만 존재)
  const matchNumber = cleaned.match(/^([A-Z]\d)\d+/);
  if (matchNumber) {
    return matchNumber[1];
  }

  return null;
}

/**
 * 항공사 코드를 한글 항공사명으로 변환
 * @param {string} airlineCode - 항공사 코드 (예: "OZ", "KE")
 * @returns {string} - 항공사 한글명 또는 원본 코드
 */
function getAirlineName(airlineCode) {
  if (!airlineCode) {
    return '';
  }

  const code = airlineCode.toUpperCase();
  return AIRLINE_CODES[code] || code;
}

/**
 * 항공편 번호에서 항공사명 자동 추출
 * @param {string} flightNumber - 항공편 번호 (예: "OZ361", "KE123")
 * @returns {string} - 항공사 한글명 또는 빈 문자열
 */
function getAirlineNameFromFlightNumber(flightNumber) {
  const code = extractAirlineCode(flightNumber);
  if (!code) {
    return '';
  }
  return getAirlineName(code);
}

/**
 * 전역으로 export (ES6 모듈이 아닌 경우)
 */
if (typeof window !== 'undefined') {
  window.AIRLINE_CODES = AIRLINE_CODES;
  window.extractAirlineCode = extractAirlineCode;
  window.getAirlineName = getAirlineName;
  window.getAirlineNameFromFlightNumber = getAirlineNameFromFlightNumber;
}

/**
 * ES6 모듈 export
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AIRLINE_CODES,
    extractAirlineCode,
    getAirlineName,
    getAirlineNameFromFlightNumber,
  };
}
