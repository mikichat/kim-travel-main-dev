# 인보이스 시스템 문제 해결 가이드

## 접근이 안되는 경우

### 1. 서버가 실행 중인지 확인
```bash
# 서버 시작
cd backend
node server.js
```

서버가 정상적으로 시작되면 다음 메시지가 표시됩니다:
```
백엔드 서버가 http://localhost:5000 에서 실행 중입니다.
```

### 2. 접근 URL 확인
- **인보이스 편집**: `http://localhost:5000/invoice`
- **인보이스 미리보기**: `http://localhost:5000/invoice/preview`

### 3. 브라우저 콘솔 확인
브라우저 개발자 도구(F12)를 열고:
- **Console 탭**: JavaScript 오류 확인
- **Network 탭**: 파일 로드 실패 확인 (404, 500 등)

### 4. 일반적인 문제

#### 문제: 404 Not Found
**원인**: 파일 경로가 잘못되었거나 서버가 파일을 찾을 수 없음
**해결**:
- 서버를 재시작
- 파일이 `in/invoice-editor.html` 경로에 있는지 확인

#### 문제: 스크립트가 로드되지 않음
**원인**: 상대 경로 문제
**해결**:
- `http://localhost:5000/js/flight-sync-manager.js` 직접 접근 테스트
- `http://localhost:5000/in/js/invoice-editor.js` 직접 접근 테스트

#### 문제: CORS 오류
**원인**: API 호출 시 CORS 문제
**해결**:
- 서버의 CORS 설정이 활성화되어 있는지 확인
- `backend/server.js`에서 `app.use(cors());` 확인

### 5. 서버 로그 확인
서버 콘솔에서 다음을 확인:
- 요청이 들어오는지 (GET /invoice 등)
- 오류 메시지가 있는지

### 6. 포트 충돌 확인
다른 프로세스가 5000 포트를 사용 중일 수 있습니다:
```bash
# Windows에서 포트 사용 확인
netstat -ano | findstr :5000
```

### 7. 파일 권한 확인
파일 읽기 권한이 있는지 확인합니다.

## 빠른 테스트

브라우저에서 다음 URL들을 직접 테스트:
1. `http://localhost:5000/` - 메인 페이지
2. `http://localhost:5000/invoice` - 인보이스 편집
3. `http://localhost:5000/in/js/invoice-editor.js` - JS 파일
4. `http://localhost:5000/js/flight-sync-manager.js` - FlightSyncManager

모든 파일이 로드되면 정상입니다.
