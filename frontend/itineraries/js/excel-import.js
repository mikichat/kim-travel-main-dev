/**
 * 엑셀 가져오기 모듈
 * tourworld1/landing의 excel-parser.service.ts 로직을 클라이언트 JS로 포팅
 * SheetJS (XLSX) CDN 필요
 */

const { showToast, showConfirmModal } = window;

// ── 유틸리티 ──

/** Excel 시간 숫자(0.5 = 12:00)를 HH:MM 문자열로 변환 */
function excelTimeToString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return (
      String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0')
    );
  }
  return String(value);
}

/** 식사 텍스트 파싱 (조:, 중:, 석: 패턴) */
function parseMealsFromText(text) {
  const meals = { breakfast: '', lunch: '', dinner: '' };
  if (!text) return meals;
  const lines = text.split(/[\r\n]+/);
  lines.forEach(function (line) {
    const trimmed = line.trim();
    if (trimmed.match(/^조/) && trimmed.includes(':')) {
      meals.breakfast = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.match(/^중/) && trimmed.includes(':')) {
      meals.lunch = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.match(/^석/) && trimmed.includes(':')) {
      meals.dinner = trimmed.split(':')[1]?.trim() || '';
    }
  });
  return meals;
}

// ── 엑셀 파싱 ──

/** 멀티시트 엑셀 파싱 (기본정보, 일정, 세부일정 시트) */
function parseMultiSheetExcel(workbook) {
  const rows = [];

  // 일정 시트에서 식사 정보 가져오기
  const mealsMap = {};
  const scheduleSheetName = workbook.SheetNames.find(function (name) {
    return (name === '일정' || name.includes('일정')) && !name.includes('세부');
  });

  if (scheduleSheetName) {
    const scheduleSheet = workbook.Sheets[scheduleSheetName];
    const scheduleData = XLSX.utils.sheet_to_json(scheduleSheet, { header: 1 });

    let headerIdx = 0;
    for (let i = 0; i < scheduleData.length; i++) {
      const row = scheduleData[i];
      if (
        row &&
        row.some(function (cell) {
          return String(cell).includes('일차') || String(cell).includes('조식');
        })
      ) {
        headerIdx = i;
        break;
      }
    }

    const headerRow = scheduleData[headerIdx] || [];
    let dayCol = -1,
      breakfastCol = -1,
      lunchCol = -1,
      dinnerCol = -1;
    headerRow.forEach(function (cell, idx) {
      const text = String(cell || '').toLowerCase();
      if (text.includes('일차')) dayCol = idx;
      if (text.includes('조식') || text === '조') breakfastCol = idx;
      if (text.includes('중식') || text === '중') lunchCol = idx;
      if (text.includes('석식') || text === '석') dinnerCol = idx;
    });

    for (let j = headerIdx + 1; j < scheduleData.length; j++) {
      const r = scheduleData[j];
      if (!r) continue;
      const dayNum = parseInt(String(r[dayCol] || ''), 10);
      if (!isNaN(dayNum)) {
        mealsMap[dayNum] = {
          breakfast: String(r[breakfastCol] || ''),
          lunch: String(r[lunchCol] || ''),
          dinner: String(r[dinnerCol] || ''),
        };
      }
    }
  }

  // 세부일정 시트 파싱
  const detailSheetName = workbook.SheetNames.find(function (name) {
    return name.includes('세부일정') || name.includes('세부');
  });

  if (detailSheetName) {
    const detailSheet = workbook.Sheets[detailSheetName];
    const detailData = XLSX.utils.sheet_to_json(detailSheet, { header: 1 });

    let dHeaderIdx = 0;
    for (let di = 0; di < detailData.length; di++) {
      const dRow = detailData[di];
      if (
        dRow &&
        dRow.some(function (cell) {
          return (
            String(cell).includes('일차') ||
            String(cell).includes('시간') ||
            String(cell).includes('세부')
          );
        })
      ) {
        dHeaderIdx = di;
        break;
      }
    }

    const dHeaderRow = detailData[dHeaderIdx] || [];
    const colMap = {
      day: 0,
      order: 1,
      region: 2,
      transport: 3,
      time: 4,
      activity: 5,
    };
    dHeaderRow.forEach(function (cell, idx) {
      const text = String(cell || '').toLowerCase();
      if (text.includes('일차')) colMap.day = idx;
      if (text.includes('순서')) colMap.order = idx;
      if (text.includes('지역') || text.includes('장소')) colMap.region = idx;
      if (text.includes('교통')) colMap.transport = idx;
      if (text.includes('시간')) colMap.time = idx;
      if (
        text.includes('세부') ||
        text.includes('일정') ||
        text.includes('내용')
      )
        colMap.activity = idx;
    });

    for (let dj = dHeaderIdx + 1; dj < detailData.length; dj++) {
      const dr = detailData[dj];
      if (
        !dr ||
        !dr.some(function (cell) {
          return cell;
        })
      )
        continue;
      const dn = parseInt(String(dr[colMap.day] || ''), 10);
      if (isNaN(dn)) continue;
      const meals = mealsMap[dn] || { breakfast: '', lunch: '', dinner: '' };
      rows.push({
        dayNumber: dn,
        time: excelTimeToString(dr[colMap.time]),
        location: String(dr[colMap.region] || ''),
        transport: String(dr[colMap.transport] || ''),
        activity: String(dr[colMap.activity] || ''),
        meals: meals,
      });
    }
  } else {
    // 세부일정 시트가 없으면 첫 번째 시트로 폴백
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    return parseSingleSheetSchedule(jsonData);
  }

  return rows;
}

