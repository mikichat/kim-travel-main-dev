const { showToast, showConfirmModal } = window;
import { StorageManager } from './storage-manager.js';
import { sanitizeHtml } from '../../js/modules/ui.js';

/**
 * saved-flights.js
 * 저장된 항공편 관리 기능
 */

// 저장된 항공편 리스트 로드 및 표시
async function loadSavedFlights() {
  const flights = await StorageManager.getFlightList();
  const listContainer = document.getElementById('savedFlightsList');
  const noDataMessage = document.getElementById('noSavedFlights');

  // 리스트 초기화
  listContainer.innerHTML = '';

  // 기존 액션 버튼 영역 제거 (중복 방지)
  const existingActionBar = document.getElementById('flightActionBar');
  if (existingActionBar) {
    existingActionBar.remove();
  }

  if (flights.length === 0) {
    // 저장된 항공편이 없는 경우
    listContainer.classList.add('hidden');
    noDataMessage.classList.remove('hidden');

    // 가져오기 버튼 추가
    noDataMessage.innerHTML = `
            <i class="fas fa-inbox text-4xl mb-4" style="color: #cbd5e0;"></i>
            <p class="mb-4">저장된 항공편이 없습니다.</p>
            <div class="flex gap-2 justify-center">
                <button
                    onclick="document.getElementById('importFileInputEmpty').click()"
                    class="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                >
                    📥 백업 파일에서 가져오기
                </button>
                <input type="file" id="importFileInputEmpty" accept=".json" style="display:none" onchange="importFlightData(this.files[0])">
            </div>
        `;
    return;
  }

  // 저장된 항공편이 있는 경우
  listContainer.classList.remove('hidden');
  noDataMessage.classList.add('hidden');

  // 액션 버튼 영역 추가 (선택 삭제, 선택 통합, 내보내기/가져오기)
  const actionBar = document.createElement('div');
  actionBar.id = 'flightActionBar';
  actionBar.className =
    'mb-4 p-3 bg-gray-50 rounded-lg flex flex-wrap gap-2 items-center';
  actionBar.innerHTML = `
        <button
            onclick="toggleAllCheckboxes()"
            class="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors duration-200"
        >
            ☑️ 전체 선택
        </button>
        <button
            onclick="deleteSelectedFlights()"
            class="px-3 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
        >
            🗑️ 선택 삭제
        </button>
        <button
            onclick="mergeSelectedFlights()"
            class="px-3 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200"
        >
            🔗 선택 통합 (팀 합치기)
        </button>
        <div class="border-l border-gray-300 h-6 mx-2"></div>
        <button
            onclick="exportFlightData()"
            class="px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200"
        >
            📤 내보내기
        </button>
        <button
            onclick="document.getElementById('importFileInput').click()"
            class="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
        >
            📥 가져오기
        </button>
        <input type="file" id="importFileInput" accept=".json" style="display:none" onchange="importFlightData(this.files[0])">
        <span class="text-sm text-gray-500 ml-auto">총 ${flights.length}개의 항공편</span>
    `;
  listContainer.parentNode.insertBefore(actionBar, listContainer);

  // 각 항공편을 카드로 표시
  flights.forEach((flight) => {
    const card = createFlightCard(flight);
    listContainer.appendChild(card);
  });
}

// 전체 체크박스 토글
function toggleAllCheckboxes() {
  const checkboxes = document.querySelectorAll('.flight-checkbox');
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  checkboxes.forEach((cb) => (cb.checked = !allChecked));
}

// 데이터 내보내기
async function exportFlightData() {
  const result = await StorageManager.exportAllData();
  showToast(result.message, result.success ? 'success' : 'error');
}

// 데이터 가져오기
// eslint-disable-next-line no-unused-vars
async function importFlightData(file) {
  if (!file) return;

  const result = await StorageManager.importData(file);
  showToast(result.message, result.success ? 'success' : 'error');

  if (result.success) {
    // 리스트 새로고침
    loadSavedFlights();
  }

  // 파일 입력 초기화
  document.getElementById('importFileInput').value = '';
}

