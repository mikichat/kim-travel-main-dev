# TRD — 여행사 계약·견적·일정 자동화 인트라넷

## 1. 문서 목적 (Technical Purpose)
본 문서는 PRD에서 정의된 요구사항을 기반으로 **실제 개발을 위한 기술 설계 기준**을 정의한다.

- 개발자 구현 기준 문서
- DB / API / 문서 출력 / 자동 계산 로직의 기술적 상세 명시
- 향후 유지보수 및 확장을 고려한 구조 제안

---

## 2. 시스템 아키텍처 개요

### 2.1 전체 구조
```
[Web Intranet]
   ↓ (REST API)
[Backend Application]
   ↓
[Database]
   ↓
[HTML Template Engine]
   ↓
[PDF Generator]
```

### 2.2 기술 스택 권장

| 구분 | 기술 | 비고 |
|---|---|---|
| Frontend | Internal Web (HTML/JS 또는 React) | |
| Backend | Python (FastAPI 권장) | |
| Template | Jinja2 | HTML 문서 생성 |
| PDF (선택) | WeasyPrint | 서버 사이드 PDF 생성 (선택적) |
| Document Preview | HTML Response | 기본 문서 미리보기 방식 |
| DB | PostgreSQL 또는 SQLite | SQLite는 개발/소규모 운영용 |

---

## 3. 데이터베이스 기술 설계

### 3.1 핵심 테이블

- groups (단체 기본 정보)
- group_itinerary (일정)
- group_cancel_rules (취소 규정)
- group_includes (포함/불포함 항목)
- documents (문서 이력)

### 3.2 데이터베이스 스키마 상세

#### 3.2.1 PostgreSQL DDL 예시

```sql
-- groups 테이블
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    nights INTEGER NOT NULL,
    nights_manual BOOLEAN DEFAULT FALSE,
    days INTEGER NOT NULL,
    days_manual BOOLEAN DEFAULT FALSE,
    pax INTEGER NOT NULL CHECK (pax > 0),
    price_per_pax DECIMAL(12,2) NOT NULL CHECK (price_per_pax >= 0),
    total_price DECIMAL(12,2) NOT NULL,
    total_price_manual BOOLEAN DEFAULT FALSE,
    deposit DECIMAL(12,2) DEFAULT 0 CHECK (deposit >= 0),
    balance DECIMAL(12,2) NOT NULL,
    balance_manual BOOLEAN DEFAULT FALSE,
    balance_due_date DATE,
    balance_due_date_manual BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'estimate' CHECK (status IN ('estimate', 'contract', 'confirmed')),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_groups_name ON groups(name);
CREATE INDEX idx_groups_start_date ON groups(start_date);
CREATE INDEX idx_groups_status ON groups(status);

-- group_itinerary 테이블
CREATE TABLE group_itinerary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    day_no INTEGER NOT NULL CHECK (day_no > 0),
    itinerary_date DATE NOT NULL,
    itinerary_date_manual BOOLEAN DEFAULT FALSE,
    location VARCHAR(255),
    transport VARCHAR(255),
    time VARCHAR(50),
    schedule TEXT,
    meals VARCHAR(255),
    accommodation VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, day_no)  -- 동일 단체 내 day_no 중복 방지
);

CREATE INDEX idx_itinerary_group_id ON group_itinerary(group_id);
CREATE INDEX idx_itinerary_group_day ON group_itinerary(group_id, day_no);

-- group_cancel_rules 테이블
CREATE TABLE group_cancel_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    days_before INTEGER NOT NULL,
    cancel_date DATE NOT NULL,
    cancel_date_manual BOOLEAN DEFAULT FALSE,
    penalty_rate DECIMAL(5,2) NOT NULL CHECK (penalty_rate >= 0 AND penalty_rate <= 100),
    penalty_amount DECIMAL(12,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cancel_rules_group_id ON group_cancel_rules(group_id);
CREATE INDEX idx_cancel_rules_days_before ON group_cancel_rules(group_id, days_before);

-- group_includes 테이블
CREATE TABLE group_includes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('include', 'exclude')),
    category VARCHAR(100),
    description TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_includes_group_id ON group_includes(group_id);
CREATE INDEX idx_includes_type_order ON group_includes(group_id, item_type, display_order);

-- documents 테이블
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('estimate', 'contract', 'itinerary', 'bundle')),
    version INTEGER NOT NULL DEFAULT 1,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(100),
    file_size BIGINT
);

CREATE INDEX idx_documents_group_id ON documents(group_id);
CREATE INDEX idx_documents_type_version ON documents(group_id, document_type, version);
```

#### 3.2.2 단체명 중복 허용 정책

- `groups.name` 컬럼에 UNIQUE 제약조건 없음
- 고유 식별은 `id` (UUID) 사용
- 검색 시 단체명으로 필터링 가능하되, 정확한 식별은 `id` 사용
- 동일 단체명이 여러 개 존재할 수 있음 (예: "하노이 골프단 1기", "하노이 골프단 2기")

#### 3.2.3 자동/수동 플래그 정책

- 자동 계산 컬럼: 값 + `*_manual` Boolean 플래그
- 수동 수정 시 `*_manual = TRUE`로 설정
- `*_manual = TRUE`인 경우 자동 재계산 시 해당 필드는 재계산 생략
- 단, 일정 날짜(itinerary_date)는 예외: 출발일 변경 시 수동 수정 여부와 관계없이 재계산됨

---

## 4. API 설계

### 4.1 단체 조회 API

#### 4.1.1 단체 목록 조회
```
GET /api/groups
Query Parameters:
  - name: string (optional) - 단체명 검색
  - status: string (optional) - 상태 필터 (estimate/contract/confirmed)
  - start_date_from: date (optional) - 출발일 시작 범위
  - start_date_to: date (optional) - 출발일 종료 범위
  - page: integer (default: 1)
  - limit: integer (default: 20)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "name": "하노이 골프단",
      "start_date": "2025-01-15",
      "end_date": "2025-01-20",
      "status": "estimate",
      ...
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### 4.1.2 단체 상세 조회
```
GET /api/groups/{group_id}

