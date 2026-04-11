# 일정 관리 시스템

travel_agency.db의 schedules 테이블을 기반으로 한 완전한 일정 관리 시스템입니다.

## 주요 기능

### 1. 캘린더 뷰
- 월별 캘린더로 일정을 시각적으로 확인
- 일정이 있는 날짜는 점으로 표시
- 오늘 날짜 하이라이트
- 이전/다음 달 네비게이션

### 2. 일정 관리
- **추가**: 새로운 일정 추가
- **수정**: 기존 일정 편집
- **삭제**: 불필요한 일정 제거
- **조회**: 전체 일정 목록 확인

### 3. 통계 대시보드
- 전체 일정 수
- 오늘 일정 수
- 이번 주 일정 수
- 이번 달 일정 수

### 4. 검색 및 필터
- 일정명, 장소, 설명으로 검색
- 날짜별 필터링
- 실시간 검색 결과 업데이트

## 데이터베이스 스키마

```sql
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT,
    event_date TEXT,
    location TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

## API 엔드포인트

### 모든 일정 조회
```
GET /api/schedules
```

### 특정 일정 조회
```
GET /api/schedules/:id
```

### 새 일정 추가
```
POST /api/schedules
Content-Type: application/json

{
  "event_name": "일정명",
  "event_date": "2025-11-20",
  "location": "장소",
  "description": "상세 내용"
}
```

### 일정 수정
```
PUT /api/schedules/:id
Content-Type: application/json

{
  "event_name": "수정된 일정명",
  "event_date": "2025-11-21",
  "location": "새 장소",
  "description": "수정된 내용"
}
```

### 일정 삭제
```
DELETE /api/schedules/:id
```

### 날짜별 일정 조회
```
GET /api/schedules/date/:date
예: GET /api/schedules/date/2025-11-20
```

## 사용 방법

### 1. 서버 실행
```bash
cd backend
npm start
```

서버가 http://localhost:5000 에서 실행됩니다.

### 2. 일정 관리 페이지 열기

브라우저에서 다음 중 하나를 엽니다:
- http://localhost:5000/schedules.html
- 메인 페이지(index.html)의 사이드바에서 "일정 관리" 클릭

### 3. 일정 추가하기

1. "새 일정" 버튼 클릭 또는 왼쪽 폼 사용
2. 필수 항목:
   - 일정명: 일정의 제목
3. 선택 항목:
   - 날짜: 일정 날짜 (YYYY-MM-DD)
   - 장소: 일정이 진행되는 장소
   - 상세 내용: 일정의 상세 설명
4. "저장" 버튼 클릭

### 4. 일정 수정하기

1. 일정 목록에서 "수정" 버튼 클릭
2. 폼에 기존 데이터가 자동으로 채워짐
3. 원하는 항목 수정
4. "저장" 버튼 클릭

### 5. 일정 검색하기

- 상단 검색창에 키워드 입력 (일정명, 장소, 설명 검색)
- 날짜 필터를 선택하여 특정 날짜 일정만 보기
- "초기화" 버튼으로 필터 제거

### 6. 캘린더 사용하기

- 캘린더에서 날짜 클릭 시 해당 날짜의 일정만 필터링
- "오늘" 버튼으로 현재 월로 이동
- 화살표 버튼으로 이전/다음 달 이동

## 기존 데이터

데이터베이스에는 이미 16개의 일정이 포함되어 있습니다:
- 하노이 견적서 일정 (2026-01-03 ~ 2026-01-07)
- 골프 라운딩, 관광, 마사지 등 상세 일정

## 파일 구조

```
main/
├── schedules.html          # 일정 관리 프론트엔드
├── index.html             # 메인 페이지 (일정 관리 링크 추가됨)
└── backend/
    ├── server.js          # 백엔드 서버 (일정 API 추가됨)
    ├── database.js        # 데이터베이스 연결
    └── travel_agency.db   # SQLite 데이터베이스
```

## 특징

1. **반응형 디자인**: 데스크톱과 모바일에서 모두 사용 가능
2. **실시간 업데이트**: 일정 추가/수정/삭제 시 즉시 반영
3. **직관적인 UI**: 아이콘과 색상으로 쉽게 구분
4. **Toast 알림**: 모든 작업에 대한 피드백 제공
5. **데이터 유효성 검사**: 필수 항목 확인
6. **정렬 기능**: 날짜순으로 자동 정렬

## 추가 개발 가능 항목

- [ ] 일정 카테고리 분류 (여행, 회의, 개인 등)
- [ ] 알림 기능 (일정 시작 전 알림)
- [ ] 일정 공유 기능
- [ ] Excel/PDF 내보내기
- [ ] 반복 일정 설정
- [ ] 일정에 파일 첨부
- [ ] 참석자 관리

## 문제 해결

### 서버가 시작되지 않을 때
```bash
# 포트 5000이 이미 사용 중인 경우
netstat -ano | findstr :5000
# 프로세스 종료
taskkill /PID [프로세스ID] /F
```

### 일정이 로드되지 않을 때
1. 서버가 실행 중인지 확인
2. 브라우저 콘솔(F12)에서 오류 확인
3. API URL이 올바른지 확인 (http://localhost:5000/api/schedules)

### 한글이 깨질 때
- 데이터베이스는 UTF-8로 저장되므로 브라우저에서는 정상 표시됨
- curl 테스트 시 Windows 콘솔에서 한글이 깨질 수 있으나 실제 사용에는 문제 없음

## 라이선스

이 프로젝트는 여행사 관리 시스템의 일부입니다.
