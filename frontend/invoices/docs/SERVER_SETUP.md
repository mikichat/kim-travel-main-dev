# 인보이스 시스템 서버 설정 가이드

## 서버 접근 경로

백엔드 서버(`http://localhost:5000`)에서 인보이스 시스템에 접근하는 방법:

### 주요 페이지

1. **인보이스 편집 페이지**
   - URL: `http://localhost:5000/invoice`
   - 파일: `in/invoice-editor.html`

2. **인보이스 미리보기 페이지**
   - URL: `http://localhost:5000/invoice/preview`
   - 파일: `in/invoice-preview.html`
   - 주의: 미리보기는 편집 페이지에서 자동으로 열립니다.

### 정적 파일 경로

- **CSS 파일**: `http://localhost:5000/in/css/invoice.css`
- **JavaScript 파일**: 
  - `http://localhost:5000/in/js/invoice-editor.js`
  - `http://localhost:5000/js/flight-sync-manager.js`
- **이미지 파일**: `http://localhost:5000/in/이미지/브랜드.jpg`

## 서버 시작 방법

```bash
cd backend
node server.js
```

또는

```bash
npm start
```

서버가 시작되면 `http://localhost:5000`에서 접근 가능합니다.

## API 엔드포인트

인보이스 시스템에서 사용하는 API:

- `GET /api/flight-schedules` - 항공 스케줄 목록
- `GET /api/bank-accounts` - 은행 계좌 목록
- `POST /api/invoices` - 인보이스 저장

## 파일 구조

```
main/
├── backend/
│   └── server.js          # 서버 설정 (정적 파일 서빙 포함)
├── in/
│   ├── invoice-editor.html
│   ├── invoice-preview.html
│   ├── js/
│   │   └── invoice-editor.js
│   ├── css/
│   │   └── invoice.css
│   └── 이미지/
└── js/
    └── flight-sync-manager.js
```

## 주의사항

1. **FlightSyncManager 경로**: 
   - 편집 페이지에서 `../js/flight-sync-manager.js`로 로드
   - 서버에서는 `/js/flight-sync-manager.js`로 접근 가능

2. **미리보기 데이터 전달**:
   - URL 파라미터 방식 (2000자 이하)
   - sessionStorage 방식 (2000자 초과)

3. **CORS 설정**: 
   - 서버에서 CORS가 활성화되어 있어 다른 도메인에서도 API 호출 가능

## 문제 해결

### 파일을 찾을 수 없는 경우
- 서버가 정상적으로 시작되었는지 확인
- 파일 경로가 올바른지 확인
- 브라우저 콘솔에서 404 오류 확인

### 스크립트가 로드되지 않는 경우
- 브라우저 개발자 도구의 Network 탭에서 요청 상태 확인
- 파일 경로가 서버 설정과 일치하는지 확인