Response 200:
{
  "id": "uuid",
  "name": "하노이 골프단",
  "start_date": "2025-01-15",
  "end_date": "2025-01-20",
  "nights": 5,
  "days": 6,
  "pax": 20,
  "price_per_pax": 1500000,
  "total_price": 30000000,
  "deposit": 10000000,
  "balance": 20000000,
  "balance_due_date": "2025-01-08",
  "status": "estimate",
  "itineraries": [...],
  "cancel_rules": [...],
  "includes": [...]
}
```

### 4.2 단체 생성 / 수정 API

#### 4.2.1 단체 생성
```
POST /api/groups
Content-Type: application/json

Request Body:
{
  "name": "하노이 골프단",
  "start_date": "2025-01-15",
  "end_date": "2025-01-20",
  "pax": 20,
  "price_per_pax": 1500000,
  "deposit": 10000000,
  "status": "estimate"
}

Response 201:
{
  "id": "uuid",
  "message": "단체가 생성되었습니다",
  "data": {...}
}

Error 400:
{
  "error": "ValidationError",
  "message": "도착일은 출발일보다 이후여야 합니다",
  "field": "end_date"
}
```

#### 4.2.2 단체 수정
```
PUT /api/groups/{group_id}
Content-Type: application/json

Request Body:
{
  "start_date": "2025-01-20",  // 변경 시 자동 재계산 트리거
  "pax": 25,
  ...
}

Response 200:
{
  "id": "uuid",
  "message": "단체 정보가 수정되었습니다",
  "data": {...},
  "recalculated_fields": ["nights", "days", "itinerary_dates", "cancel_dates"]
}

Error 403:
{
  "error": "Forbidden",
  "message": "확정된 계약은 수정할 수 없습니다"
}
```

#### 4.2.3 상태 변경
```
PUT /api/groups/{group_id}/status
Content-Type: application/json

Request Body:
{
  "status": "contract"  // estimate -> contract -> confirmed
}

Response 200:
{
  "id": "uuid",
  "status": "contract",
  "message": "상태가 변경되었습니다"
}

Error 400:
{
  "error": "ValidationError",
  "message": "상태는 순차적으로만 변경할 수 있습니다"
}
```

### 4.3 자동 계산 트리거 API

```
POST /api/groups/{group_id}/recalculate
Content-Type: application/json

Request Body (optional):
{
  "fields": ["nights", "days", "total_price", "balance"]  // 특정 필드만 재계산
}

Response 200:
{
  "id": "uuid",
  "message": "재계산이 완료되었습니다",
  "recalculated_fields": ["nights", "days", "total_price", "balance", "itinerary_dates"],
  "data": {...}
}

Error 403:
{
  "error": "Forbidden",
  "message": "확정된 계약은 재계산할 수 없습니다"
}
```

### 4.4 일정 관리 API

#### 4.4.1 일정 추가
```
POST /api/groups/{group_id}/itineraries
Content-Type: application/json

Request Body:
{
  "day_no": 1,  // 생략 시 자동 부여
  "location": "인천",
  "transport": "OZ729",
  "time": "09:10",
  "schedule": "인천 국제공항 출발",
  "meals": "조:기내식"
}

Response 201:
{
  "id": "uuid",
  "day_no": 1,
  "itinerary_date": "2025-01-15",  // 자동 계산됨
  ...
}
```

#### 4.4.2 일정 수정
```
PUT /api/groups/{group_id}/itineraries/{itinerary_id}
Content-Type: application/json

Request Body:
{
  "itinerary_date": "2025-01-16",  // 수동 수정 시
  "itinerary_date_manual": true,
  "schedule": "수정된 일정"
}
```

#### 4.4.3 일정 삭제
```
DELETE /api/groups/{group_id}/itineraries/{itinerary_id}

Response 200:
{
  "message": "일정이 삭제되었습니다"
}
```

### 4.5 문서 출력 API

```
POST /api/groups/{group_id}/documents/generate
Content-Type: application/json

Request Body:
{
  "document_type": "estimate",  // estimate, contract, itinerary, bundle
  "version": null  // null이면 자동 증가
}

Response 200:
{
  "document_id": "uuid",
  "file_path": "/documents/견적서_하노이골프단_v1_20250101.pdf",
  "file_name": "견적서_하노이골프단_v1_20250101.pdf",
  "version": 1,
  "generated_at": "2025-01-01T10:00:00Z"
}

Error 500:
{
  "error": "PDFGenerationError",
  "message": "PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요",
  "retry_count": 0
}
```

### 4.6 API 에러 처리

#### 4.6.1 공통 에러 응답 형식
```json
{
  "error": "ErrorType",
  "message": "사용자 친화적 에러 메시지",
  "field": "field_name",  // 필드별 에러인 경우
  "code": "ERROR_CODE"
}
```

#### 4.6.2 HTTP 상태 코드
- `200 OK`: 성공
- `201 Created`: 생성 성공
- `400 Bad Request`: 요청 데이터 검증 실패
- `403 Forbidden`: 권한 없음 (확정 상태 수정 시도 등)
- `404 Not Found`: 리소스 없음
- `500 Internal Server Error`: 서버 오류

---

## 5. 자동 계산 로직 (Backend)

### 5.1 재계산 트리거 조건

다음 필드 변경 시 자동 재계산 실행:
- `start_date` 변경 → 모든 날짜 관련 필드 재계산
- `end_date` 변경 → 기간 계산 재실행
- `pax` 변경 → 요금 계산 재실행
- `price_per_pax` 변경 → 요금 계산 재실행
- `deposit` 변경 → 잔액 계산 재실행

### 5.2 재계산 흐름 (의사코드)

```python
def recalculate_group(group_id: UUID, changed_fields: List[str]):
    # 1. 상태 확인
    group = get_group(group_id)
    if group.status == 'confirmed':
        raise ValidationError("확정된 계약은 재계산할 수 없습니다")
    
    # 2. 기간 계산 (박/일)
    if 'start_date' in changed_fields or 'end_date' in changed_fields:
        if not group.nights_manual:
            group.nights = (group.end_date - group.start_date).days
        if not group.days_manual:
            group.days = group.nights + 1
    
    # 3. 요금 계산 (총액/잔액)
    if 'pax' in changed_fields or 'price_per_pax' in changed_fields:
        if not group.total_price_manual:
            group.total_price = group.pax * group.price_per_pax
        if not group.balance_manual:
            group.balance = group.total_price - group.deposit
    
    # 4. 잔액 완납일 계산
    if 'start_date' in changed_fields:
        if not group.balance_due_date_manual:
            group.balance_due_date = group.start_date - timedelta(days=7)  # 기본값 7일
    
    # 5. 취소 규정 날짜 계산
    if 'start_date' in changed_fields:
        cancel_rules = get_cancel_rules(group_id)
        for rule in cancel_rules:
            if not rule.cancel_date_manual:
                rule.cancel_date = group.start_date - timedelta(days=rule.days_before)
                save_cancel_rule(rule)
    
    # 6. 일정 날짜 재배치
    if 'start_date' in changed_fields:
        recalculate_itinerary_dates(group_id, group.start_date)
    
    # 7. 검증
    validate_group_data(group)
    
    # 8. 저장
    save_group(group)
