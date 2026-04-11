# 포트 설정 가이드

## 포트 변경 방법

### 방법 1: 환경 변수 사용 (권장)

#### Windows (명령 프롬프트)
```bash
cd backend
set PORT=5001
node server.js
```

#### Windows (PowerShell)
```bash
cd backend
$env:PORT=5001
node server.js
```

#### Linux/Mac
```bash
cd backend
PORT=5001 node server.js
```

### 방법 2: .env 파일 사용

1. `backend` 폴더에 `.env` 파일 생성
2. 다음 내용 추가:
   ```
   PORT=5001
   ```
3. 서버 시작:
   ```bash
   node server.js
   ```

### 방법 3: 배치 파일 사용 (Windows)

`backend/start-with-port.bat` 파일을 실행하면 포트 번호를 입력받아 시작합니다.

### 방법 4: package.json 스크립트 수정

`backend/package.json`의 scripts 섹션에 추가:
```json
{
  "scripts": {
    "start": "node server.js",
    "start:5001": "set PORT=5001 && node server.js",
    "start:3000": "set PORT=3000 && node server.js"
  }
}
```

사용:
```bash
npm run start:5001
```

## 현재 포트 확인

서버가 시작되면 콘솔에 다음 메시지가 표시됩니다:
```
백엔드 서버가 http://localhost:5000 에서 실행 중입니다.
인보이스 편집 페이지: http://localhost:5000/invoice
인보이스 미리보기: http://localhost:5000/invoice/preview
```

## 포트 충돌 해결

### 포트가 이미 사용 중인 경우

#### Windows에서 포트 사용 확인
```bash
netstat -ano | findstr :5000
```

#### 포트를 사용하는 프로세스 종료
```bash
taskkill /PID [프로세스ID] /F
```

#### 다른 포트 사용
위의 방법 중 하나를 사용하여 다른 포트로 변경

## 기본 포트

- 기본 포트: **5000**
- 환경 변수 `PORT`가 설정되지 않으면 5000 사용
