const { showToast, showConfirmModal } = window;
const { fetchJSON } = window;
const { FlightSyncManager } = window;
import { sanitizeHtml } from '../../js/modules/ui.js';

// 인보이스 편집 로직
// API_BASE_URL은 config.js에서 가져옴 (classic script로 window.CONFIG 설정)
const CONFIG = window.CONFIG || {};
const API_BASE_URL = CONFIG.API_BASE_URL || '/api';

// 항목 데이터 (기본 항목 포함)
let invoiceItems = [
  { id: 'item-1', name: '항공료', unitPrice: 0, quantity: 0 },
  { id: 'item-2', name: '선호좌석', unitPrice: 0, quantity: 0 },
];

// 거래처 저장소 키 (config.js에서 가져옴)
const RECIPIENTS_STORAGE_KEY =
  CONFIG.STORAGE_KEYS?.RECIPIENTS || 'invoice_recipients';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // 일자를 오늘 날짜로 자동 설정
  setTodayDate();

  // 거래처 목록 로드
  await loadRecipients();

  // 항공 스케줄 로드 (서버 DB에서)
  await loadFlightSchedulesFromLocalStorage();

  await loadBankAccounts();
  renderItems();
  setupEventListeners();

  // URL 파라미터 확인 (편집 모드)
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get('id');
  if (invoiceId) {
    await loadInvoiceForEdit(invoiceId);
  }
});

// 오늘 날짜로 자동 설정
function setTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  document.getElementById('invoice-date').value = dateString;
}

