# Invoice PDF 생성 API 사양

## 목표
`GET /api/invoices/:id/pdf` 엔드포인트를 구현하여 인보이스를 A4 인쇄용 HTML로 렌더링한다.

## 기존 패턴
- `fare-certificates.ts`의 `/:id/pdf` 패턴과 동일한 방식
- HTML을 `text/html`로 반환, 브라우저에서 `window.print()`로 PDF 출력
- A4 @page 설정, @media print 스타일 포함

## 데이터 모델 (InvoiceRow)
```
- invoice_number: 인보이스 번호
- recipient: 수신인
- invoice_date: 발행일
- description: 설명
- total_amount: 총 금액
- airfare_unit_price / airfare_quantity / airfare_total: 항공운임
- seat_preference_unit_price / quantity / total: 좌석 선호 수수료
- calculation_mode: 계산 방식 (simple/detailed)
- base_price_per_person / total_participants: 1인 단가 / 총 인원
- total_travel_cost / deposit_amount / deposit_description: 총 여행비 / 예치금
- additional_items: JSON 배열 (추가 항목)
- balance_due: 잔금
- flight_info: JSON 배열 (항공편 정보)
- passenger_info: JSON 배열 (탑승자 정보)
- ticket_info: JSON 배열 (티켓 정보)
- bank_name / account_number / account_holder: 입금 계좌
```

## 기능 요구사항

### P0: 핵심
1. `GET /api/invoices/:id/pdf` → 인보이스 HTML 렌더링
2. 인보이스 기본 정보 표시 (번호, 수신인, 날짜)
3. 항공운임 내역 테이블
4. 총 금액 표시
5. 회사 정보 + 직인 + 인쇄 버튼

### P1: 상세
6. flight_info가 있으면 항공편 스케줄 섹션
7. passenger_info가 있으면 탑승자 목록
8. additional_items가 있으면 추가 항목 테이블
9. 예치금/잔금 표시 (deposit_amount, balance_due)
10. 입금 계좌 정보 (bank_name, account_number, account_holder)

### P2: 부가
11. ticket_info가 있으면 티켓 정보 표시
12. 직인 이미지 인쇄 시 제외 토글

## 디자인 방향
- 기존 견적서(quotation) 스타일 참조: Navy + Gold 컬러
- 하지만 인보이스는 **청구서** 느낌: 좀 더 formal한 톤
- 컬러: Navy (#000666) 기반, Gold 포인트
- A4 사이즈, 인쇄 최적화

## 기술 스택
- Express + TypeScript
- 기존 invoices.ts 라우터에 엔드포인트 추가
- 기존 invoices.service.ts의 getInvoiceById() 사용
- fare-certificates.ts의 유틸 함수 참조 (formatKRW, formatDateKR 등)
