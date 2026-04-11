# 엑셀 템플릿 구조 분석

## 1. 기본 정보

- **템플릿 파일**: `C:\Users\kgj12\Root\main\tourworld1\landing\server\test.xlsx`
- **시트 이름**: 여행일정 (Sheet1)
- **총 행 수**: 62 rows
- **총 열 수**: 8 columns (A-H)

## 2. 컬럼 구조

| 컬럼 | 헤더명 | 너비 | 데이터 타입 | 정렬 | 설명 |
|------|--------|------|------------|------|------|
| A | 일자 | 13.75 | str | center | 여행 일자 (예: "1일차", "2일차") |
| B | 지역 | 11.75 | str | center | 출발/도착 지역 (예: "인천", "다낭") |
| C | 교통편 | 13.0 | str | center | 항공편명 또는 교통수단 (예: "VN431", "전용차량") |
| D | 시간 | 13.0 | time | center | 출발/도착 시간 (예: 10:10:00) |
| E-G | 일정 | 10.625, 11.75, 35.25 | str | left | 여행 일정 상세 내용 (병합 셀) |
| H | 식사 | 19.25 | str | center | 식사 정보 (예: "조:기내식", "석:현지식") |

## 3. 헤더 스타일

### Row 1 (헤더)

- **높이**: 66.6
- **폰트**: 맑은 고딕, 11pt, Bold
- **배경색**: #D9D9D9 (연한 회색)
- **정렬**: center (가운데 정렬)
- **테두리**: 전체 셀에 테두리 적용

### 특이사항
- E-G 컬럼은 "일정"이라는 하나의 헤더로 병합됨 (E1:G1)
- F, G 컬럼은 헤더에 별도 값이 없으며, E 컬럼과 병합되어 사용

## 4. 데이터 행 스타일

### 일반 행 (Row 2 이상)

- **높이**: 21.0 (기본), 일부 18.0, 21.0, 30.0, 38.25 등 가변
- **폰트**: 맑은 고딕, 11pt, Regular
- **배경색**: 흰색 (배경 없음)
- **테두리**:
  - A 컬럼: 왼쪽 medium, 오른쪽 thin
  - B-G 컬럼: 좌우 thin
  - H 컬럼: 왼쪽 thin, 오른쪽 medium

### 정렬 규칙

- **A, B, C, D, H 컬럼**: center (가운데 정렬)
- **E-G 컬럼 (일정)**: left (왼쪽 정렬)

## 5. 병합 셀 패턴

### A 컬럼 (일자)
- 하나의 일자에 여러 행이 포함될 경우 세로 병합
- 예시:
  - A2:A10 (1일차에 9개 행)
  - A11:A18 (2일차에 8개 행)
  - A19:A31 (3일차에 13개 행)

### E-G 컬럼 (일정)
- 모든 데이터 행에서 E-G가 가로로 병합됨
- 예시:
  - E2:G2, E3:G3, E4:G4, ...
  - 일정 내용이 긴 경우 넓은 영역 확보

### 하단 여백 행
- A46:H46 (전체 컬럼 병합)

## 6. 데이터 예시

### Row 2 (1일차 첫 행)

```
A: 1일차
B: 인천
C: VN431
D: 10:10:00
E-G: 인천 국제공항 출발
H: 조:기내식
```

### Row 3 (1일차 두 번째 행)

```
A: (병합됨)
B: 다낭
C: (공백)
D: 13:10:00
E-G: 다낭 국제공항 도착 및 입국 수속
H: 석:현지정식
```

### Row 4-10 (1일차 상세 일정)

```
A: (병합됨)
B: (공백)
C: (공백)
D: (공백)
E-G: - 공항에서 가이드 미팅 및 한국어 가이드 합류
H: (공백)
```

## 7. openpyxl 재현 가이드

### 필수 라이브러리

```python
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
```

### 스타일 정의

```python
# 헤더 스타일
header_font = Font(name='맑은 고딕', size=11, bold=True)
header_fill = PatternFill(start_color='FFD9D9D9', end_color='FFD9D9D9', fill_type='solid')
header_alignment = Alignment(horizontal='center', vertical='center')

# 데이터 셀 스타일
data_font = Font(name='맑은 고딕', size=11)
center_alignment = Alignment(horizontal='center', vertical='center')
left_alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)

# 테두리 스타일
thin_border = Side(style='thin', color='000000')
medium_border = Side(style='medium', color='000000')
```

### 컬럼 너비 설정

```python
ws.column_dimensions['A'].width = 13.75
ws.column_dimensions['B'].width = 11.75
ws.column_dimensions['C'].width = 13.0
ws.column_dimensions['D'].width = 13.0
ws.column_dimensions['E'].width = 10.625
ws.column_dimensions['F'].width = 11.75
ws.column_dimensions['G'].width = 35.25
ws.column_dimensions['H'].width = 19.25
```

### 병합 셀 예시

```python
# 헤더 일정 컬럼 병합
ws.merge_cells('E1:G1')

# 일자 컬럼 병합 (1일차, 10개 행)
ws.merge_cells('A2:A10')

# 일정 컬럼 병합 (각 데이터 행)
ws.merge_cells('E2:G2')
ws.merge_cells('E3:G3')
```

## 8. 데이터 모델 설계

### ItineraryDay (일자별 일정)

```python
from dataclasses import dataclass
from datetime import time
from typing import List, Optional

@dataclass
class ItineraryItem:
    """일정 항목"""
    region_from: str = ""           # 출발 지역
    region_to: str = ""             # 도착 지역
    transport: str = ""             # 교통편
    time: Optional[time] = None     # 시간
    description: str = ""           # 일정 설명
    meal: str = ""                  # 식사 정보

@dataclass
class ItineraryDay:
    """일자별 일정"""
    day_number: int                 # 일자 (1, 2, 3, ...)
    items: List[ItineraryItem]      # 일정 항목들
```

### 엑셀 생성 로직

1. Workbook 생성
2. 헤더 행 작성 및 스타일 적용
3. 일자별 데이터 순회:
   - 첫 행: 일자, 출발지, 교통편, 시간, 일정, 식사
   - 추가 행: 도착지, 상세 일정 등
   - 일자 컬럼 병합 (첫 행부터 마지막 행까지)
4. 셀 스타일 적용 (폰트, 정렬, 테두리)
5. 파일 저장

## 9. 주의사항

- **시간 데이터**: openpyxl에서 Python `datetime.time` 객체로 처리
- **한글 폰트**: Windows 환경에서 '맑은 고딕' 필수 설치
- **셀 병합 순서**: 데이터 입력 후 병합 (병합 후 데이터 입력 시 첫 셀에만 값 저장됨)
- **텍스트 줄바꿈**: 일정 컬럼(E-G)은 `wrap_text=True` 설정
- **테두리 일관성**: 병합된 셀에도 개별 테두리 스타일 적용 필요

## 10. 향후 개선 사항

- [ ] 동적 행 높이 계산 (일정 내용 길이에 따라)
- [ ] 이미지 삽입 기능 (관광지 사진)
- [ ] 다양한 템플릿 지원 (테마별)
- [ ] PDF 변환 기능
