# 여행사 관리 시스템 - User Flow

**Version:** v1.0
**Last Updated:** 2025-12-29
**작성자:** System Analysis

---

## 🎯 핵심 업무 플로우 (3단계)

```mermaid
graph TD
    Start[시작] --> A[1. 항공편 정보 수집]
    A --> B[2. 상품 생성]
    B --> C[3. 견적서/명단 관리]
    C --> Loop{반복 작업?}
    Loop -->|예| A
    Loop -->|아니오| End[완료]

    style A fill:#e3f2fd
    style B fill:#fff3e0
    style C fill:#f3e5f5
```

---

## 📋 Flow 1: 항공편 정보 수집 및 저장

### 시작점: 항공사 예약 시스템에서 데이터 복사

```mermaid
graph TD
    Start([항공사 PNR 복사]) --> Open[항공편 변환기 열기]
    Open --> Input[빠른 입력 모달]

    Input --> Parse{파싱 성공?}
    Parse -->|실패| Error1[에러 메시지]
    Error1 --> Input

    Parse -->|성공| Preview[변환 결과 미리보기]
    Preview --> Check{정보 확인}

    Check -->|수정 필요| Edit[수동 수정]
    Edit --> Preview

    Check -->|확인| Save[저장]
    Save --> SaveSuccess{저장 성공?}

    SaveSuccess -->|실패| Error2[저장 실패 알림]
    Error2 --> Save

    SaveSuccess -->|성공| Confirm[✅ 저장 완료]
    Confirm --> Next{다음 작업}

    Next -->|상품 생성| Flow2[Flow 2로 이동]
    Next -->|다른 항공편 추가| Input
    Next -->|종료| End([완료])

    style Start fill:#4caf50,color:#fff
    style Confirm fill:#4caf50,color:#fff
    style Error1 fill:#f44336,color:#fff
    style Error2 fill:#f44336,color:#fff
    style Flow2 fill:#2196f3,color:#fff
```

### 성공 조건
- ✅ PNR 올바르게 추출
- ✅ 항공편 번호, 날짜, 시간 파싱 성공
- ✅ localStorage에 저장 완료

### 실패 분기
- ❌ PNR 형식 불일치 → 에러 메시지 + 재입력
- ❌ 날짜/시간 파싱 실패 → 수동 수정 필요
- ❌ 저장 실패 → 재시도

---

## 🎫 Flow 2: 상품 생성 (자동입력)

### 시작점: 상품 관리 → 신규 상품 추가

```mermaid
graph TD
    Start([상품 추가 버튼]) --> Modal[상품 진행 모달 열기]
    Modal --> Load[저장된 항공편 목록 로드]

    Load --> LoadSuccess{로드 성공?}
    LoadSuccess -->|실패| Error1[항공편 없음 알림]
    Error1 --> Manual[수동 입력 모드]

    LoadSuccess -->|성공| Select[항공편 선택]
    Select --> SelectCheck{선택?}

    SelectCheck -->|미선택| Manual
    SelectCheck -->|선택| Auto[자동 입력 실행]

    Auto --> Fill1[단체명 자동입력]
    Fill1 --> Fill2[목적지 자동입력]
    Fill2 --> Fill3[여행기간 자동계산]
    Fill3 --> Fill4[항공편 정보 자동입력]
    Fill4 --> AutoComplete[✅ 자동입력 완료]

    AutoComplete --> Review{정보 확인}
    Manual --> Review

    Review -->|수정 필요| Edit[수동 수정]
    Edit --> Review

    Review -->|확인| Submit[저장]
    Submit --> Validate{필수 항목 검증}

    Validate -->|실패| Error2[필수 항목 누락 알림]
    Error2 --> Edit

    Validate -->|성공| Save[DB 저장]
    Save --> SaveSuccess{저장 성공?}

    SaveSuccess -->|실패| Error3[저장 실패]
    Error3 --> Submit

    SaveSuccess -->|성공| Success[✅ 상품 생성 완료]
    Success --> Next{다음 작업}

    Next -->|견적서 생성| Flow3[Flow 3로 이동]
    Next -->|다른 상품 추가| Modal
    Next -->|종료| End([완료])

    style Start fill:#ff9800,color:#fff
    style AutoComplete fill:#4caf50,color:#fff
    style Success fill:#4caf50,color:#fff
    style Error1 fill:#f44336,color:#fff
    style Error2 fill:#f44336,color:#fff
    style Error3 fill:#f44336,color:#fff
    style Flow3 fill:#2196f3,color:#fff
```