/** 단일 시트 일정 파싱 (병합 셀 지원) */
function parseSingleSheetSchedule(jsonData) {
  const rows = [];
  let currentDay = 0;
  let currentLocation = '';
  let currentTransport = '';
  let currentMeals = { breakfast: '', lunch: '', dinner: '' };
  let headerRowIndex = -1;

  // 헤더 행 찾기
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row) continue;
    const rowText = row.join(' ').toLowerCase();
    if (
      rowText.includes('시간') ||
      rowText.includes('장소') ||
      rowText.includes('교통') ||
      rowText.includes('일정') ||
      rowText.includes('날짜') ||
      rowText.includes('세부')
    ) {
      headerRowIndex = i;
      break;
    }
  }

  // 컬럼 인덱스 매핑
  const colMap = {
    day: -1,
    time: -1,
    location: -1,
    transport: -1,
    activity: -1,
    meals: -1,
  };

  if (headerRowIndex >= 0) {
    const headerRow = jsonData[headerRowIndex];
    headerRow.forEach(function (cell, idx) {
      const cellText = String(cell || '').toLowerCase();
      if (
        cellText.includes('일차') ||
        cellText.includes('day') ||
        cellText.includes('날짜')
      )
        colMap.day = idx;
      if (cellText.includes('시간')) colMap.time = idx;
      if (cellText.includes('장소') || cellText.includes('지역'))
        colMap.location = idx;
      if (cellText.includes('교통')) colMap.transport = idx;
      if (
        cellText.includes('일정') ||
        cellText.includes('내용') ||
        cellText.includes('세부')
      )
        colMap.activity = idx;
      if (cellText.includes('식사')) colMap.meals = idx;
    });
  }

  // 데이터 행 파싱
  for (let j = headerRowIndex + 1; j < jsonData.length; j++) {
    const r = jsonData[j];
    if (!r || r.length === 0) continue;
    const hasContent = r.some(function (cell) {
      return cell && String(cell).trim();
    });
    if (!hasContent) continue;

    // 일차 감지
    const firstCell = String(r[colMap.day >= 0 ? colMap.day : 0] || '');
    const dayMatch = firstCell.match(
      /제\s*(\d+)\s*일|day\s*(\d+)|(\d+)\s*일차/i
    );
    if (dayMatch) {
      currentDay = parseInt(dayMatch[1] || dayMatch[2] || dayMatch[3], 10);
    }

    // 장소 업데이트 (병합 셀 처리)
    const locationCell = r[colMap.location >= 0 ? colMap.location : 1];
    if (locationCell) currentLocation = String(locationCell).trim();

    // 교통편 업데이트
    const transportCell = r[colMap.transport >= 0 ? colMap.transport : 2];
    if (transportCell) currentTransport = String(transportCell).trim();

    // 식사 정보
    const mealsCell = r[colMap.meals >= 0 ? colMap.meals : -1];
    if (mealsCell) currentMeals = parseMealsFromText(String(mealsCell));

    // 세부일정 텍스트
    const activityText = String(
      r[colMap.activity >= 0 ? colMap.activity : 4] || ''
    ).trim();

    // 시간 파싱
    const timeValue = r[colMap.time >= 0 ? colMap.time : 3];
    const timeStr = excelTimeToString(timeValue);

    if (currentDay === 0) currentDay = 1;

    if (activityText) {
      rows.push({
        dayNumber: currentDay,
        time: timeStr,
        location: currentLocation,
        transport: currentTransport,
        activity: activityText,
        meals: {
          breakfast: currentMeals.breakfast,
          lunch: currentMeals.lunch,
          dinner: currentMeals.dinner,
        },
      });
    }
  }

  return rows;
}

