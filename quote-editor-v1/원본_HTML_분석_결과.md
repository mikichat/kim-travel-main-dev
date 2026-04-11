# 원본 HTML 분석 결과
**파일:** 25년11월중순 광저우 망산-1_tailwind.html
**분석일:** 2025-12-25

---

## 1. 전체 구조

```
<!DOCTYPE html>
<html lang="ko">
  <head>
    - Tailwind CSS CDN
    - Google Fonts (Pretendard)
  </head>
  <body>
    <div class="page-container">
      <div class="top-border"></div>
      <div class="content">
        <header>
        <section class="title">
        <section class="main-info-table">
        <section class="conditions-table">
        <section class="signature">
      </div>
      <footer>
    </div>
  </body>
</html>
```

---

## 2. 주요 섹션 분석

### 2.1 Page Container
```html
<div class="relative mx-auto my-4 w-[210mm] min-h-[297mm] overflow-hidden rounded-sm border border-[#d4d0cc] bg-white shadow-xl">
```

**핵심 속성:**
- 폭: `210mm` (A4 폭)
- 최소 높이: `297mm` (A4 높이)
- 테두리: `#d4d0cc`
- 배경: `white`
- 그림자: `shadow-xl`

---

### 2.2 Top Border (주황색 바)
```html
<div class="absolute inset-x-0 top-0 h-2 bg-[#f09641]"></div>
```

**핵심 속성:**
- 높이: `8px` (h-2 = 0.5rem = 8px)
- 배경색: `#f09641` (주황색)
- 위치: 절대 위치, 상단

---

### 2.3 Content Wrapper
```html
<div class="relative px-12 pt-10 pb-14 text-gray-800">
```

**핵심 속성:**
- 좌우 패딩: `48px` (px-12 = 3rem)
- 상단 패딩: `40px` (pt-10 = 2.5rem)
- 하단 패딩: `56px` (pb-14 = 3.5rem)

---

### 2.4 Header (로고 + 담당자)
```html
<header class="flex items-start justify-between">
  <img src="..." class="h-16 w-16 object-contain" />
  <p class="text-sm font-semibold text-gray-600">담당자: 김국진 010-2662-9009</p>
</header>
```

**핵심 속성:**
- 레이아웃: Flexbox (양 끝 정렬)
- 로고 크기: `64px × 64px` (h-16 w-16)
- 담당자 폰트: `14px` (text-sm), 두께 `semibold`

---

### 2.5 Title Section (제목)
```html
<section class="mt-6 text-center">
  <h1 class="text-4xl font-extrabold tracking-tight text-gray-900">여행 견적서</h1>
  <div class="mx-auto mt-3 h-1.5 w-28 rounded-full bg-[#f09641]"></div>
</section>
```

**핵심 속성:**
- 상단 마진: `24px` (mt-6)
- 제목 폰트: `36px` (text-4xl), 두께 `extrabold`
- 밑줄: 폭 `112px` (w-28), 높이 `6px` (h-1.5), 색상 `#f09641`

---

### 2.6 Main Info Table
```html
<section class="mt-10">
  <table class="w-full border border-[#d9d3cc] text-sm">
    <tr class="border-b border-[#e3ddd6]">
      <th class="w-32 bg-[#f7f3ee] px-4 py-3 text-left font-semibold text-gray-700">단체명</th>
      <td class="px-4 py-3">중국 – 광저우 천저우 고의령 망산 PTY</td>
    </tr>
    <!-- 일자, 여행지 동일 구조 -->
    <tr>
      <th>1인 여행요금</th>
      <td>
        <!-- 1인 요금 Grid -->
      </td>
    </tr>
  </table>
</section>
```

**핵심 속성:**
- 테이블 테두리: `#d9d3cc`
- 행 구분선: `#e3ddd6`
- TH 배경: `#f7f3ee`
- TH 폭: `128px` (w-32)
- 패딩: `16px 16px 12px 16px` (px-4 py-3)

---

### 2.7 1인 여행요금 Grid (중요!)
```html
<div class="grid grid-cols-[120px_1fr_120px_140px] divide-x divide-[#e8e2db] bg-[#fdfaf6] text-sm">
  <div class="px-3 py-3 text-center font-semibold leading-5">
    아시아나<br />항공
  </div>
  <div class="px-4 py-3 leading-relaxed">
    <p>인천 (08:40) - 광저우 (11:15)</p>
    <p>광저우 (12:20) - 인천 (17:00)</p>
  </div>
  <div class="flex items-center justify-center px-3 py-3 font-semibold text-[#c2682c]">
    노옵션
  </div>
  <div class="flex items-center justify-center bg-white px-3 py-3 text-xl font-black text-gray-900">
    1,540,000원
  </div>
</div>
```