// 거래처 목록 로드 (서버 DB)
async function loadRecipients() {
  try {
    const res = await fetch('/api/invoice-recipients', { credentials: 'include' });
    const recipients = await res.json();

    const select = document.getElementById('recipient-select');
    select.innerHTML = '<option value="">거래처 선택</option>';

    recipients.forEach((r) => {
      const option = document.createElement('option');
      option.value = r.name;
      option.textContent = r.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('거래처 목록 로드 오류:', error);
    // 폴백: localStorage
    try {
      const local = localStorage.getItem(RECIPIENTS_STORAGE_KEY);
      if (local) {
        const recipients = JSON.parse(local);
        const select = document.getElementById('recipient-select');
        select.innerHTML = '<option value="">거래처 선택</option>';
        recipients.forEach((r) => {
          const option = document.createElement('option');
          option.value = r;
          option.textContent = r;
          select.appendChild(option);
        });
      }
    } catch (e) {}
  }
}

// 거래처 저장 (서버 DB)
async function saveRecipient(recipientName) {
  if (!recipientName || recipientName.trim() === '') return;

  try {
    await fetch('/api/invoice-recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: recipientName.trim() })
    });
    await loadRecipients(); // 목록 새로고침
  } catch (error) {
    console.error('거래처 저장 오류:', error);
  }
}

// 항공 스케줄 목록 로드 (서버 DB에서) - 그룹 단위로 표시
async function loadFlightSchedulesFromLocalStorage() {
  try {
    // FlightSyncManager를 통해 항공편 데이터 가져오기 (서버 DB)
    if (typeof FlightSyncManager === 'undefined') {
      console.warn(
        'FlightSyncManager가 로드되지 않았습니다. API를 사용합니다.'
      );
      loadFlightSchedulesFromAPI();
      return;
    }

    const flightSaves = await FlightSyncManager.getFlights();
    const select = document.getElementById('flight-schedule');

    select.innerHTML = '<option value="">선택하세요</option>';

    if (flightSaves.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '등록된 항공 스케줄이 없습니다';
      option.disabled = true;
      select.appendChild(option);
      return;
    }

    // 그룹 단위로 표시 (예약번호 또는 단체명 기준)
    flightSaves.forEach((flightSave) => {
      const schedules = FlightSyncManager.convertToScheduleFormat(flightSave);

      if (schedules.length === 0) return;

      // 그룹 정보 추출
      const groupName = schedules[0].groupName || flightSave.name || '';
      const pnr = schedules[0].pnr || '';
      const firstSchedule = schedules[0];
      const lastSchedule = schedules[schedules.length - 1];

      // 표시 텍스트 생성 (예약번호 또는 단체명)
      let displayText = '';
      if (pnr) {
        displayText = `[${pnr}] `;
      }
      if (groupName) {
        displayText += groupName;
      } else {
        displayText += '항공편';
      }

      // 구간 정보 추가
      const departureAirport = firstSchedule.departure || '';
      const arrivalAirport = lastSchedule.arrival || '';
      const departureDate = firstSchedule.departureDate || '';

      if (departureAirport && arrivalAirport) {
        displayText += ` - ${departureAirport} → ${arrivalAirport}`;
      }
      if (departureDate) {
        displayText += ` (${formatDateForDisplay(departureDate)})`;
      }
      if (schedules.length > 1) {
        displayText += ` [${schedules.length}구간]`;
      }

      // 옵션 생성
      const option = document.createElement('option');
      option.value = flightSave.id; // flightSave ID를 값으로 사용
      option.textContent = displayText;

      // 모든 구간 정보를 저장
      option.dataset.allSchedules = JSON.stringify(schedules);
      option.dataset.flightSave = JSON.stringify(flightSave);
      option.dataset.groupName = groupName;
      option.dataset.pnr = pnr;

      select.appendChild(option);
    });
  } catch (error) {
    console.error('항공 스케줄 로드 오류:', error);
    // 오류 시 API로 폴백
    loadFlightSchedulesFromAPI();
  }
}

// API에서 항공 스케줄 로드 (폴백)
async function loadFlightSchedulesFromAPI() {
  try {
    const data = await fetchJSON(`${API_BASE_URL}/flight-schedules`);
    const select = document.getElementById('flight-schedule');

    select.innerHTML = '<option value="">선택하세요</option>';
    if (data.data && data.data.length > 0) {
      data.data.forEach((schedule) => {
        const option = document.createElement('option');
        option.value = schedule.id;
        option.textContent = `${schedule.airline} ${schedule.flight_number || ''} - ${schedule.departure_date}`;
        option.dataset.schedule = JSON.stringify(schedule);
        select.appendChild(option);
      });
    }
  } catch (error) {
    showToast('항공 스케줄을 불러오는 데 실패했습니다.', 'error');
  }
}

// 날짜 포맷팅 (표시용)
function formatDateForDisplay(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 은행 계좌 목록 로드
async function loadBankAccounts() {
  const select = document.getElementById('bank-account');
  select.innerHTML = '<option value="">선택하세요</option>';

  // 기본 은행 계좌 추가
  const defaultAccounts = [
    {
      id: 'hana-1',
      bank_name: '하나은행',
      account_number: '611-016420-721',
      account_holder: '여행세상',
    },
  ];

  defaultAccounts.forEach((account) => {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = `${account.bank_name} - ${account.account_number} (예금주: ${account.account_holder})`;
    option.dataset.account = JSON.stringify(account);
    select.appendChild(option);
  });

  try {
    const data = await fetchJSON(`${API_BASE_URL}/bank-accounts`);

    if (data.data && data.data.length > 0) {
      data.data.forEach((account) => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = `${account.bank_name} - ${account.account_number}`;
        option.dataset.account = JSON.stringify(account);
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.warn('은행 계좌 로드 오류 (기본 계좌 사용):', error);
    // API 오류는 무시하고 기본 계좌만 사용
  }
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 거래처 선택 드롭다운
  document
    .getElementById('recipient-select')
    .addEventListener('change', (e) => {
      if (e.target.value) {
        document.getElementById('recipient').value = e.target.value;
      }
    });

  // 거래처 수동 입력 시 저장
  document.getElementById('recipient').addEventListener('blur', async (e) => {
    const value = e.target.value.trim();
    if (value) {
      await saveRecipient(value);
    }
  });

  // 항공 스케줄 선택 (그룹 전체 구간 표시)
  document.getElementById('flight-schedule').addEventListener('change', (e) => {
    const option = e.target.selectedOptions[0];
    if (option.value && option.dataset.allSchedules) {
      const allSchedules = JSON.parse(option.dataset.allSchedules);
      displayFlightInfoGroup(allSchedules);
    } else {
      document.getElementById('flight-info').style.display = 'none';
    }
  });

  // 은행 계좌 선택
  document.getElementById('bank-account').addEventListener('change', (e) => {
    const option = e.target.selectedOptions[0];
    if (option.value) {
      const account = JSON.parse(option.dataset.account);
      displayBankInfo(account);
    } else {
      document.getElementById('bank-info').style.display = 'none';
    }
  });

  // 항목 추가 버튼
  document.getElementById('add-item-btn').addEventListener('click', addNewItem);

  // 폼 제출
  document
    .getElementById('invoice-form')
    .addEventListener('submit', handleSubmit);

  // 미리보기 버튼
  document
    .getElementById('preview-btn')
    .addEventListener('click', handlePreview);

  // PDF 생성 버튼
  document
    .getElementById('generate-pdf-btn')
    .addEventListener('click', handleGeneratePDF);
}

// 항공 스케줄 정보 표시 (단일 구간)
// eslint-disable-next-line no-unused-vars
function displayFlightInfo(schedule) {
  // schedule 형식에 맞춰 표시
  const airline = schedule.airline || '-';
  const flightNumber = schedule.flightNumber || schedule.flight_number || '-';
  const departureDate =
    schedule.departureDate || schedule.departure_date || '-';
  const departureAirport =
    schedule.departure || schedule.departure_airport || '-';
  const departureTime =
    schedule.departureTime || schedule.departure_time || '-';
  const arrivalDate = schedule.arrivalDate || schedule.arrival_date || '-';
  const arrivalAirport = schedule.arrival || schedule.arrival_airport || '-';
  const arrivalTime = schedule.arrivalTime || schedule.arrival_time || '-';

  document.getElementById('flight-airline').textContent = airline;
  document.getElementById('flight-number').textContent = flightNumber;
  document.getElementById('flight-departure').textContent =
    `${formatDateForDisplay(departureDate)} ${departureAirport} ${departureTime}`;
  document.getElementById('flight-arrival').textContent =
    `${formatDateForDisplay(arrivalDate)} ${arrivalAirport} ${arrivalTime}`;
  document.getElementById('flight-info').style.display = 'block';
}

// 항공 스케줄 정보 표시 (그룹 전체 구간)
function displayFlightInfoGroup(allSchedules) {
  if (!allSchedules || allSchedules.length === 0) {
    document.getElementById('flight-info').style.display = 'none';
    return;
  }

  // 첫 번째 구간 정보로 기본 정보 표시
  const firstSchedule = allSchedules[0];
  const lastSchedule = allSchedules[allSchedules.length - 1];

  const groupName = firstSchedule.groupName || '';
  const pnr = firstSchedule.pnr || '';
  const airline = firstSchedule.airline || '-';

  // 항공편명 (모든 구간 표시)
  const flightNumbers = allSchedules
    .map((s) => s.flightNumber || '-')
    .join(', ');

  // 출발 정보 (첫 번째 구간)
  const departureDate = firstSchedule.departureDate || '-';
  const departureAirport = firstSchedule.departure || '-';
  const departureTime = firstSchedule.departureTime || '-';

  // 도착 정보 (마지막 구간)
  const arrivalDate = lastSchedule.arrivalDate || '-';
  const arrivalAirport = lastSchedule.arrival || '-';
  const arrivalTime = lastSchedule.arrivalTime || '-';

  // 정보 표시
  let infoText = '';
  if (groupName) {
    infoText += `단체명: ${groupName}\n`;
  }
  if (pnr) {
    infoText += `예약번호: ${pnr}\n`;
  }
  infoText += `항공사: ${airline}\n`;
  infoText += `항공편명: ${flightNumbers}\n`;
  infoText += `출발: ${formatDateForDisplay(departureDate)} ${departureAirport} ${departureTime}\n`;
  infoText += `도착: ${formatDateForDisplay(arrivalDate)} ${arrivalAirport} ${arrivalTime}`;

  if (allSchedules.length > 1) {
    infoText += `\n\n[전체 ${allSchedules.length}구간]`;
    allSchedules.forEach((schedule, index) => {
      const segmentType =
        schedule.segmentType ||
        (index === 0
          ? '출발'
          : index === allSchedules.length - 1
            ? '도착'
            : '경유');
      infoText += `\n${index + 1}. ${segmentType}: ${schedule.flightNumber || '-'} (${schedule.departure || '-'} → ${schedule.arrival || '-'})`;
    });
  }

  // 기존 표시 영역 업데이트
  document.getElementById('flight-airline').textContent = airline;
  document.getElementById('flight-number').textContent = flightNumbers;
  document.getElementById('flight-departure').textContent =
    `${formatDateForDisplay(departureDate)} ${departureAirport} ${departureTime}`;
  document.getElementById('flight-arrival').textContent =
    `${formatDateForDisplay(arrivalDate)} ${arrivalAirport} ${arrivalTime}`;

  // 상세 정보를 표시할 수 있도록 추가 영역 생성 또는 업데이트
  let detailInfo = document.getElementById('flight-detail-info');
  if (!detailInfo) {
    detailInfo = document.createElement('div');
    detailInfo.id = 'flight-detail-info';
    detailInfo.style.marginTop = '10px';
    detailInfo.style.padding = '10px';
    detailInfo.style.backgroundColor = '#f9fafb';
    detailInfo.style.borderRadius = '4px';
    detailInfo.style.fontSize = '14px';
    detailInfo.style.whiteSpace = 'pre-line';
    document.getElementById('flight-info').appendChild(detailInfo);
  }
  detailInfo.textContent = infoText;

  document.getElementById('flight-info').style.display = 'block';
}

// 은행 계좌 정보 표시
function displayBankInfo(account) {
  document.getElementById('bank-name').textContent = account.bank_name;
  document.getElementById('account-number').textContent =
    account.account_number;
  document.getElementById('account-holder').textContent =
    account.account_holder;
  document.getElementById('bank-info').style.display = 'block';
}

// 항목 렌더링
function renderItems() {
  const container = document.getElementById('items-container');
  container.innerHTML = '';

  invoiceItems.forEach((item, _index) => {
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.id = `item-row-${item.id}`;

    const total = item.unitPrice * item.quantity;

    itemRow.innerHTML = `
            <input type="text" class="item-name" value="${sanitizeHtml(item.name)}" placeholder="항목명" data-item-id="${item.id}">
            <input type="text" inputmode="numeric" class="item-unit" value="${formatNumberInput(item.unitPrice)}" placeholder="단가" data-item-id="${item.id}">
            <span>×</span>
            <input type="number" class="item-quantity" value="${item.quantity}" min="0" placeholder="수량" data-item-id="${item.id}">
            <span>=</span>
            <span class="item-total" data-item-id="${item.id}">${formatCurrency(total)}</span>
            ${invoiceItems.length > 1 ? `<button type="button" class="btn-remove-item" data-item-id="${item.id}">삭제</button>` : ''}
        `;

    container.appendChild(itemRow);
  });

  // 이벤트 리스너 추가
  attachItemEventListeners();
  calculateTotals();
}

// 항목 이벤트 리스너
function attachItemEventListeners() {
  document
    .querySelectorAll('.item-name, .item-unit, .item-quantity')
    .forEach((input) => {
      input.addEventListener('input', (e) => {
        const itemId = e.target.dataset.itemId;
        updateItem(itemId);
      });
    });

  document.querySelectorAll('.btn-remove-item').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const itemId = e.target.dataset.itemId;
      removeItem(itemId);
    });
  });
}

