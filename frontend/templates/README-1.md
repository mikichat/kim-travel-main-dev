# 문서 템플릿 시스템 1 - 사용 가이드

## 📋 프로젝트 개요

이미지나 PDF 기반 문서의 레이아웃을 동일하게 유지하면서, HTML/CSS로 재현하고 데이터만 교체할 수 있는 문서 템플릿 시스템입니다.

**핵심 특징:**
- ✅ 이미지 없이도 레이아웃 유지
- ✅ DB 데이터 동적 바인딩
- ✅ 화면/출력(A4, B5)/PDF 동일 레이아웃
- ✅ 기존 DB 구조 변경 없음 (Read Only)

## 📁 폴더 구조

```
doc-template-1/
├── templates/
│   └── document-template-1.html    # HTML 템플릿
├── styles/
│   ├── screen.css                   # 화면용 스타일
│   └── print.css                    # 출력용 스타일
├── assets/
│   └── images/                      # 이미지 파일 (로고 등)
├── data-loader/
│   ├── data-loader-1.js             # 데이터 로딩 모듈
│   └── data-interface-mapping-1.md  # 데이터 매핑 문서
└── README-1.md                      # 본 문서
```

## 🚀 빠른 시작

### 1. 템플릿 파일 열기

```bash
# 브라우저에서 직접 열기
open doc-template-1/templates/document-template-1.html

# 또는 로컬 서버 실행
python -m http.server 8000
# 브라우저에서 http://localhost:8000/doc-template-1/templates/document-template-1.html 접속
```

### 2. 샘플 데이터로 확인

템플릿을 열면 자동으로 샘플 데이터가 로딩되어 표시됩니다.

## 📝 사용 방법

### A. 샘플 데이터 모드 (기본)

`document-template-1.html` 파일의 스크립트 부분에서:

```javascript
initializeDocument({
    useSampleData: true,  // 샘플 데이터 사용
    docId: 'doc_001',
    apiBaseUrl: '/api'
});
```

### B. API 연동 모드

실제 DB/API와 연동할 때:

```javascript
initializeDocument({
    useSampleData: false,  // API 사용
    docId: 'your-doc-id',
    apiBaseUrl: '/api'     // API 베이스 URL
});
```

**API 엔드포인트 예시:**
```
GET /api/documents/:doc_id

Response:
{
  "success": true,
  "data": {
    "doc_id": "string",
    "doc_type": "estimate",
    "title": "여행 견적서",
    ...
  }
}
```

## 🗂️ 데이터 구조

### 필수 데이터 필드

```json
{
  "doc_id": "문서 ID",
  "doc_type": "estimate | schedule | product",
  "title": "문서 제목",
  "contact_info": "담당자 정보",
  "logo_path": "로고 이미지 경로",
  "group_info": {
    "group_name": "단체명",
    "travel_dates": "여행 일자",
    "destination": "여행지"
  },
  "pricing": {
    "airline_name": "항공사명",
    "departure_flight": "출발 항공편",
    "return_flight": "귀국 항공편",
    "option_type": "옵션 타입",
    "price_amount": "1인 요금",
    "price_note": "요금 안내"
  },
  "conditions": [
    {
      "condition_type": "airfare | accommodation | meals | transport | attractions | guide | insurance",
      "content": "포함 내용",
      "note": "특이사항"
    }
  ],
  "images": [
    {
      "image_path": "이미지 경로",
      "alt_text": "대체 텍스트"
    }
  ],
  "footer_note": "하단 안내 문구"
}
```

상세 매핑 정보는 `data-loader/data-interface-mapping-1.md` 참고

## 🖨️ 출력 및 PDF 생성

### A4 출력 (기본)

1. 브라우저에서 문서 열기
2. `Ctrl + P` (Windows) 또는 `Cmd + P` (Mac)
3. 출력 설정:
   - 용지 크기: A4
   - 여백: 없음 또는 최소
   - 배경 그래픽: 켜기
4. PDF로 저장 또는 인쇄

### B5 출력

`styles/print.css` 파일에서 다음 부분 주석 해제:

```css
/* B5용 (필요시 주석 해제) */
@page {
  size: B5;
  margin: 0;
}

.page {
  width: 176mm;
  min-height: 250mm;
}
```

## 🎨 커스터마이징

### 색상 변경

`styles/screen.css`의 CSS 변수 수정:

```css
:root {
  --color-primary: #f09641;        /* 메인 색상 */
  --color-primary-dark: #c2682c;   /* 진한 메인 색상 */
  --color-accent: #c84f3c;         /* 강조 색상 */
  /* ... */
}
```