```

### 5.3 일정 날짜 자동 재배치 로직

#### 5.3.1 재배치 알고리즘

```python
def recalculate_itinerary_dates(group_id: UUID, new_start_date: DATE):
    """
    출발일 변경 시 모든 일정 날짜를 자동 재계산
    수동 수정 여부와 관계없이 모든 일정 날짜 재계산
    """
    itineraries = get_itineraries_by_group(group_id, order_by='day_no')
    updated_itineraries = []
    
    for itinerary in itineraries:
        # day_no 기준으로 새 날짜 계산
        new_date = new_start_date + timedelta(days=itinerary.day_no - 1)
        
        # 수동 수정 플래그는 유지하되 날짜는 재계산
        itinerary.itinerary_date = new_date
        # itinerary_date_manual 플래그는 유지 (사용자 알림용)
        
        updated_itineraries.append(itinerary)
    
    # 일괄 업데이트
    batch_update_itineraries(updated_itineraries)
    
    # 사용자 알림 (수동 수정된 일정이 있는 경우)
    manual_modified = [it for it in updated_itineraries if it.itinerary_date_manual]
    if manual_modified:
        notify_user(f"출발일 변경으로 인해 {len(manual_modified)}개의 수동 수정된 일정 날짜가 재계산되었습니다")
```

#### 5.3.2 일정 추가/삭제 처리

```python
def add_itinerary(group_id: UUID, itinerary_data: dict):
    """일정 추가 시 day_no 자동 부여"""
    # 해당 단체의 최대 day_no 조회
    max_day_no = get_max_day_no(group_id)
    new_day_no = max_day_no + 1 if max_day_no else 1
    
    # 출발일 기준 날짜 자동 계산
    group = get_group(group_id)
    itinerary_date = group.start_date + timedelta(days=new_day_no - 1)
    
    itinerary = Itinerary(
        group_id=group_id,
        day_no=new_day_no,
        itinerary_date=itinerary_date,
        **itinerary_data
    )
    save_itinerary(itinerary)

def delete_itinerary(itinerary_id: UUID):
    """일정 삭제 시 남은 일정의 day_no는 유지 (재정렬하지 않음)"""
    delete_itinerary_by_id(itinerary_id)
    # day_no 재정렬은 하지 않음 (의도적인 빈 번호 허용)
```

### 5.4 계산 공식 상세

#### 5.4.1 기간 계산
- `nights = (end_date - start_date).days`
- `days = nights + 1`
- 재계산 조건: start_date 또는 end_date 변경
- 수동 수정 보호: `nights_manual` 또는 `days_manual`이 TRUE면 재계산 생략

#### 5.4.2 요금 계산
- `total_price = pax × price_per_pax`
- `balance = total_price - deposit`
- 재계산 조건: pax, price_per_pax, deposit 변경
- 수동 수정 보호: `total_price_manual` 또는 `balance_manual`이 TRUE면 재계산 생략
- 검증: `deposit > total_price`인 경우 ValidationError 발생

#### 5.4.3 잔액 완납일 계산
- `balance_due_date = start_date - N일` (N은 설정값, 기본 7일)
- 재계산 조건: start_date 변경
- 수동 수정 보호: `balance_due_date_manual`이 TRUE면 재계산 생략

#### 5.4.4 취소 규정 날짜 계산
- `cancel_date = start_date - days_before`
- 재계산 조건: start_date 변경
- 수동 수정 보호: `cancel_date_manual`이 TRUE면 해당 규정만 재계산 생략
- 정렬: `days_before` 기준 내림차순 (가장 늦은 날짜부터)

#### 5.4.5 일정 날짜 계산
- `itinerary_date = start_date + (day_no - 1)`
- 재계산 조건: start_date 변경
- **특수 규칙**: 수동 수정 여부와 관계없이 항상 재계산됨 (itinerary_date_manual 플래그는 유지)

---

## 6. 문서 출력 기술 설계

### 6.1 HTML 템플릿 구조

템플릿 파일 위치: `/templates/documents/`

- `estimate.html` - 견적서 템플릿
- `itinerary.html` - 일정표 템플릿
- `contract.html` - 계약서 템플릿
- `bundle.html` - 통합 PDF 템플릿 (3개 문서 결합)

### 6.2 템플릿 엔진 (Jinja2) 사용

```python
from jinja2 import Environment, FileSystemLoader

# 템플릿 환경 설정
env = Environment(
    loader=FileSystemLoader('/templates/documents'),
    autoescape=True
)

