// flight-schedule-app.js
// Extracted from inline <script> in flight-schedule.html
// Flight schedule CRUD, PNR parsing, event listeners, sync functionality

const { showToast, showConfirmModal } = window;
import { sanitizeHtml } from './modules/ui.js';
const { AirportDatabase } = window;
const { FlightSyncManager } = window;

let flights = [];
let filteredFlights = [];
let _alarmIntervalId = null;
let _expiredIntervalId = null;

// 페이지 로드
document.addEventListener('DOMContentLoaded', function () {
  loadFlights();
  setupEventListeners();
  setupSyncListener(); // 실시간 동기화 리스너 추가
  checkExpiredFlights(); // 만료된 스케줄 확인
});

// 만료된 항공 스케줄 확인 및 정리
async function checkExpiredFlights() {
  try {
    const response = await fetch('/api/flight-schedules/expired/count');
    if (!response.ok) return;

    const { count } = await response.json();
    if (count > 0) {
      const cleanup = await showConfirmModal(
        '만료된 스케줄 정리',
        `도착일이 지난 항공 스케줄이 ${count}개 있습니다. 관련 데이터(인보이스, 일정표, 원가계산)와 함께 삭제하시겠습니까?`,
        { danger: true }
      );

      if (cleanup) {
        await cleanupExpiredFlights();
      }
    }
  } catch (error) {
    console.error('만료된 스케줄 확인 오류:', error);
  }
}

// 만료된 스케줄 정리 실행
async function cleanupExpiredFlights() {
  try {
    const response = await fetch('/api/flight-schedules/cleanup/expired', {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('정리 실패');
    }

    const result = await response.json();
    showToast(
      `정리 완료! 스케줄 ${result.deleted.flightSchedules}개, 인보이스 ${result.deleted.invoices}개, 일정 ${result.deleted.schedules}개 삭제`,
      'success',
      5000
    );

    loadFlights(); // 목록 새로고침
  } catch (error) {
    showToast('만료된 스케줄 정리 중 오류가 발생했습니다.', 'error');
  }
}

function setupEventListeners() {
  // 검색
  document
    .getElementById('searchInput')
    .addEventListener('input', filterFlights);
  document
    .getElementById('airlineFilter')
    .addEventListener('change', filterFlights);
  document
    .getElementById('statusFilter')
    .addEventListener('change', filterFlights);
  document
    .getElementById('dateFilter')
    .addEventListener('change', filterFlights);

  // 폼 제출
  document
    .getElementById('flightForm')
    .addEventListener('submit', async function (e) {
      e.preventDefault();
      await saveFlight();
    });
}

// 실시간 동기화 리스너 설정
function setupSyncListener() {
  FlightSyncManager.onFlightChange((eventType, _flightId) => {
    // 알림 표시
    const message =
      eventType === 'add'
        ? '새 항공편이 추가되었습니다.'
        : eventType === 'update'
          ? '항공편이 수정되었습니다.'
          : eventType === 'delete'
            ? '항공편이 삭제되었습니다.'
            : '항공편 데이터가 변경되었습니다.';

    // 브라우저 알림
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('항공 스케줄 업데이트', {
        body: message,
        icon: '✈️',
      });
    }

    // 목록 새로고침
    loadFlights();
  });
}

