# Sync UI Test Guide

## Overview
This guide provides step-by-step instructions to test the Group Roster Auto-Sync System UI in the group roster manager.

## Pre-requisites
✅ Backend server running on `http://localhost:5000`
✅ All sync modules loaded:
  - `js/group-sync-manager.js` (17 KB)
  - `js/conflict-resolver.js` (6 KB)
  - `js/product-matcher.js` (7.5 KB)
✅ CSS stylesheet: `css/sync-ui.css` (6.3 KB)

## Test Pages
1. **Test UI Page**: `test-sync-ui.html` - Isolated UI component testing
2. **Group Roster Manager**: `group-roster-manager-v2 (3).html` - Real integration testing

---

## Test 1: Module Loading Verification

### Steps:
1. Open `test-sync-ui.html` in your browser
2. Check the test log at the bottom
3. Click **"모듈 확인"** button

### Expected Results:
```
✅ GroupSyncManager 로드됨
✅ ConflictResolver 로드됨
✅ ProductMatcher 로드됨
✅ 모든 모듈이 정상적으로 로드되었습니다!
```

### What to Check:
- All three modules appear with green checkmarks
- No red error messages in the log
- Browser console shows no JavaScript errors (F12)

---

## Test 2: Sync Confirmation Dialog

### Steps:
1. On `test-sync-ui.html`, click **"확인 다이얼로그 표시"**
2. A modal dialog should appear with sync preview information

### Expected Results:
- Modal appears with dark overlay
- Shows preview information:
  - 고객 생성: 3명
  - 고객 업데이트: 1명
  - 달력 일정: 2025-12-30 ~ 2026-01-05
  - 상품: 기존 상품 연결: 하노이 골프 3박4일
- Two buttons: "취소" and "동기화 시작"

### What to Test:
- [ ] Click "취소" - dialog closes, log shows "사용자가 동기화를 취소했습니다"
- [ ] Click "동기화 시작" - dialog closes, log shows "사용자가 동기화를 확인했습니다"
- [ ] Dialog has smooth fade-in animation
- [ ] Clicking outside dialog doesn't close it

---

## Test 3: Progress Indicator

### Steps:
1. Click **"진행 표시 테스트"** button
2. Watch the progress indicator animate through 3 steps

### Expected Results:
- Progress dialog appears in center of screen
- Progress bar fills from 0% → 33% → 66% → 100%
- Step messages change:
  1. "고객 동기화 준비 중..."
  2. "고객 동기화 중..."
  3. "달력 동기화 중..."
  4. "완료!"
- Progress bar has shimmer animation
- Dialog auto-closes after completion

### What to Check:
- [ ] Smooth progress bar animation
- [ ] Clear step indicators (1/3, 2/3, 3/3)
- [ ] No flickering or layout jumps
- [ ] Shimmer effect on progress bar

---

## Test 4: Result Dialog

### Steps:
1. Click **"결과 다이얼로그 표시"** button
2. Review the sync results displayed

### Expected Results:
- Dialog shows sync summary table:
  - 고객 생성: **3명**
  - 고객 업데이트: **1명**
  - 건너뜀: 1명
  - 오류: **1건** (in red)
- Expandable error details section
- "확인" button to close

### What to Test:
- [ ] Click error details dropdown - shows error list
- [ ] Error items displayed: "홍길동 (HONG GILDONG): 여권번호 누락"
- [ ] Click "확인" - dialog closes
- [ ] Important numbers (created, updated) are bold
- [ ] Error count is in red color

---

## Test 5: Full Sync Integration Test

### Steps:
1. Click **"전체 동기화 테스트"** button
2. This will test the complete sync flow with real API calls

### Expected Flow:
1. Confirmation dialog appears (preview with 2 members)
2. Click "동기화 시작"
3. Progress indicator shows 3 steps
4. Result dialog appears with actual API results
5. Check test log for detailed results

### Expected API Results:
```
✅ 동기화 완료!
고객 생성: 2명
고객 업데이트: 0명
건너뜀: 0명
```

### What to Verify:
- [ ] All dialogs appear in correct sequence
- [ ] No JavaScript errors in console
- [ ] Server log shows new sync entry
- [ ] Database has new customers with:
  - `sync_source = 'group_roster'`
  - `sync_group_id = 'test-ui-group-001'`
  - Names: UI테스트1, UI테스트2

---

## Test 6: Real Group Roster Manager Integration

### Steps:
1. Open `group-roster-manager-v2 (3).html`
2. Open browser DevTools (F12) → Console tab
3. Check for module loading messages

### Initial Verification:
In the console, type:
```javascript
console.log('GroupSyncManager:', typeof GroupSyncManager);
console.log('ConflictResolver:', typeof ConflictResolver);
console.log('ProductMatcher:', typeof ProductMatcher);
```

Expected output:
```
GroupSyncManager: function
ConflictResolver: function
ProductMatcher: function
```

### Create Test Group:
1. Click "새 그룹 생성" button
2. Fill in group details:
   - 그룹명: "동기화 UI 테스트"
   - 목적지: "제주도"
   - 출발일: 2025-12-30
   - 귀국일: 2026-01-02
3. Add members with complete information:
   - 이름(한글): 테스트김철수
   - 이름(영문): TEST KIM CHEOLSU
   - 여권번호: TESTUI001
   - 생년월일: 1980-05-15
   - 여권만료일: 2028-05-14
   - 전화번호: 010-1234-5678