def render_template(template_name: str, group: Group) -> str:
    """템플릿 렌더링"""
    template = env.get_template(template_name)
    
    # 데이터 준비
    context = {
        'group': group,
        'itineraries': group.itineraries,
        'cancel_rules': group.cancel_rules,
        'includes': group.includes,
        'excludes': [item for item in group.includes if item.item_type == 'exclude'],
        'generated_at': datetime.now().strftime('%Y년 %m월 %d일'),
        'format_currency': format_currency,  # 헬퍼 함수
        'format_date': format_date  # 헬퍼 함수
    }
    
    return template.render(**context)
```

### 6.3 변수 매핑 원칙

- DB 컬럼명 = HTML 변수명 (스네이크 케이스)
- 자동 계산 결과만 출력 (수동 수정 여부는 표시하지 않음)
- 날짜 형식: `YYYY년 MM월 DD일`
- 금액 형식: `1,000,000원` (천 단위 구분)

### 6.4 문서 생성 흐름 (HTML 미리보기 기본)

#### 6.4.1 HTML 미리보기 생성 (기본 방식)

```python
@router.get("/api/groups/{group_id}/documents/preview/{document_type}", response_class=HTMLResponse)
async def preview_document(
    group_id: UUID,
    document_type: str,
    db: Session = Depends(get_db)
):
    """
    문서 HTML 미리보기

    - WeasyPrint 등 외부 라이브러리 불필요
    - 브라우저에서 바로 확인 가능
    - 사용자가 Ctrl+P로 PDF 저장 가능
    """

    # 1. 데이터 조회
    group = get_group_with_relations(group_id, db)
    if not group:
        raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

    # 2. 템플릿 선택
    template_map = {
        'estimate': 'estimate.html',
        'contract': 'contract.html',  # 표준 계약서 양식 기반
        'itinerary': 'itinerary.html',
        'bundle': 'bundle.html'
    }

    template_name = template_map.get(document_type)
    if not template_name:
        raise HTTPException(status_code=400, detail="지원하지 않는 문서 타입")

    # 3. 데이터 준비
    context = {
        'group': group,
        'itineraries': sorted(group.itineraries, key=lambda x: x.day_no),
        'cancel_rules': sorted(group.cancel_rules, key=lambda x: x.days_before, reverse=True),
        'includes': group.includes,
        'version': 'Preview',
        'generated_date': date.today()
    }

    # 4. HTML 렌더링
    html_content = render_template(template_name, context)

    # 5. HTML Response 반환 (브라우저에서 바로 표시)
    return HTMLResponse(content=html_content)
```

**장점:**
- 외부 라이브러리 의존성 없음
- 즉시 확인 가능
- 브라우저 인쇄 기능으로 PDF 생성 가능
- 서버 부하 최소화

#### 6.4.2 PDF 자동 생성 (선택사항 - WeasyPrint 필요)

```python
def generate_pdf(group_id: UUID, document_type: str) -> dict:
    """
    PDF 자동 생성 (서버 사이드)

    주의: WeasyPrint 설치 필요
    - pip install weasyprint
    - GTK+ 라이브러리 설치 (Windows의 경우 별도 설치 필요)
    """

    # WeasyPrint 사용 가능 여부 확인
    if not WEASYPRINT_AVAILABLE:
        raise RuntimeError(
            "PDF 생성 기능을 사용할 수 없습니다. "
            "WeasyPrint가 설치되지 않았거나 GTK+ 라이브러리가 누락되었습니다."
        )

    # 1. 데이터 조회
    group = get_group_with_relations(group_id)
    if not group:
        raise NotFoundError(f"단체를 찾을 수 없습니다: {group_id}")

    # 2. HTML 렌더링 (6.4.1과 동일)
    context = prepare_document_context(group)
    html_content = render_template(get_template_name(document_type), context)

    # 3. PDF 변환
    pdf_bytes = convert_html_to_pdf(html_content)

    # 4. 파일 저장
    version = get_next_version(group_id, document_type)
    filepath = save_pdf_file(group, document_type, version, pdf_bytes)

    # 5. documents 테이블 기록
    document = save_document_record(group_id, document_type, filepath, len(pdf_bytes), version)

    return {
        'document_id': document.id,
        'file_path': filepath,
        'version': version
    }
```

### 6.5 계약서 표준 양식 적용

#### 6.5.1 표준 계약서 요구사항

**법적 근거:**
- 공정거래위원회 제정 국외/국내여행 표준약관
- 한국여행업협회 단체여행 표준 계약서
- 소비자분쟁해결기준 (공정거래위원회 고시)

**필수 포함 조항 (국외여행 표준약관 기준):**
- 제1조 (목적) ~ 제19조 (분쟁의 해결)
- **제16조 (여행지 안전정보 제공)** - 2019년 개정 필수 조항
  ```
  당사는 여행자에게 외교부 해외안전여행 사이트(www.0404.go.kr)에서
  제공하는 여행지 안전정보를 제공하여야 한다.
  ```

**표준 취소 수수료 규정:**
| 취소 시점 | 위약금 |
|---|---|
| 여행 개시 30일 전까지 | 계약금 환급 |
| 여행 개시 20일 전까지 | 여행 요금의 10% |
| 여행 개시 10일 전까지 | 여행 요금의 15% |
| 여행 개시 8일 전까지 | 여행 요금의 20% |
| 여행 개시 1일 전까지 | 여행 요금의 30% |
| 여행 당일 또는 No-Show | 여행 요금의 50% |

#### 6.5.2 템플릿 구조

```html
{% extends "base.html" %}

{% block content %}
<!-- 경고 배너 (임시 템플릿 사용 시) -->
<div class="warning-banner">
    ⚠️ 본 계약서는 표준약관 구조를 기반으로 한 템플릿입니다.
    실제 사용 전 반드시 공식 표준약관으로 교체하시기 바랍니다.
</div>

<!-- 계약서 표제 -->
<div class="header">
    <h1>국외여행 계약서</h1>
    <p>(공정거래위원회 제정 - 표준약관 제10021호, 2019.8.30. 개정)</p>
