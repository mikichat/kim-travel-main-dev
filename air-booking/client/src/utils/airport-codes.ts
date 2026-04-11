// 공항 코드 → 도시명 통합 매핑 (클라이언트용)
// 원본: main/js/airport-database.js + server/src/utils/airport-codes.ts 동일 데이터

export const AIRPORT_CITY: Record<string, string> = {
  // 국내
  ICN: '인천', GMP: '김포', PUS: '부산', TAE: '대구', CJU: '제주', KWJ: '광주',
  // 일본
  NRT: '도쿄/나리타', HND: '도쿄/하네다', KIX: '오사카', FUK: '후쿠오카', CTS: '삿포로',
  OKA: '오키나와', NGO: '나고야', SDJ: '센다이', FSZ: '시즈오카', TAK: '다카마쓰',
  MYJ: '마쓰야마', KOJ: '가고시마', OIT: '오이타',
  // 중국
  PEK: '북경', PKX: '북경', PVG: '상해', SHA: '상해', CAN: '광저우', TAO: '칭다오',
  // 대만/홍콩
  TPE: '타이페이', TSA: '타이베이', KHH: '가오슝', HKG: '홍콩', MFM: '마카오',
  // 동남아
  BKK: '방콕', DMK: '방콕', HAN: '하노이', SGN: '호치민', DAD: '다낭', CXR: '나트랑',
  PQC: '푸꾸옥', MNL: '마닐라', CEB: '세부', MPH: '카티클란',
  SIN: '싱가포르', KUL: '쿠알라룸푸르', BKI: '코타키나발루',
  CGK: '자카르타', DPS: '발리', PNH: '프놈펜', REP: '시엠립', RGN: '양곤', VTE: '비엔티안',
  // 미주
  LAX: '로스앤젤레스', JFK: '뉴욕', EWR: '뉴욕', SFO: '샌프란시스코', SEA: '시애틀',
  ORD: '시카고', ATL: '애틀랜타', DFW: '달라스', HNL: '호놀룰루',
  GUM: '괌', SPN: '사이판', YVR: '밴쿠버', YYZ: '토론토',
  // 유럽
  LHR: '런던', CDG: '파리', FRA: '프랑크푸르트', MUC: '뮌헨', FCO: '로마', MXP: '밀라노',
  AMS: '암스테르담', MAD: '마드리드', BCN: '바르셀로나', LIS: '리스본', OPO: '포르투',
  IST: '이스탄불', VIE: '비엔나', PRG: '프라하', ZRH: '취리히',
  CPH: '코펜하겐', OSL: '오슬로', ARN: '스톡홀름', HEL: '헬싱키',
  WAW: '바르샤바', BUD: '부다페스트', ATH: '아테네', DUB: '더블린', EDI: '에든버러',
  // 대양주/중동
  SYD: '시드니', BNE: '브리즈번', MEL: '멜버른', AKL: '오클랜드',
  DXB: '두바이', AUH: '아부다비', DOH: '도하', DEL: '델리', BOM: '뭄바이',
  TAS: '타슈켄트', ALA: '알마티',
  // 러시아/몽골
  VVO: '블라디보스톡', ULN: '울란바토르',
};

/** 공항 코드 → 도시명 변환. 매핑 없으면 코드 그대로 반환 */
export function airportToCity(code: string): string {
  return AIRPORT_CITY[code.toUpperCase()] || code;
}
