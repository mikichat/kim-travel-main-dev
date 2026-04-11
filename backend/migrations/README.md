# Database Migrations

이 디렉토리는 데이터베이스 스키마 마이그레이션 스크립트를 포함합니다.

## 📁 파일 목록

| 파일 | 설명 | 상태 |
|------|------|------|
| `add_advanced_mode_columns.js` | Advanced Mode 컬럼 추가 마이그레이션 | ✅ 완료 |
| `test_advanced_mode.js` | Advanced Mode 기능 테스트 | ✅ 통과 |
| `MIGRATION_LOG.md` | 마이그레이션 이력 로그 | 📝 문서 |

## 🚀 사용 방법

### 마이그레이션 실행

```bash
cd backend
node migrations/add_advanced_mode_columns.js
```

### 테스트 실행

```bash
cd backend
node migrations/test_advanced_mode.js
```

## ✅ Migration 001: Advanced Mode Columns

**실행일**: 2026-01-02
**상태**: ✅ 성공

### 추가된 컬럼

1. `calculation_mode` - 계산 모드 (simple/advanced)
2. `base_price_per_person` - 1인당 요금
3. `total_participants` - 총 인원
4. `total_travel_cost` - 총 여행경비
5. `deposit_amount` - 계약금 금액
6. `deposit_description` - 계약금 설명
7. `additional_items` - 추가 비용 항목 (JSON)
8. `balance_due` - 잔금

### 테스트 결과

```
✅ INSERT - Working
✅ SELECT - Working
✅ UPDATE - Working
✅ DELETE - Working
✅ JSON storage - Working
```

## 🔄 롤백 방법

마이그레이션을 되돌리려면:

```bash
# 애플리케이션 중지
# 백업에서 복원
cd backend
copy travel_agency.db.backup_20260102 travel_agency.db

# 애플리케이션 재시작
```

## 📊 데이터베이스 스키마

### Before Migration

```sql
CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE,
    recipient TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    description TEXT,
    -- ... (기존 컬럼들)
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);
```

### After Migration

```sql
CREATE TABLE invoices (
    -- ... (기존 컬럼들) ...

    -- Advanced Mode 컬럼
    calculation_mode TEXT DEFAULT 'simple',
    base_price_per_person INTEGER,
    total_participants INTEGER,
    total_travel_cost INTEGER,
    deposit_amount INTEGER,
    deposit_description TEXT,
    additional_items TEXT,  -- JSON 배열
    balance_due INTEGER
);
```

## 📝 다음 단계

- [ ] API 엔드포인트 업데이트
- [ ] 프론트엔드 저장 로직 연동
- [ ] 엔드투엔드 테스트

## 🔗 관련 문서

- [PENDING_TASKS.md](../../in/docs/PENDING_TASKS.md) - 미완료 작업 목록
- [INVOICE_CALCULATION_PRD.md](../../in/docs/INVOICE_CALCULATION_PRD.md) - Advanced Mode PRD
- [MIGRATION_LOG.md](./MIGRATION_LOG.md) - 마이그레이션 이력
