# 항공편 시스템 통합 구현 계획 (업데이트)

## 📋 프로젝트 개요

**목표**: 항공편 자동변환기 ↔ 항공 스케줄 관리 ↔ 견적서 ↔ 일정표 완전 통합

**핵심 기능**:
1. 항공편 자동변환기(air1) ↔ 항공 스케줄 관리(flight-schedule) 양방향 동기화 ⭐ **NEW**
2. 항공 스케줄 관리를 localStorage 기반으로 전환 ⭐ **NEW**
3. 견적서에서 항공편 데이터 자동 불러오기 (완료)
4. 일정표 자동 입력 (완료)
5. 실시간 데이터 동기화 및 업데이트 ⭐ **NEW**

**예상 소요 시간**: 약 3일 (20시간)

---

## 🎯 1. PRD (Product Requirements Document)

### 사용자 스토리

#### **US-01: 항공편 변환기 → 스케줄 관리 연동** ⭐ NEW
**AS A** 여행사 직원
**I WANT** 항공편 변환기에서 저장한 항공편이 자동으로 스케줄 관리에 표시되기를
**SO THAT** 수동으로 재입력하지 않고 스케줄을 관리할 수 있다

**인수 기준**:
- ✅ 항공편 변환기에서 저장 버튼 클릭 시 flight_saves_v2에 저장
- ✅ 스케줄 관리 페이지에서 저장된 항공편 자동 로드
- ✅ 새로운 항공편 추가 시 실시간 반영
- ✅ 항공편 수정/삭제 시 양쪽에 동기화

**성공 지표**:
- 데이터 입력 시간 70% 감소
- 입력 오류 90% 감소

---

#### **US-02: 스케줄 관리에서 항공편 수정** ⭐ NEW
**AS A** 여행사 직원
**I WANT** 스케줄 관리에서 항공편 정보를 수정하면 원본 데이터도 업데이트되기를
**SO THAT** 모든 시스템에서 일관된 정보를 유지할 수 있다

**인수 기준**:
- ✅ 스케줄 관리에서 항공편 수정 기능
- ✅ 수정 시 flight_saves_v2 업데이트
- ✅ 견적서/일정표에서도 업데이트된 정보 반영
- ✅ 수정 이력 추적 (선택사항)

---

#### **US-03: 통합 데이터 대시보드** ⭐ NEW
**AS A** 여행사 관리자
**I WANT** 한 곳에서 모든 항공편 정보를 확인하고 관리하기를
**SO THAT** 효율적으로 업무를 조율할 수 있다

**인수 기준**:
- ✅ 전체 항공편 목록 조회
- ✅ 상태별 필터링 (예정, 완료, 취소)
- ✅ 날짜별/항공사별 그룹화
- ✅ 연결된 견적서/일정표 바로가기

---

### 주요 기능

#### **F-01: 항공 스케줄 관리 localStorage 전환** ⭐ NEW
**현재 상태**: 하드코딩된 임시 데이터 사용
**목표**: localStorage 기반 동적 데이터 관리

**구현 내용**:
- flight_saves_v2에서 항공편 목록 로드
- 스케줄 추가/수정/삭제 기능
- 탑승객 정보 연동 (customerInfo 활용)
- 알람 기능 유지 (출발 24/48시간 전)

**데이터 구조**:
```javascript
// flight_saves_v2 (기존)
{
  id: "FLIGHT-1234567890",
  name: "방콕 여행",
  pnr: "ABC123",
  flights: [
    {
      flightNumber: "OZ 747",
      airline: "OZ",
      date: "2025.01.20(월)",
      departure: { airport: "인천국제공항", code: "ICN", time: "10:30" },
      arrival: { airport: "방콕", code: "BKK", time: "14:30" }
    }
  ],
  customerInfo: {
    name: "홍길동",
    phone: "010-1234-5678",
    totalPeople: "45"
  }
}
```

---

#### **F-02: 양방향 동기화 시스템** ⭐ NEW
**기능**: 항공편 변환기 ↔ 스케줄 관리 실시간 동기화

**동기화 시나리오**:

**시나리오 A: 항공편 변환기 → 스케줄 관리**
```
1. air1/index.html에서 항공편 입력
2. "저장" 버튼 클릭
3. flight_saves_v2에 저장
4. 스케줄 관리 페이지 자동 감지 (storage event)
5. 새 항공편 추가되어 표시
```

**시나리오 B: 스케줄 관리 → 항공편 변환기**
```
1. flight-schedule.html에서 항공편 수정
2. flight_saves_v2 업데이트
3. 다른 탭/페이지에 storage event 발생
4. 항공편 목록 자동 새로고침
```