**핵심 속성:**
- Grid 컬럼: `120px 1fr 120px 140px`
- 배경: `#fdfaf6`
- 구분선: `#e8e2db`
- 항공사명: 중앙 정렬, `semibold`
- 스케줄: 좌측 정렬, `leading-relaxed`
- 옵션: 중앙 정렬, `#c2682c` (오렌지 다크)
- 금액: 중앙 정렬, `20px` (text-xl), `font-black`, 배경 `white`

**요금 안내:**
```html
<div class="border-t border-[#e8e2db] px-4 py-2 text-xs text-gray-500">
  ※ 상기 요금은 1인 기준이며 항공 및 세금 변동 시 재확인 필요
</div>
```

---

### 2.8 Conditions Table (여행 조건)
```html
<section class="mt-10">
  <div class="rounded-t-md border border-[#d9d3cc] bg-[#f3ebe1]">
    <h2 class="py-3 text-center text-lg font-bold tracking-[0.35em] text-gray-800">여 행 조 건</h2>
  </div>
  <table class="w-full border border-t-0 border-[#d9d3cc] text-sm">
    <tr class="border-b border-[#e3ddd6]">
      <th class="w-32 bg-[#fdfaf6] px-4 py-3 text-left font-semibold text-gray-700">항공료</th>
      <td class="px-4 py-3 text-gray-700">전 일정에 명시된 항공료</td>
      <td class="w-1/2 px-4 py-3 text-[#c84f3c]">선발권 기준으로 추후에 요금이 변동 될 수 있습니다</td>
    </tr>
    <!-- 숙박, 식사, 교통편, 관광, 여행자보험, 기타세금, 비고사항 -->
  </table>
</section>
```

**핵심 속성:**
- 헤더 배경: `#f3ebe1`
- 헤더 폰트: `18px` (text-lg), `bold`, 자간 `0.35em`
- TH 배경: `#fdfaf6`
- 특이사항 텍스트: `#c84f3c` (빨강)

---

### 2.9 Signature (서명)
```html
<section class="mt-10 space-y-2 text-center text-sm leading-relaxed text-gray-800">
  <p class="text-base font-semibold">위와 같이 여행 경비 견적서를 제출합니다.</p>
  <p>2025년 07월 09일</p>
  <p class="text-lg font-black tracking-widest">(유) 여행세상 대표이사</p>
</section>
```

**핵심 속성:**
- 상단 마진: `40px`
- 행간: `space-y-2` (8px)
- 회사명: `18px`, `font-black`, `tracking-widest`

---

### 2.10 Footer
```html
<footer class="border-t border-[#d9d3cc] bg-[#fdfaf6] px-12 py-6 text-xs text-gray-600">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <img src="..." class="h-10 w-auto object-contain" />
    </div>
    <div class="flex flex-col items-center gap-1 text-[11px]">
      <span>A: 전주시 완산구 서신동 856-1번지</span>
      <span>T: 063)271-9090</span>
      <span>F: 063)271-9030</span>
    </div>
    <div class="w-16"></div>
  </div>
</footer>
```

**핵심 속성:**
- 배경: `#fdfaf6`
- 상단 테두리: `#d9d3cc`
- 로고 높이: `40px` (h-10)
- 텍스트: `11px`

---

## 3. 색상 코드 정리

