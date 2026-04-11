# 🔄 항공편 동기화 시스템 사용 가이드

## 📋 개요

**항공편 자동변환기(air1)와 항공 스케줄 관리(flight-schedule) 간의 실시간 양방향 동기화 시스템**

모든 페이지가 **포트 5000**에서 통합 운영되며, localStorage를 통해 데이터를 공유합니다.

---

## 🎯 주요 기능

### 1. **실시간 동기화**
- 항공편 변환기에서 저장 → 스케줄 관리에 즉시 반영
- 스케줄 관리에서 수정 → 모든 페이지에 자동 업데이트
- 다중 탭 간 자동 동기화

### 2. **자동 데이터 변환**
- flight_saves_v2 ↔ schedule 형식 자동 변환
- 날짜, 공항, 항공사 정보 자동 파싱

### 3. **완전 통합 워크플로우**
```
항공편 변환기 → 스케줄 관리 → 견적서 → 일정표
         ↓            ↓         ↓        ↓
      localStorage (단일 진실 소스)
```

---

## 🚀 사용 방법

### 시나리오 1: 새 항공편 추가

#### Step 1: 항공편 변환기에서 입력
```
1. http://localhost:5000/air1/index.html 접속
2. 항공편 정보 입력 및 변환
3. "저장" 버튼 클릭
4. ✅ flight_saves_v2에 저장됨
```

#### Step 2: 스케줄 관리에서 확인
```
1. http://localhost:5000/flight-schedule.html 접속
   → 자동으로 새 항공편이 목록에 표시됨
2. 실시간 동기화로 즉시 반영
3. 상세 정보 확인 가능
```

#### Step 3: 견적서/일정표에서 활용
```
1. 견적서 편집기 → 드롭다운에서 항공편 선택
2. 일정표 → 자동 입력 제안
```

---

### 시나리오 2: 다중 탭 동기화 테스트

#### 준비
```
1. 테스트 페이지 열기: http://localhost:5000/test-flight-sync.html
2. "🎲 샘플 데이터 생성 (5개)" 클릭
3. "👂 동기화 리스너 시작" 클릭
```

#### 테스트 1: 항공편 추가 감지
```
1. 테스트 페이지에서 "🚀 새 탭 열기" 클릭
2. 새 탭에서 "➕ 항공편 추가 테스트" 클릭
3. 원래 탭으로 돌아오기
4. ✅ 로그에 "🔄 동기화 감지: add" 표시
5. ✅ 항공편 목록 자동 업데이트
```

#### 테스트 2: 스케줄 관리 연동
```
1. http://localhost:5000/flight-schedule.html 열기
2. 페이지 로드 → 샘플 데이터 5개 표시 확인
3. 테스트 페이지에서 항공편 추가
4. 스케줄 관리 페이지 확인
5. ✅ 새 항공편 자동 추가됨
```

---

### 시나리오 3: 완전한 워크플로우

#### 1단계: 항공편 입력
```
페이지: http://localhost:5000/air1/index.html
작업:
  - 항공편 번호, 출발/도착 공항, 시간 입력
  - 고객 정보, 미팅 장소/시간 입력
  - 저장
```

#### 2단계: 스케줄 확인
```
페이지: http://localhost:5000/flight-schedule.html
확인:
  - ✅ 새 항공편이 목록에 표시됨
  - ✅ 출발 24/48시간 전 알람 설정됨
  - ✅ 탑승객 정보 포함
```

#### 3단계: 견적서 작성
```
페이지: http://localhost:5000/quote-editor-v1/index.html
작업:
  - 항공편 드롭다운에서 선택
  - 자동 입력된 정보 확인
  - 가격 정보 추가
  - 견적서 저장
```

#### 4단계: 일정표 생성
```
페이지: http://localhost:5000/hanatour/travel-simple.html
작업:
  - 자동 입력 확인 대화상자 "확인" 클릭
  - 모든 필드 자동 채워짐
  - 필요시 수정
  - 다운로드
```

---

## 🔧 기술 상세