async function loadFlights() {
  try {
    const flightSaves = await FlightSyncManager.getFlights();

    // flight_saves_v2 형식 -> schedule 형식으로 변환
    flights = [];
    flightSaves.forEach((flightSave) => {
      const schedules = FlightSyncManager.convertToScheduleFormat(flightSave);
      flights = flights.concat(schedules);
    });

    document.getElementById('loading').style.display = 'none';

    if (flights.length === 0) {
      document.getElementById('noData').style.display = 'block';
      return;
    }

    // 항공사 필터 옵션 추가
    const airlines = [...new Set(flights.map((f) => f.airline))];
    const airlineFilter = document.getElementById('airlineFilter');
    airlines.forEach((airline) => {
      const option = document.createElement('option');
      option.value = airline;
      option.textContent = airline;
      airlineFilter.appendChild(option);
    });

    filteredFlights = [...flights];
    renderFlights();
    document.getElementById('tableContainer').style.display = 'block';

    // 알람 체크 시작 (기존 인터벌 정리 후 재시작)
    if (_alarmIntervalId) clearInterval(_alarmIntervalId);
    if (_expiredIntervalId) clearInterval(_expiredIntervalId);
    checkAlarms();
    _alarmIntervalId = setInterval(checkAlarms, 60000);

    // 만료된 항공편 삭제 (async — 실패해도 무시)
    deleteExpiredFlights().catch(e => console.warn('만료 항공편 삭제 실패:', e));
    _expiredIntervalId = setInterval(() => {
      deleteExpiredFlights().catch(e => console.warn('만료 항공편 삭제 실패:', e));
    }, 60 * 60 * 1000);

    // URL 파라미터 확인하고 자동으로 편집 모달 열기
    checkAutoEditFlight();
  } catch (error) {
    console.error('항공 스케줄 로드 오류:', error);
    document.getElementById('loading').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <p>항공 스케줄을 불러오는 중 오류가 발생했습니다.</p>
            </div>
        `;
  }
}

// 한국 공항 코드 확인 함수 (AirportDatabase 사용)
function isKoreanAirport(airportStr) {
  // "인천 (ICN)" 형식에서 공항 코드 추출
  const match = airportStr.match(/\(([A-Z]{3})\)/);
  const code = match ? match[1] : airportStr;
  return AirportDatabase.isKoreanAirport(code);
}

// ========================================
// 동일 스케줄 통합 함수 (2단계 통합)
// 1단계: PNR 기준으로 묶기 (왕복/다구간 처리)
// 2단계: 동일한 스케줄(구간 구성)을 가진 예약끼리 묶기 (팀 통합)
// ========================================
function mergeDuplicateSchedules(flights) {
  // ========================================
  // 1단계: PNR/그룹명 기준 통합
  // - PNR이 있으면 같은 PNR끼리 묶기 (왕복/다구간)
  // - PNR이 없고 그룹명이 있으면 같은 그룹끼리 묶기 (왕복편 통합)
  // ========================================
  const pnrMap = new Map();

  flights.forEach((flight) => {
    // 동일 예약 판단 키:
    // 1. PNR이 있으면 PNR 사용 (같은 PNR은 하나의 예약)
    // 2. PNR이 없고 그룹명이 있으면 그룹명 사용 (같은 그룹의 왕복편 통합)
    // 3. 둘 다 없으면 항공편 정보로 구분
    const key = flight.pnr
      ? `PNR:${flight.pnr}`
      : flight.groupName
        ? `GROUP:${flight.groupName}`
        : `FLIGHT:${flight.flightNumber}_${flight.departureDate}_${flight.departure}_${flight.arrival}`;

    if (pnrMap.has(key)) {
      // 이미 같은 PNR의 항공편이 있으면 segments에 추가
      const existing = pnrMap.get(key);

      // 항공편 구간 추가 (segments 배열에)
      existing.segments.push({
        id: flight.id,
        flightNumber: flight.flightNumber,
        departure: flight.departure,
        arrival: flight.arrival,
        departureDate: flight.departureDate,
        arrivalDate: flight.arrivalDate,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        segmentType: flight.segmentType,
        segmentOrder: flight.segmentOrder,
      });

      // 그룹명 병합
      if (
        flight.groupName &&
        !existing.allGroupNames.includes(flight.groupName)
      ) {
        existing.allGroupNames.push(flight.groupName);
        existing.groupName = existing.allGroupNames.join(', ');
      }

      // 승객 목록 병합
      if (flight.passengers && Array.isArray(flight.passengers)) {
        flight.passengers.forEach((p) => {
          const pName = typeof p === 'object' ? p.name : p;
          if (
            !existing.passengers.some(
              (ep) => (typeof ep === 'object' ? ep.name : ep) === pName
            )
          ) {
            existing.passengers.push(p);
          }
        });
      }

      // sourceId 배열에 추가
      if (
        flight.sourceId &&
        !existing.mergedSourceIds.includes(flight.sourceId)
      ) {
        existing.mergedSourceIds.push(flight.sourceId);
      }
    } else {
      // 새 예약 등록
      const mergedFlight = { ...flight };
      mergedFlight.allGroupNames = flight.groupName ? [flight.groupName] : [];
      mergedFlight.allPnrs = flight.pnr ? [flight.pnr] : [];
      mergedFlight.passengers = flight.passengers ? [...flight.passengers] : [];
      mergedFlight.mergedSourceIds = flight.sourceId ? [flight.sourceId] : [];
      // segments 배열로 여러 구간 저장
      mergedFlight.segments = [
        {
          id: flight.id,
          flightNumber: flight.flightNumber,
          departure: flight.departure,
          arrival: flight.arrival,
          departureDate: flight.departureDate,
          arrivalDate: flight.arrivalDate,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          segmentType: flight.segmentType,
          segmentOrder: flight.segmentOrder,
        },
      ];
      pnrMap.set(key, mergedFlight);
    }
  });

  // 구간별 정렬 (segmentOrder 또는 날짜 순)
  pnrMap.forEach((flight) => {
    if (flight.segments && flight.segments.length > 1) {
      flight.segments.sort(
        (a, b) => (a.segmentOrder || 0) - (b.segmentOrder || 0)
      );
    }
  });

  const pnrMergedFlights = Array.from(pnrMap.values());

  // ========================================
  // 2단계: 스케줄 기준 통합 (동일한 구간 구성을 가진 예약끼리 묶기)
  // ========================================
  const scheduleMap = new Map();

  pnrMergedFlights.forEach((flight) => {
    // 스케줄 키 생성: 모든 구간의 (항공편번호+날짜+경로)를 정렬하여 결합
    const scheduleKey = flight.segments
      .map(
        (seg) =>
          `${seg.flightNumber}|${seg.departureDate}|${seg.departure}|${seg.arrival}|${seg.departureTime}`
      )
      .sort()
      .join('::');

    if (scheduleMap.has(scheduleKey)) {
      // 이미 같은 스케줄이 있으면 병합
      const existing = scheduleMap.get(scheduleKey);

      // PNR 병합 (여러 PNR을 쉼표로 연결)
      if (flight.pnr && !existing.allPnrs.includes(flight.pnr)) {
        existing.allPnrs.push(flight.pnr);
        existing.pnr = existing.allPnrs.filter((p) => p).join(', ');
      }

      // 그룹명 병합 (여러 단체명을 쉼표로 연결)
      if (flight.groupName) {
        const newGroups = flight.allGroupNames || [flight.groupName];
        newGroups.forEach((gname) => {
          if (gname && !existing.allGroupNames.includes(gname)) {
            existing.allGroupNames.push(gname);
          }
        });
        existing.groupName = existing.allGroupNames.join(', ');
      }

      // 승객 목록 병합
      if (flight.passengers && Array.isArray(flight.passengers)) {
        flight.passengers.forEach((p) => {
          const pName = typeof p === 'object' ? p.name : p;
          if (
            !existing.passengers.some(
              (ep) => (typeof ep === 'object' ? ep.name : ep) === pName
            )
          ) {
            existing.passengers.push(p);
          }
        });
      }

      // sourceId 배열에 추가
      if (flight.mergedSourceIds && Array.isArray(flight.mergedSourceIds)) {
        flight.mergedSourceIds.forEach((sid) => {
          if (sid && !existing.mergedSourceIds.includes(sid)) {
            existing.mergedSourceIds.push(sid);
          }
        });
      }
    } else {
      // 새로운 스케줄 등록
      scheduleMap.set(scheduleKey, flight);
    }
  });

  return Array.from(scheduleMap.values());
}

function renderFlights() {
  const tbody = document.getElementById('flightTableBody');
  tbody.innerHTML = '';

  if (filteredFlights.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="13" class="no-data">검색 결과가 없습니다.</td></tr>';
    return;
  }

  // ========================================
  // 동일 PNR 통합 (같은 예약번호는 하나로 표시)
  // ========================================
  const mergedFlights = mergeDuplicateSchedules(filteredFlights);

  const processedIds = new Set();

  // 통합된 항공편 목록으로 렌더링
  mergedFlights.forEach((flight) => {
    // 이미 처리된 항공편 스킵
    if (processedIds.has(flight.id)) {
      return;
    }

    // segments 배열 사용 (PNR 기준 통합된 구간들)
    const segments = flight.segments || [
      {
        id: flight.id,
        flightNumber: flight.flightNumber,
        departure: flight.departure,
        arrival: flight.arrival,
        departureDate: flight.departureDate,
        arrivalDate: flight.arrivalDate,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        segmentType: flight.segmentType,
      },
    ];

    const rowspan = segments.length;
    const passengerCount =
      flight.passengers && Array.isArray(flight.passengers)
        ? flight.passengers.length
        : 0;
    const passengerDisplay = passengerCount > 0 ? `${passengerCount}명` : '';
    // passengers가 객체 배열인 경우 name 속성 추출
    const passengerTitle =
      flight.passengers && Array.isArray(flight.passengers)
        ? flight.passengers
            .map((p) => (typeof p === 'object' ? p.name : p))
            .join(', ')
        : '';

    // 각 항공편 행 추가
    segments.forEach((segmentFlight, index) => {
      const row = document.createElement('tr');
      // data-id는 원래 flight id (통합된 경우 첫번째 id 또는 segment id)
      row.dataset.id = segmentFlight.id;

      // 도착지가 한국 공항이면 '도착'으로 변경
      let actualSegmentType = segmentFlight.segmentType;
      if (segmentFlight.arrival && isKoreanAirport(segmentFlight.arrival)) {
        actualSegmentType = '도착';
      }

      // 구분 색상
      let segmentColor, segmentBgColor, segmentText;
      if (actualSegmentType === '출발') {
        segmentBgColor = '#dbeafe';
        segmentColor = '#1e40af';
        segmentText = '출발';
      } else if (actualSegmentType === '경유') {
        segmentBgColor = '#fef3c7';
        segmentColor = '#92400e';
        segmentText = '경유';
      } else {
        segmentBgColor = '#dcfce7';
        segmentColor = '#166534';
        segmentText = '도착';
      }

      // 출발 여부 체크
      const isDeparted = checkIfDeparted(segmentFlight);
      if (isDeparted) {
        row.classList.add('departed-flight');
      }

      const alarmIcon = getAlarmIcon(segmentFlight);

      if (index === 0) {
        // 첫 번째 행: 체크박스, 그룹명, PNR, 탑승자, 작업 버튼 포함
        row.innerHTML = `
                        <td class="checkbox-cell" rowspan="${rowspan}" style="vertical-align: middle;">
                            <input type="checkbox" class="flight-checkbox" data-id="${segmentFlight.id}" onchange="updateSelectedCount()">
                        </td>
                        <td rowspan="${rowspan}" style="vertical-align: middle;">${sanitizeHtml(flight.groupName || '')}</td>
                        <td rowspan="${rowspan}" style="vertical-align: middle;">${sanitizeHtml(flight.pnr || '')}</td>
                        <td rowspan="${rowspan}" style="vertical-align: middle; cursor: pointer;" onclick="showPassengers('${segmentFlight.id}')" title="${sanitizeHtml(passengerTitle)}">${sanitizeHtml(passengerDisplay)}</td>
                        <td style="background: ${segmentBgColor}; color: ${segmentColor}; font-weight: 600;">${segmentText}</td>
                        <td><span class="flight-number">${sanitizeHtml(segmentFlight.flightNumber)}</span>${alarmIcon}</td>
                        <td>${sanitizeHtml(segmentFlight.departure)}</td>
                        <td>${formatDate(segmentFlight.departureDate)}</td>
                        <td class="time-cell">${segmentFlight.departureTime}</td>
                        <td>${sanitizeHtml(segmentFlight.arrival)}</td>
                        <td>${formatDate(segmentFlight.arrivalDate)}</td>
                        <td class="time-cell">${segmentFlight.arrivalTime}</td>
                        <td rowspan="${rowspan}" style="vertical-align: middle;">
                            <button class="btn btn-secondary" style="padding: 0.5rem 1rem;" onclick="editFlight('${segmentFlight.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    `;
      } else {
        // 나머지 행: 항공편 정보만
        row.innerHTML = `
                        <td style="background: ${segmentBgColor}; color: ${segmentColor}; font-weight: 600;">${segmentText}</td>
                        <td><span class="flight-number">${segmentFlight.flightNumber}</span>${alarmIcon}</td>
                        <td>${segmentFlight.departure}</td>
                        <td>${formatDate(segmentFlight.departureDate)}</td>
                        <td class="time-cell">${segmentFlight.departureTime}</td>
                        <td>${segmentFlight.arrival}</td>
                        <td>${formatDate(segmentFlight.arrivalDate)}</td>
                        <td class="time-cell">${segmentFlight.arrivalTime}</td>
                    `;
      }

      tbody.appendChild(row);
      processedIds.add(segmentFlight.id);
    });
  });

  updateSelectedCount();
}

