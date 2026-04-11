/**
 * 공항 데이터베이스 관리 클래스
 * airport.txt 기반으로 생성된 공항 코드 DB
 */

class AirportDatabase {
  static airports = {
    국내: [
      { code: 'ICN', name: '인천', airport: '인천국제공항' },
      { code: 'PUS', name: '부산', airport: '김해공항' },
      { code: 'TAE', name: '대구', airport: '대구공항' },
      { code: 'GMP', name: '김포', airport: '김포공항' },
      { code: 'CJU', name: '제주', airport: '제주공항' },
    ],
    일본: [
      { code: 'NRT', name: '도쿄', airport: '나리타공항' },
      { code: 'HND', name: '도쿄', airport: '하네다공항' },
      { code: 'KIX', name: '오사카', airport: '간사이공항' },
      { code: 'FUK', name: '후쿠오카', airport: '후쿠오카공항' },
      { code: 'CTS', name: '삿포로', airport: '치토세공항' },
      { code: 'OKA', name: '오키나와', airport: '나하공항' },
      { code: 'NGO', name: '나고야', airport: '나고야공항' },
      { code: 'SDJ', name: '센다이', airport: '센다이공항' },
      { code: 'FSZ', name: '시즈오카', airport: '시즈오카공항' },
      { code: 'TAK', name: '다카마쓰', airport: '다카마쓰공항' },
      { code: 'MYJ', name: '마쓰야마', airport: '마쓰야마공항' },
      { code: 'KOJ', name: '가고시마', airport: '가고시마공항' },
      { code: 'OIT', name: '오이타', airport: '오이타공항' },
    ],
    중국: [
      { code: 'PVG', name: '상하이', airport: '푸동공항' },
      { code: 'SHA', name: '상하이', airport: '홍차오공항' },
      { code: 'PEK', name: '베이징', airport: '서우두공항' },
      { code: 'PKX', name: '베이징', airport: '다싱공항' },
      { code: 'TAO', name: '칭다오', airport: '칭다오공항' },
      { code: 'CAN', name: '광저우', airport: '바이윈공항' },
    ],
    대만홍콩: [
      { code: 'TPE', name: '타이베이', airport: '타오위안공항' },
      { code: 'TSA', name: '타이베이', airport: '송산공항' },
      { code: 'KHH', name: '가오슝', airport: '가오슝공항' },
      { code: 'HKG', name: '홍콩', airport: '홍콩공항' },
      { code: 'MFM', name: '마카오', airport: '마카오공항' },
    ],
    동남아: [
      { code: 'BKK', name: '방콕', airport: '수완나품공항' },
      { code: 'DMK', name: '방콕', airport: '돈므앙공항' },
      { code: 'HAN', name: '하노이', airport: '노이바이공항' },
      { code: 'SGN', name: '호치민', airport: '떤선녓공항' },
      { code: 'DAD', name: '다낭', airport: '다낭공항' },
      { code: 'CXR', name: '나트랑', airport: '나트랑공항' },
      { code: 'PQC', name: '푸꾸옥', airport: '푸꾸옥공항' },
      { code: 'MNL', name: '마닐라', airport: '니노이아키노공항' },
      { code: 'CEB', name: '세부', airport: '막탄세부공항' },
      { code: 'MPH', name: '카티클란', airport: '카티클란공항' },
      { code: 'SIN', name: '싱가포르', airport: '창이공항' },
      { code: 'KUL', name: '쿠알라룸푸르', airport: '쿠알라룸푸르공항' },
      { code: 'BKI', name: '코타키나발루', airport: '코타키나발루공항' },
      { code: 'CGK', name: '자카르타', airport: '수카르노하타공항' },
      { code: 'DPS', name: '발리', airport: '응우라라이공항' },
      { code: 'PNH', name: '프놈펜', airport: '프놈펜공항' },
      { code: 'KTI', name: '프놈펜', airport: '테초국제공항' },
      { code: 'REP', name: '시엠립', airport: '시엠립공항' },
      { code: 'RGN', name: '양곤', airport: '양곤공항' },
      { code: 'VTE', name: '비엔티안', airport: '왓타이공항' },
    ],
    미주: [
      { code: 'LAX', name: '로스앤젤레스', airport: '로스앤젤레스공항' },
      { code: 'JFK', name: '뉴욕', airport: '존에프케네디공항' },
      { code: 'EWR', name: '뉴욕', airport: '뉴어크공항' },
      { code: 'SFO', name: '샌프란시스코', airport: '샌프란시스코공항' },
      { code: 'SEA', name: '시애틀', airport: '시애틀공항' },
      { code: 'ORD', name: '시카고', airport: '오헤어공항' },
      { code: 'ATL', name: '애틀랜타', airport: '애틀랜타공항' },
      { code: 'DFW', name: '달라스', airport: '달라스공항' },
      { code: 'HNL', name: '호놀룰루', airport: '호놀룰루공항' },
      { code: 'GUM', name: '괌', airport: '괌공항' },
      { code: 'SPN', name: '사이판', airport: '사이판공항' },
      { code: 'YVR', name: '밴쿠버', airport: '밴쿠버공항' },
      { code: 'YYZ', name: '토론토', airport: '피어슨공항' },
    ],
    유럽: [
      { code: 'LHR', name: '런던', airport: '히드로공항' },
      { code: 'CDG', name: '파리', airport: '샤를드골공항' },
      { code: 'FRA', name: '프랑크푸르트', airport: '프랑크푸르트공항' },
      { code: 'MUC', name: '뮌헨', airport: '뮌헨공항' },
      { code: 'FCO', name: '로마', airport: '피우미치노공항' },
      { code: 'MXP', name: '밀라노', airport: '말펜사공항' },
      { code: 'AMS', name: '암스테르담', airport: '스키폴공항' },
      { code: 'MAD', name: '마드리드', airport: '마드리드공항' },
      { code: 'BCN', name: '바르셀로나', airport: '바르셀로나공항' },
      { code: 'IST', name: '이스탄불', airport: '이스탄불공항' },
      { code: 'VIE', name: '빈', airport: '빈공항' },
      { code: 'PRG', name: '프라하', airport: '프라하공항' },
      { code: 'WAW', name: '바르샤바', airport: '바르샤바공항' },
    ],
    대양주중동: [
      { code: 'SYD', name: '시드니', airport: '킹스포드스미스공항' },
      { code: 'BNE', name: '브리즈번', airport: '브리즈번공항' },
      { code: 'MEL', name: '멜버른', airport: '멜버른공항' },
      { code: 'AKL', name: '오클랜드', airport: '오클랜드공항' },
      { code: 'DXB', name: '두바이', airport: '두바이공항' },
      { code: 'AUH', name: '아부다비', airport: '아부다비공항' },
      { code: 'DOH', name: '도하', airport: '하마드공항' },
      { code: 'TAS', name: '타슈켄트', airport: '타슈켄트공항' },
      { code: 'ALA', name: '알마티', airport: '알마티공항' },
    ],
  };