### Test Sync from Group Roster:
1. After adding member data, look for sync button or toggle
2. Enable "고객관리에 자동추가" option (if available)
3. Click save/sync button
4. **Expected behavior:**
   - Confirmation dialog appears with preview
   - Shows: "고객 생성: 1명"
   - Click "동기화 시작"
   - Progress indicator animates through steps
   - Result dialog shows success

### Verify in Backend:
Run this in terminal:
```bash
node check-api-data.js
```

Expected to see the new customer in synced customers list.

---

## Test 7: Reverse Sync (Customer → Group)

### Steps:
1. Open customer management (navigate to customer page)
2. Find a customer that was created from group roster
   - Look for customers with `sync_source = 'group_roster'`
3. Edit customer information (e.g., change phone number)
4. Save changes

### Expected Results:
- Changes propagate back to group roster data
- localStorage updated
- Database updated
- Calendar refreshes automatically
- Console log shows: "✅ 고객 → 그룹 역동기화 완료"

### Verification:
1. Go back to group roster manager
2. Find the same member in the group
3. Verify changes are reflected
4. Check console for sync messages

---

## Test 8: Conflict Resolution

### Setup:
1. Create a customer manually: "충돌테스트" / "CONFLICT TEST" / Passport: CONF12345
2. Create a group with same member but different phone number
3. Trigger sync

### Expected Behavior:
- ConflictResolver detects conflict
- Recent modification wins (time-based)
- If within 5 seconds → auto-merge
- If > 5 seconds apart → use newer data
- Console shows resolution: "Conflict resolved using: customer/member/merged"

---

## Test 9: Error Handling

### Test Invalid Data:
1. In `test-sync-ui.html`, modify the test to include invalid member:
```javascript
members: [{
    nameKor: '',  // Empty name
    nameEn: '',   // Empty name
    passportNo: '',  // Empty passport
    birthDate: 'invalid-date',
    phone: '123'  // Too short
}]
```

### Expected Results:
- Validation API catches errors
- Result dialog shows error count
- Error details list specific issues:
  - "이름(한글) 또는 이름(영문) 필수"
  - "여권번호 형식 오류"
  - "전화번호 형식 오류"
- Sync completes with partial success

---

## Test 10: UI Responsiveness

### What to Check:
- [ ] Dialogs are centered on screen
- [ ] Text is readable (good contrast)
- [ ] Buttons have hover effects
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts when dialogs appear
- [ ] Dialogs work on different screen sizes
- [ ] z-index is correct (dialogs on top)
- [ ] Scrolling works if content is long

### Browser Compatibility:
Test on:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

---

## Troubleshooting

### Issue: Modules Not Loading
**Symptoms:** Console shows "GroupSyncManager is not defined"

**Solutions:**
1. Check script order in HTML (sync modules must load before app.js)
2. Verify file paths are correct
3. Check for JavaScript syntax errors in modules
4. Clear browser cache and reload

### Issue: API Errors
**Symptoms:** Sync fails with "fetch failed" error

**Solutions:**
1. Verify backend server is running: `http://localhost:5000`
2. Check CORS settings (should allow localhost)
3. Check server logs for errors
4. Verify database is accessible

### Issue: CSS Not Applied
**Symptoms:** Dialogs have no styling

**Solutions:**
1. Check if `css/sync-ui.css` is loaded (Network tab in DevTools)
2. Verify CSS file path in HTML `<link>` tag
3. Check for CSS syntax errors
4. Clear browser cache

### Issue: Dialogs Don't Appear
**Symptoms:** Click buttons but nothing happens

**Solutions:**
1. Check console for JavaScript errors
2. Verify DOM elements aren't blocked by other elements
3. Check z-index values
4. Ensure no ad-blockers are interfering

---

## Success Criteria

✅ **All tests pass without errors**
✅ **Dialogs appear and function correctly**
✅ **Progress indicators animate smoothly**
✅ **API calls succeed and return expected data**
✅ **Database updates correctly**
✅ **Sync logs are created**
✅ **No JavaScript console errors**
✅ **UI is responsive and accessible**
✅ **Bi-directional sync works (group ↔ customer)**
✅ **Conflict resolution handles edge cases**

---

## Test Results Log

Date: _____________
Tester: _____________

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Module Loading | ⬜ PASS ⬜ FAIL | |
| 2 | Confirmation Dialog | ⬜ PASS ⬜ FAIL | |
| 3 | Progress Indicator | ⬜ PASS ⬜ FAIL | |
| 4 | Result Dialog | ⬜ PASS ⬜ FAIL | |
| 5 | Full Sync Flow | ⬜ PASS ⬜ FAIL | |
| 6 | Group Roster Integration | ⬜ PASS ⬜ FAIL | |
| 7 | Reverse Sync | ⬜ PASS ⬜ FAIL | |
| 8 | Conflict Resolution | ⬜ PASS ⬜ FAIL | |
| 9 | Error Handling | ⬜ PASS ⬜ FAIL | |
| 10 | UI Responsiveness | ⬜ PASS ⬜ FAIL | |

**Overall Result:** ⬜ PASS ⬜ FAIL

**Additional Notes:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## Quick Test Commands

```bash
# Start backend server
cd backend
node server.js

# Check synced data
node check-api-data.js

# Run sync API test
node test-sync.js

# Open test pages
start test-sync-ui.html
start "group-roster-manager-v2 (3).html"
```

---

## Contact & Support

For issues or questions:
- Check console logs (F12 → Console)
- Review server logs (backend/server.log)
- Check database state with check-api-data.js
- Review sync_logs table for sync history

**Documentation:**
- TRD.md: Technical specifications
- TASKS.md: Phase 6 implementation tasks
- This file: UI testing procedures