function filterFlights() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const airlineFilter = document.getElementById('airlineFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  const dateFilter = document.getElementById('dateFilter').value;

  filteredFlights = flights.filter((flight) => {
    const matchesSearch =
      !searchTerm ||
      flight.flightNumber.toLowerCase().includes(searchTerm) ||
      flight.airline.toLowerCase().includes(searchTerm) ||
      flight.departure.toLowerCase().includes(searchTerm) ||
      flight.arrival.toLowerCase().includes(searchTerm);

    const matchesAirline = !airlineFilter || flight.airline === airlineFilter;
    const matchesStatus = !statusFilter || flight.status === statusFilter;
    const matchesDate = !dateFilter || flight.departureDate === dateFilter;

    return matchesSearch && matchesAirline && matchesStatus && matchesDate;
  });

  renderFlights();
}

function selectAll() {
  const checkboxes = document.querySelectorAll('.flight-checkbox');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);

  checkboxes.forEach((cb) => {
    cb.checked = !allChecked;
    const row = cb.closest('tr');
    if (cb.checked) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });

  selectAllCheckbox.checked = !allChecked;
  updateSelectedCount();
}

function updateSelectedCount() {
  const checkboxes = document.querySelectorAll('.flight-checkbox:checked');
  document.getElementById('selectedCount').textContent = checkboxes.length;

  // 체크된 행 하이라이트
  document.querySelectorAll('.flight-checkbox').forEach((cb) => {
    const row = cb.closest('tr');
    if (cb.checked) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });
}

function getSelectedFlights() {
  const checkboxes = document.querySelectorAll('.flight-checkbox:checked');
  return Array.from(checkboxes)
    .map((cb) => {
      const id = cb.dataset.id; // String ID 그대로 사용 (parseInt 제거)
      return flights.find((f) => f.id === id);
    })
    .filter((f) => f !== undefined); // undefined 필터링 추가
}

