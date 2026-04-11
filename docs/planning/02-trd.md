# TRD: 자유여행 예약 내역 이미지 생성 시스템 - 기술 요구사항

**문서 버전**: 1.0 | **작성일**: 2026-02-18 | **상태**: Active

---

## MVP 캡슐 (기술 관점)

| 항목 | 내용 |
|------|------|
| **핵심 기술** | HTML + Tailwind CSS + Vanilla JS + html2canvas |
| **데이터 저장** | localStorage (freetravel_saves_v1) + LZString 압축 |
| **성능 목표** | 로딩 < 2초, 이미지 저장 < 3초 |
| **호환성** | iOS Safari + Android Chrome |
| **보안** | LZString 암호화 (URL) |

---

## 1. 아키텍처

### 클라이언트 구조
- Editor Page → localStorage → Preview Page → Image Export/Print

### 데이터 흐름
1. 여행사 직원: 에디터 입력 → 자동 저장 → 미리보기 → 이미지/URL 공유
2. 자유여행 고객: URL 링크 → 자동 로드 → 미리보기 → 이미지/인쇄

---

## 2. 기술 스택

| 계층 | 기술 | 버전 | 용도 |
|------|------|------|------|
| 마크업 | HTML5 | 최신 | 시맨틱 구조 |
| 스타일 | Tailwind CSS | CDN | 모바일 반응형 |
| 로직 | Vanilla JS | ES6+ | 라이브러리 최소화 |
| 아이콘 | Material Symbols + FA | 최신 | 시각화 |
| 폰트 | Noto Sans KR + Inter | Google Fonts | 다국어 |
| 이미지 | html2canvas | 최신 | PNG 저장 |
| 압축 | LZString | 1.5.0 | URL 공유 |

---

## 3. 데이터 저장소

### localStorage

| 키 | 용도 | 크기 | 형식 |
|----|------|------|------|
| freetravel_saves_v1 | 여행사 저장 (최대 10개) | 5MB | JSON |
| freetravel_company_default | 회사정보 기본값 | 100KB | JSON |

### LZString 압축
- 원본 JSON → compress() → Base64 → URL 파라미터
- 압축율: 60% 이상 감소

---

## 4. 이미지 생성

### html2canvas 설정

```javascript
{
  allowTaint: true,
  useCORS: true,
  logging: false,
  scale: 2,           // 고화질
  backgroundColor: '#ffffff'
}
```

### 저장 방식
- 전체: 1장 이미지 저장
- 섹션별: 개별 체크박스로 선택 저장

---

## 5. 성능 요구사항

| 메트릭 | 목표 |
|-------|------|
| FCP (First Contentful Paint) | < 1.5초 |
| LCP (Largest Contentful Paint) | < 2초 |
| TTI (Time to Interactive) | < 2.5초 |
| 이미지 저장 | < 3초 |

---

## 6. 호환성

### 브라우저
- iOS Safari 14+
- Android Chrome 90+
- Desktop Chrome/Safari (권장)

### 기기
- iPhone SE (375x667)
- iPhone 14/14Pro (390x932, 430x932)
- Android 360x640+
- iPad 768x1024+

---

## 7. 보안

| 항목 | 방식 |
|------|------|
| URL 파라미터 | LZString 압축 |
| localStorage | 클라이언트 전용 |
| 민감정보 | 계좌 마스킹 |
| 외부 리소스 | HTTPS CDN 사용 |

---

## 8. 입력 검증

| 필드 | 규칙 |
|------|------|
| 이름 | 한글/영문/숫자 (최대 50자) |
| 날짜 | YYYY-MM-DD |
| 금액 | 숫자 (최대 99,999,999) |
| 휴대폰 | 010-0000-0000 |
| 이메일 | 표준 형식 |

---

## 9. 파일 구조

```
hanatour/
├── travel-free.html      // 에디터
│   ├── 기본정보 입력
│   ├── 항공/호텔/렌트카/골프/커스텀 입력
│   ├── 실시간 미리보기
│   └── JS: 저장/불러오기/상태 관리
│
├── preview-free.html     // 미리보기
│   ├── 헤더 (타이틀, 제어 버튼)
│   ├── 8개 섹션 카드
│   ├── 푸터 (회사정보)
│   └── 다크모드 지원
│
└── css/style.css         // 사이드바 스타일
```

---

## 10. 핵심 API (Vanilla JS)

```javascript
// 저장
saveToLocalStorage(data, name)

// 불러오기
loadFromLocalStorage(index)

// URL 공유
generateShareUrl(data)

// 이미지 저장
downloadImage(element, filename)

// 인쇄
printPreview()
```

---

## 11. 테스트

### 단위 테스트
- 데이터 검증 (날짜, 금액, 이메일 등)
- LZString 압축/해제

### 통합 테스트 (수동)
- 기본정보 입력 → 자동 저장
- 항목 추가/삭제 → 미리보기 반영
- 저장/불러오기 → 전체 상태 복원
- 이미지 저장 → PNG 생성
- 인쇄 → 레이아웃 최적화

### 성능 테스트
- Lighthouse: 각 항목 90점 이상

---

## 12. 배포

- **방식**: 정적 파일 (HTML, CSS, JS)
- **호스팅**: 기존 웹서버 (hanatour/ 폴더)
- **버전**: 파일명에 v1.0 포함
- **캐시**: CDN 1시간 (필요시)

---

**버전**: v1.0 | **작성**: 2026-02-18
