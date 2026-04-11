# 코딩 컨벤션 (Coding Convention)

**문서 버전**: 1.0 | **작성일**: 2026-02-18

---

## MVP 캡슐

| 항목 | 규칙 |
|------|------|
| **언어** | HTML5 + CSS3 (Tailwind) + Vanilla JavaScript (ES6+) |
| **파일** | hanatour/travel-free.html, hanatour/preview-free.html |
| **스타일** | Tailwind CSS (CDN), 인라인 스타일 최소화 |

---

## 1. 파일 명명

### HTML
- travel-free.html (에디터)
- preview-free.html (미리보기)

### JavaScript
- kebab-case: editor.js, preview.js
- camelCase: function, variable
- CONSTANT_CASE: const MAX_SAVES

### CSS
- css/style.css (사이드바)
- kebab-case: section-card, btn-primary

---

## 2. HTML 컨벤션

### 순서
```html
<head>
  <meta charset>
  <meta name="viewport">
  <title>
  <link rel="stylesheet">
  <script src="...">
  <style>
</head>
```

### 속성
- id (camelCase)
- class (kebab-case)
- data-* (kebab-case)
- aria-* (접근성)

---

## 3. CSS 컨벤션

### Tailwind CSS 우선
```html
<div class="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg">
```

### 순서
1. Layout (flex, grid)
2. Sizing (w, h)
3. Spacing (p, m)
4. Typography (font)
5. Colors (bg, text)
6. State (hover, focus)
7. Responsive (md:)
8. Dark mode (dark:)

---

## 4. JavaScript 컨벤션

### 함수
```javascript
// 화살표 함수
const isValid = (data) => { ... }

// 일반 함수
function save(data) { ... }

// async/await
async function download() { ... }
```

### 데이터 구조
```javascript
const travelBooking = {
  recipient: String,
  createdDate: String,  // YYYY-MM-DD
  sections: { flights: Boolean, ... },
  flights: { passengerGroups: [...] }
}
```

### 에러 처리
```javascript
try {
  localStorage.setItem(key, value)
} catch (error) {
  console.error(error)
}
```

---

## 5. 네이밍

### 함수 접두어
- get: 값 가져오기
- set: 값 설정
- is/has: 상태 확인
- add/remove: 추가/제거
- toggle: 켜기/끄기

### 이벤트
- on + 요소 + 이벤트
- onSaveBtnClick, onInputChange

---

## 6. 성능

### Debouncing (자동 저장)
```javascript
let timer
function onChange() {
  clearTimeout(timer)
  timer = setTimeout(() => save(), 500)
}
```

### Event Delegation
- 부모에 1개 리스너로 관리

### Lazy Loading
- html2canvas 동적 import

---

## 7. 검증

### 필드 검증
- recipient: 길이 > 0
- createdDate: YYYY-MM-DD
- nights: 숫자 > 0
- email: 표준 형식
- phone: 010-xxxx-xxxx

---

## 8. 접근성 (A11y)

- aria-label 추가
- 시맨틱 HTML 사용
- 색상 대비 4.5:1 이상

---

## 9. Git

### 커밋 메시지
- feat: 새로운 기능
- fix: 버그 수정
- refactor: 코드 리팩토링
- docs: 문서 수정

### 브랜치
- feature/travel-free-editor
- bugfix/mobile-layout

---

## 10. 주석

### 필요한 주석
- 복잡한 알고리즘
- 비즈니스 로직
- 성능 최적화 이유

### 불필요한 주석
- 명백한 코드

---

v1.0 | 2026-02-18