async function deleteSelected() {
  const selected = getSelectedFlights();
  if (selected.length === 0) {
    showToast('삭제할 항공편을 선택해주세요.', 'warning');
    return;
  }

  if (
    !(await showConfirmModal(
      '항공편 삭제',
      `선택한 ${selected.length}개의 항목을 삭제하시겠습니까? (원본 항공편이 삭제됩니다.)`,
      { danger: true }
    ))
  ) {
    return;
  }

  try {
    // Unique sourceIds 추출 (일정은 여러개일 수 있지만 원본은 하나)
    const sourceIds = [
      ...new Set(selected.map((f) => f.sourceId).filter(Boolean)),
    ];

    // FlightSyncManager를 통해 실제 데이터 삭제 (AB- 포함 모두)
    for (const id of sourceIds) {
      await FlightSyncManager.deleteFlight(id);
    }

    showToast('삭제되었습니다.', 'success');

    // UI 업데이트를 위해 데이터 다시 로드
    await loadFlights();
    filterFlights();

    // 선택 카운트 초기화
    updateSelectedCount();
  } catch (error) {
    showToast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

function openAddModal() {
  document.getElementById('modalTitle').textContent = '예약 정보';
  document.getElementById('flightForm').reset();
  document.getElementById('flightId').value = '';
  document.getElementById('isRoundTrip').checked = false;
  document.getElementById('returnFlightSection').style.display = 'none';
  document.getElementById('passengerDisplay').innerHTML =
    '<span style="color: #a0aec0;">탑승자 명단이 여기에 표시됩니다</span>';
  document.getElementById('flightModal').classList.add('active');
}

function toggleReturnFlight() {
  const isRoundTrip = document.getElementById('isRoundTrip').checked;
  const returnSection = document.getElementById('returnFlightSection');

  if (isRoundTrip) {
    returnSection.style.display = 'block';
    // 출발지와 도착지를 자동으로 반대로 설정
    updateReturnRoute();

    // 도착편 필수 입력으로 변경
    document.getElementById('returnFlightNumber').required = true;
    document.getElementById('returnDepartureTime').required = true;
    document.getElementById('returnArrivalTime').required = true;
    document.getElementById('returnArrivalDate').required = true;
  } else {
    returnSection.style.display = 'none';

    // 도착편 필수 입력 해제
    document.getElementById('returnFlightNumber').required = false;
    document.getElementById('returnDepartureTime').required = false;
    document.getElementById('returnArrivalTime').required = false;
    document.getElementById('returnArrivalDate').required = false;
  }
}

function updateReturnRoute() {
  const departure = document.getElementById('departure').value;
  const arrival = document.getElementById('arrival').value;

  // 도착편은 출발편의 반대 경로
  document.getElementById('returnDeparture').value = arrival;
  document.getElementById('returnArrival').value = departure;
}

function updatePassengerDisplay() {
  const textarea = document.getElementById('passengerList');
  const display = document.getElementById('passengerDisplay');

  const passengers = textarea.value
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p);

  if (passengers.length === 0) {
    display.innerHTML =
      '<span style="color: #a0aec0;">탑승자 명단이 여기에 표시됩니다</span>';
    return;
  }

  const lines = [];
  for (let i = 0; i < passengers.length; i += 4) {
    const chunk = passengers.slice(i, i + 4);
    lines.push(chunk.join(',  '));
  }

  display.innerHTML = lines.join('<br>');
}

// 출발편 출발지/도착지 변경 시 도착편도 자동 업데이트
document.addEventListener('DOMContentLoaded', function () {
  document
    .getElementById('departure')
    ?.addEventListener('input', updateReturnRoute);
  document
    .getElementById('arrival')
    ?.addEventListener('input', updateReturnRoute);
});

// URL 파라미터로 자동 편집 모달 열기
function checkAutoEditFlight() {
  const urlParams = new URLSearchParams(window.location.search);
  const editFlightId = urlParams.get('editFlight');
  const groupName = urlParams.get('groupName');

  if (editFlightId) {
    // URL 파라미터 제거 (한 번만 실행)
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);

    // 그룹명으로 필터링 (있는 경우)
    if (groupName) {
      const groupFilter = document.getElementById('groupFilter');
      if (groupFilter) {
        groupFilter.value = groupName;
        filterFlights();
      }
    }

    // 약간의 딜레이 후 편집 모달 열기 (렌더링 완료 대기)
    setTimeout(() => {
      editFlight(editFlightId);
    }, 300);
  }
}

function editFlight(id) {
  const flight = flights.find((f) => f.id === id);
  if (!flight) {
    showToast('항공편 정보를 찾을 수 없습니다.', 'error');
    return;
  }

  document.getElementById('modalTitle').textContent = '예약 정보';
  document.getElementById('flightId').value = flight.id;
  document.getElementById('groupName').value = flight.groupName || '';
  document.getElementById('pnr').value = flight.pnr || '';
  document.getElementById('airline').value = flight.airline;
  document.getElementById('flightNumber').value = flight.flightNumber;
  document.getElementById('departure').value = flight.departure;
  document.getElementById('arrival').value = flight.arrival;
  document.getElementById('departureTime').value = flight.departureTime;
  document.getElementById('arrivalTime').value = flight.arrivalTime;
  document.getElementById('departureDate').value = flight.departureDate;

  // 탑승자 명단 불러오기 (객체 배열인 경우 이름만 추출)
  if (flight.passengers && flight.passengers.length > 0) {
    // passengers가 객체 배열인지 문자열 배열인지 확인
    const passengerNames = flight.passengers.map((p) => {
      if (typeof p === 'object' && p.name) {
        return p.name;
      }
      return p;
    });
    document.getElementById('passengerList').value = passengerNames.join('\n');
  } else {
    document.getElementById('passengerList').value = '';
  }
  updatePassengerDisplay();

  // 왕복 항공편인 경우 도착편 정보 불러오기
  if (flight.isRoundTrip) {
    document.getElementById('isRoundTrip').checked = true;
    toggleReturnFlight();

    // 도착편 찾기
    const returnFlight = flights.find((f) => f.returnFlightId === flight.id);
    if (returnFlight) {
      document.getElementById('returnFlightNumber').value =
        returnFlight.flightNumber;
      document.getElementById('returnDeparture').value = returnFlight.departure;
      document.getElementById('returnArrival').value = returnFlight.arrival;
      document.getElementById('returnDepartureTime').value =
        returnFlight.departureTime;
      document.getElementById('returnArrivalTime').value =
        returnFlight.arrivalTime;
      document.getElementById('returnArrivalDate').value =
        returnFlight.arrivalDate;
    }
  } else {
    document.getElementById('isRoundTrip').checked = false;
    document.getElementById('returnFlightSection').style.display = 'none';
  }

  document.getElementById('flightModal').classList.add('active');
}

function closeModal() {
  document.getElementById('flightModal').classList.remove('active');
  document.getElementById('flightForm').reset();
  document.getElementById('flightId').value = '';
  document.getElementById('returnFlightSection').style.display = 'none';
}

function openQuickAddModal() {
  document.getElementById('quickInputText').value = '';
  document.getElementById('quickGroupName').value = '';
  document.getElementById('quickPnr').value = '';
  document.getElementById('quickAddModal').classList.add('active');
}

function closeQuickAddModal() {
  document.getElementById('quickAddModal').classList.remove('active');
  // 모달 닫을 때도 필드 초기화
  document.getElementById('quickInputText').value = '';
  document.getElementById('quickGroupName').value = '';
  document.getElementById('quickPnr').value = '';
}

// 공항 코드 데이터
let airportCodeMap = {};
let airportData = {};

// JSON 파일에서 공항 데이터 로드
async function loadAirportData() {
  try {
    const response = await fetch('./air1/world_airports_by_region.json');
    airportData = await response.json();

    // 공항 코드 맵 생성
    for (const region in airportData) {
      airportData[region].forEach((airport) => {
        airportCodeMap[airport['공항코드']] = airport['도시'];
      });
    }
  } catch (error) {
    console.error('공항 데이터 로드 실패:', error);
    // 기본 데이터 사용
    airportCodeMap = {
      ICN: '인천',
      MNL: '마닐라',
      CAN: '광저우',
      PVG: '상하이',
      PEK: '베이징',
      NRT: '나리타',
      HND: '하네다',
      KIX: '간사이',
      BKK: '방콕',
      SIN: '싱가포르',
      HKG: '홍콩',
      TPE: '타이베이',
      HAN: '하노이',
      SGN: '호치민',
      KUL: '쿠알라룸푸르',
      DPS: '발리',
      DAD: '다낭',
      GMP: '김포',
    };
  }
}

// 페이지 로드 시 공항 데이터 로드
loadAirportData();

const airlineCodeMap = {
  OZ: '아시아나항공',
  KE: '대한항공',
  LJ: '진에어',
  TW: '티웨이항공',
  ZE: '이스타항공',
  '7C': '제주항공',
  BX: '에어부산',
  RS: '에어서울',
};