// 항목 업데이트
function updateItem(itemId) {
  const item = invoiceItems.find((i) => String(i.id) === String(itemId));
  if (!item) return;

  const row = document.getElementById(`item-row-${itemId}`);
  item.name = row.querySelector('.item-name').value || '';
  item.unitPrice = parseNumberInput(row.querySelector('.item-unit').value);
  item.quantity = parseInt(row.querySelector('.item-quantity').value) || 0;

  // 단가 입력 필드에 쉼표 서식 적용
  const unitInput = row.querySelector('.item-unit');
  const cursorPos = unitInput.selectionStart;
  const oldLen = unitInput.value.length;
  unitInput.value = formatNumberInput(item.unitPrice);
  const newLen = unitInput.value.length;
  const newCursor = cursorPos + (newLen - oldLen);
  unitInput.setSelectionRange(newCursor, newCursor);

  const total = item.unitPrice * item.quantity;
  row.querySelector('.item-total').textContent = formatCurrency(total);

  calculateTotals();
}

// 새 항목 추가
function addNewItem() {
  // Simple 모드에서는 최대 2개까지만 허용
  const calcModeEl = document.getElementById('calculation-mode');
  const isSimple = !calcModeEl || calcModeEl.value !== 'advanced';
  if (isSimple && invoiceItems.length >= 2) {
    showToast(
      'Simple 모드에서는 최대 2개 항목까지 추가할 수 있습니다.',
      'warning'
    );
    return;
  }
  const newItem = {
    id: `item-${Date.now()}`,
    name: '',
    unitPrice: 0,
    quantity: 0,
  };
  invoiceItems.push(newItem);
  renderItems();
}

// 항목 삭제
function removeItem(itemId) {
  if (invoiceItems.length <= 1) {
    showToast('최소 1개의 항목이 필요합니다.', 'warning');
    return;
  }
  invoiceItems = invoiceItems.filter((i) => String(i.id) !== String(itemId));
  renderItems();
}

// 자동 계산
function calculateTotals() {
  const total = invoiceItems.reduce((sum, item) => {
    return sum + item.unitPrice * item.quantity;
  }, 0);

  document.getElementById('total-amount').textContent = formatCurrency(total);
}

// 숫자 입력 포맷 (쉼표 구분)
function formatNumberInput(n) {
  if (!n && n !== 0) return '';
  return new Intl.NumberFormat('ko-KR').format(n);
}

function parseNumberInput(str) {
  return parseFloat(String(str).replace(/[^0-9.-]/g, '')) || 0;
}

// 통화 포맷
function formatCurrency(amount) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

// 폼 제출 처리 - 편집 모드 지원 (하단의 handleSubmit 함수 참조)

// 미리보기 처리
function handlePreview() {
  // 폼 데이터 수집
  const previewData = collectFormData();

  // 필수 필드 검증
  if (!previewData.recipient || !previewData.invoice_date) {
    showToast('수신과 일자를 입력해주세요.', 'warning');
    return;
  }

  // Advanced Mode 유효성 검증
  if (previewData.calculation_mode === 'advanced') {
    const errors = validateAdvancedMode();
    if (errors.length > 0) {
      showToast('입력 오류: ' + errors.join(', '), 'warning');
      return;
    }
  }

  try {
    // 새 창에서 미리보기 열기
    const jsonData = JSON.stringify(previewData);
    const encodedData = encodeURIComponent(jsonData);
    const previewUrl = `invoice-preview.html?data=${encodedData}`;

    // URL 길이 제한 체크 (일부 브라우저는 2000자 제한)
    if (previewUrl.length > 2000) {
      console.warn('URL이 너무 깁니다. sessionStorage를 사용합니다.');
      // sessionStorage를 사용하여 데이터 전달
      const tempId = 'preview_' + Date.now();
      sessionStorage.setItem(tempId, jsonData);
      const previewUrlWithId = `invoice-preview.html?previewId=${tempId}`;
      const newWindow = window.open(
        previewUrlWithId,
        '_blank',
        'width=900,height=1200'
      );
      if (!newWindow) {
        showToast(
          '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.',
          'warning'
        );
      }
    } else {
      const newWindow = window.open(
        previewUrl,
        '_blank',
        'width=900,height=1200'
      );
      if (!newWindow) {
        showToast(
          '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.',
          'warning'
        );
      }
    }
  } catch (error) {
    showToast('미리보기를 열 수 없습니다: ' + error.message, 'error');
  }
}

