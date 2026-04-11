# 여행 문서 통합 편집 시스템 v2.0

**견적서 + 일정표 통합 편집기**

---

## 📖 개요

여행 견적서와 일정표를 쉽게 편집하고 PDF로 출력할 수 있는 웹 기반 통합 편집 시스템입니다.

### 주요 기능
- ✅ 여행 견적서 편집
- ✅ 일정표 편집 (다중 일차)
- ✅ 실시간 미리보기
- ✅ LocalStorage 저장/불러오기
- ✅ PDF/인쇄 출력
- ✅ 레이아웃 100% 재현

---

## 🚀 빠른 시작

### 1. 통합 편집기 열기
```
index-full.html 파일을 브라우저에서 열기
```

### 2. 견적서 작성
- 왼쪽 "견적서" 탭 클릭
- 단체 정보, 요금 정보 입력
- "미리보기 업데이트" 클릭

### 3. 일정표 작성
- 왼쪽 "일정표" 탭 클릭
- 1일차, 2일차 등 선택
- 일정 내용 입력
- "미리보기 업데이트" 클릭

### 4. 저장 및 출력
- "전체 저장" 클릭 → LocalStorage에 저장
- "전체 인쇄/PDF" 클릭 → PDF 생성

---

## 📁 파일 구조

```
quote-editor-v1/
│
├── 📄 HTML 파일
│   ├── index-full.html           ⭐ 통합 편집기 (메인)
│   ├── index.html                  견적서 편집기 (Phase 1)
│   ├── preview-all.html            통합 미리보기
│   ├── preview.html                견적서 미리보기
│   ├── itinerary-preview.html      일정표 미리보기
│   └── test-binding.html           테스트 페이지
│
├── 🎨 CSS 파일
│   ├── css/document.css            견적서 스타일
│   ├── css/itinerary.css           일정표 스타일
│   └── css/print.css               인쇄용 스타일
│
├── 💾 JavaScript 파일
│   ├── js/data-binding.js          견적서 데이터 바인딩
│   └── js/itinerary-data.js        일정표 데이터 구조
│
├── 🖼️ 이미지 파일
│   └── assets/images/              로고 이미지
│
└── 📝 문서 파일
    ├── README.md                   이 파일
    ├── PHASE1_TEST_RESULTS.md      Phase 1 테스트 결과
    ├── PHASE2_PLAN.md              Phase 2 계획서
    ├── PHASE2_SUMMARY.md           Phase 2 요약
    └── PHASE2_COMPLETE.md          Phase 2 완료 보고서
```

---

## 🎯 사용 방법

### 기본 사용법

1. **편집기 열기**
   ```
   index-full.html을 브라우저에서 열기
   ```

2. **견적서 탭 작성**
   - 단체명 입력
   - 여행 일자 입력
   - 여행지 입력
   - 항공사, 스케줄, 요금 입력

3. **일정표 탭 작성**
   - 1일차 버튼 클릭
   - 날짜, 요일, 제목 입력
   - 주요 일정 입력
   - 식사, 숙박 정보 입력
   - 2일차, 3일차 반복

4. **미리보기 & 저장**
   - "미리보기 업데이트" 클릭
   - 우측에서 전체 문서 확인
   - "전체 저장" 클릭

5. **PDF 출력**
   - "전체 인쇄/PDF" 클릭
   - 브라우저 인쇄 대화상자에서 "PDF로 저장" 선택

### 고급 사용법

- **데이터 불러오기**: "불러오기" 버튼으로 저장된 문서 복원
- **개별 페이지 편집**: 일정표 탭에서 일차별 독립 편집
- **다중 일차 관리**: + 추가 버튼으로 일차 추가

---

## 💡 주요 기능

### Phase 1: 견적서 편집
- 단체 정보 (단체명, 일자, 여행지)
- 요금 정보 (항공사, 스케줄, 옵션, 금액)
- 실시간 미리보기
- LocalStorage 저장
- PDF 출력

### Phase 2: 일정표 편집
- 일차별 일정 관리
- 날짜/요일/제목 설정
- 주요 일정 텍스트
- 식사 정보 (조식/중식/석식)
- 숙박 정보
- 배경 이미지 + 텍스트 오버레이

