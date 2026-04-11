// 인보이스 시스템 설정 파일
// 환경에 따라 이 파일만 수정하면 됩니다.

const CONFIG = {
  // API 서버 URL
  API_BASE_URL: '/api',

  // 개발/운영 환경 구분
  ENV: 'development', // 'development' | 'production'

  // 회사 정보
  COMPANY: {
    NAME: '(유)여행세상',
    CEO: '김국진',
    ADDRESS: '전주시 완산구',
    PHONE: '063-XXX-XXXX',
  },

  // 이미지 경로
  IMAGES: {
    LOGO: '이미지/브랜드.jpg',
    SEAL: '이미지/사용인감2.jpg',
  },

  // localStorage 키
  STORAGE_KEYS: {
    RECIPIENTS: 'invoice_recipients',
    TEMPLATES: 'invoice_templates',
    FLIGHT_SAVES: 'flight_saves_v2',
  },

  // 페이지네이션 설정
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
};

// 전역 접근 가능하도록 window 객체에 할당
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
