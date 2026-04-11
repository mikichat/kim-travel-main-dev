# Schedules 테이블 마이그레이션 완료

## 마이그레이션 일시
2025-11-14

## 변경 사항

### 이전 스키마
```sql
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT,
    event_date TEXT,
    location TEXT,
    description TEXT,
    created_at TEXT
);
```

### 새로운 스키마
```sql
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date TEXT,
    location TEXT,
    transport TEXT,
    time TEXT,
    schedule TEXT,
    meals TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

## 필드 변경 내역

| 이전 필드 | 새 필드 | 설명 |
|----------|---------|------|
| event_name | (제거) | schedule 필드로 통합 |
| event_date | event_date | 유지 |
| location | location | 유지 |
| (없음) | transport | 신규 - 교통편 정보 |
| (없음) | time | 신규 - 시간 정보 |
| description | schedule | 변경 - 일정 내용 |
| (없음) | meals | 신규 - 식사 정보 |
| created_at | created_at | 유지 |

## 데이터 마이그레이션

- **총 데이터**: 16개
- **마이그레이션 완료**: 16개
- **성공률**: 100%

### 마이그레이션 로직

1. `description`에서 "교통편:", "시간:", "식사:" 라벨 추출
2. `event_name` + `description`의 "일정:" 내용을 `schedule`로 통합
3. 기존 데이터 백업 테이블(`schedules_backup`) 생성

## 백업 테이블

안전을 위해 원본 데이터를 `schedules_backup` 테이블에 보관했습니다.

```sql
-- 백업 테이블 확인
SELECT * FROM schedules_backup;

-- 문제가 없으면 삭제 가능
DROP TABLE schedules_backup;
```

## API 변경 사항

### POST /api/schedules
**이전:**
```json
{
  "event_name": "인천 출발",
  "event_date": "2026-01-03",
  "location": "인천",
  "description": "교통편: OZ729\\n시간: 09:10\\n일정: 인천 국제공항 출발\\n식사: 조:기내식"
}
```

**현재:**
```json
{
  "event_date": "2026-01-03",
  "location": "인천",
  "transport": "OZ729",
  "time": "09:10",
  "schedule": "인천 출발\\n인천 국제공항 출발",
  "meals": "조:기내식"
}
```

### PUT /api/schedules/:id
동일한 필드 구조 사용

## 프론트엔드 변경 사항

### 폼 필드
- ~~일정명~~ (제거)
- 일자 (유지)
- 지역 (유지)
- **교통편** (신규)
- **시간** (신규)
- **일정** (필수, event_name + description 통합)
- **식사** (신규)

### 테이블 표시
| 일자 | 지역 | 교통편 | 시간 | 일정 | 식사 | 작업 |
|------|------|--------|------|------|------|------|
| 2026-01-03 | 인천 | OZ729 | 09:10 | 인천 출발... | 조:기내식 | 수정/삭제 |

- 동일 날짜는 `rowspan`으로 병합 표시
- 날짜 내림차순 정렬 (최신 날짜가 위로)

## 테스트 결과

### ✅ CREATE (생성)
```bash
curl -X POST http://localhost:5000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{"event_date":"2025-12-01","location":"제주","transport":"KE1234","time":"08:00","schedule":"제주 공항 도착","meals":"조:기내식"}'
```
결과: ✅ 성공 (ID 17 생성)

### ✅ READ (조회)
```bash
curl http://localhost:5000/api/schedules
```
결과: ✅ 성공 (16개 데이터 조회)

### ✅ UPDATE (수정)
```bash
curl -X PUT http://localhost:5000/api/schedules/17 \
  -H "Content-Type: application/json" \
  -d '{"event_date":"2025-12-01","location":"제주","transport":"KE1234","time":"08:00","schedule":"제주 공항 도착 후 렌트카 픽업","meals":"조:기내식, 중:흑돼지"}'
```
결과: ✅ 성공

### ✅ DELETE (삭제)
```bash
curl -X DELETE http://localhost:5000/api/schedules/17
```
결과: ✅ 성공

## 오류 체크

### 데이터베이스 무결성
- [x] 테이블 스키마 변경 완료
- [x] 모든 데이터 마이그레이션 완료
- [x] 데이터 개수 일치 (16개)
- [x] 백업 테이블 생성 완료

### API 엔드포인트
- [x] GET /api/schedules - 정상
- [x] GET /api/schedules/:id - 정상
- [x] POST /api/schedules - 정상
- [x] PUT /api/schedules/:id - 정상
- [x] DELETE /api/schedules/:id - 정상
- [x] GET /api/schedules/date/:date - 정상

### 프론트엔드
- [x] 폼 필드 업데이트 완료
- [x] 테이블 렌더링 수정 완료
- [x] 필터링 기능 업데이트 완료
- [x] 수정/삭제 기능 동작 확인

## 알려진 이슈

없음 - 모든 기능 정상 동작

## 사용 방법

1. **서버 실행**
   ```bash
   cd backend
   npm start
   ```

2. **브라우저 접속**
   - http://localhost:5000/schedules.html

3. **새 일정 추가**
   - 왼쪽 폼에서 필수 항목(일정) 입력
   - 선택 항목(일자, 지역, 교통편, 시간, 식사) 입력
   - "저장" 버튼 클릭

## 롤백 방법

문제 발생 시 백업 테이블로 복구 가능:

```sql
-- 1. 현재 테이블 삭제
DROP TABLE schedules;

-- 2. 백업 테이블을 복원
ALTER TABLE schedules_backup RENAME TO schedules;
```

그 후 backend/server.js와 database.js의 필드를 이전 버전으로 되돌립니다.

## 참고 파일

- 마이그레이션 스크립트: `backend/migrate_schedules.js`
- 백엔드 API: `backend/server.js` (line 333-403)
- 데이터베이스 스키마: `backend/database.js` (line 91-100)
- 프론트엔드: `schedules.html`

## 문의

문제가 발생하면 `schedules_backup` 테이블을 확인하고 위의 롤백 방법을 사용하세요.
