# 데이터 인터페이스 매핑 정의 - 문서 템플릿 1

## 1. 개요

본 문서는 기존 DB 테이블 구조와 HTML 템플릿 간의 데이터 매핑을 정의합니다.
DB 구조를 변경하지 않고, 읽기 전용으로 데이터를 조회하여 HTML 템플릿에 바인딩합니다.

## 2. 논리 데이터 모델

### 2.1 공통 문서 데이터 구조

```json
{
  "doc_id": "string",
  "doc_type": "estimate | schedule | product",
  "title": "string",
  "subtitle": "string",
  "contact_info": "string",
  "logo_path": "string",
  "group_info": {
    "group_name": "string",
    "travel_dates": "string",
    "destination": "string"
  },
  "pricing": {
    "airline_name": "string",
    "departure_flight": "string",
    "return_flight": "string",
    "option_type": "string",
    "price_amount": "string",
    "price_note": "string"
  },
  "conditions": [
    {
      "condition_type": "string",
      "content": "string",
      "note": "string"
    }
  ],
  "images": [
    {
      "image_path": "string",
      "alt_text": "string"
    }
  ],
  "footer_note": "string"
}
```

## 3. HTML data-field 매핑

### 3.1 Header 영역

| HTML data-field | 논리 필드 | 데이터 타입 | 설명 |
|----------------|----------|------------|------|
| `logo_path` | logo_path | string | 로고 이미지 경로 |
| `contact_info` | contact_info | string | 담당자 연락처 |

### 3.2 Title 영역

| HTML data-field | 논리 필드 | 데이터 타입 | 설명 |
|----------------|----------|------------|------|
| `doc_title` | title | string | 문서 제목 (예: "여행 견적서") |

### 3.3 Main Info Table 영역

| HTML data-field | 논리 필드 | 데이터 타입 | 설명 |
|----------------|----------|------------|------|
| `group_name` | group_info.group_name | string | 단체명 |
| `travel_dates` | group_info.travel_dates | string | 여행 일자 |
| `destination` | group_info.destination | string | 여행지 |
| `airline_name` | pricing.airline_name | string | 항공사명 |
| `departure_flight` | pricing.departure_flight | string | 출발 항공편 정보 |
| `return_flight` | pricing.return_flight | string | 귀국 항공편 정보 |
| `option_type` | pricing.option_type | string | 옵션 타입 (예: "노옵션") |
| `price_amount` | pricing.price_amount | string | 1인 요금 |
| `price_note` | pricing.price_note | string | 요금 안내 문구 |

### 3.4 Conditions Table 영역

| HTML data-field | 논리 필드 | 데이터 타입 | 설명 |
|----------------|----------|------------|------|
| `conditions_title` | "여 행 조 건" | string | 조건 섹션 제목 (고정값) |
| `airfare_included` | conditions[type='airfare'].content | string | 항공료 포함 내용 |
| `airfare_note` | conditions[type='airfare'].note | string | 항공료 특이사항 |
| `accommodation_included` | conditions[type='accommodation'].content | string | 숙박 포함 내용 |
| `accommodation_note` | conditions[type='accommodation'].note | string | 숙박 특이사항 |
| `meals_included` | conditions[type='meals'].content | string | 식사 포함 내용 |
| `meals_note` | conditions[type='meals'].note | string | 식사 특이사항 |
| `transport_included` | conditions[type='transport'].content | string | 교통편 포함 내용 |
| `transport_note` | conditions[type='transport'].note | string | 교통편 특이사항 |
| `attractions_included` | conditions[type='attractions'].content | string | 관광지 포함 내용 |
| `attractions_note` | conditions[type='attractions'].note | string | 관광지 특이사항 |
| `guide_included` | conditions[type='guide'].content | string | 가이드 포함 내용 |
| `guide_note` | conditions[type='guide'].note | string | 가이드 특이사항 |
| `insurance_included` | conditions[type='insurance'].content | string | 여행자보험 포함 내용 |
| `insurance_note` | conditions[type='insurance'].note | string | 여행자보험 특이사항 |

### 3.5 Image 영역

| HTML data-field | 논리 필드 | 데이터 타입 | 설명 |
|----------------|----------|------------|------|
| `main_image` | images[0].image_path | string | 메인 이미지 경로 |

### 3.6 Footer 영역

| HTML data-field | 논리 필드 | 데이터 타입 | 설명 |
|----------------|----------|------------|------|
| `footer_note` | footer_note | string | 하단 안내 문구 |

## 4. DB 컬럼 매핑 예시 (실제 DB 구조 기준 조정 필요)

> 실제 프로젝트의 DB 구조에 맞춰 아래 매핑을 수정해야 합니다.

### 4.1 가정: documents 테이블

```sql
-- 예시: 실제 DB 구조에 맞춰 수정 필요
SELECT
  doc_id,
  doc_type,
  title,
  subtitle,
  contact_info,
  logo_path,
  group_name,
  travel_dates,
  destination,
  airline_name,
  departure_flight,
  return_flight,
  option_type,
  price_amount,
  price_note,
  main_image_path,
  footer_note
FROM documents
WHERE doc_id = ?
```

### 4.2 가정: document_conditions 테이블

```sql
-- 예시: 실제 DB 구조에 맞춰 수정 필요
SELECT
  condition_type,
  content,
  note
FROM document_conditions
WHERE doc_id = ?
ORDER BY display_order
```

## 5. NULL/빈 값 처리 규칙

| 상황 | 처리 방법 |
|------|----------|
| 텍스트 필드가 NULL | 빈 문자열로 표시 |
| 이미지 경로가 NULL | img 태그는 유지, 회색 placeholder 표시 |
| 조건 테이블 행이 없음 | 해당 행은 빈 값으로 표시 (레이아웃 유지) |
| 가격 정보가 NULL | "0원" 또는 빈 값 표시 |

## 6. 데이터 로딩 순서

1. 메인 문서 정보 조회 (documents 테이블)
2. 조건 정보 조회 (document_conditions 테이블)
3. 이미지 정보 조회 (필요시)
4. JSON 형태로 통합
5. HTML 템플릿에 바인딩

## 7. API 엔드포인트 예시

```
GET /api/documents/:doc_id
Response:
{
  "success": true,
  "data": {
    // 위의 논리 데이터 모델 구조
  }
}
```

## 8. 향후 확장 고려사항

- 다국어 지원 시: `title_ko`, `title_en` 등의 필드 추가
- 이미지 다중 업로드: `images` 배열 확장
- 커스텀 필드: `custom_fields` 객체 추가