/** 파싱된 rows를 일차별로 그룹화하여 폼에 맞는 구조로 변환 */
function groupByDay(rows) {
  const daysMap = {};

  rows.forEach(function (row) {
    if (!daysMap[row.dayNumber]) {
      daysMap[row.dayNumber] = {
        dayNumber: row.dayNumber,
        region: row.location || '',
        activities: [],
        meals: { breakfast: '', lunch: '', dinner: '' },
        hotel: '',
      };
    }

    const day = daysMap[row.dayNumber];

    // 호텔 정보 감지
    if (
      row.activity.includes('호텔') ||
      row.activity.includes('HOTEL') ||
      row.activity.includes('숙박')
    ) {
      if (row.location && !day.hotel) {
        day.hotel = row.location;
      }
    }

    // 식사 정보 업데이트
    if (row.meals) {
      if (row.meals.breakfast) day.meals.breakfast = row.meals.breakfast;
      if (row.meals.lunch) day.meals.lunch = row.meals.lunch;
      if (row.meals.dinner) day.meals.dinner = row.meals.dinner;
    }

    // 활동 추가
    const timePrefix = row.time ? row.time + ' ' : '';
    day.activities.push(timePrefix + row.activity);

    if (!day.region && row.location) day.region = row.location;
  });

  // 정렬된 배열 반환
  return Object.keys(daysMap)
    .map(Number)
    .sort(function (a, b) {
      return a - b;
    })
    .map(function (key) {
      return daysMap[key];
    });
}

// ── 폼 매핑 ──

/** 그룹화된 일정 데이터를 travel-simple.html 폼에 입력 */
function fillScheduleForm(days) {
  const container = document.getElementById('scheduleContainer');
  if (!container) return;

  const template = container.querySelector('.schedule-item');
  if (!template) return;

  // 기존 일정 비우기
  container.innerHTML = '';

  // 시작일로부터 날짜 계산
  const startDateEl = document.getElementById('startDate');
  const startDate =
    startDateEl && startDateEl.value ? new Date(startDateEl.value) : null;
  const oneDayMs = 24 * 60 * 60 * 1000;

  days.forEach(function (day, index) {
    const item = template.cloneNode(true);

    // 입력 초기화
    item.querySelectorAll('input, textarea').forEach(function (el) {
      el.value = '';
    });

    // 번호 배지 업데이트
    const badge = item.querySelector('.bg-gradient-to-r.from-green-500');
    if (badge) badge.textContent = String(index + 1);

    // Day 입력
    const dayEl = item.querySelector('.schedule-day');
    if (dayEl) dayEl.value = 'Day ' + day.dayNumber;

    // 날짜 입력 (시작일 기준 계산)
    const dateEl = item.querySelector('.schedule-date');
    if (dateEl && startDate) {
      const d = new Date(startDate.getTime() + (day.dayNumber - 1) * oneDayMs);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateEl.value = yyyy + '-' + mm + '-' + dd;
    }

    // 일정 제목 (지역명)
    const titleEl = item.querySelector('.schedule-title');
    if (titleEl) titleEl.value = day.region || '';

    // 세부 일정 (활동 목록)
    const detailEl = item.querySelector('.schedule-detail');
    if (detailEl) detailEl.value = day.activities.join('\n');

    // 숙소
    const hotelEl = item.querySelector('.schedule-hotel');
    if (hotelEl) hotelEl.value = day.hotel || '';

    // 식사
    const mealEl = item.querySelector('.schedule-meal');
    if (mealEl) {
      const mealParts = [];
      if (day.meals.breakfast) mealParts.push('조식 ' + day.meals.breakfast);
      if (day.meals.lunch) mealParts.push('중식 ' + day.meals.lunch);
      if (day.meals.dinner) mealParts.push('석식 ' + day.meals.dinner);
      mealEl.value = mealParts.join('\n');
    }

    // 이미지 프리뷰 초기화 & 이벤트 바인딩
    const previewWrap = item.querySelector('.schedule-image-preview');
    const previewImg = previewWrap ? previewWrap.querySelector('img') : null;
    const imageInput = item.querySelector('.schedule-image');
    const removeBtn = item.querySelector('.remove-schedule-image');

    if (previewWrap) previewWrap.classList.add('hidden');
    if (previewImg) previewImg.src = '';

    if (imageInput && previewWrap && previewImg) {
      imageInput.addEventListener('change', function () {
        if (imageInput.files && imageInput.files[0]) {
          previewImg.src = URL.createObjectURL(imageInput.files[0]);
          previewWrap.classList.remove('hidden');
        } else {
          previewImg.src = '';
          previewWrap.classList.add('hidden');
        }
      });
    }
    if (removeBtn && imageInput && previewWrap && previewImg) {
      removeBtn.addEventListener('click', function () {
        imageInput.value = '';
        previewImg.src = '';
        previewWrap.classList.add('hidden');
      });
    }

    container.appendChild(item);
  });

  // 삭제 버튼 재바인딩
  container.querySelectorAll('.remove-schedule').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (container.querySelectorAll('.schedule-item').length > 1) {
        btn.closest('.schedule-item').remove();
      }
    });
  });
}