### FlightSyncManager API

#### CRUD 작업
```javascript
// 조회
FlightSyncManager.getFlights()        // 전체 항공편
FlightSyncManager.getFlightById(id)   // ID로 조회

// 추가
FlightSyncManager.addFlight({
  name: "방콕 여행",
  flights: [...],
  customerInfo: {...}
})

// 수정
FlightSyncManager.updateFlight(id, {
  name: "방콕 여행 (수정)"
})

// 삭제
FlightSyncManager.deleteFlight(id)
```

#### 동기화
```javascript
// 변경 감지 리스너
FlightSyncManager.onFlightChange((eventType, flightId) => {
  console.log('변경 감지:', eventType, flightId);
  // 'add', 'update', 'delete', 'change'
});
```

#### 데이터 변환
```javascript
// flight_saves_v2 → schedule 형식
const schedules = FlightSyncManager.convertToScheduleFormat(flightSave);

// schedule → flight_saves_v2 형식
const flightSave = FlightSyncManager.convertFromScheduleFormat(schedule);
```

#### 유틸리티
```javascript
// 백업
const json = FlightSyncManager.backup();

// 복원
FlightSyncManager.restore(json);

// 통계
const stats = FlightSyncManager.getStats();
// { total: 5, byAirline: {...}, byMonth: {...}, totalPassengers: 150 }

// 전체 삭제
FlightSyncManager.clear();
```

---

### 데이터 구조

#### flight_saves_v2 (기본 형식)
```javascript
{
  id: "FLIGHT-1735214857000",
  name: "방콕 여행",
  pnr: "ABC123",
  saveDate: "2025-12-26T14:00:57.000Z",
  flights: [
    {
      flightNumber: "OZ 747",
      airline: "OZ",
      date: "2025.01.20(월)",
      departure: {
        airport: "인천국제공항",
        code: "ICN",
        time: "10:30"
      },
      arrival: {
        airport: "방콕",
        code: "BKK",
        time: "14:30"
      }
    }
  ],
  customerInfo: {
    name: "홍길동",
    phone: "010-1234-5678",
    meetingPlace: "인천공항 제1터미널",
    meetingTime: "2025.01.20 06:30",
    totalPeople: "45"
  }
}
```

#### Schedule 형식 (스케줄 관리용)
```javascript
{
  id: "FLIGHT-1735214857000-0",
  sourceId: "FLIGHT-1735214857000",
  sourceIndex: 0,
  groupName: "방콕 여행",
  pnr: "ABC123",
  flightNumber: "OZ 747",
  airline: "아시아나항공",
  departure: "인천국제공항 (ICN)",
  arrival: "방콕 (BKK)",
  departureDate: "2025-01-20",
  departureTime: "10:30",
  arrivalDate: "2025-01-20",
  arrivalTime: "14:30",
  passengers: [
    { name: "홍길동", phone: "010-1234-5678", isRepresentative: true },
    { name: "승객 2", phone: "", isRepresentative: false }
    // ... 총 45명
  ],
  status: "scheduled"
}
```

---

## 🧪 테스트 체크리스트

### 기본 동작
- [ ] FlightSyncManager 로드 확인
- [ ] localStorage 읽기/쓰기 동작
- [ ] 데이터 형식 변환 정확도

### CRUD 작업
- [ ] 항공편 추가 (addFlight)
- [ ] 항공편 조회 (getFlights)
- [ ] 항공편 수정 (updateFlight)
- [ ] 항공편 삭제 (deleteFlight)

### 실시간 동기화
- [ ] storage event 발생 확인
- [ ] 다른 탭에서 변경 감지
- [ ] 자동 목록 새로고침
- [ ] 브라우저 알림 표시

### 페이지 연동
- [ ] air1 → flight-schedule 동기화
- [ ] flight-schedule → quote-editor 연동
- [ ] quote-editor → travel-simple 자동 입력

### 엣지 케이스
- [ ] 빈 데이터 처리
- [ ] 잘못된 형식 처리
- [ ] 중복 ID 처리
- [ ] localStorage 용량 제한

