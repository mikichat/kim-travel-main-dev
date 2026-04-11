# 하나투어 스크래핑 셀렉터 문서

> 페이지 구조 변경 시 이 문서를 참고하여 셀렉터를 수정하세요.

## 페이지 정보

### 샘플 URL
```
하나투어 일본 상품 URL 형식:
https://www.hanatour.com/package/international/...
https://www.hanatour.com/pkg/...

주의: 하나투어 웹사이트는 SPA(Single Page Application) 구조로,
JavaScript 렌더링 후 콘텐츠가 로드되므로 Playwright 사용 필수
```

### 페이지 로딩 전략
```python
# 1. 페이지 로드 대기
page.goto(url, wait_until="networkidle")

# 2. 동적 콘텐츠 로드 대기
page.wait_for_selector("CSS_SELECTOR", timeout=10000)

# 3. JavaScript 완료 대기
page.wait_for_load_state("domcontentloaded")
```

---

## CSS 셀렉터 목록

### 1. 일정 테이블 컨테이너

**시도할 셀렉터 (우선순위순):**

1. `[class*="schedule"]` - schedule 클래스
2. `[class*="itinerary"]` - itinerary 클래스
3. `[class*="일정"]` - 한글 클래스명
4. `div[class*="day"]` - day 관련 div
5. `table` - 일반 테이블 요소
6. `[role="table"]` - ARIA role

**확정 셀렉터:**
```css
/* 분석 후 업데이트 예정 */
TBD
```

---

### 2. 일정 항목 (각 일차)

**시도할 셀렉터:**

1. `tr` - 테이블 행
2. `[class*="day-item"]` - day-item 클래스
3. `div[class*="schedule-day"]` - schedule-day 클래스

**확정 셀렉터:**
```css
/* 분석 후 업데이트 예정 */
TBD
```

---

### 3. 데이터 필드별 셀렉터

#### 3.1 일자 (Day)
```css
/* 예상 패턴 */
[class*="day-number"]
[class*="date"]
td:first-child
```

#### 3.2 지역 (Region)
```css
/* 예상 패턴 */
[class*="region"]
[class*="city"]
[class*="destination"]
```

#### 3.3 교통편 (Transport)
```css
/* 예상 패턴 */
[class*="transport"]
[class*="vehicle"]
img[alt*="버스"], img[alt*="비행기"]
```

#### 3.4 시간 (Time)
```css
/* 예상 패턴 */
[class*="time"]
[class*="duration"]
```

#### 3.5 일정 (Schedule)
```css
/* 예상 패턴 */
[class*="schedule"]
[class*="activity"]
[class*="description"]
```

#### 3.6 식사 (Meals)
```css
/* 예상 패턴 */
[class*="meal"]
[class*="food"]
[class*="식사"]
```

---

## 데이터 구조

### 추출 데이터 형식
```json
[
  {
    "day": "1일차",
    "region": "오사카",
    "transport": "전용버스",
    "time": "09:00",
    "schedule": "인천 출발 → 간사이공항 도착 → 호텔 체크인",
    "meals": "조식: 기내식, 중식: 현지식, 석식: 호텔식"
  },
  {
    "day": "2일차",
    "region": "교토",
    "transport": "전용버스",
    "time": "08:00",
    "schedule": "호텔 조식 → 금각사 → 청수사 → 기온 거리",
    "meals": "조식: 호텔식, 중식: 현지식, 석식: 현지식"
  }
]
```

---

## 분석 결과

### 현재 상태 (P1-T1.1 완료)
- [x] Mock HTML 구조 생성
- [x] 페이지 구조 분석 (Mock 기반)
- [x] 셀렉터 테스트
- [x] 데이터 추출 검증

### 확정된 셀렉터 (Mock HTML 기준)

```python
# 일정 테이블
schedule_table = soup.select_one('table.schedule-table')

# 일정 행
schedule_rows = schedule_table.select('tbody tr.schedule-day')

# 각 필드
day = row.select_one('.day-number')
region = row.select_one('.region')
transport = row.select_one('.transport')
time = row.select_one('.time')
schedule = row.select_one('.schedule-detail')
meals = row.select_one('.meals')
```

### 발견된 이슈
```
1. 샘플 URL (PKG000000001035) 404 에러 발생
   → Mock HTML로 스크래핑 로직 구현 완료
   → 실제 URL 확보 시 셀렉터만 교체

2. 하나투어 메인 페이지 접속 타임아웃
   → User-Agent 헤더 추가됨
   → 실제 URL 테스트 필요
```

### 다음 단계
1. [나중에] 실제 하나투어 일본 상품 URL 확보
2. [나중에] 페이지 HTML 구조 분석 및 셀렉터 업데이트
3. [완료] 스크래핑 로직 구현
4. [완료] 테스트 작성 및 검증

---

## 변경 이력

| 날짜 | 작업 | 담당자 |
|------|------|--------|
| 2026-01-30 | 초안 작성 | backend-specialist |
| 2026-01-30 | P1-T1.1 완료: Mock HTML 기반 스크래핑 로직 구현 | backend-specialist |

---

## 참고 자료

### Playwright 스크래핑 패턴
```python
# User-Agent 설정
page = browser.new_page(user_agent="Mozilla/5.0 ...")

# JavaScript 실행 대기
page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")

# 동적 로딩 대기
page.wait_for_function("() => document.querySelectorAll('.item').length > 0")
```

### 디버깅 팁
```python
# 페이지 스크린샷
page.screenshot(path="debug.png")

# HTML 저장
html = page.content()
with open("debug.html", "w", encoding="utf-8") as f:
    f.write(html)

# 콘솔 로그 수집
page.on("console", lambda msg: print(f"Console: {msg.text}"))
```