// 폼 데이터 수집 함수 (미리보기와 PDF에서 공통 사용)
function collectFormData() {
  // 기본 정보
  const recipient = document.getElementById('recipient').value;
  const invoiceDate = document.getElementById('invoice-date').value;
  const description = document.getElementById('description').value;

  // 항공 스케줄 정보 (모든 구간)
  let allSchedules = null;
  const flightSelect = document.getElementById('flight-schedule');
  if (flightSelect.value) {
    const option = flightSelect.selectedOptions[0];
    if (option.dataset.allSchedules) {
      allSchedules = JSON.parse(option.dataset.allSchedules);
    } else if (option.dataset.schedule) {
      allSchedules = [JSON.parse(option.dataset.schedule)];
    }
  }

  // 은행 계좌 정보
  let bankAccount = null;
  const bankSelect = document.getElementById('bank-account');
  if (bankSelect.value) {
    const option = bankSelect.selectedOptions[0];
    if (option.dataset.account) {
      bankAccount = JSON.parse(option.dataset.account);
    }
  }

  // 항목 데이터 수집 (빈 항목 제외)
  const items = invoiceItems
    .filter((item) => item.name && item.name.trim() !== '')
    .map((item) => ({
      name: item.name,
      unit_price: item.unitPrice || 0,
      quantity: item.quantity || 0,
      total: (item.unitPrice || 0) * (item.quantity || 0),
    }));

  // 항공 스케줄 정보 변환 (미리보기용 - 모든 구간 포함)
  let flightScheduleForPreview = null;
  if (allSchedules && allSchedules.length > 0) {
    const firstSchedule = allSchedules[0];
    const lastSchedule = allSchedules[allSchedules.length - 1];

    flightScheduleForPreview = {
      departure_date:
        firstSchedule.departureDate || firstSchedule.departure_date,
      departure_airport:
        firstSchedule.departure || firstSchedule.departure_airport,
      departure_time:
        firstSchedule.departureTime || firstSchedule.departure_time,
      arrival_date: lastSchedule.arrivalDate || lastSchedule.arrival_date,
      arrival_airport: lastSchedule.arrival || lastSchedule.arrival_airport,
      arrival_time: lastSchedule.arrivalTime || lastSchedule.arrival_time,
      all_segments: allSchedules.map((schedule) => {
        let departureAirport =
          schedule.departure || schedule.departure_airport || '';
        let arrivalAirport = schedule.arrival || schedule.arrival_airport || '';

        if (typeof departureAirport === 'object' && departureAirport !== null) {
          const name = departureAirport.airport || departureAirport.name || '';
          const code = departureAirport.code || '';
          departureAirport =
            name && code ? `${name} (${code})` : name || code || '';
        }

        if (typeof arrivalAirport === 'object' && arrivalAirport !== null) {
          const name = arrivalAirport.airport || arrivalAirport.name || '';
          const code = arrivalAirport.code || '';
          arrivalAirport =
            name && code ? `${name} (${code})` : name || code || '';
        }

        let arrivalTime = schedule.arrivalTime || schedule.arrival_time || '';
        if (
          !arrivalTime &&
          schedule.arrival &&
          typeof schedule.arrival === 'object'
        ) {
          arrivalTime = schedule.arrival.time || '';
        }

        let departureTime =
          schedule.departureTime || schedule.departure_time || '';
        if (
          !departureTime &&
          schedule.departure &&
          typeof schedule.departure === 'object'
        ) {
          departureTime = schedule.departure.time || '';
        }

        return {
          segment_type: schedule.segmentType || '경유',
          flight_number: schedule.flightNumber || schedule.flight_number || '',
          airline: schedule.airline || '',
          departure_date:
            schedule.departureDate || schedule.departure_date || '',
          departure_airport: departureAirport,
          departure_time: departureTime,
          arrival_date:
            schedule.arrivalDate ||
            schedule.arrival_date ||
            schedule.departureDate ||
            schedule.departure_date ||
            '',
          arrival_airport: arrivalAirport,
          arrival_time: arrivalTime,
        };
      }),
    };
  }

  // 계산 모드 확인
  const calcMode = document.querySelector(
    'input[name="calc-mode"]:checked'
  ).value;

  // 데이터 구성
  const formData = {
    recipient,
    invoice_date: invoiceDate,
    description,
    items: items,
    flight_schedule: flightScheduleForPreview,
    bank_account: bankAccount,
    calculation_mode: calcMode,
  };

  // Advanced Mode 데이터 추가
  if (calcMode === 'advanced') {
    const groups = getGroups();
    const extras = getExtraItems();
    const airfareTotal = groups.reduce((s, g) => s + g.unitPrice * g.count, 0);
    const depositTotal = groups.reduce((s, g) => s + g.deposit * g.count, 0);
    const extrasTotal = extras.reduce((s, ex) => {
      const sub = ex.unitPrice * ex.count;
      return ex.type === 'subtract' ? s - sub : s + sub;
    }, 0);
    const totalCharge = airfareTotal + extrasTotal;
    const balance = totalCharge - depositTotal;
    const totalPax = groups.reduce((s, g) => s + g.count, 0);

    formData.advanced_calculation = {
      groups: groups,
      extras: extras,
      cost_label: getCostLabel(),
      deposit_label: getDepositLabel(),
      base_price_per_person: groups.length > 0 ? groups[0].unitPrice : 0,
      total_participants: totalPax,
      total_travel_cost: airfareTotal,
      deposit_amount: depositTotal,
      deposit_description:
        document.getElementById('deposit-description').value || '',
      additional_items: { groups, extras, cost_label: getCostLabel(), deposit_label: getDepositLabel() },
      balance_due: balance,
    };
  }

  return formData;
}

// PDF 생성 처리
async function handleGeneratePDF() {
  try {
    // 폼 데이터 수집
    const formData = collectFormData();

    // 유효성 검증
    if (!formData.recipient || formData.recipient.trim() === '') {
      showToast('수신자를 입력해주세요.', 'warning');
      return;
    }

    // Advanced Mode 유효성 검증
    if (formData.calculation_mode === 'advanced') {
      const errors = validateAdvancedMode();
      if (errors.length > 0) {
        showToast('입력 오류: ' + errors.join(', '), 'warning');
        return;
      }
    } else {
      // Simple Mode: 항목 확인
      if (!formData.items || formData.items.length === 0) {
        showToast('최소 하나의 항목을 추가해주세요.', 'warning');
        return;
      }
    }

    // sessionStorage에 데이터 저장
    const previewId = 'invoice-preview-' + Date.now();
    sessionStorage.setItem(previewId, JSON.stringify(formData));

    // 미리보기 창 열기 (PDF 생성 안내 포함)
    const previewUrl = `invoice-preview.html?previewId=${previewId}`;
    const previewWindow = window.open(
      previewUrl,
      '_blank',
      'width=900,height=900'
    );

    if (!previewWindow) {
      showToast('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.', 'warning');
      sessionStorage.removeItem(previewId);
    }
  } catch (error) {
    showToast('PDF 생성을 실행할 수 없습니다: ' + error.message, 'error');
  }
}

