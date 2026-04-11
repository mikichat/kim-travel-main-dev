# 인보이스 시스템 빠른 시작 가이드

## 서버 시작 방법

### 방법 1: 배치 파일 사용 (권장)

1. `backend/start-server.bat` 파일을 더블클릭
2. 서버가 시작되면 콘솔에 다음 메시지가 표시됩니다:
   ```
   백엔드 서버가 http://localhost:5000 에서 실행 중입니다.
   ```
3. 브라우저에서 `http://localhost:5000/invoice` 접근

### 방법 2: 명령 프롬프트 사용

1. 명령 프롬프트(CMD) 또는 PowerShell 열기
2. 다음 명령 실행:
   ```bash
   cd C:\Users\kgj12\Root\main\backend
   node server.js
   ```
3. 서버가 시작되면 브라우저에서 `http://localhost:5000/invoice` 접근

### 방법 3: npm 사용

```bash
cd backend
npm start
```

## 접근 URL

- **인보이스 편집**: http://localhost:5000/invoice
- **인보이스 미리보기**: http://localhost:5000/invoice/preview (자동으로 열림)

## 문제 해결

### ERR_CONNECTION_REFUSED 오류

**원인**: 서버가 실행되지 않음

**해결 방법**:
1. 서버가 실행 중인지 확인
2. `backend/start-server.bat` 실행
3. 포트 5000이 다른 프로그램에서 사용 중인지 확인

### 포트가 이미 사용 중인 경우

다른 포트로 변경하려면 `backend/server.js` 파일에서:
```javascript
const port = 5000; // 이 값을 변경 (예: 5001)
```

### Node.js가 설치되지 않은 경우

1. https://nodejs.org/ 에서 Node.js 다운로드 및 설치
2. 설치 후 명령 프롬프트에서 `node --version` 확인

## 서버 중지

서버를 중지하려면:
- 서버가 실행 중인 콘솔 창에서 `Ctrl + C` 누르기

## 확인 사항

서버가 정상적으로 실행되면:
- 콘솔에 "백엔드 서버가 http://localhost:5000 에서 실행 중입니다." 메시지 표시
- 브라우저에서 `http://localhost:5000` 접근 시 메인 페이지 표시
- `http://localhost:5000/invoice` 접근 시 인보이스 편집 페이지 표시