// 항공편 카드 생성
function createFlightCard(flight) {
  const card = document.createElement('div');
  card.className =
    'border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200';

  // 저장 날짜 포맷
  const saveDate = flight.saveDate
    ? new Date(flight.saveDate).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '날짜 정보 없음';

  // 항공편 정보 요약
  const flightSummary = getFlightSummary(flight);

  card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <!-- 체크박스 (선택 삭제/통합용) -->
            <div class="flex items-center mr-3">
                <input 
                    type="checkbox" 
                    class="flight-checkbox w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    value="${flight.id}"
                    title="선택"
                />
            </div>
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <h3 class="text-lg font-bold text-gray-800">${sanitizeHtml(flight.name || '이름 없음')}</h3>
                    ${flight.pnr ? `<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">${sanitizeHtml(flight.pnr)}</span>` : ''}
                </div>
                <p class="text-sm text-gray-500">저장일: ${saveDate}</p>
            </div>
            <button
                onclick="deleteSavedFlight('${flight.id}')"
                class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors duration-200"
                title="삭제"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </button>
        </div>

        <!-- 항공편 정보 -->
        <div class="mb-3 space-y-2">
            ${flightSummary}
        </div>

        <!-- 고객 정보 -->
        ${
          flight.customerInfo
            ? `
            <div class="text-sm text-gray-600 mb-3">
                <span class="font-semibold">고객:</span> ${sanitizeHtml(flight.customerInfo.name || '정보 없음')}
                ${flight.customerInfo.totalPeople ? ` (${sanitizeHtml(flight.customerInfo.totalPeople)}명)` : ''}
            </div>
        `
            : ''
        }

        <!-- 버튼들 -->
        <div class="flex gap-2 flex-wrap">
            <button
                onclick="loadFlightToConverter('${flight.id}')"
                class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                불러오기
            </button>
            <button
                onclick="viewFlightDetails('${flight.id}')"
                class="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                상세보기
            </button>
            <button
                onclick="openReservationPage('${flight.id}')"
                class="px-4 py-2 bg-brand-green hover:bg-green-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2"
                style="background-color: #00A67E;"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                예약내역
            </button>
        </div>
    `;

  return card;
}

// 항공편 정보 요약 생성
function getFlightSummary(flight) {
  if (!flight.flights || flight.flights.length === 0) {
    return '<p class="text-sm text-gray-500">항공편 정보 없음</p>';
  }

  let html = '';
  flight.flights.forEach((f, index) => {
    const segmentLabel =
      index === 0
        ? '출발'
        : index === flight.flights.length - 1
          ? '도착'
          : '경유';
    const bgColor =
      index === 0
        ? 'bg-blue-50 text-blue-700'
        : index === flight.flights.length - 1
          ? 'bg-green-50 text-green-700'
          : 'bg-yellow-50 text-yellow-700';

    html += `
            <div class="flex items-center gap-2 text-sm">
                <span class="px-2 py-1 ${bgColor} rounded text-xs font-semibold">${segmentLabel}</span>
                <span class="font-semibold">${f.flightNumber || 'N/A'}</span>
                <span class="text-gray-600">
                    ${f.departure?.airport || f.departure?.code || 'N/A'}
                    →
                    ${f.arrival?.airport || f.arrival?.code || 'N/A'}
                </span>
                <span class="text-gray-500">${f.date || ''}</span>
            </div>
        `;
  });

  return html;
}

// 항공편 삭제
async function deleteSavedFlight(flightId) {
  if (
    !(await showConfirmModal('항공편 삭제', '이 항공편을 삭제하시겠습니까?', {
      danger: true,
    }))
  ) {
    return;
  }

  const success = await StorageManager.deleteFlightById(flightId);
  if (success) {
    showToast('항공편이 삭제되었습니다.', 'success');
    loadSavedFlights();
  } else {
    showToast('삭제에 실패했습니다.', 'error');
  }
}

// ========================================
// 선택 삭제 기능 (Phase 2.1)
// ========================================

/**
 * 선택된 항공편들을 일괄 삭제
 */
async function deleteSelectedFlights() {
  const checkboxes = document.querySelectorAll('.flight-checkbox:checked');

  if (checkboxes.length === 0) {
    showToast('삭제할 항공편을 선택해주세요.', 'warning');
    return;
  }

  if (
    !(await showConfirmModal(
      '선택 삭제',
      `선택한 ${checkboxes.length}개의 항공편을 삭제하시겠습니까?`,
      { danger: true }
    ))
  ) {
    return;
  }

  let successCount = 0;
  for (const checkbox of checkboxes) {
    const flightId = checkbox.value;
    if (await StorageManager.deleteFlightById(flightId)) {
      successCount++;
    }
  }

  showToast(`${successCount}개의 항공편이 삭제되었습니다.`, 'success');
  loadSavedFlights(); // 리스트 새로고침
}

// ========================================
// 팀 통합 기능 (Phase 3)
// ========================================

/**
 * 선택된 여러 항공편을 하나로 통합
 */
async function mergeSelectedFlights() {
  const checkboxes = document.querySelectorAll('.flight-checkbox:checked');

  if (checkboxes.length < 2) {
    showToast('통합할 항공편을 2개 이상 선택해주세요.', 'warning');
    return;
  }

  // 선택된 항공편 데이터 수집
  const selectedFlights = [];
  for (const checkbox of checkboxes) {
    const flight = await StorageManager.getFlightById(checkbox.value);
    if (flight) {
      selectedFlights.push(flight);
    }
  }

  if (selectedFlights.length < 2) {
    showToast('유효한 항공편이 2개 미만입니다.', 'warning');
    return;
  }

  // 통합 데이터 생성
  const mergedFlight = {
    name: selectedFlights[0].name + ' (통합)',
    pnr: selectedFlights
      .map((f) => f.pnr)
      .filter(Boolean)
      .join(', '),
    flights: selectedFlights.flatMap((f) => f.flights || []),
    customerInfo: {
      name: selectedFlights
        .map((f) => f.customerInfo?.name)
        .filter(Boolean)
        .join(', '),
      phone: selectedFlights
        .map((f) => f.customerInfo?.phone)
        .filter(Boolean)
        .join(', '),
      totalPeople: selectedFlights
        .reduce((sum, f) => {
          const count = parseInt(f.customerInfo?.totalPeople) || 0;
          return sum + count;
        }, 0)
        .toString(),
      meetingPlace: selectedFlights[0].customerInfo?.meetingPlace || '',
      meetingTime: selectedFlights[0].customerInfo?.meetingTime || '',
    },
  };

  // 저장
  const result = StorageManager.saveFlightData(mergedFlight);
  if (result.success) {
    showToast(
      `${selectedFlights.length}개의 항공편이 통합되었습니다.`,
      'success'
    );
    loadSavedFlights();
  } else {
    showToast('통합 중 오류가 발생했습니다.', 'error');
  }
}

// 항공편을 변환기로 불러오기
async function loadFlightToConverter(flightId) {
  const flight = await StorageManager.getFlightById(flightId);

  if (!flight) {
    showToast('항공편 정보를 찾을 수 없습니다.', 'error');
    return;
  }

  // ========================================
  // 편집 모드 추적 (Phase 2.2)
  // ========================================
  // 전역 변수에 현재 편집 중인 항공편 ID 저장
  window.currentEditingFlightId = flightId;

  // 항공편 변환 탭으로 전환
  switchTab('converter');

  // 고객 정보 채우기
  if (flight.customerInfo) {
    document.getElementById('nameInput').value = flight.customerInfo.name || '';
    document.getElementById('phoneInput').value =
      flight.customerInfo.phone || '';
    document.getElementById('totalPeopleInput').value =
      flight.customerInfo.totalPeople || '';
  }

  // PNR 정보 채우기
  if (flight.pnr) {
    document.getElementById('showPnr').checked = true;
    document.getElementById('pnrInputWrapper').classList.remove('hidden');
    document.getElementById('pnrInput').value = flight.pnr;
  }

  // 원본 PNR 텍스트를 입력창에 채우기
  if (flight.originalPnrText) {
    const inputText = document.getElementById('inputText');
    if (inputText) {
      inputText.value = flight.originalPnrText;
    }
  }

  // 출력 섹션 표시
  const outputSection = document.getElementById('outputSection');
  outputSection.classList.remove('hidden');

  // 항공편 정보를 출력 영역에 표시
  displayFlightInfo(flight);

  // parsedFlights 전역 변수 업데이트 (저장 시 사용)
  // Note: main.js의 parsedFlights는 모듈 스코프이므로 window를 통해 공유
  if (flight.flights && flight.flights.length > 0) {
    // 저장된 형식을 parsedFlights 형식으로 변환
    window.parsedFlights = flight.flights.map((f) => ({
      flightNumber: f.flightNumber,
      date: f.date, // 이미 변환된 형식 (2025.11.14(금))
      departure: f.departure?.code || f.departure?.airport || '',
      arrival: f.arrival?.code || f.arrival?.airport || '',
      departureTime: f.departure?.time?.replace(':', '') || '',
      arrivalTime: f.arrival?.time?.replace(':', '') || '',
      arrivalDate: f.arrivalDate || f.arrival?.date || null,
    }));
  }

  showToast(
    '항공편 정보가 불러와졌습니다. 수정 후 저장하면 기존 항공편이 업데이트됩니다.',
    'info',
    4000
  );
}

// 항공편 정보 표시 (원본 변환기 형식과 동일하게)
function displayFlightInfo(flight) {
  const outputTextElement = document.querySelector('#outputText pre');

  if (!outputTextElement) {
    console.error('출력 요소를 찾을 수 없습니다.');
    return;
  }

  if (!flight.flights || flight.flights.length === 0) {
    outputTextElement.innerHTML =
      '<div style="color: #dc2626;">항공편 정보가 없습니다. 데이터를 확인해주세요.</div>';
    console.error('항공편 flights 배열이 비어있습니다:', flight);
    return;
  }

  let output = '';

  // 구간 라벨 결정
  const getSegmentLabel = (index, total) => {
    if (total === 1) return '출발';
    if (total === 2) return index === 0 ? '출발' : '도착';
    if (index === 0) return '출발';
    if (index === total - 1) return '도착';
    return '경유';
  };

  // PNR 정보가 있으면 상단에 표시
  if (flight.pnr) {
    output += `<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>`;
    output += `<div>📌 예약번호: ${sanitizeHtml(flight.pnr)}</div>`;
    output += `<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div><br>`;
  }

  // 항공편 정보 표시
  const getAirportName = window.getAirportName || ((code) => code);

  flight.flights.forEach((f, index) => {
    const label = getSegmentLabel(index, flight.flights.length);
    const depCode = f.departure?.code || f.departure?.airport || 'N/A';
    const arrCode = f.arrival?.code || f.arrival?.airport || 'N/A';
    const departureAirport = getAirportName(depCode);
    const arrivalAirport = getAirportName(arrCode);
    const departureTime = f.departure?.time || '';
    const arrivalTime = f.arrival?.time || '';
    const date = f.date || '';

    if (index > 0) output += '<br><br>';

    output += `<div>`;
    output += `<div>${sanitizeHtml(label)} : ${sanitizeHtml(date)} - ${sanitizeHtml(departureAirport)}: ${sanitizeHtml(departureTime)} - ${sanitizeHtml(arrivalAirport)}: ${sanitizeHtml(arrivalTime)} - ${sanitizeHtml(f.flightNumber)}</div>`;

    // 도착일 표시 (명시적으로 있고 출발일과 다른 경우만)
    const arrivalDate = f.arrival?.date || null;
    if (arrivalDate && arrivalDate !== (f.departure?.date || '')) {
      output += `<div style="color: #dc2626; font-weight: bold; margin-top: 4px; font-size: 0.875rem; text-align: right;">⚠️ [도착일: ${sanitizeHtml(arrivalDate)}]</div>`;
    }

    output += `</div>`;
  });

  // 고객 정보가 있으면 표시
  if (flight.customerInfo) {
    const ci = flight.customerInfo;
    if (
      ci.name ||
      ci.totalPeople ||
      ci.phone ||
      ci.meetingTime ||
      ci.meetingPlace
    ) {
      output += '<br><br><div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
      output +=
        '<div style="font-weight: bold; color: #1f2937;">📋 고객 정보</div>';
      output += '<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
      if (ci.name) output += `<div>👤 대표명: ${sanitizeHtml(ci.name)}</div>`;
      if (ci.totalPeople) output += `<div>👥 총인원: ${sanitizeHtml(ci.totalPeople)}</div>`;
      if (ci.phone) output += `<div>📞 전화번호: ${sanitizeHtml(ci.phone)}</div>`;
      if (ci.meetingTime)
        output += `<div>🕒 미팅 시간: ${sanitizeHtml(ci.meetingTime)}</div>`;
      if (ci.meetingPlace)
        output += `<div>📍 미팅 장소: ${sanitizeHtml(ci.meetingPlace)}</div>`;
      output += '<div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>';
    }
  }

  outputTextElement.innerHTML = output;
  outputTextElement.style.whiteSpace = 'normal';
}

// 예약내역 페이지 열기 (모바일 뷰)
async function openReservationPage(flightId) {
  const flight = await StorageManager.getFlightById(flightId);
  if (!flight) {
    showToast('항공편 정보를 찾을 수 없습니다.', 'error');
    return;
  }

  // 데이터를 reservation.html 형식으로 변환
  const reservationData = {
    pnr: flight.pnr || '-',
    name: flight.customerInfo?.name || flight.name || '-',
    phone: flight.customerInfo?.phone || '-',
    totalPeople: flight.customerInfo?.totalPeople
      ? `${flight.customerInfo.totalPeople}명`
      : '-',
    flights: (flight.flights || []).map((f) => ({
      flightNo: f.flightNumber || '-',
      departure: {
        airport: f.departure?.code || f.departure?.airport || '-',
        time: f.departure?.time || '-',
        date: f.date || f.departure?.date || '-',
      },
      arrival: {
        airport: f.arrival?.code || f.arrival?.airport || '-',
        time: f.arrival?.time || '-',
        date: f.arrivalDate || f.arrival?.date || f.date || '-',
        nextDay: f.arrival?.nextDay || false,
      },
    })),
    meetingTime: flight.customerInfo?.meetingTime || '',
    meetingPlace: flight.customerInfo?.meetingPlace || '',
    departureMeal: flight.customerInfo?.departureMeal || '',
    arrivalMeal: flight.customerInfo?.arrivalMeal || '',
    remarks: flight.customerInfo?.remarks || '',
  };

  // URL 파라미터로 데이터 전달
  const dataParam = encodeURIComponent(JSON.stringify(reservationData));
  const url = `reservation.html?id=${flightId}&data=${dataParam}`;

  // 새 창으로 열기 (모바일 크기)
  window.open(url, 'reservation', 'width=430,height=932,scrollbars=yes');
}

// 항공편 상세보기
async function viewFlightDetails(flightId) {
  const flight = await StorageManager.getFlightById(flightId);
  if (!flight) {
    showToast('항공편 정보를 찾을 수 없습니다.', 'error');
    return;
  }

  // 상세 정보를 모달로 표시 (sanitizeHtml로 XSS 방지)
  let detailHtml = `<div style="text-align:left;font-size:13px;line-height:1.8;">`;
  detailHtml += `<b>이름:</b> ${sanitizeHtml(flight.name || '정보 없음')}<br>`;
  detailHtml += `<b>PNR:</b> ${sanitizeHtml(flight.pnr || '정보 없음')}<br>`;
  detailHtml += `<b>저장일:</b> ${flight.saveDate ? sanitizeHtml(new Date(flight.saveDate).toLocaleString('ko-KR')) : '정보 없음'}<br>`;

  if (flight.customerInfo) {
    detailHtml += `<hr style="margin:8px 0;border-color:#e5e7eb;">`;
    detailHtml += `<b>고객:</b> ${sanitizeHtml(flight.customerInfo.name || '-')} / ${sanitizeHtml(flight.customerInfo.phone || '-')} / ${sanitizeHtml(String(flight.customerInfo.totalPeople || '-'))}명<br>`;
  }

  if (flight.flights && flight.flights.length > 0) {
    detailHtml += `<hr style="margin:8px 0;border-color:#e5e7eb;">`;
    detailHtml += `<b>항공편 (${flight.flights.length}구간)</b><br>`;
    flight.flights.forEach((f, index) => {
      const segmentLabel =
        index === 0
          ? '출발'
          : index === flight.flights.length - 1
            ? '도착'
            : '경유';
      detailHtml += `[${segmentLabel}] ${sanitizeHtml(f.flightNumber || 'N/A')} | ${sanitizeHtml(f.date || '')} | ${sanitizeHtml(f.departure?.airport || f.departure?.code || 'N/A')} ${sanitizeHtml(f.departure?.time || '')} → ${sanitizeHtml(f.arrival?.airport || f.arrival?.code || 'N/A')} ${sanitizeHtml(f.arrival?.time || '')}<br>`;
    });
  }
  detailHtml += `</div>`;

  showConfirmModal('항공편 상세 정보', detailHtml, {
    confirmText: '확인',
    showCancel: false,
  });
}

// 탭 전환 함수
function switchTab(tabName) {
  // 모든 탭 버튼에서 active 제거
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.remove('active');
  });

  // 모든 탭 콘텐츠 숨기기
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });

  // 선택된 탭 활성화
  const targetBtn = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
  const targetContent = document.getElementById(`tab-${tabName}`);

  if (targetBtn && targetContent) {
    targetBtn.classList.add('active');
    targetContent.classList.add('active');
  }
}

// Window assignments for onclick handlers in innerHTML
window.loadSavedFlights = loadSavedFlights;
window.toggleAllCheckboxes = toggleAllCheckboxes;
window.deleteSelectedFlights = deleteSelectedFlights;
window.mergeSelectedFlights = mergeSelectedFlights;
window.exportFlightData = exportFlightData;
window.deleteSavedFlight = deleteSavedFlight;
window.loadFlightToConverter = loadFlightToConverter;
window.viewFlightDetails = viewFlightDetails;
window.openReservationPage = openReservationPage;

export { loadSavedFlights };

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function () {
  // 새로고침 버튼
  const refreshBtn = document.getElementById('refreshSavedFlights');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadSavedFlights);
  }

  // 탭 버튼 클릭 이벤트 (index.html에서 이미 처리하므로 중복 제거)
  // 저장된 항공편 탭 진입 시 리스트 로드는 index.html의 탭 전환 로직에서 처리
});