**시나리오 C: 스케줄 관리 → 견적서/일정표**
```
1. 스케줄에서 항공편 수정
2. flight_saves_v2 업데이트
3. 견적서에서 해당 항공편 선택 시 최신 정보 표시
4. 일정표 자동 입력 시 최신 정보 사용
```

---

#### **F-03: 스케줄 관리 UI 개선** ⭐ NEW
**추가 기능**:
- "항공편 변환기에서 불러오기" 버튼
- 실시간 업데이트 표시 (새로운 항공편 알림)
- 빠른 추가 모달 간소화
- 항공편 상세 정보 표시 (탑승객 수, PNR 등)

---

#### **F-04: 데이터 검증 및 충돌 해결** ⭐ NEW
**문제**: 여러 곳에서 동시에 수정할 경우 충돌 가능성

**해결 방안**:
- 타임스탬프 기반 최신 데이터 우선
- 수정 전 확인 대화상자
- 충돌 감지 시 사용자 선택 (A 유지 / B 적용 / 병합)

---

## 🏗️ 2. TRD (Technical Requirements Document)

### 업데이트된 시스템 아키텍처

```
┌──────────────────────────────────────────────────────┐
│                  포트: 5000 (통합)                    │
└──────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌──────────────────────┐
│  air1/index.html    │◄───────►│ flight-schedule.html │
│  항공편 자동변환기   │  동기화  │  항공 스케줄 관리    │
├─────────────────────┤         ├──────────────────────┤
│ • 항공편 변환       │         │ • 스케줄 조회        │
│ • 버스예약          │         │ • 항공편 수정/삭제   │
│ • 안내문 작성       │         │ • 알람 기능          │
│ • 저장/관리         │         │ • 탑승객 관리        │
└────────┬────────────┘         └──────────┬───────────┘
         │                                  │
         │         ┌────────────────────────┤
         │         │                        │
         ▼         ▼                        ▼
┌────────────────────────────────────────────────┐
│             localStorage (공유 스토리지)        │
├────────────────────────────────────────────────┤
│ • flight_saves_v2    - 항공편 데이터 (주)      │
│ • bus_reservations   - 버스예약               │
│ • saved_notices      - 안내문                 │
│ • quote_data         - 견적서 (flightId 연결) │
└────────┬───────────────────────────────────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ quote-editor │  │ travel-simple│  │ 기타 페이지  │
│   견적서     │  │   일정표     │  │             │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 데이터 흐름

#### **항공편 데이터 생성 → 전파**
```
1. [air1] 항공편 입력 및 변환
2. [air1] flight_saves_v2에 저장
3. [storage event] → 모든 열린 페이지에 알림
4. [flight-schedule] 자동 새로고침, 목록에 추가
5. [quote-editor] 드롭다운 옵션 업데이트
6. [travel-simple] 자동 입력 제안 업데이트
```

#### **스케줄에서 수정 → 전파**
```
1. [flight-schedule] 항공편 정보 수정
2. [flight-schedule] flight_saves_v2 업데이트
3. [storage event] → 모든 열린 페이지에 알림
4. [air1] 항공편 목록 새로고침
5. [quote-editor] 선택된 항공편 정보 업데이트
6. [travel-simple] 입력된 필드 업데이트 제안
```

---

### 핵심 API

#### **FlightSyncManager** (신규 생성: `js/flight-sync-manager.js`)
localStorage 기반 항공편 동기화 관리

```javascript
class FlightSyncManager {
  // CRUD 작업
  static getFlights()               // 전체 항공편 조회
  static getFlightById(id)          // ID로 조회
  static addFlight(flightData)      // 새 항공편 추가
  static updateFlight(id, updates)  // 항공편 수정
  static deleteFlight(id)           // 항공편 삭제

  // 동기화
  static onFlightChange(callback)   // 변경 감지 리스너
  static notifyChange(eventType)    // 변경 알림 발송

