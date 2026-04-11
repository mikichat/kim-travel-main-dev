// 공항 코드 → 도시명 통합 매핑
// 원본: main/js/airport-database.js + 기존 하드코딩 통합
// air-booking 서버 전역에서 import하여 사용

export interface AirportInfo {
  code: string;
  name: string;
  airport: string;
  region: string;
}

const AIRPORTS: AirportInfo[] = [
  // ── 국내 ──
  { code: 'ICN', name: '인천', airport: '인천국제공항', region: '국내' },
  { code: 'GMP', name: '김포', airport: '김포공항', region: '국내' },
  { code: 'PUS', name: '부산', airport: '김해공항', region: '국내' },
  { code: 'TAE', name: '대구', airport: '대구공항', region: '국내' },
  { code: 'CJU', name: '제주', airport: '제주공항', region: '국내' },
  { code: 'KWJ', name: '광주', airport: '광주공항', region: '국내' },

  // ── 일본 ──
  { code: 'NRT', name: '도쿄/나리타', airport: '나리타공항', region: '일본' },
  { code: 'HND', name: '도쿄/하네다', airport: '하네다공항', region: '일본' },
  { code: 'KIX', name: '오사카', airport: '간사이공항', region: '일본' },
  { code: 'FUK', name: '후쿠오카', airport: '후쿠오카공항', region: '일본' },
  { code: 'CTS', name: '삿포로', airport: '치토세공항', region: '일본' },
  { code: 'OKA', name: '오키나와', airport: '나하공항', region: '일본' },
  { code: 'NGO', name: '나고야', airport: '나고야공항', region: '일본' },
  { code: 'SDJ', name: '센다이', airport: '센다이공항', region: '일본' },
  { code: 'FSZ', name: '시즈오카', airport: '시즈오카공항', region: '일본' },
  { code: 'TAK', name: '다카마쓰', airport: '다카마쓰공항', region: '일본' },
  { code: 'MYJ', name: '마쓰야마', airport: '마쓰야마공항', region: '일본' },
  { code: 'KOJ', name: '가고시마', airport: '가고시마공항', region: '일본' },
  { code: 'OIT', name: '오이타', airport: '오이타공항', region: '일본' },

  // ── 중국 ──
  { code: 'PEK', name: '북경', airport: '서우두공항', region: '중국' },
  { code: 'PKX', name: '북경', airport: '다싱공항', region: '중국' },
  { code: 'PVG', name: '상해', airport: '푸동공항', region: '중국' },
  { code: 'SHA', name: '상해', airport: '홍차오공항', region: '중국' },
  { code: 'CAN', name: '광저우', airport: '바이윈공항', region: '중국' },
  { code: 'TAO', name: '칭다오', airport: '칭다오공항', region: '중국' },

  // ── 대만/홍콩 ──
  { code: 'TPE', name: '타이페이', airport: '타오위안공항', region: '대만홍콩' },
  { code: 'TSA', name: '타이베이', airport: '송산공항', region: '대만홍콩' },
  { code: 'KHH', name: '가오슝', airport: '가오슝공항', region: '대만홍콩' },
  { code: 'HKG', name: '홍콩', airport: '홍콩공항', region: '대만홍콩' },
  { code: 'MFM', name: '마카오', airport: '마카오공항', region: '대만홍콩' },

  // ── 동남아 ──
  { code: 'BKK', name: '방콕', airport: '수완나품공항', region: '동남아' },
  { code: 'DMK', name: '방콕', airport: '돈므앙공항', region: '동남아' },
  { code: 'HAN', name: '하노이', airport: '노이바이공항', region: '동남아' },
  { code: 'SGN', name: '호치민', airport: '떤선녓공항', region: '동남아' },
  { code: 'DAD', name: '다낭', airport: '다낭공항', region: '동남아' },
  { code: 'CXR', name: '나트랑', airport: '나트랑공항', region: '동남아' },
  { code: 'PQC', name: '푸꾸옥', airport: '푸꾸옥공항', region: '동남아' },
  { code: 'MNL', name: '마닐라', airport: '니노이아키노공항', region: '동남아' },
  { code: 'CEB', name: '세부', airport: '막탄세부공항', region: '동남아' },
  { code: 'MPH', name: '카티클란', airport: '카티클란공항', region: '동남아' },
  { code: 'SIN', name: '싱가포르', airport: '창이공항', region: '동남아' },
  { code: 'KUL', name: '쿠알라룸푸르', airport: '쿠알라룸푸르공항', region: '동남아' },
  { code: 'BKI', name: '코타키나발루', airport: '코타키나발루공항', region: '동남아' },
  { code: 'CGK', name: '자카르타', airport: '수카르노하타공항', region: '동남아' },
  { code: 'DPS', name: '발리', airport: '응우라라이공항', region: '동남아' },
  { code: 'PNH', name: '프놈펜', airport: '프놈펜공항', region: '동남아' },
  { code: 'REP', name: '시엠립', airport: '시엠립공항', region: '동남아' },
  { code: 'RGN', name: '양곤', airport: '양곤공항', region: '동남아' },
  { code: 'VTE', name: '비엔티안', airport: '왓타이공항', region: '동남아' },

  // ── 미주 ──
  { code: 'LAX', name: '로스앤젤레스', airport: '로스앤젤레스공항', region: '미주' },
  { code: 'JFK', name: '뉴욕', airport: '존에프케네디공항', region: '미주' },
  { code: 'EWR', name: '뉴욕', airport: '뉴어크공항', region: '미주' },
  { code: 'SFO', name: '샌프란시스코', airport: '샌프란시스코공항', region: '미주' },
  { code: 'SEA', name: '시애틀', airport: '시애틀공항', region: '미주' },
  { code: 'ORD', name: '시카고', airport: '오헤어공항', region: '미주' },
  { code: 'ATL', name: '애틀랜타', airport: '애틀랜타공항', region: '미주' },
  { code: 'DFW', name: '달라스', airport: '달라스공항', region: '미주' },
  { code: 'HNL', name: '호놀룰루', airport: '호놀룰루공항', region: '미주' },
  { code: 'GUM', name: '괌', airport: '괌공항', region: '미주' },
  { code: 'SPN', name: '사이판', airport: '사이판공항', region: '미주' },
  { code: 'YVR', name: '밴쿠버', airport: '밴쿠버공항', region: '미주' },
  { code: 'YYZ', name: '토론토', airport: '피어슨공항', region: '미주' },

  // ── 유럽 ──
  { code: 'LHR', name: '런던', airport: '히드로공항', region: '유럽' },
  { code: 'CDG', name: '파리', airport: '샤를드골공항', region: '유럽' },
  { code: 'FRA', name: '프랑크푸르트', airport: '프랑크푸르트공항', region: '유럽' },
  { code: 'MUC', name: '뮌헨', airport: '뮌헨공항', region: '유럽' },
  { code: 'FCO', name: '로마', airport: '피우미치노공항', region: '유럽' },
  { code: 'MXP', name: '밀라노', airport: '말펜사공항', region: '유럽' },
  { code: 'AMS', name: '암스테르담', airport: '스키폴공항', region: '유럽' },
  { code: 'MAD', name: '마드리드', airport: '마드리드공항', region: '유럽' },
  { code: 'BCN', name: '바르셀로나', airport: '바르셀로나공항', region: '유럽' },
  { code: 'LIS', name: '리스본', airport: '리스본공항', region: '유럽' },
  { code: 'OPO', name: '포르투', airport: '포르투공항', region: '유럽' },
  { code: 'IST', name: '이스탄불', airport: '이스탄불공항', region: '유럽' },
  { code: 'VIE', name: '비엔나', airport: '빈공항', region: '유럽' },
  { code: 'PRG', name: '프라하', airport: '프라하공항', region: '유럽' },
  { code: 'ZRH', name: '취리히', airport: '취리히공항', region: '유럽' },
  { code: 'CPH', name: '코펜하겐', airport: '코펜하겐공항', region: '유럽' },
  { code: 'OSL', name: '오슬로', airport: '오슬로공항', region: '유럽' },
  { code: 'ARN', name: '스톡홀름', airport: '알란다공항', region: '유럽' },
  { code: 'HEL', name: '헬싱키', airport: '헬싱키공항', region: '유럽' },
  { code: 'WAW', name: '바르샤바', airport: '바르샤바공항', region: '유럽' },
  { code: 'BUD', name: '부다페스트', airport: '부다페스트공항', region: '유럽' },
  { code: 'ATH', name: '아테네', airport: '아테네공항', region: '유럽' },
  { code: 'DUB', name: '더블린', airport: '더블린공항', region: '유럽' },
  { code: 'EDI', name: '에든버러', airport: '에든버러공항', region: '유럽' },

  // ── 대양주/중동/중앙아시아 ──
  { code: 'SYD', name: '시드니', airport: '킹스포드스미스공항', region: '대양주중동' },
  { code: 'BNE', name: '브리즈번', airport: '브리즈번공항', region: '대양주중동' },
  { code: 'MEL', name: '멜버른', airport: '멜버른공항', region: '대양주중동' },
  { code: 'AKL', name: '오클랜드', airport: '오클랜드공항', region: '대양주중동' },
  { code: 'DXB', name: '두바이', airport: '두바이공항', region: '대양주중동' },
  { code: 'AUH', name: '아부다비', airport: '아부다비공항', region: '대양주중동' },
  { code: 'DOH', name: '도하', airport: '하마드공항', region: '대양주중동' },
  { code: 'DEL', name: '델리', airport: '인디라간디공항', region: '대양주중동' },
  { code: 'BOM', name: '뭄바이', airport: '뭄바이공항', region: '대양주중동' },
  { code: 'TAS', name: '타슈켄트', airport: '타슈켄트공항', region: '대양주중동' },
  { code: 'ALA', name: '알마티', airport: '알마티공항', region: '대양주중동' },

  // ── 러시아/몽골 ──
  { code: 'VVO', name: '블라디보스톡', airport: '블라디보스톡공항', region: '러시아몽골' },
  { code: 'ULN', name: '울란바토르', airport: '울란바토르공항', region: '러시아몽골' },
];

// 코드 → 도시명 빠른 조회용 맵 (서버 시작 시 1회 생성)
const AIRPORT_CITY: Record<string, string> = {};
for (const a of AIRPORTS) {
  AIRPORT_CITY[a.code] = a.name;
}

/** 공항 코드 → 도시명 변환. 매핑 없으면 코드 그대로 반환 */
export function airportToCity(code: string): string {
  return AIRPORT_CITY[code.toUpperCase()] || code;
}

/** 공항 코드 → 상세 정보 조회 */
export function getAirportByCode(code: string): AirportInfo | undefined {
  return AIRPORTS.find(a => a.code === code.toUpperCase());
}

/** 전체 AIRPORT_CITY 맵 반환 (클라이언트 전달용) */
export function getAirportCityMap(): Record<string, string> {
  return { ...AIRPORT_CITY };
}

/** 전체 공항 목록 반환 */
export function getAllAirports(): AirportInfo[] {
  return AIRPORTS;
}