// ==================== Advanced Mode 로직 ====================

let groupCounter = 0;
let extraItemCounter = 0;

// 계산 모드 전환 함수 (프로그래매틱 호출용)
function toggleCalculationMode(mode) {
  const simpleSection = document.getElementById('simple-mode-section');
  const advancedSection = document.getElementById('advanced-mode-section');

  if (mode === 'simple') {
    simpleSection.style.display = 'block';
    advancedSection.style.display = 'none';
  } else if (mode === 'advanced') {
    simpleSection.style.display = 'none';
    advancedSection.style.display = 'block';
  }
}

// 계산 모드 전환 (라디오 버튼 이벤트)
document.querySelectorAll('input[name="calc-mode"]').forEach((radio) => {
  radio.addEventListener('change', function () {
    toggleCalculationMode(this.value);
  });
});

// ── 인원 그룹 관리 ──────────────────────────────────────────

function addGroup(initialData) {
  const container = document.getElementById('groups-container');
  const groupId = `group-${++groupCounter}`;

  const name = initialData?.name || '';
  const count = initialData?.count || '';
  const unitPrice = initialData?.unitPrice || '';
  const deposit = initialData?.deposit || '';

  const html = `
    <div class="group-row" data-id="${groupId}">
      <div class="group-row-header">
        <input type="text" placeholder="그룹명 (예: 계약금 입금)" class="group-name" value="${name}">
        <button type="button" class="btn-remove-item" onclick="removeGroup('${groupId}')">삭제</button>
      </div>
      <div class="group-row-body">
        <div class="group-field">
          <label>인원</label>
          <input type="number" class="group-count" value="${count}" min="1" placeholder="0">
          <span>명</span>
        </div>
        <div class="group-field">
          <label class="group-cost-label">1인 여행경비</label>
          <input type="text" inputmode="numeric" class="group-unit-price" value="${unitPrice ? formatNumberInput(unitPrice) : ''}" placeholder="0">
          <span>원</span>
        </div>
        <div class="group-field">
          <label>소계</label>
          <span class="group-subtotal" style="min-width:100px">₩ 0</span>
        </div>
        <div class="group-separator"></div>
        <div class="group-field">
          <label class="group-deposit-label">1인 계약금</label>
          <input type="text" inputmode="numeric" class="group-deposit" value="${deposit ? formatNumberInput(deposit) : ''}" placeholder="0">
          <span>원</span>
        </div>
        <div class="group-field">
          <label class="group-deposit-total-label">계약금 소계</label>
          <span class="group-deposit-total" style="min-width:100px">₩ 0</span>
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);

  // 이벤트 바인딩
  const row = container.querySelector(`[data-id="${groupId}"]`);
  row.querySelectorAll('input').forEach((input) => {
    if (input.type === 'text' && input.inputMode === 'numeric') {
      input.addEventListener('input', function () {
        const raw = parseNumberInput(this.value);
        const cursorPos = this.selectionStart;
        const oldLen = this.value.length;
        this.value = raw ? formatNumberInput(raw) : '';
        const newLen = this.value.length;
        const newCursor = cursorPos + (newLen - oldLen);
        this.setSelectionRange(Math.max(0, newCursor), Math.max(0, newCursor));
        calculateAdvancedMode();
      });
    } else {
      input.addEventListener('input', calculateAdvancedMode);
    }
  });

  calculateAdvancedMode();
  updateLabels();
}

function removeGroup(groupId) {
  const el = document.querySelector(`[data-id="${groupId}"]`);
  if (el) el.remove();
  calculateAdvancedMode();
}

function getGroups() {
  const rows = document.querySelectorAll('.group-row');
  return Array.from(rows).map((row) => ({
    name: row.querySelector('.group-name').value || '',
    count: parseInt(row.querySelector('.group-count').value) || 0,
    unitPrice: parseNumberInput(row.querySelector('.group-unit-price').value),
    deposit: parseNumberInput(row.querySelector('.group-deposit').value),
  }));
}

// ── 추가 항목 관리 (단가 × 인원) ─────────────────────────────

function addExtraItem(initialData) {
  const container = document.getElementById('extra-items-container');
  const itemId = `extra-${++extraItemCounter}`;

  const name = initialData?.name || '';
  const unitPrice = initialData?.unitPrice || initialData?.amount || '';
  const count = initialData?.count || '';
  const type = initialData?.type || 'add';

  const html = `
    <div class="extra-item-row" data-id="${itemId}">
      <input type="text" placeholder="항목명 (예: 선택관광)" class="extra-item-name" value="${name}">
      <input type="text" inputmode="numeric" placeholder="단가" class="extra-unit-price" value="${unitPrice ? formatNumberInput(unitPrice) : ''}">
      <span>×</span>
      <input type="number" placeholder="인원" class="extra-count" value="${count}" min="0">
      <span>명 =</span>
      <span class="extra-subtotal">₩ 0</span>
      <select class="extra-item-type">
        <option value="add" ${type === 'add' ? 'selected' : ''}>청구 (+)</option>
        <option value="subtract" ${type === 'subtract' ? 'selected' : ''}>차감 (-)</option>
      </select>
      <button type="button" class="btn-remove-item" onclick="removeExtraItem('${itemId}')">삭제</button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);

  const row = container.querySelector(`[data-id="${itemId}"]`);
  row.querySelectorAll('input, select').forEach((input) => {
    if (input.type === 'text' && input.inputMode === 'numeric') {
      input.addEventListener('input', function () {
        const raw = parseNumberInput(this.value);
        const cursorPos = this.selectionStart;
        const oldLen = this.value.length;
        this.value = raw ? formatNumberInput(raw) : '';
        const newLen = this.value.length;
        const newCursor = cursorPos + (newLen - oldLen);
        this.setSelectionRange(Math.max(0, newCursor), Math.max(0, newCursor));
        calculateAdvancedMode();
      });
    } else {
      input.addEventListener('input', calculateAdvancedMode);
      input.addEventListener('change', calculateAdvancedMode);
    }
  });

  calculateAdvancedMode();
}