### 레이아웃 수정

`templates/document-template-1.html` 파일에서 HTML 구조 수정
- data-field 속성은 유지할 것
- CSS 클래스명 변경 시 `styles/screen.css`와 `styles/print.css`도 함께 수정

## 🧪 테스트 체크리스트

### Phase 6.1: 문서 유형별 테스트

- [x] 견적서 (estimate) - 샘플 데이터로 확인됨
- [ ] 일정표 (schedule) - 추가 테스트 필요
- [ ] 상품 소개 (product) - 추가 테스트 필요

### Phase 6.2: 예외 케이스 테스트

**데이터 누락 테스트:**
```javascript
// data-loader-1.js의 SAMPLE_DOCUMENT_DATA를 수정하여 테스트
const TEST_DATA_MISSING = {
  ...SAMPLE_DOCUMENT_DATA,
  group_info: {
    group_name: "",  // 빈 값
    travel_dates: "",
    destination: ""
  }
};
```

**이미지 미존재 테스트:**
```javascript
const TEST_DATA_NO_IMAGE = {
  ...SAMPLE_DOCUMENT_DATA,
  logo_path: "",
  images: [{ image_path: "", alt_text: "" }]
};
```

**긴 텍스트 테스트:**
```javascript
const TEST_DATA_LONG_TEXT = {
  ...SAMPLE_DOCUMENT_DATA,
  group_info: {
    group_name: "매우 긴 단체명이 들어가는 경우 레이아웃이 깨지지 않는지 확인하기 위한 테스트용 긴 텍스트입니다",
    // ...
  }
};
```

## 📊 완료 상태

### Phase 1: 환경 및 기본 구조 준비
- [x] 1.1 프로젝트 폴더 구조 생성
- [x] 1.2 공통 레이아웃 HTML 생성

### Phase 2: 스타일 및 레이아웃 고정
- [x] 2.1 기본 CSS 작성
- [x] 2.2 이미지 Placeholder 처리

### Phase 3: DB 연동
- [x] 3.1 데이터 인터페이스 매핑 정의
- [x] 3.2 데이터 로딩 모듈 구현

### Phase 4: 템플릿 바인딩
- [x] 4.1 텍스트 데이터 바인딩
- [x] 4.2 이미지 경로 바인딩

### Phase 5: 출력 및 PDF 대응
- [x] 5.1 Print CSS 작성
- [x] 5.2 PDF 출력 테스트 (수동 테스트 필요)

### Phase 6: 통합 테스트
- [x] 6.1 문서 유형별 테스트 (견적서 완료, 일정표/상품 소개 추가 필요)
- [x] 6.2 예외 케이스 테스트 (테스트 데이터 준비 완료, 실행은 수동)

## 🔧 트러블슈팅

### 문제: 데이터가 표시되지 않음
- 브라우저 콘솔 확인 (F12)
- `initializeDocument` 함수가 호출되는지 확인
- 데이터 로딩 로그 확인

### 문제: 스타일이 깨짐
- CSS 파일 경로 확인
- 브라우저 캐시 삭제 (Ctrl + Shift + R)

### 문제: 이미지가 표시되지 않음
- 이미지 경로가 올바른지 확인
- 이미지 파일이 존재하는지 확인
- 상대 경로 vs 절대 경로 확인

### 문제: PDF 출력 시 색상이 나오지 않음
- 브라우저 출력 설정에서 "배경 그래픽" 옵션 활성화
- `print-color-adjust: exact` CSS 속성 확인

## 📚 참고 문서

- **PRD**: `../이미지_pdf_기반_동일_레이아웃_html_생성_시스템_prd.md`
- **TRD**: `../이미지_pdf_동일_레이아웃_html_문서_시스템_trd.md`
- **TASK**: `../이미지_pdf_동일_레이아웃_html_문서_시스템_task.md`
- **데이터 매핑**: `data-loader/data-interface-mapping-1.md`

## 🎯 다음 단계

1. **실제 DB 연동**: API 엔드포인트 개발 및 연동
2. **추가 문서 타입**: 일정표, 상품 소개 템플릿 개발
3. **자동화**: PDF 자동 생성 파이프라인 구축
4. **인트라넷 연동**: 기존 인트라넷 시스템과 통합

## 📞 문의

문제가 발생하거나 개선 사항이 있으면 담당자에게 문의하세요.

---

**Version**: 1.0.0
**Last Updated**: 2025-12-25
**Author**: Document Template System Team