  // 변환 유틸리티
  static convertToScheduleFormat(flightSave)  // flight_saves_v2 → schedule 형식
  static convertFromScheduleFormat(schedule)  // schedule → flight_saves_v2 형식
}
```

---

### 기술 스택
- **기존**: Vanilla JS, Tailwind CSS, localStorage
- **추가**: Storage Event API (실시간 동기화)
- **보안**: 없음 (로컬 전용)

---

## ✅ 3. Task Breakdown

### **Phase 1: 동기화 매니저 구현** (1일, 6시간)

#### **Task 1.1: FlightSyncManager 클래스 생성** ⭐ P0
**시간**: 3시간
**파일**: `js/flight-sync-manager.js` (신규 생성)

**구현 내용**:
- CRUD 메서드 구현
- Storage Event 리스너 설정
- 데이터 형식 변환 유틸리티
- 충돌 해결 로직

**테스트**:
- [ ] 항공편 추가/조회/수정/삭제
- [ ] storage event 발생 확인
- [ ] 다른 탭에서 변경 감지

---

#### **Task 1.2: 데이터 형식 변환기 구현** ⭐ P0
**시간**: 2시간
**파일**: `js/flight-sync-manager.js`

**구현 내용**:
```javascript
// flight_saves_v2 형식 → flight-schedule 형식
{
  id: "FLIGHT-123",
  name: "방콕 여행",
  flights: [{
    flightNumber: "OZ 747",
    date: "2025.01.20(월)",
    departure: { airport: "인천국제공항", code: "ICN", time: "10:30" },
    arrival: { airport: "방콕", code: "BKK", time: "14:30" }
  }],
  customerInfo: { name: "홍길동", totalPeople: "45" }
}
↓ 변환 ↓
{
  id: "FLIGHT-123",
  groupName: "방콕 여행",
  flightNumber: "OZ 747",
  airline: "아시아나항공",
  departure: "인천국제공항 (ICN)",
  arrival: "방콕 (BKK)",
  departureDate: "2025-01-20",
  departureTime: "10:30",
  arrivalDate: "2025-01-20",
  arrivalTime: "14:30",
  passengers: [{ name: "홍길동" }] // totalPeople 활용
}
```

**테스트**:
- [ ] 양방향 변환 정확도
- [ ] 누락 필드 처리
- [ ] 날짜 형식 변환

---

#### **Task 1.3: 통합 테스트 페이지 생성** ⭐ P1
**시간**: 1시간
**파일**: `test-flight-sync.html` (신규 생성)

**구현 내용**:
- 동기화 기능 테스트 UI
- 실시간 업데이트 확인
- 양방향 동기화 시뮬레이션

---

### **Phase 2: 스케줄 관리 페이지 개선** (1일, 8시간)

#### **Task 2.1: localStorage 연동** ⭐ P0
**시간**: 3시간
**파일**: `flight-schedule.html`

**수정 내용**:
```javascript
// 기존: 하드코딩 데이터
flights = [{ id: 1, flightNumber: 'KE123', ... }];

// 변경: localStorage에서 로드
async function loadFlights() {
  const flightSaves = FlightSyncManager.getFlights();
  flights = flightSaves.map(fs =>
    FlightSyncManager.convertToScheduleFormat(fs)
  );
  renderFlights();
}
```

**테스트**:
- [ ] localStorage 데이터 로드
- [ ] 빈 데이터 처리
- [ ] 형식 변환 정확도

---

#### **Task 2.2: 항공편 추가/수정 기능** ⭐ P0
**시간**: 3시간
**파일**: `flight-schedule.html`

**구현 내용**:
- 새 항공편 추가 → flight_saves_v2 저장
- 기존 항공편 수정 → flight_saves_v2 업데이트
- 항공편 삭제 → flight_saves_v2에서 제거
- 확인 대화상자 추가

**테스트**:
- [ ] 추가/수정/삭제 동작
- [ ] localStorage 업데이트 확인
- [ ] 다른 탭에서 동기화 확인

---

#### **Task 2.3: 실시간 업데이트 리스너** ⭐ P0
**시간**: 2시간
**파일**: `flight-schedule.html`

**구현 내용**:
```javascript
// storage event 리스너 추가
FlightSyncManager.onFlightChange((eventType, flightId) => {
  console.log(`항공편 ${eventType}: ${flightId}`);
  loadFlights(); // 목록 새로고침
  showNotification(`새로운 항공편이 ${eventType}되었습니다.`);
});
```

**테스트**:
- [ ] 다른 탭에서 추가 시 감지
- [ ] 알림 표시
- [ ] 목록 자동 업데이트

---

### **Phase 3: 항공편 변환기 개선** (0.5일, 4시간)

#### **Task 3.1: 저장 후 스케줄 연동 안내** ⭐ P1
**시간**: 2시간
**파일**: `air1/index.html`, `air1/js/main.js`

**구현 내용**:
- 저장 성공 시 메시지 개선
```javascript
alert(`✓ 항공편이 저장되었습니다!\n\n` +
      `• 견적서에서 자동 선택 가능\n` +
      `• 항공 스케줄 관리에 자동 추가됨\n` +
      `• 일정표 자동 입력 가능`);