---

## 🐛 문제 해결

### 문제 1: 스케줄 관리에 항공편이 표시되지 않음

**원인**: localStorage에 데이터가 없음

**해결**:
```
1. F12 → Console 열기
2. localStorage.getItem('flight_saves_v2') 확인
3. null이면:
   - 테스트 페이지에서 샘플 데이터 생성
   - 또는 air1에서 항공편 저장
```

---

### 문제 2: 동기화가 작동하지 않음

**원인**: 같은 탭에서는 storage event가 발생하지 않음

**해결**:
```
1. 새 탭 열기 (같은 페이지)
2. 한 탭에서 데이터 추가/수정
3. 다른 탭에서 자동 업데이트 확인
```

---

### 문제 3: FlightSyncManager를 찾을 수 없음

**원인**: 스크립트 로드 실패

**해결**:
```
1. F12 → Network 탭 확인
2. js/flight-sync-manager.js 404 오류 확인
3. 파일 경로 확인:
   - 위치: C:\Users\kgj12\Root\main\js\flight-sync-manager.js
   - URL: http://localhost:5000/js/flight-sync-manager.js
```

---

### 문제 4: 데이터 형식 오류

**원인**: flight_saves_v2와 schedule 형식 불일치

**해결**:
```
1. 콘솔에서 확인:
   FlightSyncManager.getFlights()
2. 형식이 잘못되었으면:
   FlightSyncManager.clear()
   샘플 데이터 재생성
```

---

## 📊 성능 고려사항

### localStorage 제한
- **최대 용량**: 5MB (브라우저마다 다름)
- **권장 항공편 수**: 500개 이하
- **초과 시**: 자동 백업 후 오래된 데이터 삭제 권장

### 동기화 빈도
- **즉시 동기화**: 추가/수정/삭제 시
- **지연 없음**: storage event는 즉시 발생
- **대량 작업**: 백그라운드에서 처리 권장

---

## 🔐 보안 고려사항

### 데이터 저장
- **위치**: 브라우저 localStorage (로컬 전용)
- **암호화**: 없음 (민감 정보 저장 지양)
- **접근 권한**: 같은 origin(포트 5000)만 접근 가능

### 백업 권장
- **주기**: 매주 또는 중요 작업 전
- **방법**: 테스트 페이지 → "📦 백업" 버튼
- **저장**: 안전한 위치에 JSON 파일 보관

---

## 📚 참고 자료

### 관련 문서
- `FLIGHT_SYSTEM_INTEGRATION_PLAN.md` - 전체 통합 계획
- `SYNC_DATA_EXPLANATION.md` - 견적서 동기화 설명
- `SYNC_FEATURE_GUIDE.md` - 견적서 동기화 가이드

### 관련 파일
- `js/flight-sync-manager.js` - 동기화 매니저
- `test-flight-sync.html` - 테스트 페이지
- `flight-schedule.html` - 스케줄 관리
- `air1/index.html` - 항공편 변환기

---

## 🎯 요약

### 핵심 흐름
```
1. 항공편 변환기에서 입력 → 저장
2. localStorage에 flight_saves_v2 저장
3. storage event 발생
4. 모든 열린 페이지에서 감지
5. 스케줄 관리 자동 업데이트
6. 견적서/일정표에서 활용
```

### 주요 장점
- ✅ **실시간 동기화**: 수동 작업 불필요
- ✅ **데이터 일관성**: 단일 진실 소스 (localStorage)
- ✅ **자동 변환**: 형식 변환 자동 처리
- ✅ **완전 통합**: 모든 페이지 연동

### 사용 팁
- 💡 테스트 페이지에서 먼저 익히기
- 💡 샘플 데이터로 시작하기
- 💡 정기적으로 백업하기
- 💡 F12 콘솔로 디버깅하기

---

**버전**: 1.0
**작성일**: 2025-12-26
**포트**: 5000 (통합)
**상태**: ✅ 운영 준비 완료
