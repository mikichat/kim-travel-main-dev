# 🚀 Quick Test Reference - Sync UI

## One-Command Test

```bash
# Run complete verification
node verify-sync-setup.js

# Expected: 19/19 tests pass, 0 failures, 0 warnings
```

---

## 🎯 Test the Sync UI Now

### Option 1: Isolated UI Component Test
```bash
start test-sync-ui.html
```

**What to do:**
1. Page opens with 5 test buttons
2. Click "모듈 확인" → All 3 modules should show ✅
3. Click each test button to see UI components in action
4. Click "전체 동기화 테스트" for real API integration

### Option 2: Real Group Roster Integration
```bash
start "group-roster-manager-v2 (3).html"
```

**What to do:**
1. Press F12 to open DevTools Console
2. Type: `GroupSyncManager` → Should show: `ƒ GroupSyncManager()`
3. Create a new group with members
4. Enable sync option and save
5. Watch for sync dialogs to appear

---

## 🔍 Verify Sync Results

```bash
node check-api-data.js
```

**Shows:**
- Total customers vs synced customers
- Recent synced customer details
- Sync log history
- Group sync status

---

## 🧪 Test UI Components

### In Browser Console (F12):

```javascript
// Test confirmation dialog
GroupSyncManager.showSyncConfirmDialog({
    newCustomers: 3,
    existingCustomers: 1,
    departureDate: '2025-12-30',
    returnDate: '2026-01-05',
    destination: '하노이',
    groupName: 'Test Group',
    productAction: '기존 상품 연결: 하노이 골프'
});

// Test progress indicator
GroupSyncManager.showSyncProgress(1, 3, '고객 동기화 중...');
setTimeout(() => GroupSyncManager.hideSyncProgress(), 3000);

// Test result dialog
GroupSyncManager.showSyncResult({
    customers: {
        created: 3,
        updated: 1,
        skipped: 0,
        errors: []
    }
});
```

---

## 📊 Current Test Data

**Database has:**
- 6 total customers (3 manual + 3 synced)
- 3 synced from group roster
- 1 sync log entry

**Synced Customers:**
1. 테스트홍길동 (TEST HONG GILDONG) - T12345678
2. 테스트김철수 (TEST KIM CHEOLSU) - T87654321
3. 테스트이영희 (TEST LEE YOUNGHEE) - T11112222

**Group:** 하노이 골프단 테스트 (test-group-001)

---

## ✅ What Works

- [x] Backend API (4 endpoints)
- [x] Database schema (sync_logs, sync fields)
- [x] JavaScript modules (GroupSyncManager, ConflictResolver, ProductMatcher)
- [x] CSS styling (dialogs, progress, animations)
- [x] HTML integration (scripts loaded in correct order)
- [x] Test data creation and sync
- [x] Sync logging

---

## 📖 Full Documentation

- **SYNC_UI_TEST_GUIDE.md** - Comprehensive 10-step testing guide
- **SYNC_UI_TEST_RESULTS.md** - Complete test results (19/19 passed)
- **This file** - Quick reference for immediate testing

---

## 🎬 Quick Visual Test

**1-Minute Test:**
1. Open: `start test-sync-ui.html`
2. Click: "확인 다이얼로그 표시"
3. Click: "동기화 시작" in the dialog
4. Click: "진행 표시 테스트"
5. Watch the progress bar animate
6. Click: "결과 다이얼로그 표시"
7. Check the results table

**Expected:** All UI components display correctly with smooth animations

---

## 🐛 Troubleshooting

**Modules not loading?**
```bash
# Check files exist
dir js\group-sync-manager.js
dir js\conflict-resolver.js
dir js\product-matcher.js
dir css\sync-ui.css
```

**Server not running?**
```bash
# Check port 5000
netstat -ano | findstr :5000

# Restart if needed
cd backend
node server.js
```

**Want to reset test data?**
```bash
# Delete test customers via API or database
# They have sync_source = 'group_roster'
```

---

## 📞 Test Support Commands

```bash
# View all test-related files
dir test-*.* & dir check-*.* & dir verify-*.*

# Server logs
type backend\server.log | tail -50

# Database queries (if sqlite3 available)
sqlite3 backend\travel_agency.db "SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 5"
```

---

**Status: ✅ READY TO TEST**
**All Systems: GO**
**Test Now: `start test-sync-ui.html`**