### 통합 기능
- 탭 기반 편집 UI
- 견적서 + 일정표 통합 저장
- 다중 페이지 미리보기
- 전체 문서 PDF 출력

---

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **폰트**: Pretendard (Google Fonts)
- **데이터**: JSON, LocalStorage
- **PDF**: Browser Print API
- **통신**: postMessage (iframe)

---

## 📋 데이터 구조

### 견적서 데이터
```javascript
{
  quote_id: 'Q-xxx',
  group_info: {
    group_name: '단체명',
    travel_dates: '2025년 11월 14일 ~ 11월 18일',
    destination: '여행지'
  },
  pricing: {
    airline_name: '아시아나<br />항공',
    departure_flight: '인천 (08:40) - 광저우 (11:15)',
    return_flight: '광저우 (12:20) - 인천 (17:00)',
    option_type: '노옵션',
    price_amount: '1,540,000원'
  }
}
```

### 일정표 데이터
```javascript
{
  itinerary_id: 'I-xxx',
  pages: [
    {
      page_number: 2,
      page_type: 'itinerary_day',
      day_info: {
        day_number: 1,
        date: '11/14',
        day_of_week: '목',
        title: '인천 → 광저우'
      },
      editable_text: {
        main_schedule: '08:40 인천 출발\n11:15 광저우 도착...',
        meals: '조: 기내식 / 중: 현지식 / 석: 한식',
        hotel: '광저우 ****호텔'
      }
    }
  ]
}
```

---

## 🎨 디자인 가이드

### 색상
- Primary: `#f09641` (주황색)
- Primary Dark: `#c2682c`
- Accent: `#c84f3c` (빨강)
- Background: `#fdfaf6`, `#f7f3ee`

### 타이포그래피
- 폰트 패밀리: Pretendard
- 견적서 제목: 36px, 800 weight
- 일정표 제목: 28px, 700 weight
- 본문: 14-15px, 400-600 weight

### 레이아웃
- 페이지 크기: A4 (210mm × 297mm)
- 견적서: Grid (100px 1fr 80px 140px)
- 일정표: Flexbox + 오버레이

---

## 🧪 테스트

### 브라우저 호환성
- ✅ Chrome 131+
- ✅ Edge 131+
- ✅ Firefox 133+

### 테스트 페이지
```
test-binding.html - 데이터 바인딩 테스트
```

---

## 📚 문서

- `PHASE1_TEST_RESULTS.md` - Phase 1 테스트 결과
- `PHASE2_PLAN.md` - Phase 2 구현 계획
- `PHASE2_SUMMARY.md` - Phase 2 진행 요약
- `PHASE2_COMPLETE.md` - Phase 2 완료 보고서

---

## 🔮 향후 계획 (Phase 3)

### 선택사항
1. **HTML 완전 재구성**: 일정표 이미지를 HTML/CSS로 변환
2. **고급 기능**: 이미지 업로드, 템플릿 시스템
3. **단체 DB 연동**: 기존 단체 데이터 자동 가져오기
4. **서버 구현**: PDF 자동 생성, 문서 버전 관리

---

## 🐛 문제 해결

### 미리보기가 업데이트되지 않을 때
1. "미리보기 업데이트" 버튼 클릭
2. 브라우저 새로고침 (F5)
3. 브라우저 캐시 삭제

### PDF 출력 시 색상이 나오지 않을 때
1. 인쇄 설정에서 "배경 그래픽" 옵션 활성화
2. Chrome: 설정 → 배경 그래픽 체크
3. Firefox: 페이지 설정 → 배경색 및 이미지 인쇄 체크

### 저장된 데이터가 사라졌을 때
1. 브라우저 LocalStorage 확인
2. 개발자 도구 → Application → LocalStorage
3. `complete_document` 키 확인

---

## 📄 라이선스

이 프로젝트는 내부 사용을 위해 제작되었습니다.

---

## 👨‍💻 개발 정보

- **버전**: 2.0
- **개발 기간**: 2025-12-25
- **개발자**: Claude Code
- **Phase 1**: 견적서 편집 시스템 (완료)
- **Phase 2**: 일정표 편집 시스템 (완료)

---

## 📞 지원

문제가 발생하거나 개선 제안이 있으면 문서를 참조하거나 개발자에게 문의하세요.

---

**Happy Editing! 🎉**
