# TASK (Execution & Work Breakdown Document)
# 견적서 편집 시스템 - Phase 1

## 1. 문서 목적

본 TASK 문서는 PRD / TRD에서 정의된 요구사항을 **실제 구현 가능한 작업 단위**로 분해한 실행 문서이다.

**핵심 원칙:**
- ✅ 레이아웃 100% 재현
- ✅ 데이터 수정 가능
- ✅ 이미지/PDF 출력 보장
- ✅ 단계적 구현 (1페이지 완성 후 확장)

---

## 2. 전체 작업 흐름

```
원본 HTML 분석
 → 레이아웃 재현 (HTML/CSS)
 → 데이터 바인딩 구현
 → 편집 UI 구현
 → 저장/불러오기 구현
 → PDF/이미지 출력 구현
 → 테스트 및 검증
```

---

## 3. Phase 1: 원본 분석 및 준비

### TASK 1.1 원본 HTML 분석
**목표:** 25년11월중순광저우-1.html의 구조 완전 파악

**작업 항목:**
- [ ] 원본 HTML 파일 읽기
- [ ] 주요 섹션 식별
  - Header (로고, 담당자 정보)
  - Title (여행 견적서)
  - Main Info Table (단체명, 일자, 여행지, 1인 요금)
  - Conditions Table (여행 조건)
  - Footer
- [ ] 사용된 색상 코드 추출
- [ ] 사용된 폰트 확인
- [ ] 간격/여백 측정
- [ ] Grid 레이아웃 분석 (특히 1인 요금 부분)

**완료 기준:**
- 모든 섹션의 HTML 구조 문서화 완료
- CSS 값 목록 작성 완료

**예상 시간:** 2시간

---

### TASK 1.2 프로젝트 구조 생성
**목표:** 편집기 프로젝트 폴더 구조 생성

**작업 항목:**
```bash
quote-editor-v1/
├── index.html              # 편집기 메인 페이지
├── preview.html            # 견적서 미리보기 (독립 페이지)
├── css/
│   ├── editor.css          # 편집기 스타일
│   ├── document.css        # 견적서 스타일 (원본 재현)
│   └── print.css           # 출력용 스타일
├── js/
│   ├── editor.js           # 편집기 메인 로직
│   ├── data-binding.js     # 데이터 바인딩
│   ├── storage.js          # 저장/불러오기
│   └── validation.js       # 검증
├── assets/
│   └── images/             # 로고 이미지
│       └── 25년11월중순 광저우 망산-1_hd1.png
└── README.md
```

**완료 기준:**
- 폴더 구조 생성 완료
- 빈 파일들 생성 완료

**예상 시간:** 30분

---

## 4. Phase 2: 레이아웃 재현

### TASK 2.1 HTML 템플릿 작성 (preview.html)
**목표:** 원본과 동일한 HTML 구조 생성

**작업 항목:**
- [ ] HTML 기본 구조 작성
- [ ] Header 섹션 작성
  ```html
  <header class="header">
    <img data-field="logo_path" />
    <p data-field="contact_info"></p>
  </header>
  ```
- [ ] Title 섹션 작성
- [ ] Main Info Table 작성
  - 단체명 (data-field="group_name")
  - 일자 (data-field="travel_dates")
  - 여행지 (data-field="destination")
  - 1인 여행요금 (pricing 관련 필드들)
- [ ] Conditions Table 작성 (고정 내용)
- [ ] Footer 작성
- [ ] 모든 수정 가능 영역에 data-field 속성 추가

**완료 기준:**
- 모든 섹션 HTML 완성
- data-field 속성 올바르게 적용

**예상 시간:** 3시간

---

### TASK 2.2 CSS 스타일 작성 (document.css)
**목표:** 원본과 픽셀 단위 동일한 스타일 재현

**작업 항목:**
- [ ] CSS 변수 정의
  ```css
  :root {
    --color-primary: #f09641;
    --color-border-main: #d9d3cc;
    --color-border-light: #e3ddd6;
    --color-bg-light: #fdfaf6;
    --color-bg-lighter: #f7f3ee;
    --color-bg-section: #f3ebe1;
    --color-text-primary: #1f2937;
    --color-text-secondary: #4b5563;
    --color-accent: #c84f3c;
  }
  ```