function removeExtraItem(itemId) {
  const el = document.querySelector(`[data-id="${itemId}"]`);
  if (el) el.remove();
  calculateAdvancedMode();
}

function getExtraItems() {
  const rows = document.querySelectorAll('.extra-item-row');
  return Array.from(rows)
    .map((row) => ({
      name: row.querySelector('.extra-item-name').value,
      unitPrice: parseNumberInput(row.querySelector('.extra-unit-price').value),
      count: parseInt(row.querySelector('.extra-count').value) || 0,
      type: row.querySelector('.extra-item-type').value,
    }))
    .filter((item) => item.name);
}

// ── 계산 + UI 업데이트 ──────────────────────────────────────

function calculateAdvancedMode() {
  // 1. 그룹별 소계 계산
  const groups = getGroups();
  let airfareTotal = 0;
  let depositTotal = 0;
  let totalParticipants = 0;

  document.querySelectorAll('.group-row').forEach((row, i) => {
    const g = groups[i];
    if (!g) return;
    const sub = g.unitPrice * g.count;
    const depSub = g.deposit * g.count;
    airfareTotal += sub;
    depositTotal += depSub;
    totalParticipants += g.count;
    row.querySelector('.group-subtotal').textContent = formatCurrency(sub);
    row.querySelector('.group-deposit-total').textContent = formatCurrency(depSub);
  });

  // 2. 추가 항목 소계
  const extras = getExtraItems();
  let extrasTotal = 0;
  document.querySelectorAll('.extra-item-row').forEach((row, i) => {
    const ex = extras[i];
    if (!ex) return;
    const sub = ex.unitPrice * ex.count;
    const signed = ex.type === 'subtract' ? -sub : sub;
    extrasTotal += signed;
    row.querySelector('.extra-subtotal').textContent = formatCurrency(sub);
  });

  // 3. 총 청구 / 잔금
  const totalCharge = airfareTotal + extrasTotal;
  const balance = totalCharge - depositTotal;

  // 4. 요약 UI 업데이트
  document.getElementById('breakdown-airfare').textContent = formatCurrency(airfareTotal);
  document.getElementById('breakdown-extras').textContent = formatCurrency(extrasTotal);
  document.getElementById('breakdown-total-charge').textContent = formatCurrency(totalCharge);
  document.getElementById('breakdown-total-paid').textContent = formatCurrency(depositTotal);
  document.getElementById('breakdown-balance').textContent = formatCurrency(balance);

  // 5. 음수 잔금 경고
  const balanceEl = document.getElementById('breakdown-balance');
  const balanceAlert = document.getElementById('balance-alert');

  if (balance < 0) {
    balanceEl.style.color = '#ef4444';
    if (balanceAlert) {
      balanceAlert.style.display = 'block';
      balanceAlert.textContent = `⚠️ 계약금이 청구액보다 ${formatCurrency(Math.abs(balance))} 많습니다.`;
    }
  } else {
    balanceEl.style.color = '#fbbf24';
    if (balanceAlert) balanceAlert.style.display = 'none';
  }
}

// ── 명칭 라벨 관리 ──────────────────────────────────────────

function getCostLabel() {
  const sel = document.getElementById('cost-label-select');
  if (!sel) return '여행경비';
  if (sel.value === 'custom') {
    return document.getElementById('cost-label-custom').value || '여행경비';
  }
  return sel.value;
}

function getDepositLabel() {
  const sel = document.getElementById('deposit-label-select');
  if (!sel) return '계약금';
  if (sel.value === 'custom') {
    return document.getElementById('deposit-label-custom').value || '계약금';
  }
  return sel.value;
}

function updateLabels() {
  const costLabel = getCostLabel();
  const depositLabel = getDepositLabel();

  // 카드 제목
  const cardTitle = document.getElementById('groups-card-title');
  if (cardTitle) cardTitle.textContent = `인원 그룹별 ${costLabel}`;

  // 그룹 행 라벨
  document.querySelectorAll('.group-cost-label').forEach(el => {
    el.textContent = `1인 ${costLabel}`;
  });
  document.querySelectorAll('.group-deposit-label').forEach(el => {
    el.textContent = `1인 ${depositLabel}`;
  });
  document.querySelectorAll('.group-deposit-total-label').forEach(el => {
    el.textContent = `${depositLabel} 소계`;
  });

  // 요약 라벨
  const summCost = document.getElementById('summary-cost-label');
  if (summCost) summCost.textContent = `${costLabel} 소계:`;
  const summDeposit = document.getElementById('summary-deposit-label');
  if (summDeposit) summDeposit.textContent = `총 ${depositLabel}:`;
}

// 라벨 드롭다운 이벤트
['cost-label-select', 'deposit-label-select'].forEach(id => {
  const sel = document.getElementById(id);
  if (!sel) return;
  const customInput = document.getElementById(id.replace('select', 'custom'));
  sel.addEventListener('change', function () {
    if (customInput) customInput.style.display = this.value === 'custom' ? 'inline-block' : 'none';
    updateLabels();
  });
  if (customInput) {
    customInput.addEventListener('input', updateLabels);
  }
});

// ── 그룹 프리셋 관리 ────────────────────────────────────────

const GROUP_PRESET_KEY = 'invoice_group_presets';

function loadGroupPresets() {
  try {
    return JSON.parse(localStorage.getItem(GROUP_PRESET_KEY) || '[]');
  } catch { return []; }
}

function saveGroupPresets(presets) {
  localStorage.setItem(GROUP_PRESET_KEY, JSON.stringify(presets));
}

function refreshPresetSelect() {
  const sel = document.getElementById('group-preset-select');
  if (!sel) return;
  const presets = loadGroupPresets();
  sel.innerHTML = '<option value="">프리셋 불러오기...</option>';
  presets.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    const summary = p.groups.map(g => `${g.name || '그룹'}(${g.count}명)`).join(' + ');
    opt.textContent = `${p.name} — ${summary}`;
    sel.appendChild(opt);
  });
  // 삭제 옵션
  if (presets.length > 0) {
    const divider = document.createElement('option');
    divider.disabled = true;
    divider.textContent = '──────────';
    sel.appendChild(divider);
    presets.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = `delete-${i}`;
      opt.textContent = `🗑 삭제: ${p.name}`;
      opt.style.color = '#ef4444';
      sel.appendChild(opt);
    });
  }
}