// ── 메인 로직 ──

/** 엑셀 파일을 읽고 파싱하여 폼에 입력 */
function handleExcelFile(file) {
  if (!window.XLSX) {
    showToast('SheetJS 라이브러리가 로드되지 않았습니다.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // 멀티시트 여부 확인
      const hasMultiSheet = workbook.SheetNames.some(function (name) {
        return (
          name.includes('세부일정') ||
          name.includes('일정') ||
          name.includes('기본정보')
        );
      });

      let rows;
      if (hasMultiSheet) {
        rows = parseMultiSheetExcel(workbook);
      } else {
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        rows = parseSingleSheetSchedule(jsonData);
      }

      if (rows.length === 0) {
        showToast('엑셀 파일에서 일정을 찾을 수 없습니다.', 'warning', 4000);
        return;
      }

      // 일차별 그룹화
      const days = groupByDay(rows);

      // 기존 일정이 있으면 확인
      const container = document.getElementById('scheduleContainer');
      const hasExisting =
        container &&
        Array.from(container.querySelectorAll('.schedule-item')).some(
          function (item) {
            return Array.from(
              item.querySelectorAll('input[type="text"], textarea')
            ).some(function (el) {
              return !!(el.value || '').trim();
            });
          }
        );

      if (hasExisting) {
        if (
          !(await showConfirmModal(
            '엑셀 가져오기',
            '기존 일정이 초기화됩니다. 계속하시겠습니까?',
            { danger: true }
          ))
        )
          return;
      }

      // 폼에 입력
      fillScheduleForm(days);

      showToast(
        days.length + '일 일정이 입력되었습니다. (활동 ' + rows.length + '개)',
        'success',
        4000
      );

      // 미리보기 업데이트
      if (typeof updatePreview === 'function') {
        updatePreview();
      }
    } catch (err) {
      showToast(
        '엑셀 파일 처리 중 오류가 발생했습니다: ' + err.message,
        'error'
      );
    }
  };

  reader.readAsArrayBuffer(file);
}

// ── 이벤트 바인딩 ──

document.addEventListener('DOMContentLoaded', function () {
  const importBtn = document.getElementById('excelImportBtn');
  const fileInput = document.getElementById('excelFileInput');

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        handleExcelFile(fileInput.files[0]);
        fileInput.value = ''; // 같은 파일 재선택 가능
      }
    });
  }
});

// 전역 접근용
window.excelImport = {
  handleFile: handleExcelFile,
  parseMultiSheet: parseMultiSheetExcel,
  parseSingleSheet: parseSingleSheetSchedule,
  groupByDay: groupByDay,
};