```
- "스케줄 관리로 이동" 버튼 추가 (선택사항)

**테스트**:
- [ ] 메시지 표시
- [ ] 버튼 동작 (선택사항)

---

#### **Task 3.2: 항공편 목록 새로고침** ⭐ P1
**시간**: 2시간
**파일**: `air1/index.html`

**구현 내용**:
- 항공편 관리 탭에 실시간 업데이트 추가
- 다른 곳에서 수정된 항공편 감지
- 목록 자동 새로고침

---

### **Phase 4: 통합 테스트 및 문서화** (0.5일, 2시간)

#### **Task 4.1: 전체 워크플로우 테스트** ⭐ P0
**시간**: 1시간

**테스트 시나리오**:
```
1. air1에서 새 항공편 입력 및 저장
   → flight-schedule에 자동 표시 확인

2. flight-schedule에서 항공편 수정
   → air1 목록에서 업데이트 확인
   → quote-editor에서 최신 정보 확인

3. flight-schedule에서 항공편 삭제
   → 모든 페이지에서 제거 확인

4. 여러 탭에서 동시 작업
   → 충돌 없이 동기화 확인
```

---

#### **Task 4.2: 사용자 가이드 작성** ⭐ P2
**시간**: 1시간
**파일**: `FLIGHT_SYNC_GUIDE.md` (신규 생성)

**내용**:
- 동기화 기능 설명
- 사용 방법
- 문제 해결 가이드

---

## 📁 Critical Files

### 신규 생성 파일
1. `js/flight-sync-manager.js` - 동기화 매니저 (핵심)
2. `test-flight-sync.html` - 동기화 테스트 페이지
3. `FLIGHT_SYNC_GUIDE.md` - 사용자 가이드

### 수정 파일
1. `flight-schedule.html` - localStorage 연동
2. `air1/index.html` - 저장 후 안내 개선
3. `air1/js/main.js` - 동기화 이벤트 처리

---

## 🔄 의존성 그래프

```
Task 1.1 (FlightSyncManager)
    ↓
Task 1.2 (데이터 변환기)
    ↓
Task 1.3 (테스트 페이지)
    ↓
Task 2.1 (localStorage 연동) ─┐
    ↓                         │
Task 2.2 (추가/수정/삭제)     │
    ↓                         │
Task 2.3 (실시간 업데이트) ───┤
    ↓                         │
Task 3.1 (안내 개선) ─────────┤
    ↓                         │
Task 3.2 (목록 새로고침) ─────┤
    ↓                         │
Task 4.1 (통합 테스트) ◄──────┘
    ↓
Task 4.2 (문서화)
```

---

## 📊 성공 지표

### 효율성
- 항공편 입력 시간: 평균 5분 → 1분 (80% 감소)
- 데이터 동기화 시간: 즉시 (수동 작업 제거)

### 품질
- 데이터 불일치: 월 20건 → 0건 (100% 개선)
- 입력 오류: 월 10건 → 1건 (90% 감소)

### 사용자 만족도
- 직원 피드백: 4.8/5.0 이상

---

## 🚀 구현 시작 가이드

### 1단계: FlightSyncManager 구현
```bash
# 1. 파일 생성
touch js/flight-sync-manager.js

# 2. 기본 클래스 구조 작성
# 3. CRUD 메서드 구현
# 4. storage event 리스너 추가
```

### 2단계: flight-schedule.html 수정
```bash
# 1. FlightSyncManager import
# 2. loadFlights() 함수 수정
# 3. saveFlight() 함수 수정
# 4. storage event 리스너 추가
```

### 3단계: 테스트
```bash
# 1. test-flight-sync.html 열기
# 2. 동기화 테스트 실행
# 3. 다중 탭 테스트
```

---

## 💡 주의사항

1. **데이터 일관성**: 항상 flight_saves_v2를 단일 진실 소스로 사용
2. **이벤트 루프**: storage event가 무한 루프 발생하지 않도록 주의
3. **성능**: 대량의 항공편 데이터 시 렌더링 최적화 필요
4. **백업**: localStorage 5MB 제한 고려, 정기 백업 권장

---

**총 예상 소요 시간**: 20시간 (약 3일)
**우선순위**: P0 (필수) 작업 먼저 완료 후 P1, P2 순차 진행
**현재 포트**: 5000 (통합 완료)

---

## 📝 변경 이력

- 2025-12-26: 초안 작성
  - 항공편 자동변환기 ↔ 항공 스케줄 관리 동기화 계획 수립
  - FlightSyncManager 설계
  - 양방향 동기화 아키텍처 정의