function getAirportName(code) {
  return airportCodeMap[code] ? `${airportCodeMap[code]} (${code})` : code;
}

function getAirlineName(code) {
  return airlineCodeMap[code] || code;
}

// 날짜 변환 함수
function convertFlightDate(dateStr) {
  const monthMap = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10',
    NOV: '11',
    DEC: '12',
  };

  const day = dateStr.substring(0, 2);
  const monthStr = dateStr.substring(2, 5);
  const month = monthMap[monthStr];

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  let year = currentYear;
  const inputMonth = parseInt(month, 10);

  if (inputMonth < currentMonth - 1) {
    year = currentYear + 1;
  }

  return `${year}-${month}-${day}`;
}

// 시간 변환 함수
function convertFlightTime(timeStr) {
  if (!timeStr || timeStr.length !== 4) return timeStr;
  return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
}

// 항공편 정보 파싱
function parseFlightInfo(line) {
  const parts = line.split(/\s+/).filter(Boolean);

  if (parts.length < 9) {
    return null;
  }

  // 첫 번째 부분이 숫자만 있으면 (예: "3") 인덱스 조정
  let offset = 0;
  if (/^\d+$/.test(parts[0])) {
    offset = 1;
  }

  // 충분한 요소가 있는지 확인
  if (parts.length < 9 + offset) {
    return null;
  }

  let flightNumber = parts[offset] + ' ' + parts[offset + 1];
  flightNumber = flightNumber.replace(/(\d+)[A-Z]$/, '$1');

  let dateIndex,
    routeIndex,
    departureTimeIndex,
    arrivalTimeIndex,
    arrivalDateIndex;

  // 날짜 포맷 확인 (부분 3 또는 4에서 찾기)
  if (/^\d{2}[A-Z]{3}$/.test(parts[offset + 2])) {
    dateIndex = offset + 2;
    routeIndex = offset + 4;
    departureTimeIndex = offset + 6;
    arrivalTimeIndex = offset + 7;
    // 도착 시간 다음에 날짜가 있는지 확인
    if (parts[offset + 8] && /^\d{2}[A-Z]{3}$/.test(parts[offset + 8])) {
      arrivalDateIndex = offset + 8;
    }
  } else {
    dateIndex = offset + 3;
    routeIndex = offset + 5;
    departureTimeIndex = offset + 7;
    arrivalTimeIndex = offset + 8;
    // 도착 시간 다음에 날짜가 있는지 확인
    if (parts[offset + 9] && /^\d{2}[A-Z]{3}$/.test(parts[offset + 9])) {
      arrivalDateIndex = offset + 9;
    }
  }

  const departureDate = parts[dateIndex];
  const route = parts[routeIndex];
  const departure = route.substring(0, 3);
  const arrival = route.substring(3, 6);
  const departureTime = parts[departureTimeIndex];
  const arrivalTime = parts[arrivalTimeIndex];
  const arrivalDate = arrivalDateIndex
    ? parts[arrivalDateIndex]
    : departureDate;
  const airlineCode = parts[offset];

  return {
    flightNumber,
    airlineCode,
    departureDate,
    arrivalDate,
    departure,
    arrival,
    departureTime,
    arrivalTime,
  };
}

async function parseAndAddFlights() {
  const input = document.getElementById('quickInputText').value.trim();
  const groupName = document.getElementById('quickGroupName').value.trim();
  let pnr = document.getElementById('quickPnr').value.trim();

  if (!input) {
    showToast('항공편 정보를 입력해주세요.', 'warning');
    return;
  }

  const lines = input.split(/\n/).filter((l) => l.trim() !== '');
  let addedCount = 0;
  const errors = [];

  // 첫 줄에서 PNR 추출 (예: HUVHNQ)
  if (!pnr && lines.length > 0) {
    const firstLine = lines[0].trim();
    // 알파벳 대문자 6자리 패턴 찾기 (줄 전체가 PNR인 경우)
    const pnrMatch = firstLine.match(/^([A-Z]{6})$/);
    if (pnrMatch) {
      pnr = pnrMatch[1];
      lines.shift(); // PNR 줄 제거
    }
  }

  // PNR을 입력 필드에 자동 채우기
  if (pnr) {
    document.getElementById('quickPnr').value = pnr;
  }

  // 승객 명단 파싱 (1.1KANG/DAEWOOMR 또는 1.YANG/MYEONGHWANMR 형식)
  const passengers = [];
  while (lines.length > 0) {
    const line = lines[0].trim();
    // 승객 정보 패턴: 숫자.숫자 또는 숫자.로 시작하는 줄
    if (/^\d+\./.test(line)) {
      lines.shift();

      // 패턴 1: 1.1KANG/DAEWOOMR 형식
      let passengerMatches = line.match(/\d+\.\d+([A-Z/]+)(MR|MS|MSTR|MISS)/g);
      if (passengerMatches) {
        passengerMatches.forEach((match) => {
          const nameMatch = match.match(/\d+\.\d+([A-Z/]+)(MR|MS|MSTR|MISS)/);
          if (nameMatch) {
            passengers.push(nameMatch[1]);
          }
        });
      } else {
        // 패턴 2: 1.YANG/MYEONGHWANMR 형식
        passengerMatches = line.match(/\d+\.([A-Z/]+)(MR|MS|MSTR|MISS)/g);
        if (passengerMatches) {
          passengerMatches.forEach((match) => {
            const nameMatch = match.match(/\d+\.([A-Z/]+)(MR|MS|MSTR|MISS)/);
            if (nameMatch) {
              passengers.push(nameMatch[1]);
            }
          });
        }
      }
    } else {
      break; // 승객 정보가 아니면 중단
    }
  }

  // 한국 공항 코드 확인 함수 (AirportDatabase 사용) - local scope
  function isKoreanAirportLocal(airportCode) {
    return AirportDatabase.isKoreanAirport(airportCode);
  }

  // 모든 항공편 정보 파싱
  const flightInfos = [];
  for (let i = 0; i < lines.length; i++) {
    const flightInfo = parseFlightInfo(lines[i]);
    if (flightInfo) {
      flightInfos.push(flightInfo);
    } else {
      errors.push(`${i + 1}번째 줄 파싱 실패`);
    }
  }

  if (flightInfos.length === 0) {
    showToast('파싱된 항공편 정보가 없습니다.', 'warning');
    return;
  }

  try {
    // flight_saves_v2 형식으로 서버 DB에 저장
    const flightSaveData = {
      id: 'FLIGHT-' + Date.now(),
      name: groupName,
      pnr: pnr,
      saveDate: new Date().toISOString(),
      flights: flightInfos.map(fi => ({
        flightNumber: fi.flightNumber,
        airline: fi.airlineCode,
        date: convertFlightDate(fi.departureDate) ? convertFlightDate(fi.departureDate).replace(/-/g, '.') : '',
        departure: {
          airport: getAirportName(fi.departure),
          code: fi.departure,
          time: convertFlightTime(fi.departureTime)
        },
        arrival: {
          airport: getAirportName(fi.arrival),
          code: fi.arrival,
          time: convertFlightTime(fi.arrivalTime)
        },
        departureTime: convertFlightTime(fi.departureTime),
        arrivalTime: convertFlightTime(fi.arrivalTime)
      })),
      customerInfo: {
        name: passengers[0] || '',
        phone: '',
        totalPeople: passengers.length.toString(),
        passengers: passengers
      }
    };

    await FlightSyncManager.addFlight(flightSaveData);
    addedCount = flightInfos.length;
  } catch (error) {
    errors.push(`항공편 처리 오류: ${error.message}`);
  }

  if (errors.length > 0) {
    showToast(`${addedCount}개 추가, ${errors.length}개 실패`, 'warning', 4000);
  } else {
    showToast(`${addedCount}개의 항공편이 추가되었습니다.`, 'success');
  }

  if (addedCount > 0) {
    await loadFlights();
    filterFlights();
    closeQuickAddModal();
  }
}