  /**
   * 공항 코드로 정보 조회
   * @param {string} code - IATA 공항 코드 (예: "ICN", "NRT")
   * @returns {Object|null} - 공항 정보 또는 null
   */
  static getAirportByCode(code) {
    for (const region in this.airports) {
      const airport = this.airports[region].find((a) => a.code === code);
      if (airport) {
        return { ...airport, region };
      }
    }
    return null;
  }

  /**
   * 도시명으로 공항 검색
   * @param {string} cityName - 도시명 (예: "도쿄", "방콕")
   * @returns {Array} - 해당 도시의 공항 목록
   */
  static getAirportsByCity(cityName) {
    const results = [];
    for (const region in this.airports) {
      const matches = this.airports[region].filter((a) => a.name === cityName);
      matches.forEach((airport) => {
        results.push({ ...airport, region });
      });
    }
    return results;
  }

  /**
   * 지역별 공항 목록 조회
   * @param {string} region - 지역명 (예: "일본", "동남아")
   * @returns {Array} - 해당 지역의 공항 목록
   */
  static getAirportsByRegion(region) {
    return this.airports[region] || [];
  }

  /**
   * 공항 코드 형식 변환: "ICN" → "인천 (ICN)"
   * @param {string} code - IATA 공항 코드
   * @returns {string} - 포맷된 공항명
   */
  static formatAirportName(code) {
    const airport = this.getAirportByCode(code);
    if (airport) {
      return `${airport.name} (${code})`;
    }
    return code;
  }

  /**
   * 한국 공항 여부 확인
   * @param {string} code - IATA 공항 코드
   * @returns {boolean} - 한국 공항이면 true
   */
  static isKoreanAirport(code) {
    const koreanAirports = this.airports['국내'];
    return koreanAirports.some((a) => a.code === code);
  }

  /**
   * 전체 공항 코드 목록
   * @returns {Array} - 모든 공항 코드 배열
   */
  static getAllAirportCodes() {
    const codes = [];
    for (const region in this.airports) {
      this.airports[region].forEach((airport) => {
        codes.push(airport.code);
      });
    }
    return codes;
  }

  /**
   * 공항 검색 (코드, 도시명, 공항명으로 검색)
   * @param {string} keyword - 검색 키워드
   * @returns {Array} - 검색 결과 목록
   */
  static search(keyword) {
    const results = [];
    const searchTerm = keyword.toLowerCase();

    for (const region in this.airports) {
      this.airports[region].forEach((airport) => {
        if (
          airport.code.toLowerCase().includes(searchTerm) ||
          airport.name.includes(keyword) ||
          airport.airport.includes(keyword)
        ) {
          results.push({ ...airport, region });
        }
      });
    }

    return results;
  }
}

// 전역 접근을 위해 window 객체에 등록
if (typeof window !== 'undefined') {
  window.AirportDatabase = AirportDatabase;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AirportDatabase };
}