- [ ] Page Container 스타일
- [ ] Top Border (8px, #f09641)
- [ ] Header 스타일
- [ ] Title 섹션 스타일
- [ ] Main Info Table 스타일
- [ ] **1인 여행요금 Grid 레이아웃**
  ```css
  .price-grid {
    display: grid;
    grid-template-columns: 100px 1fr 80px 140px;
  }
  ```
- [ ] Conditions Table 스타일
- [ ] Footer 스타일
- [ ] 폰트 설정 (Pretendard)

**완료 기준:**
- 원본과 시각적으로 동일
- 모든 간격/색상 일치
- 폰트 크기 일치

**예상 시간:** 4시간

---

### TASK 2.3 Print CSS 작성 (print.css)
**목표:** PDF/인쇄 시 레이아웃 유지

**작업 항목:**
- [ ] @page 설정
  ```css
  @page {
    size: A4;
    margin: 0;
  }
  ```
- [ ] 색상 보존 설정
  ```css
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  ```
- [ ] Page break 규칙
- [ ] 여백 조정

**완료 기준:**
- 인쇄 미리보기에서 레이아웃 정상
- 색상 보존 확인

**예상 시간:** 1시간

---

### TASK 2.4 레이아웃 검증
**목표:** 원본과 비교하여 완벽한 일치 확인

**작업 항목:**
- [ ] 원본 HTML 브라우저에서 열기
- [ ] 새로 만든 preview.html 브라우저에서 열기
- [ ] 나란히 비교
  - 전체 크기
  - 각 섹션 크기
  - 폰트 크기
  - 색상
  - 간격
- [ ] 차이점 수정

**완료 기준:**
- 육안으로 차이 없음
- 주요 측정값 일치

**예상 시간:** 2시간

---

## 5. Phase 3: 데이터 바인딩

### TASK 3.1 데이터 스키마 정의 (data-binding.js)
**목표:** JSON 데이터 구조 정의

**작업 항목:**
- [ ] 기본 데이터 객체 생성
  ```javascript
  const DEFAULT_QUOTE_DATA = {
    quote_id: '',
    created_at: '',
    updated_at: '',
    group_info: {
      group_id: null,
      group_name: '',
      travel_dates: '',
      destination: ''
    },
    pricing: {
      airline_name: '',
      departure_flight: '',
      return_flight: '',
      option_type: '',
      price_amount: '',
      price_note: ''
    },
    metadata: {
      contact_info: '담당자: 김국진 010-2662-9009',
      logo_path: '../assets/images/25년11월중순 광저우 망산-1_hd1.png',
      template_version: 'v1.0'
    }
  };
  ```
- [ ] 샘플 데이터 작성

**완료 기준:**
- 데이터 구조 정의 완료
- 샘플 데이터로 테스트 가능

**예상 시간:** 1시간

---

### TASK 3.2 데이터 바인딩 함수 구현
**목표:** 데이터를 HTML에 자동 바인딩

**작업 항목:**
- [ ] bindField() 함수 구현
  ```javascript
  function bindField(fieldName, value) {
    const elements = document.querySelectorAll(`[data-field="${fieldName}"]`);
    elements.forEach(el => {
      if (value.includes('\n')) {
        el.innerHTML = value.split('\n').join('<br>');
      } else {
        el.textContent = value;
      }
    });
  }
  ```
- [ ] bindAllData() 함수 구현
  ```javascript
  function bindAllData(data) {
    // Group info
    bindField('group_name', data.group_info.group_name);
    bindField('travel_dates', data.group_info.travel_dates);
    bindField('destination', data.group_info.destination);

    // Pricing
    bindField('airline_name', data.pricing.airline_name);
    bindField('departure_flight', data.pricing.departure_flight);
    bindField('return_flight', data.pricing.return_flight);
    bindField('option_type', data.pricing.option_type);
    bindField('price_amount', data.pricing.price_amount);
    bindField('price_note', data.pricing.price_note);

    // Metadata
    bindField('contact_info', data.metadata.contact_info);
    bindImageField('logo_path', data.metadata.logo_path);
  }
  ```
- [ ] 이미지 바인딩 함수
  ```javascript
  function bindImageField(fieldName, imagePath) {
    const elements = document.querySelectorAll(`[data-field="${fieldName}"]`);
    elements.forEach(el => {
      if (el.tagName === 'IMG') {
        el.src = imagePath;
      }
    });
  }
  ```

**완료 기준:**
- 샘플 데이터로 바인딩 테스트 성공
- 모든 필드 정상 표시

**예상 시간:** 2시간

---

### TASK 3.3 바인딩 테스트
**목표:** 다양한 데이터로 바인딩 검증

**작업 항목:**
- [ ] 정상 데이터 테스트
- [ ] 빈 값 테스트
- [ ] 긴 텍스트 테스트
- [ ] 특수문자 포함 테스트
- [ ] 줄바꿈 포함 테스트

**완료 기준:**
- 모든 케이스에서 레이아웃 유지
- 에러 없음

**예상 시간:** 1시간

---

## 6. Phase 4: 편집 UI 구현

### TASK 4.1 편집기 레이아웃 작성 (index.html)
**목표:** 편집 폼과 미리보기를 나란히 배치

**작업 항목:**
- [ ] HTML 구조 작성
  ```html
  <div class="editor-container">
    <div class="editor-panel">
      <form id="quote-form">
        <!-- 입력 폼 -->
      </form>
    </div>
    <div class="preview-panel">
      <iframe id="preview-frame" src="preview.html"></iframe>
    </div>
  </div>
  ```
- [ ] 편집기 CSS 작성 (editor.css)
  ```css
  .editor-container {
    display: grid;
    grid-template-columns: 400px 1fr;
    height: 100vh;
  }
  ```

**완료 기준:**
- 좌측 폼, 우측 미리보기 레이아웃 완성

**예상 시간:** 2시간

---

### TASK 4.2 입력 폼 구현
**목표:** 모든 수정 가능 항목의 입력 필드 생성

**작업 항목:**
- [ ] 단체 정보 섹션
  ```html
  <section class="form-section">
    <h3>단체 정보</h3>
    <div class="form-group">
      <label>단체명</label>
      <input type="text" id="input-group-name" maxlength="100" />
    </div>
    <div class="form-group">
      <label>여행 일자</label>
      <input type="text" id="input-travel-dates" placeholder="2025년 11월 14일 ~ 11월 18일" />
    </div>
    <div class="form-group">
      <label>여행지</label>
      <input type="text" id="input-destination" maxlength="100" />
    </div>
  </section>
  ```
- [ ] 여행 요금 섹션
  ```html
  <section class="form-section">
    <h3>여행 요금</h3>
    <div class="form-group">
      <label>항공사명</label>
      <input type="text" id="input-airline-name" />
    </div>
    <div class="form-group">
      <label>출발편</label>
      <input type="text" id="input-departure-flight" placeholder="인천 (08:40) - 광저우 (11:15)" />
    </div>
    <div class="form-group">
      <label>귀국편</label>
      <input type="text" id="input-return-flight" placeholder="광저우 (12:20) - 인천 (17:00)" />
    </div>
    <div class="form-group">
      <label>옵션</label>
      <input type="text" id="input-option-type" />
    </div>
    <div class="form-group">
      <label>1인 요금</label>
      <input type="text" id="input-price-amount" placeholder="1,540,000원" />
    </div>
  </section>
  ```
- [ ] 액션 버튼
  ```html
  <div class="form-actions">
    <button type="button" id="btn-save">저장</button>
    <button type="button" id="btn-load">불러오기</button>
    <button type="button" id="btn-export-pdf">PDF 다운로드</button>
    <button type="button" id="btn-print">인쇄</button>
  </div>
  ```

**완료 기준:**
- 모든 입력 필드 생성 완료
- 버튼 배치 완료

**예상 시간:** 2시간

---

### TASK 4.3 실시간 미리보기 연동
**목표:** 입력 즉시 미리보기 업데이트

**작업 항목:**
- [ ] iframe 메시지 통신 설정
  ```javascript
  // editor.js
  function updatePreview(fieldName, value) {
    const iframe = document.getElementById('preview-frame');
    iframe.contentWindow.postMessage({
      type: 'UPDATE_FIELD',
      field: fieldName,
      value: value
    }, '*');
  }
  ```
- [ ] preview.html에서 메시지 수신
  ```javascript
  // preview.html 내부
  window.addEventListener('message', (event) => {
    if (event.data.type === 'UPDATE_FIELD') {
      bindField(event.data.field, event.data.value);
    }
  });
  ```
- [ ] 모든 입력 필드에 이벤트 리스너 연결
  ```javascript
  document.getElementById('input-group-name').addEventListener('input', (e) => {
    updatePreview('group_name', e.target.value);
  });
  ```

**완료 기준:**
- 입력 즉시 미리보기 반영
- 딜레이 없음

**예상 시간:** 3시간

---

## 7. Phase 5: 검증 기능

### TASK 5.1 검증 로직 구현 (validation.js)
**목표:** 입력값 검증

**작업 항목:**
- [ ] 검증 규칙 정의
  ```javascript
  const VALIDATION_RULES = {
    group_name: {
      required: true,
      maxLength: 100
    },
    travel_dates: {
      required: true,
      pattern: /^\d{4}년 \d{1,2}월 \d{1,2}일 ~ \d{1,2}월 \d{1,2}일$/
    },
    // ...
  };
  ```
- [ ] validateField() 함수
- [ ] validateAll() 함수
- [ ] 에러 메시지 표시 UI

**완료 기준:**
- 모든 필드 검증 작동
- 에러 메시지 표시

**예상 시간:** 2시간

---

## 8. Phase 6: 저장/불러오기

### TASK 6.1 LocalStorage 구현 (storage.js)
**목표:** 데이터 저장 및 불러오기

**작업 항목:**
- [ ] QuoteStorage 클래스 작성
  ```javascript
  class QuoteStorage {
    static STORAGE_KEY = 'quote_data_v1';

    static save(data) {
      const timestamp = new Date().toISOString();
      data.updated_at = timestamp;
      if (!data.created_at) {
        data.created_at = timestamp;
      }
      if (!data.quote_id) {
        data.quote_id = 'Q' + Date.now();
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    }

    static load() {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    }

    static clear() {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
  ```
- [ ] 저장 버튼 연결
- [ ] 불러오기 버튼 연결
- [ ] 자동 저장 (debounced)

**완료 기준:**
- 저장/불러오기 정상 작동
- 자동 저장 작동

**예상 시간:** 2시간

---

## 9. Phase 7: PDF/이미지 출력

### TASK 7.1 PDF 출력 구현
**목표:** 브라우저 인쇄 기능 활용

**작업 항목:**
- [ ] 인쇄 버튼 이벤트
  ```javascript
  document.getElementById('btn-print').addEventListener('click', () => {
    const iframe = document.getElementById('preview-frame');
    iframe.contentWindow.print();
  });
  ```
- [ ] PDF 다운로드 버튼 (동일 기능)
- [ ] Print CSS 최종 검증

**완료 기준:**
- PDF 저장 정상 작동
- 레이아웃 유지 확인

**예상 시간:** 1시간

---

### TASK 7.2 이미지 출력 구현 (Optional)
**목표:** PNG/JPG 이미지로 저장

**작업 항목:**
- [ ] html2canvas 라이브러리 추가
- [ ] 이미지 생성 함수
  ```javascript
  async function exportToImage() {
    const iframe = document.getElementById('preview-frame');
    const iframeDoc = iframe.contentDocument;
    const pageElement = iframeDoc.querySelector('.page');

    const canvas = await html2canvas(pageElement, {
      scale: 2,
      useCORS: true
    });

    const link = document.createElement('a');
    link.download = 'quote.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
  ```
- [ ] 이미지 다운로드 버튼 연결

**완료 기준:**
- 이미지 저장 작동
- 고해상도 이미지 생성

**예상 시간:** 2시간

---

## 10. Phase 8: 테스트 및 검증

### TASK 8.1 기능 테스트
**목표:** 모든 기능 검증

**테스트 케이스:**
- [ ] 신규 견적서 생성
  - 모든 필드 입력
  - 실시간 미리보기 확인
  - 저장 확인
- [ ] 저장된 견적서 불러오기
  - 데이터 정상 로딩
  - 미리보기 정상 표시
- [ ] 데이터 수정
  - 필드 수정 시 실시간 반영
  - 자동 저장 확인
- [ ] PDF 출력
  - 레이아웃 유지 확인
  - 색상 보존 확인
- [ ] 이미지 출력 (Optional)
  - 고해상도 이미지 확인

**완료 기준:**
- 모든 케이스 통과

**예상 시간:** 3시간

---

### TASK 8.2 레이아웃 검증
**목표:** 원본과 최종 비교

**작업 항목:**
- [ ] 샘플 데이터로 견적서 생성
- [ ] 원본 HTML과 나란히 비교
- [ ] 스크린샷 비교
- [ ] 픽셀 단위 측정 비교

**완료 기준:**
- 시각적 차이 없음
- 주요 측정값 일치

**예상 시간:** 2시간

---

### TASK 8.3 다양한 데이터 테스트
**목표:** 예외 케이스 검증

**테스트 케이스:**
- [ ] 짧은 텍스트
- [ ] 긴 텍스트
- [ ] 특수문자 포함
- [ ] 빈 값
- [ ] 숫자만 있는 경우

**완료 기준:**
- 모든 케이스에서 레이아웃 유지

**예상 시간:** 2시간

---

### TASK 8.4 브라우저 호환성 테스트
**목표:** 여러 브라우저에서 작동 확인

**테스트 브라우저:**
- [ ] Chrome 최신 버전
- [ ] Edge 최신 버전
- [ ] Safari (가능하다면)

**완료 기준:**
- 모든 브라우저에서 정상 작동

**예상 시간:** 2시간

---

## 11. Phase 9: 문서화 및 정리

### TASK 9.1 README 작성
**목표:** 사용 가이드 작성

**작업 항목:**
- [ ] 프로젝트 소개
- [ ] 설치 방법
- [ ] 사용 방법
- [ ] 파일 구조 설명
- [ ] 데이터 구조 설명
- [ ] 트러블슈팅

**완료 기준:**
- README.md 완성

**예상 시간:** 1시간

---

### TASK 9.2 코드 정리
**목표:** 코드 품질 향상

**작업 항목:**
- [ ] 주석 추가
- [ ] 함수 문서화
- [ ] 변수명 정리
- [ ] 불필요한 코드 제거

**완료 기준:**
- 코드 리뷰 통과

**예상 시간:** 2시간

---

## 12. 완료 정의 (Definition of Done)

### 필수 조건
- [x] 레이아웃이 원본과 100% 일치
- [x] 모든 수정 가능 항목 입력 가능
- [x] 실시간 미리보기 작동
- [x] 데이터 저장/불러오기 작동
- [x] PDF 출력 정상 작동
- [x] 모든 테스트 케이스 통과

### 선택 조건
- [ ] 이미지 출력 작동 (Optional)
- [ ] 단체 DB 연동 준비 완료 (인터페이스만)

---

## 13. 작업 일정 예상

| Phase | 작업 내용 | 예상 시간 |
|-------|----------|----------|
| Phase 1 | 원본 분석 및 준비 | 2.5h |
| Phase 2 | 레이아웃 재현 | 10h |
| Phase 3 | 데이터 바인딩 | 4h |
| Phase 4 | 편집 UI 구현 | 7h |
| Phase 5 | 검증 기능 | 2h |
| Phase 6 | 저장/불러오기 | 2h |
| Phase 7 | PDF/이미지 출력 | 3h |
| Phase 8 | 테스트 및 검증 | 9h |
| Phase 9 | 문서화 및 정리 | 3h |
| **총계** | | **42.5h** |

**예상 기간:** 약 1주일 (하루 6-8시간 작업 기준)

---

## 14. 리스크 및 대응

### 리스크 1: 레이아웃 재현 실패
**대응:**
- 원본 HTML/CSS 철저 분석
- 브라우저 개발자 도구 활용
- 픽셀 단위 비교

### 리스크 2: 실시간 미리보기 성능 이슈
**대응:**
- Debouncing 적용
- iframe 메시지 통신 최적화

### 리스크 3: PDF 출력 시 레이아웃 깨짐
**대응:**
- Print CSS 세밀 조정
- 다양한 브라우저 테스트
- 색상 보존 설정 확인

---

## 15. 다음 단계 (Phase 2)

Phase 1 완료 후:
1. 사용자 피드백 수집
2. 개선사항 반영
3. **Phase 2**: 일정표 페이지 편집 기능 추가
4. **Phase 3**: 다중 페이지 통합
5. **Phase 4**: 단체 DB 완전 연동

---

**Version**: 1.0
**Date**: 2025-12-25
**Author**: Travel Document System Team
