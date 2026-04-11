# Database Migration Log

## Migration 001: Add Advanced Mode Columns
**Date**: 2026-01-02
**Time**: 11:08 UTC
**Script**: `add_advanced_mode_columns.js`
**Status**: ✅ **SUCCESS**

### Changes
Added 8 new columns to `invoices` table to support Advanced Mode calculation:

| Column Name | Type | Default | Description |
|-------------|------|---------|-------------|
| `calculation_mode` | TEXT | 'simple' | 계산 모드 (simple/advanced) |
| `base_price_per_person` | INTEGER | NULL | 1인당 요금 |
| `total_participants` | INTEGER | NULL | 총 인원 |
| `total_travel_cost` | INTEGER | NULL | 총 여행경비 (자동 계산) |
| `deposit_amount` | INTEGER | NULL | 계약금 금액 |
| `deposit_description` | TEXT | NULL | 계약금 설명 |
| `additional_items` | TEXT | NULL | 추가 비용 항목 (JSON 배열) |
| `balance_due` | INTEGER | NULL | 잔금 (자동 계산) |

### Backup
- **Backup File**: `travel_agency.db.backup_20260102`
- **Original Size**: (database size before migration)
- **Location**: `backend/travel_agency.db.backup_20260102`

### Verification
✅ All 8 columns added successfully
✅ No errors during migration
✅ Schema verified and updated
✅ Default values applied correctly

### Rollback Instructions
If you need to rollback this migration:

```bash
# Stop the application
# Restore from backup
cd backend
copy travel_agency.db.backup_20260102 travel_agency.db

# Restart the application
```

### Next Steps
1. ✅ Migration completed
2. ⏳ Update API endpoints (`POST /api/invoices`, `GET /api/invoices/:id`)
3. ⏳ Update frontend save logic
4. ⏳ Test end-to-end flow

---

## Previous Migrations
(No previous migrations recorded)