| 용도 | 색상 코드 | Tailwind 클래스 | 설명 |
|------|----------|-----------------|------|
| 주황색 (메인) | `#f09641` | bg-[#f09641] | Top border, 제목 밑줄 |
| 테두리 (페이지) | `#d4d0cc` | border-[#d4d0cc] | 페이지 외곽 테두리 |
| 테두리 (메인) | `#d9d3cc` | border-[#d9d3cc] | 테이블 테두리 |
| 테두리 (라이트) | `#e3ddd6` | border-[#e3ddd6] | 테이블 행 구분선 |
| 테두리 (라이터) | `#e8e2db` | border-[#e8e2db] | Grid 구분선 |
| 배경 (라이터) | `#f7f3ee` | bg-[#f7f3ee] | TH 배경 (Main Info) |
| 배경 (라이트) | `#fdfaf6` | bg-[#fdfaf6] | 요금 Grid, TH 배경 (Conditions), Footer |
| 배경 (섹션) | `#f3ebe1` | bg-[#f3ebe1] | 여행 조건 헤더 |
| 텍스트 (오렌지 다크) | `#c2682c` | text-[#c2682c] | 옵션 텍스트 |
| 텍스트 (레드) | `#c84f3c` | text-[#c84f3c] | 특이사항 텍스트 |

---

## 4. 폰트 설정

```css
@import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700;800;900&family=Nanum+Gothic&family=Malgun+Gothic:wght@400;700&display=swap');

body {
  font-family: 'Pretendard', sans-serif;
}
```

**사용 폰트:** Pretendard (400, 700, 800, 900)

---

## 5. 간격/여백 측정

### 페이지
- 폭: `210mm` (A4)
- 높이: `297mm` (A4)
- 좌우 패딩: `48px`
- 상단 패딩: `40px`
- 하단 패딩: `56px`

### 섹션 간격
- Header → Title: `24px` (mt-6)
- Title → Main Info: `40px` (mt-10)
- Main Info → Conditions: `40px` (mt-10)
- Conditions → Signature: `40px` (mt-10)

### 테이블
- TH 폭: `128px` (w-32)
- 셀 패딩: `16px 16px 12px 16px` (px-4 py-3)

### 1인 요금 Grid
- 칼럼: `120px` | `1fr` | `120px` | `140px`
- 셀 패딩: `12px` (px-3 py-3)

---

## 6. Grid 레이아웃 분석 (1인 요금)

```css
/* Tailwind 클래스 */
grid-cols-[120px_1fr_120px_140px]

/* CSS 변환 */
grid-template-columns: 120px 1fr 120px 140px;
```

**구조:**
1. **항공사명 (120px)**: 중앙 정렬, 세로 2줄
2. **스케줄 (1fr)**: 좌측 정렬, 2줄 (출발/귀국)
3. **옵션 (120px)**: 중앙 정렬
4. **금액 (140px)**: 중앙 정렬, 큰 폰트, 흰 배경

---

## 7. 수정 가능 항목 식별

### ✅ 수정 가능 (Phase 1)
1. **단체명**: "중국 – 광저우 천저우 고의령 망산 PTY"
2. **일자**: "2025년 11월 14일 ~ 11월 18일"
3. **여행지**: "중국 – 광저우 천저우 고의령 망산"
4. **항공사명**: "아시아나\n항공"
5. **출발편**: "인천 (08:40) - 광저우 (11:15)"
6. **귀국편**: "광저우 (12:20) - 인천 (17:00)"
7. **옵션**: "노옵션"
8. **금액**: "1,540,000원"

### ❌ 고정 (Phase 1)
- 로고
- 담당자 정보
- 여행 조건 테이블 전체
- 서명
- Footer

---

## 8. 이미지 경로

1. **헤더 로고**: `25년11월중순 광저우 망산-1_hd1.png` (64×64px)
2. **푸터 로고**: `25년11월중순 광저우 망산-1_hd2.png` (40px 높이)

---

## 9. 특이사항

### 줄바꿈 처리
- **항공사명**: `<br />` 태그 사용 (아시아나<br />항공)

### Grid 내부 정렬
- 항공사명: `text-center`
- 스케줄: 좌측 정렬 (기본)
- 옵션: `flex items-center justify-center`
- 금액: `flex items-center justify-center`

### 특수 스타일
- 제목 밑줄: 둥근 모서리 (`rounded-full`)
- 여행 조건 헤더: 상단만 둥근 모서리 (`rounded-t-md`)

---

## 10. 완료 체크리스트

- [x] 원본 HTML 파일 읽기
- [x] 주요 섹션 식별
  - [x] Header (로고, 담당자 정보)
  - [x] Title (여행 견적서)
  - [x] Main Info Table (단체명, 일자, 여행지, 1인 요금)
  - [x] Conditions Table (여행 조건)
  - [x] Footer
- [x] 사용된 색상 코드 추출
- [x] 사용된 폰트 확인
- [x] 간격/여백 측정
- [x] Grid 레이아웃 분석 (특히 1인 요금 부분)

---

**분석 완료일**: 2025-12-25
**다음 단계**: TASK 1.2 프로젝트 구조 생성