### 성공 조건
- ✅ 항공편 선택 시 자동입력 작동
- ✅ 필수 항목 (단체명, 목적지, 기간, 가격) 모두 입력
- ✅ 저장 완료

### 실패 분기
- ❌ 항공편 없음 → 수동 입력 모드
- ❌ 필수 항목 누락 → 경고 메시지
- ❌ 저장 실패 → 재시도

### 자동입력 항목
1. **단체명**: `flight.name`
2. **목적지**: `flight.flights[0].arrival.airport`
3. **여행기간**: 출발일~귀국일 계산 (일수)
4. **항공사**: `flight.airline`
5. **출발편**: `항공편명 출발지 시간 → 도착지 시간`
6. **귀국편**: 왕복인 경우 자동 추가

---

## 📄 Flow 3: 견적서 생성

### 시작점: 상품 선택 → 견적서 생성

```mermaid
graph TD
    Start([견적서 생성 버튼]) --> Select[상품 선택]
    Select --> Check{상품 선택?}

    Check -->|미선택| Error1[상품 선택 필요 알림]
    Error1 --> Select

    Check -->|선택| Load[상품 정보 로드]
    Load --> Editor[견적서 에디터 열기]

    Editor --> AutoFill[상품 정보 자동 채우기]
    AutoFill --> Edit{수정 필요?}

    Edit -->|예| Modify[견적서 수정]
    Modify --> Edit

    Edit -->|아니오| Preview[미리보기]
    Preview --> PreviewCheck{확인}

    PreviewCheck -->|수정| Modify
    PreviewCheck -->|확인| Generate[PDF 생성]

    Generate --> GenSuccess{생성 성공?}
    GenSuccess -->|실패| Error2[생성 실패 알림]
    Error2 --> Preview

    GenSuccess -->|성공| Download[다운로드]
    Download --> Success[✅ 견적서 완성]

    Success --> Next{다음 작업}
    Next -->|다른 견적서| Select
    Next -->|명단 작성| Flow4[단체명단 작성]
    Next -->|종료| End([완료])

    style Start fill:#9c27b0,color:#fff
    style Success fill:#4caf50,color:#fff
    style Error1 fill:#f44336,color:#fff
    style Error2 fill:#f44336,color:#fff
    style Flow4 fill:#2196f3,color:#fff
```

### 성공 조건
- ✅ 상품 정보 정확히 로드
- ✅ PDF 생성 성공
- ✅ 다운로드 완료

### 실패 분기
- ❌ 상품 미선택 → 선택 요청
- ❌ PDF 생성 실패 → 재시도
- ❌ 다운로드 실패 → 재다운로드

---

## 👥 Flow 4: 단체명단 관리

### 시작점: 단체명단 → 신규 작성

```mermaid
graph TD
    Start([단체명단 작성]) --> Method{입력 방식}

    Method -->|Excel 업로드| Upload[파일 선택]
    Method -->|수동 입력| Manual[빈 명단 시작]

    Upload --> Parse[Excel 파싱]
    Parse --> ParseSuccess{파싱 성공?}

    ParseSuccess -->|실패| Error1[파일 형식 오류]
    Error1 --> Upload

    ParseSuccess -->|성공| Preview[데이터 미리보기]
    Manual --> Form[고객 정보 입력 폼]
    Form --> Preview

    Preview --> Validate{데이터 검증}
    Validate -->|실패| Error2[필수 항목 누락]
    Error2 -->|수정| Edit[데이터 수정]
    Edit --> Preview

    Validate -->|성공| Save[저장]
    Save --> SaveSuccess{저장 성공?}

    SaveSuccess -->|실패| Error3[저장 실패]
    Error3 --> Save

    SaveSuccess -->|성공| Complete[✅ 명단 저장 완료]
    Complete --> Export{내보내기?}

    Export -->|예| PDF[PDF 생성]
    PDF --> Download[다운로드]
    Download --> End([완료])

    Export -->|아니오| End

    style Start fill:#00bcd4,color:#fff
    style Complete fill:#4caf50,color:#fff
    style Error1 fill:#f44336,color:#fff
    style Error2 fill:#f44336,color:#fff
    style Error3 fill:#f44336,color:#fff
```