</div>

<!-- 계약 당사자 -->
<section class="parties">
    <h2>계약 당사자</h2>
    <!-- 여행사 정보 -->
    <!-- 여행자(단체) 정보: {{ group.name }} -->
</section>

<!-- 여행 상품 정보 -->
<section class="travel-info">
    <h2>여행 상품 정보</h2>
    <!-- 동적 데이터: {{ group.start_date }}, {{ group.nights }}박 {{ group.days }}일 -->
</section>

<!-- 표준약관 조항 (제1조~제19조) -->
<section class="standard-terms">
    <h2>국외여행 표준약관</h2>

    <div class="clause">
        <h3>제1조 (목적)</h3>
        <p>이 약관은 [여행사명]과 여행자가 체결한 국외여행 계약의...</p>
    </div>

    <!-- 제2조~제15조 생략 -->

    <div class="clause" style="border: 2px solid red;">
        <h3>제16조 (여행지 안전정보 제공) ⚠️ 2019년 개정 필수 조항</h3>
        <p>① 당사는 여행자에게 외교부 '해외안전여행' 사이트...</p>
    </div>

    <!-- 제17조~제19조 -->
</section>

<!-- 취소 수수료 규정 (표준 + 시스템 데이터) -->
<section class="cancellation">
    <h2>취소 수수료 규정</h2>
    <!-- 표준 규정 테이블 -->
    <!-- 시스템의 cancel_rules 데이터 (특약 사항) -->
</section>

<!-- 서명란 -->
<section class="signatures">
    <!-- 양방 서명란 -->
</section>
{% endblock %}
```

#### 6.5.3 표준 양식 교체 프로세스

1. **공식 표준약관 다운로드**
   - 공정거래위원회: https://www.ftc.go.kr/
   - 한국여행업협회: https://www.kata.or.kr/
   - 문화체육관광부: https://mcst.go.kr/

2. **HTML 템플릿 변환**
   ```bash
   # Word/PDF → HTML 변환
   # 수작업 또는 변환 도구 사용
   ```

3. **동적 데이터 필드 추가**
   ```html
   단체명: {{ group.name }}
   출발일: {{ group.start_date|format_date }}
   총액: {{ group.total_price|format_currency }}
   ```

4. **검증**
   - 모든 필수 조항 포함 확인
   - 동적 데이터 정상 표시 확인
   - HTML 미리보기 테스트

### 6.6 PDF 변환 설정 (WeasyPrint - 선택사항)

```python
from weasyprint import HTML, CSS

def convert_html_to_pdf(html_content: str, group: Group, doc_type: str) -> str:
    """HTML을 PDF로 변환"""
    
    # CSS 스타일 (한글 폰트 포함)
    css_content = """
    @page {
        size: A4;
        margin: 2cm;
    }
    
    @font-face {
        font-family: 'Noto Sans KR';
        src: url('/fonts/NotoSansKR-Regular.woff2') format('woff2');
        font-weight: normal;
        font-style: normal;
    }
    
    @font-face {
        font-family: 'Noto Sans KR';
        src: url('/fonts/NotoSansKR-Bold.woff2') format('woff2');
        font-weight: bold;
        font-style: normal;
    }
    
    body {
        font-family: 'Noto Sans KR', sans-serif;
        font-size: 12pt;
        line-height: 1.6;
    }
    
    h1, h2, h3 {
        font-weight: bold;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
    }
    
    table th, table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
    }
    
    table th {
        background-color: #f2f2f2;
        font-weight: bold;
    }
    """
    
    # HTML 객체 생성
    html = HTML(string=html_content)
    css = CSS(string=css_content)
    
    # 파일명 생성
    filename = generate_filename(group, doc_type, get_next_version(group.id, doc_type))
    filepath = f"/documents/{filename}"
    
    # 디렉토리 생성 (없는 경우)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # PDF 생성
    html.write_pdf(filepath, stylesheets=[css])
    
    return filepath