// 프리셋 저장
document.getElementById('save-group-preset-btn').addEventListener('click', function () {
  const groups = getGroups();
  const extras = getExtraItems();
  if (groups.length === 0) {
    alert('저장할 그룹이 없습니다.');
    return;
  }
  const name = prompt('프리셋 이름을 입력하세요:', '');
  if (!name || !name.trim()) return;

  const presets = loadGroupPresets();
  presets.push({
    name: name.trim(),
    groups,
    extras,
    costLabel: getCostLabel(),
    depositLabel: getDepositLabel(),
    description: document.getElementById('deposit-description').value || '',
  });
  saveGroupPresets(presets);
  refreshPresetSelect();
  alert(`프리셋 "${name.trim()}" 저장 완료`);
});

// 프리셋 불러오기 / 삭제
document.getElementById('group-preset-select').addEventListener('change', function () {
  const val = this.value;
  if (!val) return;

  if (val.startsWith('delete-')) {
    const idx = parseInt(val.replace('delete-', ''));
    const presets = loadGroupPresets();
    if (idx >= 0 && idx < presets.length) {
      if (confirm(`"${presets[idx].name}" 프리셋을 삭제하시겠습니까?`)) {
        presets.splice(idx, 1);
        saveGroupPresets(presets);
        refreshPresetSelect();
      }
    }
    this.value = '';
    return;
  }

  const idx = parseInt(val);
  const presets = loadGroupPresets();
  const preset = presets[idx];
  if (!preset) return;

  // 그룹 + 추가항목 복원
  document.getElementById('groups-container').innerHTML = '';
  document.getElementById('extra-items-container').innerHTML = '';
  groupCounter = 0;
  extraItemCounter = 0;

  (preset.groups || []).forEach(g => addGroup(g));
  (preset.extras || []).forEach(ex => addExtraItem(ex));

  if (preset.description) {
    document.getElementById('deposit-description').value = preset.description;
  }

  // 라벨 복원
  if (preset.costLabel) {
    const costSel = document.getElementById('cost-label-select');
    const costCustom = document.getElementById('cost-label-custom');
    if (['여행경비', '항공료', '패키지비용'].includes(preset.costLabel)) {
      costSel.value = preset.costLabel;
      costCustom.style.display = 'none';
    } else {
      costSel.value = 'custom';
      costCustom.style.display = 'inline-block';
      costCustom.value = preset.costLabel;
    }
  }
  if (preset.depositLabel) {
    const depSel = document.getElementById('deposit-label-select');
    const depCustom = document.getElementById('deposit-label-custom');
    if (['계약금', '선입금', '입금액'].includes(preset.depositLabel)) {
      depSel.value = preset.depositLabel;
      depCustom.style.display = 'none';
    } else {
      depSel.value = 'custom';
      depCustom.style.display = 'inline-block';
      depCustom.value = preset.depositLabel;
    }
  }

  updateLabels();
  calculateAdvancedMode();
  this.value = '';
});

// 페이지 로드 시 프리셋 목록 초기화
refreshPresetSelect();

// ── 이벤트 리스너 ───────────────────────────────────────────

document.getElementById('add-group-btn').addEventListener('click', function () {
  addGroup();
});

document.getElementById('add-extra-item-btn').addEventListener('click', function () {
  addExtraItem();
});

// Advanced Mode 유효성 검증
function validateAdvancedMode() {
  const errors = [];

  const groups = getGroups();
  if (groups.length === 0) {
    errors.push('최소 하나의 인원 그룹을 추가해주세요.');
  }

  // 0명 그룹 경고
  const emptyGroups = groups.filter(g => g.count <= 0);
  if (emptyGroups.length > 0) {
    errors.push(`인원이 0명인 그룹이 있습니다: ${emptyGroups.map(g => g.name || '이름없음').join(', ')}`);
  }

  const totalPax = groups.reduce((sum, g) => sum + g.count, 0);
  if (totalPax <= 0 && groups.length > 0) {
    errors.push('총 인원이 0명입니다.');
  }

  // 여행경비 0원 그룹 경고
  const zeroPrice = groups.filter(g => g.count > 0 && g.unitPrice <= 0);
  if (zeroPrice.length > 0) {
    errors.push(`여행경비가 0원인 그룹이 있습니다: ${zeroPrice.map(g => g.name || '이름없음').join(', ')}`);
  }

  return errors;
}

// ==================== 인보이스 불러오기/편집 ====================

let currentInvoiceId = null; // 현재 편집 중인 인보이스 ID

// 인보이스 데이터 로드 (편집 모드)
async function loadInvoiceForEdit(invoiceId) {
  try {
    const invoice = await fetchJSON(`${API_BASE_URL}/invoices/${invoiceId}`);

    currentInvoiceId = invoiceId;

    // 기본 정보 채우기
    document.getElementById('recipient').value = invoice.recipient || '';
    document.getElementById('invoice-date').value = invoice.invoice_date || '';
    document.getElementById('description').value = invoice.description || '';

    // 항공 스케줄 선택
    if (invoice.flight_schedule_id) {
      document.getElementById('flight-schedule').value =
        invoice.flight_schedule_id;
    }

    // 은행 계좌 선택
    if (invoice.bank_account_id) {
      document.getElementById('bank-account').value = invoice.bank_account_id;
    }

    // 계산 모드 설정
    const calcMode = invoice.calculation_mode || 'simple';
    const modeRadio = document.querySelector(
      `input[name="calc-mode"][value="${calcMode}"]`
    );
    if (modeRadio) {
      modeRadio.checked = true;
      toggleCalculationMode(calcMode); // 모드 전환
    }

    // Advanced Mode 데이터 복원
    if (calcMode === 'advanced') {
      await restoreAdvancedModeData(invoice);
    } else {
      // Simple Mode 항목 복원
      restoreSimpleModeItems(invoice);
    }

    // 페이지 제목 변경
    document.title = `인보이스 편집 - ${invoice.invoice_number}`;

    showToast(
      `인보이스를 불러왔습니다. 번호: ${invoice.invoice_number}`,
      'success'
    );
  } catch (error) {
    showToast(
      '인보이스를 불러오는 중 오류가 발생했습니다: ' + error.message,
      'error'
    );
  }
}