### 성공 조건
- ✅ Excel 파일 정상 파싱 또는 수동 입력 완료
- ✅ 필수 항목 (이름, 생년월일, 여권번호) 검증 통과
- ✅ 저장 완료

### 실패 분기
- ❌ Excel 형식 오류 → 재업로드
- ❌ 필수 항목 누락 → 수정 요청
- ❌ 저장 실패 → 재시도

---

## 🔄 Sticky Loop (반복 사용 유도)

### 핵심 반복 패턴

```mermaid
graph LR
    A[항공편 저장] --> B[상품 생성]
    B --> C[견적서 생성]
    C --> D[명단 작성]
    D --> E{다음 단체?}

    E -->|예| A
    E -->|아니오| F[완료]

    style A fill:#e3f2fd
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#e8f5e9
    style E fill:#fff9c4
    style F fill:#4caf50,color:#fff
```

### Loop 강화 요소
1. **빠른 재시작**: 저장 완료 후 "다음 단체 추가" 버튼
2. **템플릿 재사용**: 이전 상품 복사 기능
3. **최근 항목 표시**: 대시보드에 최근 작업 위젯
4. **진행 상태 표시**: 단계별 완료 체크마크

---

## ⚠️ 공통 에러 처리

### 에러 분류 및 대응

| 에러 유형 | 원인 | 대응 방법 |
|---------|------|----------|
| **파싱 실패** | PNR 형식 불일치 | 형식 가이드 표시 + 재입력 |
| **필수 항목 누락** | 입력 누락 | 빨간색 테두리 + 포커스 이동 |
| **저장 실패** | localStorage 용량 초과 | 오래된 데이터 삭제 제안 |
| **파일 업로드 실패** | 형식 오류 | 샘플 파일 다운로드 제공 |
| **PDF 생성 실패** | 브라우저 호환성 | 다른 브라우저 사용 권장 |

---

## 📊 성공 지표 (KPI)

### 각 Flow별 성공률 측정

```
Flow 1 (항공편 저장):
  성공: 파싱 성공 → 저장 완료
  목표: 95% 이상

Flow 2 (상품 생성):
  성공: 자동입력 → 저장 완료
  목표: 90% 이상 (자동입력 활용률)

Flow 3 (견적서):
  성공: PDF 생성 → 다운로드
  목표: 98% 이상

Flow 4 (명단):
  성공: Excel 업로드 → 저장 완료
  목표: 85% 이상
```

---

## 🔍 실험-학습 루프

### 현재 가설
1. **가설**: 항공편 자동입력으로 입력 시간 50% 단축
   - **실험**: 자동입력 vs 수동입력 시간 측정
   - **관측**: 사용자 행동 패턴 분석
   - **학습**: 어떤 필드가 가장 많이 수정되는가?
   - **다음**: 수정 많은 필드는 자동입력 로직 개선

2. **가설**: Sticky Loop 강화로 재사용률 증가
   - **실험**: "다음 단체 추가" 버튼 추가
   - **관측**: 연속 작업 횟수 측정
   - **학습**: 어디서 이탈하는가?
   - **다음**: 이탈 지점에 가이드 추가

---

## 🚀 다음 개선 포인트

### Phase 2 (우선순위 높음)
- [ ] 자동 백업 기능 (localStorage → Cloud)
- [ ] 상품 템플릿 저장/불러오기
- [ ] 일괄 작업 (여러 견적서 동시 생성)

### Phase 3 (백로그)
- [ ] 모바일 최적화
- [ ] 실시간 협업 (여러 사용자)
- [ ] AI 기반 가격 추천

---

## 📝 버전 히스토리

### v1.0 (2025-12-29)
- ✅ 핵심 플로우 4개 정의
- ✅ 성공/실패 분기 명시
- ✅ Sticky Loop 구성
- ✅ 에러 처리 가이드
- ✅ 실험-학습 루프 설계

---

**작성 완료일**: 2025-12-29
**다음 리뷰**: 사용자 피드백 후 업데이트