```

### 6.6 통합 PDF 생성

```python
def generate_bundle_pdf(group_id: UUID) -> dict:
    """통합 PDF 생성 (견적서 + 계약서 + 일정표)"""
    
    group = get_group_with_relations(group_id)
    
    # 각 문서별 HTML 생성
    estimate_html = render_template('estimate.html', group)
    contract_html = render_template('contract.html', group)
    itinerary_html = render_template('itinerary.html', group)
    
    # 통합 HTML 생성
    bundle_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>통합 문서 - {group.name}</title>
    </head>
    <body>
        <div class="page-break">
            {estimate_html}
        </div>
        <div class="page-break">
            {contract_html}
        </div>
        <div class="page-break">
            {itinerary_html}
        </div>
    </body>
    </html>
    """
    
    # CSS에 페이지 브레이크 추가
    css_with_break = """
    .page-break {
        page-break-after: always;
    }
    """
    
    # PDF 변환
    pdf_path = convert_html_to_pdf(bundle_html, group, 'bundle')
    
    # 문서 이력 저장
    document = save_document(group_id, 'bundle', pdf_path)
    
    return {
        'document_id': document.id,
        'file_path': pdf_path,
        'file_name': document.file_name,
        'version': document.version
    }
```

---

## 7. 문서 버전 관리

### 7.1 버전 관리 로직

```python
def get_next_version(group_id: UUID, document_type: str) -> int:
    """다음 버전 번호 조회"""
    last_doc = db.session.query(Document)\
        .filter_by(group_id=group_id, document_type=document_type)\
        .order_by(Document.version.desc())\
        .first()
    
    if last_doc:
        return last_doc.version + 1
    return 1

def generate_filename(group: Group, document_type: str, version: int) -> str:
    """파일명 생성 규칙"""
    doc_type_map = {
        'estimate': '견적서',
        'contract': '계약서',
        'itinerary': '일정표',
        'bundle': '통합'
    }
    
    doc_name = doc_type_map.get(document_type, '문서')
    date_str = datetime.now().strftime('%Y%m%d')
    safe_group_name = sanitize_filename(group.name)
    
    return f"{doc_name}_{safe_group_name}_v{version}_{date_str}.pdf"

def sanitize_filename(filename: str) -> str:
    """파일명에 사용할 수 없는 문자 제거"""
    import re
    # Windows에서 사용 불가능한 문자 제거
    invalid_chars = r'[<>:"/\\|?*]'
    return re.sub(invalid_chars, '_', filename)
```

### 7.2 문서 이력 저장

```python
def save_document(group_id: UUID, document_type: str, file_path: str) -> Document:
    """문서 이력 저장"""
    group = get_group(group_id)
    version = get_next_version(group_id, document_type)
    file_name = generate_filename(group, document_type, version)
    
    # 파일 크기 조회
    file_size = os.path.getsize(file_path)
    
    document = Document(
        group_id=group_id,
        document_type=document_type,
        version=version,
        file_path=file_path,
        file_name=file_name,
        generated_by=get_current_user(),
        file_size=file_size
    )
    
    db.session.add(document)
    db.session.commit()
    
    return document
```

### 7.3 버전 조회 API

```
GET /api/groups/{group_id}/documents
Query Parameters:
  - document_type: string (optional) - 문서 종류 필터
  - version: integer (optional) - 특정 버전 조회

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "document_type": "estimate",
      "version": 1,
      "file_name": "견적서_하노이골프단_v1_20250101.pdf",
      "generated_at": "2025-01-01T10:00:00Z",
      "generated_by": "user1",
      "file_size": 1024000
    }
  ]
}
```

### 7.4 파일명 규칙

- **견적서**: `견적서_{단체명}_v{version}_{YYYYMMDD}.pdf`
- **계약서**: `계약서_{단체명}_v{version}_{YYYYMMDD}.pdf`
- **일정표**: `일정표_{단체명}_v{version}_{YYYYMMDD}.pdf`
- **통합**: `통합_{단체명}_v{version}_{YYYYMMDD}.pdf`

예시:
- `견적서_하노이골프단_v1_20250101.pdf`
- `계약서_하노이골프단_v2_20250105.pdf`
- `통합_하노이골프단_v1_20250110.pdf`

---

## 8. 상태 기반 제어 로직

| 상태 | 제어 내용 |
|---|---|
| 견적 | 전체 수정 가능 |
| 계약 | 자동 계산 활성 |
| 확정 | 재계산 차단 |

---

## 9. 오류 처리 및 예외

### 9.1 데이터 검증 로직

#### 9.1.1 필수 필드 검증
```python
REQUIRED_FIELDS = {
    'groups': ['name', 'start_date', 'end_date', 'pax', 'price_per_pax', 'status'],
    'group_itinerary': ['group_id', 'day_no', 'itinerary_date'],
    'group_cancel_rules': ['group_id', 'days_before', 'penalty_rate']
}

def validate_required_fields(model_name: str, data: dict):
    """필수 필드 검증"""
    required = REQUIRED_FIELDS.get(model_name, [])
    missing = [field for field in required if field not in data or data[field] is None]
    if missing:
        raise ValidationError(f"필수 필드가 누락되었습니다: {', '.join(missing)}")
```

#### 9.1.2 데이터 타입 및 형식 검증
```python
def validate_date_format(date_str: str):
    """날짜 형식 검증 (YYYY-MM-DD)"""
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        raise ValidationError("날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용해주세요")

def validate_amount(amount: float, field_name: str):
    """금액 검증 (0 이상, 소수점 2자리)"""
    if amount < 0:
        raise ValidationError(f"{field_name}은(는) 0 이상의 값이어야 합니다")
    if round(amount, 2) != amount:
        raise ValidationError(f"{field_name}은(는) 소수점 2자리까지 입력 가능합니다")
```

#### 9.1.3 비즈니스 규칙 검증
```python
def validate_group_data(group: Group):
    """단체 데이터 비즈니스 규칙 검증"""
    # 1. 출발일 > 도착일 검증
    if group.end_date <= group.start_date:
        raise ValidationError("도착일은 출발일보다 이후여야 합니다", field="end_date")
    
    # 2. 계약금 > 총액 검증
    if group.deposit > group.total_price:
        raise ValidationError("계약금은 총액을 초과할 수 없습니다", field="deposit")
    
    # 3. 인원수 범위 검증
    if group.pax < 1 or group.pax > 999:
        raise ValidationError("인원수는 1명 이상 999명 이하여야 합니다", field="pax")
    
    # 4. 여행 기간 검증 (최소 1박 2일)
    nights = (group.end_date - group.start_date).days
    if nights < 1:
        raise ValidationError("여행 기간은 최소 1박 2일 이상이어야 합니다")
    
    # 5. 잔액 완납일 검증 (과거 날짜 경고)
    if group.balance_due_date and group.balance_due_date < date.today():
        logger.warning(f"잔액 완납일이 과거입니다: {group.balance_due_date}")

def validate_itinerary_data(itinerary: Itinerary, group: Group):
    """일정 데이터 검증"""
    # 1. 일정 날짜가 출발일 이전인지 검증
    if itinerary.itinerary_date < group.start_date:
        raise ValidationError("일정 날짜는 출발일 이후여야 합니다", field="itinerary_date")
    
    # 2. 일정 날짜가 도착일 이후인지 경고
    if itinerary.itinerary_date > group.end_date:
        logger.warning(f"일정 날짜가 여행 기간을 벗어났습니다: {itinerary.itinerary_date}")
    
    # 3. day_no 중복 검증 (DB 레벨에서 UNIQUE 제약조건으로 처리)
```

### 9.2 자동 계산 예외 처리

#### 9.2.1 계산 오류 처리
```python
def safe_calculate(func, *args, **kwargs):
    """안전한 계산 래퍼 (예외 발생 시 로그 기록 및 기본값 반환)"""
    try:
        return func(*args, **kwargs)
    except Exception as e:
        logger.error(f"계산 오류 발생: {func.__name__}, {str(e)}", exc_info=True)
        raise CalculationError(f"계산 중 오류가 발생했습니다: {str(e)}")

def recalculate_with_error_handling(group_id: UUID):
    """에러 처리를 포함한 재계산"""
    try:
        group = get_group(group_id)
        if group.status == 'confirmed':
            raise ForbiddenError("확정된 계약은 재계산할 수 없습니다")
        
        # 각 계산 단계별로 try-except 처리
        try:
            calculate_period(group)
        except Exception as e:
            logger.error(f"기간 계산 실패: {e}")
            # 이전 값 유지, 사용자에게 알림
            notify_user("기간 계산 중 오류가 발생했습니다. 수동으로 확인해주세요")
        
        try:
            calculate_price(group)
        except Exception as e:
            logger.error(f"요금 계산 실패: {e}")
            notify_user("요금 계산 중 오류가 발생했습니다. 수동으로 확인해주세요")
        
        # ...
        
    except Exception as e:
        logger.error(f"재계산 전체 실패: {e}", exc_info=True)
        raise
```

#### 9.2.2 수동 수정값 보호 로직
```python
def should_recalculate(field_name: str, manual_flag: bool, changed_fields: List[str]) -> bool:
    """재계산 여부 판단"""
    # 확정 상태면 재계산 안 함
    if group.status == 'confirmed':
        return False
    
    # 수동 수정된 필드는 재계산 생략 (일정 날짜 제외)
    if manual_flag and field_name != 'itinerary_date':
        return False
    
    # 해당 필드가 변경되었는지 확인
    return field_name in changed_fields or any(
        trigger_field in changed_fields 
        for trigger_field in get_trigger_fields(field_name)
    )
```

### 9.3 PDF 생성 실패 처리

#### 9.3.1 재시도 로직
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
def generate_pdf(group_id: UUID, document_type: str) -> dict:
    """PDF 생성 (최대 3회 재시도)"""
    try:
        # 데이터 조회
        group = get_group_with_relations(group_id)
        
        # HTML 렌더링
        html_content = render_template(document_type, group)
        
        # PDF 변환
        pdf_path = convert_html_to_pdf(html_content, group, document_type)
        
        # 문서 이력 저장
        document = save_document(group_id, document_type, pdf_path)
        
        return {
            "document_id": document.id,
            "file_path": pdf_path,
            "file_name": document.file_name,
            "version": document.version
        }
        
    except PDFGenerationError as e:
        logger.error(f"PDF 생성 실패: {e}", exc_info=True)
        # 3회 실패 시 관리자 알림
        if e.retry_count >= 3:
            notify_admin(f"PDF 생성 3회 실패: group_id={group_id}, type={document_type}")
        raise
    except Exception as e:
        logger.error(f"예상치 못한 오류: {e}", exc_info=True)
        raise PDFGenerationError("PDF 생성 중 예상치 못한 오류가 발생했습니다")
```

#### 9.3.2 한글 폰트 처리
```python
# WeasyPrint 한글 폰트 설정
CSS = """
@font-face {
    font-family: 'Noto Sans KR';
    src: url('/fonts/NotoSansKR-Regular.woff2') format('woff2');
}
body {
    font-family: 'Noto Sans KR', sans-serif;
}
"""

def convert_html_to_pdf(html_content: str, group: Group, doc_type: str) -> str:
    """HTML을 PDF로 변환 (한글 지원)"""
    try:
        from weasyprint import HTML, CSS
        
        html = HTML(string=html_content)
        css = CSS(string=CSS)
        
        # 파일명 생성
        filename = generate_filename(group, doc_type)
        filepath = f"/documents/{filename}"
        
        # PDF 생성
        html.write_pdf(filepath, stylesheets=[css])
        
        return filepath
        
    except Exception as e:
        logger.error(f"PDF 변환 실패: {e}", exc_info=True)
        raise PDFGenerationError("PDF 변환 중 오류가 발생했습니다")
```

### 9.4 데이터베이스 오류 처리

#### 9.4.1 연결 실패 처리
```python
from sqlalchemy.exc import OperationalError
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=5)
)
def execute_with_retry(query_func):
    """DB 쿼리 재시도 로직"""
    try:
        return query_func()
    except OperationalError as e:
        logger.error(f"DB 연결 실패: {e}")
        # 연결 재시도
        db.reconnect()
        raise
```

#### 9.4.2 트랜잭션 롤백
```python
from sqlalchemy.exc import IntegrityError

def save_group_with_rollback(group_data: dict):
    """트랜잭션 롤백을 포함한 저장"""
    try:
        with db.transaction():
            group = create_group(group_data)
            # 자동 계산 실행
            recalculate_group(group.id)
            # 검증
            validate_group_data(group)
            # 저장
            db.session.commit()
            return group
    except (ValidationError, IntegrityError) as e:
        db.session.rollback()
        logger.error(f"저장 실패 (롤백): {e}")
        raise
    except Exception as e:
        db.session.rollback()
        logger.error(f"예상치 못한 오류 (롤백): {e}", exc_info=True)
        raise
```

### 9.5 사용자 알림 및 피드백

#### 9.5.1 알림 메시지 정의
```python
MESSAGES = {
    'success': {
        'save': '저장되었습니다',
        'pdf_generated': 'PDF가 생성되었습니다. 다운로드하시겠습니까?',
        'recalculated': '자동 계산이 완료되었습니다'
    },
    'warning': {
        'manual_modified': '자동 계산값이 수동으로 수정되었습니다',
        'date_out_of_range': '입력한 날짜가 여행 기간을 벗어났습니다',
        'amount_mismatch': '계산된 금액과 입력한 금액이 다릅니다',
        'past_date': '과거 날짜가 입력되었습니다'
    },
    'error': {
        'required_field': '{field}을(를) 입력해주세요',
        'invalid_format': '{field}의 형식이 올바르지 않습니다',
        'business_rule': '{message}'
    }
}
```

#### 9.5.2 알림 전송 로직
```python
def notify_user(message_type: str, message_key: str, **kwargs):
    """사용자에게 알림 전송"""
    message = MESSAGES[message_type][message_key].format(**kwargs)
    
    # 프론트엔드로 전송 (WebSocket 또는 SSE)
    send_notification({
        'type': message_type,
        'message': message,
        'timestamp': datetime.now().isoformat()
    })
```

---

## 10. 보안 및 권한

- 내부 사용자 인증 필수
- 관리자만 상태 '확정' 변경 가능
- 문서 삭제 권한 제한

---

## 11. 로그 및 감사 추적

### 11.1 로그 레벨 정의

```python
import logging

# 로그 레벨 설정
LOG_LEVELS = {
    'DEBUG': logging.DEBUG,
    'INFO': logging.INFO,
    'WARNING': logging.WARNING,
    'ERROR': logging.ERROR,
    'CRITICAL': logging.CRITICAL
}

# 로거 설정
logger = logging.getLogger('travel_agency')
logger.setLevel(logging.INFO)

# 파일 핸들러 (영구 보관)
file_handler = logging.FileHandler('/var/log/travel_agency/app.log')
file_handler.setLevel(logging.INFO)

# 콘솔 핸들러 (개발 환경)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)

# 포맷터
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)
```

### 11.2 자동 계산 실행 로그

```python
def log_calculation(group_id: UUID, calculation_type: str, old_value: any, new_value: any):
    """자동 계산 실행 로그"""
    logger.info(
        f"자동 계산 실행 - "
        f"group_id={group_id}, "
        f"type={calculation_type}, "
        f"old_value={old_value}, "
        f"new_value={new_value}, "
        f"user={get_current_user()}"
    )
    
    # 감사 로그 테이블에 기록
    AuditLog.create(
        action='AUTO_CALCULATE',
        entity_type='group',
        entity_id=group_id,
        field_name=calculation_type,
        old_value=str(old_value),
        new_value=str(new_value),
        user=get_current_user()
    )
```

### 11.3 수동 수정 로그

```python
def log_manual_modification(group_id: UUID, field_name: str, old_value: any, new_value: any, reason: str):
    """수동 수정 로그"""
    logger.info(
        f"수동 수정 - "
        f"group_id={group_id}, "
        f"field={field_name}, "
        f"old_value={old_value}, "
        f"new_value={new_value}, "
        f"reason={reason}, "
        f"user={get_current_user()}"
    )
    
    # 감사 로그 테이블에 기록
    AuditLog.create(
        action='MANUAL_MODIFY',
        entity_type='group',
        entity_id=group_id,
        field_name=field_name,
        old_value=str(old_value),
        new_value=str(new_value),
        reason=reason,
        user=get_current_user()
    )
```

### 11.4 문서 출력 로그

```python
def log_document_generation(document_id: UUID, group_id: UUID, document_type: str, file_size: int):
    """문서 출력 로그"""
    logger.info(
        f"문서 생성 - "
        f"document_id={document_id}, "
        f"group_id={group_id}, "
        f"type={document_type}, "
        f"file_size={file_size}, "
        f"user={get_current_user()}"
    )
    
    # 감사 로그 테이블에 기록
    AuditLog.create(
        action='DOCUMENT_GENERATE',
        entity_type='document',
        entity_id=document_id,
        metadata={
            'group_id': str(group_id),
            'document_type': document_type,
            'file_size': file_size
        },
        user=get_current_user()
    )
```

### 11.5 감사 로그 테이블 설계

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,  -- AUTO_CALCULATE, MANUAL_MODIFY, DOCUMENT_GENERATE 등
    entity_type VARCHAR(50) NOT NULL,  -- group, document, itinerary 등
    entity_id UUID NOT NULL,
    field_name VARCHAR(100),  -- 수정된 필드명
    old_value TEXT,  -- 이전 값
    new_value TEXT,  -- 새 값
    reason TEXT,  -- 수정 사유 (수동 수정인 경우)
    metadata JSONB,  -- 추가 메타데이터
    user_id VARCHAR(100) NOT NULL,  -- 사용자 ID
    ip_address VARCHAR(45),  -- IP 주소
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 11.6 로그 조회 API

```
GET /api/audit-logs
Query Parameters:
  - entity_type: string (optional) - 엔티티 타입 필터
  - entity_id: uuid (optional) - 엔티티 ID 필터
  - action: string (optional) - 액션 타입 필터
  - user_id: string (optional) - 사용자 필터
  - start_date: date (optional) - 시작 날짜
  - end_date: date (optional) - 종료 날짜
  - page: integer (default: 1)
  - limit: integer (default: 50)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "action": "MANUAL_MODIFY",
      "entity_type": "group",
      "entity_id": "uuid",
      "field_name": "total_price",
      "old_value": "30000000",
      "new_value": "32000000",
      "reason": "항공료 추가",
      "user_id": "user1",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ],
  "total": 1000,
  "page": 1,
  "limit": 50
}
```

### 11.7 로그 보관 정책

- **활성 로그**: 최근 1년간의 로그는 즉시 조회 가능
- **아카이브 로그**: 1년 이상 된 로그는 별도 아카이브 스토리지로 이동
- **보관 기간**: 최소 5년간 보관 (법적 요구사항에 따라 조정 가능)
- **개인정보 마스킹**: 로그에 개인정보가 포함된 경우 마스킹 처리

### 11.8 로그 보안

- 로그 파일 접근 권한: 관리자만 읽기 가능
- 로그 무결성: 해시값 저장으로 변조 감지
- 로그 백업: 일일 자동 백업

---

## 12. 성능 기준

- 단체 조회 응답 < 500ms
- PDF 생성 < 3초

---

## 13. 확장 고려사항

- 이메일 발송 모듈 연동
- 전자서명 API 연동
- 회계/CRM 연계

---

※ 본 TRD는 TASK 분해 및 개발 일정 산정의 기준 문서로 사용된다.

