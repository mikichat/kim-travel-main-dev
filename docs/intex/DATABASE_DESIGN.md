# Database Design (LocalStorage Schema)

본 시스템은 브라우저의 `localStorage`를 주 데이터베이스로 사용합니다. 데이터는 JSON 문자열로 직렬화되어 저장됩니다.

## 1. Key: `travel_customers` (고객 정보)
Array of Objects 구조.

| 필드명 | 타입 | 설명 | 필수 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | 고유 ID (UUID v4) | Y | Primary Key |
| `nameKor` | String | 고객 한글명 | Y | |
| `nameEng` | String | 고객 영문명 (여권) | Y | |
| `phone` | String | 연락처 | Y | |
| `birthDate` | String | 생년월일 (YYYY-MM-DD) | Y | |
| `passportNumber` | String | 여권번호 | Y | |
| `passportExpiry` | String | 여권 만료일 (YYYY-MM-DD) | Y | |
| `gender` | String | 성별 (M/F) | Y | |
| `address` | String | 주소 | N | |
| `email` | String | 이메일 | N | |
| `note` | String | 비고 | N | |
| `createdAt` | Number | 생성일시 (Timestamp) | Y | |

## 2. Key: `travel_bookings` (예약 정보)
Array of Objects 구조.

| 필드명 | 타입 | 설명 | 필수 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | 예약 고유 ID | Y | Primary Key |
| `customerId` | String | 고객 ID | Y | Foreign Key |
| `customerName` | String | 고객명 (표시용) | Y | Redundant |
| `productId` | String | 상품 ID | N | Foreign Key |
| `productName` | String | 상품명 | Y | |
| `departureDate` | String | 출발일 (YYYY-MM-DD) | Y | |
| `returnDate` | String | 귀국일 (YYYY-MM-DD) | Y | |
| `peopleCount` | Number | 인원 수 | Y | Default: 1 |
| `status` | String | 예약 상태 | Y | 문의/견적/확정 등 |
| `totalPrice` | Number | 총 금액 | Y | |
| `deposit` | Number | 예약금 | N | |
| `balance` | Number | 잔금 | N | |

## 3. Key: `travel_products` (상품 정보)
Array of Objects 구조.

| 필드명 | 타입 | 설명 | 필수 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | 상품 고유 ID | Y | Primary Key |
| `name` | String | 상품명 | Y | |
| `destination` | String | 목적지 | Y | |
| `price` | Number | 기본 가격 | Y | |
| `description` | String | 상품 설명 | N | |
| `isActive` | Boolean | 활성 여부 | Y | |

## 4. Key: `travel_notifications` (알림)
Array of Objects 구조.

| 필드명 | 타입 | 설명 | 필수 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | 알림 ID | Y | |
| `type` | String | 알림 유형 | Y | passport/departure |
| `message` | String | 알림 내용 | Y | |
| `isRead` | Boolean | 읽음 여부 | Y | |
| `relatedId` | String | 관련 데이터 ID | N | BookingID or CustomerID |
| `date` | Number | 생성일시 (Timestamp) | Y | |