async function saveFlight() {
  const id = document.getElementById('flightId').value;

  if (!id) {
    showToast('편집할 항공편을 찾을 수 없습니다.', 'error');
    return;
  }

  // 수정할 항공편 찾기
  const flight = flights.find((f) => f.id === id);
  if (!flight) {
    showToast('항공편 정보를 찾을 수 없습니다.', 'error');
    return;
  }

  // sourceId 직접 사용 (flight 객체에 이미 sourceId가 있음)
  // "F1-0" -> "F1" 변환이 아닌, flight.sourceId를 직접 사용
  const originalFlightId = flight.sourceId || id;

  // FlightSyncManager에서 원본 데이터 가져오기
  const originalFlight = await FlightSyncManager.getFlightById(originalFlightId);
  if (!originalFlight) {
    showToast('원본 항공편 데이터를 찾을 수 없습니다.', 'error');
    return;
  }

  // 탑승자 명단 파싱
  const passengerText = document.getElementById('passengerList').value.trim();
  const passengers = passengerText
    ? passengerText
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p)
    : [];

  // customerInfo 형식으로 변환
  const customerInfo = {
    name: passengers[0] || originalFlight.customerInfo?.name || '',
    phone: originalFlight.customerInfo?.phone || '',
    totalPeople: passengers.length || 0,
  };

  // 수정된 데이터로 원본 업데이트
  // 원본 flight_saves_v2 형식에 맞춰 필드명 사용
  const updates = {
    name: document.getElementById('groupName').value, // groupName -> name
    pnr: document.getElementById('pnr').value,
    customerInfo: customerInfo, // passengers -> customerInfo
  };

  try {
    // FlightSyncManager를 통해 저장
    await FlightSyncManager.updateFlight(originalFlightId, updates);

    // 화면 새로고침
    await loadFlights();
    filterFlights();
    closeModal();
    showToast('항공편이 저장되었습니다.', 'success');
  } catch (error) {
    showToast('저장 중 오류가 발생했습니다: ' + error.message, 'error');
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function showPassengers(flightId) {
  const flight = flights.find((f) => f.id === flightId);
  if (!flight || !flight.passengers || flight.passengers.length === 0) {
    showToast('탑승자 정보가 없습니다.', 'info');
    return;
  }

  const passengerHtml =
    `<div style="text-align:left;font-size:13px;line-height:1.8;">` +
    `<b>총 ${flight.passengers.length}명</b><hr style="margin:6px 0;border-color:#e5e7eb;">` +
    flight.passengers.map((p, i) => `${i + 1}. ${p}`).join('<br>') +
    `</div>`;
  showConfirmModal('탑승자 명단', passengerHtml, {
    confirmText: '확인',
    showCancel: false,
  });
}

// 출발 여부 체크 함수
function checkIfDeparted(flight) {
  if (!flight.departureDate || !flight.departureTime) {
    return false;
  }

  const now = new Date();
  const departureDateTime = new Date(
    `${flight.departureDate}T${flight.departureTime}`
  );

  // 출발 시간이 현재 시간보다 이전이면 true
  return departureDateTime < now;
}

// 도착 후 3일 경과 여부 체크
function checkIfExpired(flight) {
  if (!flight.departureDate) {
    return false;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  // 출발일이 오늘 이전이면 만료
  return flight.departureDate < todayStr;
}

// 만료된 항공편 자동 삭제 (localStorage 포함)
async function deleteExpiredFlights() {
  const originalLength = flights.length;

  // 만료되지 않은 항공편만 필터링
  flights = flights.filter((flight) => !checkIfExpired(flight));

  const deletedCount = originalLength - flights.length;

  if (deletedCount > 0) {
    // 서버 DB에서도 지난 스케줄 삭제
    try {
      const allSaves = await FlightSyncManager.getFlights();
      const todayStr = new Date().toISOString().split('T')[0];
      for (const f of allSaves) {
        if (!f.flights || f.flights.length === 0) continue;
        let lastDate = '';
        f.flights.forEach(function (leg) {
          const d = FlightSyncManager.parseFlightDate(leg.date);
          if (d && d > lastDate) lastDate = d;
        });
        if (lastDate && lastDate < todayStr && !f.id.startsWith('AB-')) {
          await FlightSyncManager.deleteFlight(f.id);
        }
      }
    } catch (e) {
      console.error('저장소 정리 오류:', e);
    }

    filterFlights();
  }
}

// 알람 상태 아이콘 생성
function getAlarmIcon(flight) {
  if (!flight.departure || !flight.departure.includes('ICN')) {
    return '';
  }

  const now = new Date();
  const departureDateTime = new Date(
    `${flight.departureDate}T${flight.departureTime}`
  );
  const timeDiff = departureDateTime - now;
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  if (hoursDiff <= 0) {
    return ''; // 이미 출발함
  } else if (hoursDiff <= 24) {
    return '<i class="fas fa-bell" style="color: #dc2626; margin-left: 0.5rem;" title="24시간 이내 출발"></i>';
  } else if (hoursDiff <= 48) {
    return '<i class="fas fa-bell" style="color: #f59e0b; margin-left: 0.5rem;" title="48시간 이내 출발"></i>';
  } else if (hoursDiff <= 72) {
    return '<i class="far fa-bell" style="color: #3b82f6; margin-left: 0.5rem;" title="72시간 이내 출발"></i>';
  }
  return '';
}

// 알람 체크 함수
function checkAlarms() {
  const now = new Date();

  flights.forEach((flight) => {
    // 인천 출발 항공편만 체크
    if (!flight.departure || !flight.departure.includes('ICN')) {
      return;
    }

    // 출발 날짜와 시간 결합
    const departureDateTime = new Date(
      `${flight.departureDate}T${flight.departureTime}`
    );
    const timeDiff = departureDateTime - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // 48시간 전 알람 (47.5~48.5시간 사이)
    if (hoursDiff > 47.5 && hoursDiff <= 48.5) {
      if (!flight.alarm48Shown) {
        showAlarmNotification(flight, 48);
        flight.alarm48Shown = true;
      }
    }

    // 24시간 전 알람 (23.5~24.5시간 사이)
    if (hoursDiff > 23.5 && hoursDiff <= 24.5) {
      if (!flight.alarm24Shown) {
        showAlarmNotification(flight, 24);
        flight.alarm24Shown = true;
      }
    }
  });
}

function showAlarmNotification(flight, hours) {
  const message =
    `출발 ${hours}시간 전 알람\n\n` +
    `그룹명: ${flight.groupName || '-'}\n` +
    `항공편: ${flight.flightNumber}\n` +
    `출발: ${flight.departure}\n` +
    `출발시간: ${flight.departureDate} ${flight.departureTime}\n` +
    `탑승자: ${flight.passengers && flight.passengers.length > 0 ? flight.passengers.length + '명' : '-'}`;

  showToast(message, 'info', 10000);

  // 브라우저 알림도 표시 (권한이 있는 경우)
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`출발 ${hours}시간 전`, {
      body: `${flight.flightNumber} - ${flight.departure} ${flight.departureTime}`,
      icon: '✈️',
    });
  }
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// 페이지 로드 시 알림 권한 요청
window.addEventListener('load', requestNotificationPermission);

// 모달 외부 클릭시 닫기
document.getElementById('flightModal').addEventListener('click', function (e) {
  if (e.target === this) {
    closeModal();
  }
});

document
  .getElementById('quickAddModal')
  .addEventListener('click', function (e) {
    if (e.target === this) {
      closeQuickAddModal();
    }
  });

// ========================================
// Expose functions to window for HTML onclick/onchange/oninput handlers
// ========================================
window.openQuickAddModal = openQuickAddModal;
window.openAddModal = openAddModal;
window.selectAll = selectAll;
window.deleteSelected = deleteSelected;
window.closeQuickAddModal = closeQuickAddModal;
window.parseAndAddFlights = parseAndAddFlights;
window.closeModal = closeModal;
window.showPassengers = showPassengers;
window.editFlight = editFlight;
window.toggleReturnFlight = toggleReturnFlight;
window.updateSelectedCount = updateSelectedCount;
window.updatePassengerDisplay = updatePassengerDisplay;

// ========================================
// 예약장부 탭 (Air-Booking 데이터)
// ========================================

let abCurrentPage = 1;
const AB_PAGE_SIZE = 50;
let abCurrentTab = 'flight'; // 'flight' | 'booking'

function switchToTab(tab) {
  abCurrentTab = tab;
  const flightSection = document.querySelector('.container');
  const bookingSection = document.getElementById('airBookingSection');
  const tabFlight = document.getElementById('tabFlightManage');
  const tabBooking = document.getElementById('tabAirBooking');

  if (tab === 'flight') {
    flightSection.style.display = '';
    bookingSection.style.display = 'none';
    tabFlight.style.backgroundColor = '#2563eb';
    tabFlight.style.color = 'white';
    tabFlight.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    tabBooking.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    tabBooking.style.color = '#1e40af';
    tabBooking.style.boxShadow = 'none';
  } else {
    flightSection.style.display = 'none';
    bookingSection.style.display = '';
    tabBooking.style.backgroundColor = '#2563eb';
    tabBooking.style.color = 'white';
    tabBooking.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    tabFlight.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    tabFlight.style.color = '#1e40af';
    tabFlight.style.boxShadow = 'none';
    loadAirBookings();
  }
}

async function loadAirBookings(page = 1) {
  abCurrentPage = page;
  const loading = document.getElementById('abLoading');
  const tableContainer = document.getElementById('abTableContainer');
  const noData = document.getElementById('abNoData');
  const pagination = document.getElementById('abPagination');

  loading.style.display = '';
  tableContainer.style.display = 'none';
  noData.style.display = 'none';
  pagination.style.display = 'none';

  try {
    const search = document.getElementById('abSearchInput').value;
    const status = document.getElementById('abStatusFilter').value;
    const dateFrom = document.getElementById('abDateFrom').value;
    const dateTo = document.getElementById('abDateTo').value;

    const params = new URLSearchParams({
      page: page.toString(),
      limit: AB_PAGE_SIZE.toString()
    });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (dateFrom) params.set('departure_from', dateFrom);
    if (dateTo) params.set('departure_to', dateTo);

    const response = await fetch(`/api/air-bookings?${params}`);
    if (!response.ok) throw new Error('API 오류');

    const data = await response.json();
    loading.style.display = 'none';

    if (data.bookings.length === 0) {
      noData.style.display = '';
      return;
    }

    document.getElementById('abTotalCount').textContent = `총 ${data.total}건`;
    renderAirBookings(data.bookings);
    tableContainer.style.display = '';

    if (data.totalPages > 1) {
      renderAbPagination(data.page, data.totalPages);
      pagination.style.display = 'flex';
    }
  } catch (error) {
    loading.style.display = 'none';
    noData.style.display = '';
    console.error('예약장부 로드 오류:', error);
  }
}

function renderAirBookings(bookings) {
  const tbody = document.getElementById('abTableBody');
  const today = new Date().toISOString().split('T')[0];

  tbody.innerHTML = bookings.map(b => {
    const nmtlClass = getDeadlineClass(b.nmtl_date, today);
    const tlClass = getDeadlineClass(b.tl_date, today);
    const statusBadge = getStatusBadge(b.status);
    const segmentInfo = b.segments && b.segments.length > 0
      ? b.segments.map(s => `${s.route_from}→${s.route_to}`).join(', ')
      : `${b.route_from || ''}→${b.route_to || ''}`;
    const flightInfo = b.segments && b.segments.length > 0
      ? b.segments.map(s => `${s.airline || ''}${s.flight_number || ''}`).join(', ')
      : `${b.airline || ''}${b.flight_number || ''}`;

    return `<tr>
      <td><strong style="cursor:pointer;color:#2563eb;text-decoration:underline" onclick="showBookingDetail('${b.id}')">${sanitizeHtml(b.pnr || '')}</strong></td>
      <td>${sanitizeHtml(b.name_kr || b.name_en || '')}</td>
      <td>${sanitizeHtml(flightInfo)}</td>
      <td style="font-size:0.85rem">${sanitizeHtml(segmentInfo)}</td>
      <td>${b.departure_date || ''}</td>
      <td>${b.return_date || ''}</td>
      <td class="${nmtlClass}">${b.nmtl_date || ''}</td>
      <td class="${tlClass}">${b.tl_date || ''}</td>
      <td>${statusBadge}</td>
      <td style="text-align:center">${b.pax_count || 1}</td>
    </tr>`;
  }).join('');
}

function getDeadlineClass(dateStr, today) {
  if (!dateStr) return '';
  const diff = Math.ceil((new Date(dateStr) - new Date(today)) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '';
  if (diff <= 1) return 'deadline-urgent';
  if (diff <= 3) return 'deadline-warning';
  return '';
}

function getStatusBadge(status) {
  const map = {
    pending: '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:9999px;font-size:0.8rem;font-weight:600">대기</span>',
    confirmed: '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:9999px;font-size:0.8rem;font-weight:600">확정</span>',
    cancelled: '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:9999px;font-size:0.8rem;font-weight:600">취소</span>'
  };
  return map[status] || `<span style="background:#e2e8f0;color:#475569;padding:2px 8px;border-radius:9999px;font-size:0.8rem">${status || ''}</span>`;
}

function renderAbPagination(current, totalPages) {
  const container = document.getElementById('abPagination');
  let html = '';

  if (current > 1) {
    html += `<button type="button" onclick="loadAirBookings(${current - 1})" class="btn btn-secondary" style="padding:0.5rem 1rem">이전</button>`;
  }

  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, current + 2);
  for (let i = start; i <= end; i++) {
    const active = i === current ? 'background:#2563eb;color:white;' : '';
    html += `<button type="button" onclick="loadAirBookings(${i})" class="btn btn-secondary" style="padding:0.5rem 1rem;${active}">${i}</button>`;
  }

  if (current < totalPages) {
    html += `<button type="button" onclick="loadAirBookings(${current + 1})" class="btn btn-secondary" style="padding:0.5rem 1rem">다음</button>`;
  }

  container.innerHTML = html;
}

// 예약장부 필터 이벤트
document.addEventListener('DOMContentLoaded', function() {
  const abSearch = document.getElementById('abSearchInput');
  const abStatus = document.getElementById('abStatusFilter');
  const abDateFrom = document.getElementById('abDateFrom');
  const abDateTo = document.getElementById('abDateTo');

  if (abSearch) {
    let abSearchTimeout;
    abSearch.addEventListener('input', () => {
      clearTimeout(abSearchTimeout);
      abSearchTimeout = setTimeout(() => { if (abCurrentTab === 'booking') loadAirBookings(1); }, 300);
    });
  }
  if (abStatus) abStatus.addEventListener('change', () => { if (abCurrentTab === 'booking') loadAirBookings(1); });
  if (abDateFrom) abDateFrom.addEventListener('change', () => { if (abCurrentTab === 'booking') loadAirBookings(1); });
  if (abDateTo) abDateTo.addEventListener('change', () => { if (abCurrentTab === 'booking') loadAirBookings(1); });
});

// ========================================
// PNR 중복 감지
// ========================================

let pnrCheckTimeout = null;

async function checkPnrDuplicate(pnr) {
  const warning = document.getElementById('pnrWarning');
  if (!warning) return;

  clearTimeout(pnrCheckTimeout);

  if (!pnr || pnr.length < 4) {
    warning.style.display = 'none';
    return;
  }

  pnrCheckTimeout = setTimeout(async () => {
    try {
      const response = await fetch(`/api/air-bookings/check-pnr/${encodeURIComponent(pnr.toUpperCase())}`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.exists && data.booking) {
        const b = data.booking;
        warning.innerHTML = `<strong>⚠️ 예약장부에 이미 등록된 PNR입니다</strong><br>
          탑승객: ${sanitizeHtml(b.name_kr || '')}<br>
          항공편: ${sanitizeHtml(b.airline || '')}${sanitizeHtml(b.flight_number || '')}<br>
          구간: ${sanitizeHtml(b.route_from || '')} → ${sanitizeHtml(b.route_to || '')}<br>
          출발일: ${b.departure_date || ''}<br>
          상태: ${b.status || ''}<br>
          <small style="color:#b45309">항공편 정보가 일치하는지 확인하세요.</small>`;
        warning.style.display = 'block';
      } else {
        warning.style.display = 'none';
      }
    } catch (err) {
      console.error('PNR 중복 확인 오류:', err);
    }
  }, 500);
}

async function showBookingDetail(bookingId) {
  try {
    const response = await fetch(`/api/air-bookings/${encodeURIComponent(bookingId)}`);
    if (!response.ok) throw new Error('조회 실패');
    const booking = await response.json();

    const paxList = (booking.passengers || [])
      .map((p, i) => `${i + 1}. ${sanitizeHtml(p.name_kr || p.name_en || '')} ${p.gender || ''}`)
      .join('<br>');

    const segList = (booking.segments || [])
      .map(s => `${sanitizeHtml(s.airline || '')}${sanitizeHtml(s.flight_number || '')} ${sanitizeHtml(s.route_from || '')}→${sanitizeHtml(s.route_to || '')} ${s.departure_date || ''} ${s.departure_time || ''}`)
      .join('<br>');

    const html = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
        <div style="background:white;border-radius:1rem;padding:2rem;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
            <h2 style="margin:0;font-size:1.3rem">📒 예약 상세 — ${sanitizeHtml(booking.pnr || '')}</h2>
            <button type="button" onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b">&times;</button>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:0.95rem">
            <tr><td style="padding:0.5rem;font-weight:600;color:#64748b;width:120px">PNR</td><td style="padding:0.5rem">${sanitizeHtml(booking.pnr || '')}</td></tr>
            <tr><td style="padding:0.5rem;font-weight:600;color:#64748b">탑승객</td><td style="padding:0.5rem">${sanitizeHtml(booking.name_kr || booking.name_en || '')}</td></tr>
            <tr><td style="padding:0.5rem;font-weight:600;color:#64748b">상태</td><td style="padding:0.5rem">${getStatusBadge(booking.status)}</td></tr>
            <tr><td style="padding:0.5rem;font-weight:600;color:#64748b">출발일</td><td style="padding:0.5rem">${booking.departure_date || ''}</td></tr>
            <tr><td style="padding:0.5rem;font-weight:600;color:#64748b">귀국일</td><td style="padding:0.5rem">${booking.return_date || ''}</td></tr>
            <tr><td style="padding:0.5rem;font-weight:600;color:#64748b">NMTL</td><td style="padding:0.5rem;${booking.nmtl_date ? 'font-weight:700' : ''}">${booking.nmtl_date || '-'}</td></tr>
            <tr><td style="padding:0.5rem;font-weight:600;color:#64748b">TL</td><td style="padding:0.5rem;${booking.tl_date ? 'font-weight:700' : ''}">${booking.tl_date || '-'}</td></tr>
            <tr><td style="padding:0.5rem;font-weight:600;color:#64748b">인원</td><td style="padding:0.5rem">${booking.pax_count || 1}명</td></tr>
            <tr><td style="padding:0.5rem;font-weight:600;color:#64748b">비고</td><td style="padding:0.5rem">${sanitizeHtml(booking.remarks || '-')}</td></tr>
          </table>
          ${segList ? `<div style="margin-top:1rem;padding:1rem;background:#f8fafc;border-radius:0.5rem"><strong>구간</strong><br>${segList}</div>` : ''}
          ${paxList ? `<div style="margin-top:0.75rem;padding:1rem;background:#f8fafc;border-radius:0.5rem"><strong>탑승객 명단</strong><br>${paxList}</div>` : ''}
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  } catch (err) {
    console.error('예약 상세 조회 오류:', err);
    showToast('예약 상세 정보를 불러올 수 없습니다.', 'error');
  }
}

window.switchToTab = switchToTab;
window.loadAirBookings = loadAirBookings;
window.checkPnrDuplicate = checkPnrDuplicate;
window.showBookingDetail = showBookingDetail;