// Advanced Mode 데이터 복원
async function restoreAdvancedModeData(invoice) {
  // 비고
  if (invoice.deposit_description) {
    document.getElementById('deposit-description').value =
      invoice.deposit_description;
  }

  // 라벨 복원
  const data = invoice.additional_items;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.cost_label) {
      const costSel = document.getElementById('cost-label-select');
      const costCustom = document.getElementById('cost-label-custom');
      if (['여행경비', '항공료', '패키지비용'].includes(data.cost_label)) {
        costSel.value = data.cost_label;
        costCustom.style.display = 'none';
      } else {
        costSel.value = 'custom';
        costCustom.style.display = 'inline-block';
        costCustom.value = data.cost_label;
      }
    }
    if (data.deposit_label) {
      const depSel = document.getElementById('deposit-label-select');
      const depCustom = document.getElementById('deposit-label-custom');
      if (['계약금', '선입금', '입금액'].includes(data.deposit_label)) {
        depSel.value = data.deposit_label;
        depCustom.style.display = 'none';
      } else {
        depSel.value = 'custom';
        depCustom.style.display = 'inline-block';
        depCustom.value = data.deposit_label;
      }
    }
  }

  // 컨테이너 초기화
  document.getElementById('groups-container').innerHTML = '';
  resetExtraItems();
  groupCounter = 0;
  extraItemCounter = 0;

  // additional_items 파싱 — 새 형식(object with groups/extras) vs 구 형식(array)

  if (data && typeof data === 'object' && !Array.isArray(data) && data.groups) {
    // 새 형식: { groups: [...], extras: [...] }
    (data.groups || []).forEach((g) => addGroup(g));
    (data.extras || []).forEach((ex) => addExtraItem(ex));
  } else if (Array.isArray(data)) {
    // 구 형식: 배열 → 추가항목으로 복원 (하위호환)
    data.forEach((item) => addExtraItem(item));

    // 구 형식에서 base_price/participants가 있으면 그룹 1개로 복원
    if (invoice.base_price_per_person && invoice.total_participants) {
      addGroup({
        name: '전체',
        count: invoice.total_participants,
        unitPrice: invoice.base_price_per_person,
        deposit: invoice.deposit_amount
          ? Math.round(invoice.deposit_amount / invoice.total_participants)
          : 0,
      });
    }
  } else {
    // 데이터 없음 — base_price/participants로 그룹 생성
    if (invoice.base_price_per_person && invoice.total_participants) {
      addGroup({
        name: '전체',
        count: invoice.total_participants,
        unitPrice: invoice.base_price_per_person,
        deposit: invoice.deposit_amount
          ? Math.round(invoice.deposit_amount / invoice.total_participants)
          : 0,
      });
    }
  }

  // 계산 + 라벨 실행
  setTimeout(() => {
    calculateAdvancedMode();
    updateLabels();
  }, 100);
}

// Simple Mode 항목 복원
function restoreSimpleModeItems(invoice) {
  invoiceItems = [];

  // 항공료
  if (invoice.airfare_unit_price > 0) {
    invoiceItems.push({
      id: `item-${Date.now()}`,
      name: '항공료',
      unitPrice: invoice.airfare_unit_price,
      quantity: invoice.airfare_quantity,
    });
  }

  // 좌석 선호
  if (invoice.seat_preference_unit_price > 0) {
    invoiceItems.push({
      id: `item-${Date.now() + 1}`,
      name: '좌석 선호',
      unitPrice: invoice.seat_preference_unit_price,
      quantity: invoice.seat_preference_quantity,
    });
  }

  renderItems();
}

// handleSubmit 수정 - PUT 메서드 지원
async function handleSubmit(e) {
  e.preventDefault();

  // collectFormData()를 사용하여 폼 데이터 수집
  const formData = collectFormData();

  // 필수 필드 검증
  if (!formData.recipient || !formData.invoice_date) {
    showToast('수신자와 일자는 필수입니다.', 'warning');
    return;
  }

  // Advanced Mode 유효성 검증
  if (formData.calculation_mode === 'advanced') {
    const errors = validateAdvancedMode();
    if (errors.length > 0) {
      showToast('입력 오류: ' + errors.join(', '), 'warning');
      return;
    }
  } else {
    // Simple Mode: 항목 확인
    if (!formData.items || formData.items.length === 0) {
      showToast('최소 하나의 항목을 추가해주세요.', 'warning');
      return;
    }
  }

  // API 호출을 위한 데이터 변환
  const apiData = {
    recipient: formData.recipient,
    invoice_date: formData.invoice_date,
    description: formData.description,
    flight_schedule_id:
      document.getElementById('flight-schedule').value || null,
    bank_account_id: document.getElementById('bank-account').value || null,
    calculation_mode: formData.calculation_mode,
  };

  if (formData.calculation_mode === 'advanced') {
    // Advanced Mode 데이터 평탄화 (flatten)
    const adv = formData.advanced_calculation;
    apiData.base_price_per_person = adv.base_price_per_person;
    apiData.total_participants = adv.total_participants;
    apiData.total_travel_cost = adv.total_travel_cost;
    apiData.deposit_amount = adv.deposit_amount;
    apiData.deposit_description = adv.deposit_description;
    apiData.additional_items = adv.additional_items;
    apiData.balance_due = adv.balance_due;
  } else {
    // Simple Mode: 항목 데이터를 airfare로 변환
    if (formData.items && formData.items.length > 0) {
      const firstItem = formData.items[0];
      apiData.airfare_unit_price = firstItem.unit_price;
      apiData.airfare_quantity = firstItem.quantity;
    }

    // 두 번째 항목이 있으면 seat_preference로 처리
    if (formData.items && formData.items.length > 1) {
      const secondItem = formData.items[1];
      apiData.seat_preference_unit_price = secondItem.unit_price;
      apiData.seat_preference_quantity = secondItem.quantity;
    }
  }

  try {
    const invoice = currentInvoiceId
      ? await fetchJSON(`${API_BASE_URL}/invoices/${currentInvoiceId}`, {
          method: 'PUT',
          body: JSON.stringify(apiData),
        })
      : await fetchJSON(`${API_BASE_URL}/invoices`, {
          method: 'POST',
          body: JSON.stringify(apiData),
        });

    const action = currentInvoiceId ? '수정' : '저장';
    showToast(
      `인보이스가 ${action}되었습니다. 번호: ${invoice.invoice_number}`,
      'success'
    );

    // 목록 페이지로 이동
    if (
      await showConfirmModal('저장 완료', '인보이스 목록으로 이동하시겠습니까?')
    ) {
      window.location.href = '/invoices';
    }
  } catch (error) {
    showToast('저장 중 오류가 발생했습니다: ' + error.message, 'error');
  }
}

// 추가 비용 항목 초기화 (외부 모듈용)
function resetExtraItems() {
  const container = document.getElementById('extra-items-container');
  container.innerHTML = '';
  extraItemCounter = 0;
}

// onclick 핸들러용 window 노출
window.removeExtraItem = removeExtraItem;
window.removeGroup = removeGroup;

// ESM exports (다른 모듈에서 사용)
export {
  API_BASE_URL,
  collectFormData,
  getGroups,
  getExtraItems,
  getCostLabel,
  getDepositLabel,
  addGroup,
  addExtraItem,
  calculateAdvancedMode,
  resetExtraItems,
  formatCurrency,
  formatDateForDisplay,
  toggleCalculationMode,
};
