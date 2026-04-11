# 오류 설명 및 해결 방법

## 1. Content Security Policy (CSP) 오류

### 오류 메시지
```
Connecting to 'http://localhost:5000/.well-known/appspecific/com.chrome.devtools.json' 
violates the following Content Security Policy directive: "default-src 'none'".
```

### 원인
- Chrome DevTools가 자동으로 개발 도구 연결을 시도하는 과정에서 발생
- 서버에서 CSP 헤더가 설정되어 있어 연결이 차단됨
- **실제 기능에는 영향 없음** (개발 도구 관련 경고일 뿐)

### 해결 방법
1. **무시해도 됨**: 기능에는 영향이 없으므로 무시 가능
2. **서버 설정 수정**: `.well-known` 경로에 대한 CSP 예외 추가 (이미 적용됨)

## 2. 404 Not Found 오류

### 오류 메시지
```
INVOICE:1 Failed to load resource: the server responded with a status of 404 (Not Found)
```

### 원인
- `/invoice` 경로로 접근할 때 상대 경로 리소스가 잘못 해석됨
- 예: `css/invoice.css`가 `/invoice/css/invoice.css`로 해석되어 404 발생
- 실제 파일은 `/in/css/invoice.css`에 있음

### 해결 방법
1. **`<base>` 태그 추가**: HTML에 `<base href="/in/">` 추가 (이미 적용됨)
   - 모든 상대 경로가 `/in/` 기준으로 해석됨
   
2. **절대 경로 사용**: 
   - `css/invoice.css` → `/in/css/invoice.css`
   - `js/invoice-editor.js` → `/in/js/invoice-editor.js`
   - `../js/flight-sync-manager.js` → `/js/flight-sync-manager.js`

### 적용된 수정 사항
- ✅ `invoice-editor.html`에 `<base href="/in/">` 추가
- ✅ `invoice-preview.html`에 `<base href="/in/">` 추가
- ✅ 스크립트 경로를 절대 경로로 변경
- ✅ 서버에 CSP 예외 추가

## 확인 방법

브라우저 개발자 도구(F12)에서:
1. **Network 탭**: 모든 리소스가 200 OK로 로드되는지 확인
2. **Console 탭**: CSP 오류는 여전히 표시될 수 있지만 기능에는 영향 없음

## 테스트 URL

다음 URL들이 정상 작동하는지 확인:
- `http://localhost:5000/invoice` - 인보이스 편집
- `http://localhost:5000/in/css/invoice.css` - CSS 파일
- `http://localhost:5000/in/js/invoice-editor.js` - JavaScript 파일
- `http://localhost:5000/js/flight-sync-manager.js` - FlightSyncManager

모든 파일이 로드되면 정상입니다.
