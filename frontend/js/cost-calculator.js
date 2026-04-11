// 원가 계산서 JavaScript

// 기본 환율 (KRW 기준)
const DEFAULT_EXCHANGE_USD = 1300;
const DEFAULT_EXCHANGE_EUR = 1450;
const DEFAULT_EXCHANGE_JPY = 950;

function _escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// 초기화
function initCostCalculator() {
  setupEventListeners();
  loadFlightSchedules();
  calculateFlightCosts();
  calculateEtcCosts();
  calculateCosts();
  generateCostCode(); // 원가 코드 자동 생성
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 모든 입력 필드에 계산 이벤트 연결
  const inputs = document.querySelectorAll(
    'input[type="number"], input[type="date"], select'
  );
  inputs.forEach((input) => {
    input.addEventListener('input', calculateCosts);
    input.addEventListener('change', calculateCosts);
  });

  // 항공요금 추가 버튼
  const addFareBtn = document.getElementById('btnAddFlightFare');
  if (addFareBtn) {
    addFareBtn.addEventListener('click', addFlightFareRow);
  }

  // 그룹명 선택 이벤트
  const groupSelect = document.getElementById('costFlightGroupSelect');
  if (groupSelect) {
    groupSelect.addEventListener('change', onGroupChange);
  }

  // 항공 스케줄 불러오기 버튼
  const loadFlightBtn = document.getElementById('btnLoadFlightSchedule');
  if (loadFlightBtn) {
    loadFlightBtn.addEventListener('click', loadSelectedFlightSchedule);
  }

  // 템플릿 저장 버튼
  const saveTemplateBtn = document.getElementById('btnSaveCostTemplate');
  if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener('click', saveCostTemplate);
  }

  // 템플릿 불러오기 버튼
  const loadTemplateBtn = document.getElementById('btnLoadCostTemplate');
  if (loadTemplateBtn) {
    loadTemplateBtn.addEventListener('click', loadCostTemplate);
  }

  // 인쇄 버튼
  const printBtn = document.getElementById('btnPrintCost');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  // 엑셀 내보내기 버튼
  const excelBtn = document.getElementById('btnExportCostExcel');
  if (excelBtn) {
    excelBtn.addEventListener('click', exportCostToExcel);
  }

  // 견적서로 변환 버튼
  const quoteBtn = document.getElementById('btnConvertToQuote');
  if (quoteBtn) {
    quoteBtn.addEventListener('click', convertCostToQuote);
  }

  // DB 저장 버튼
  const saveCostDBBtn = document.getElementById('btnSaveCostDB');
  if (saveCostDBBtn) {
    saveCostDBBtn.addEventListener('click', saveCostToDB);
  }

  // DB 불러오기 버튼
  const loadCostDBBtn = document.getElementById('btnLoadCostDB');
  if (loadCostDBBtn) {
    loadCostDBBtn.addEventListener('click', loadCostFromDB);
  }

  // 항공요금 행 이벤트 설정
  setupFlightFareRowEvents();

  // 기타원가 추가 버튼
  const addEtcBtn = document.getElementById('btnAddEtcCost');
  if (addEtcBtn) {
    addEtcBtn.addEventListener('click', addEtcCostRow);
  }

  // 기타원가 행 이벤트 설정
  setupEtcCostRowEvents();

  // 인원 변경 시 항공료 및 기타원가 재계산
  ['costAdults', 'costChildren', 'costInfants', 'costTC'].forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        calculateFlightCosts();
        calculateEtcCosts();
      });
    }
  });

  // 날짜 검증 이벤트
  const departureDateInput = document.getElementById('costDepartureDate');
  const arrivalDateInput = document.getElementById('costArrivalDate');

  if (departureDateInput) {
    departureDateInput.addEventListener('change', validateAndCalculateDates);
  }

  if (arrivalDateInput) {
    arrivalDateInput.addEventListener('change', validateAndCalculateDates);
  }
}

// 항공 스케줄 목록 불러오기
async function loadFlightSchedules() {
  try {
    // 모든 스케줄 조회
    const schedules = await fetchJSON('/api/schedules');

    // 그룹명 추출 (중복 제거)
    const groupNames = new Set();
    schedules.forEach((schedule) => {
      if (schedule.group_name) {
        groupNames.add(schedule.group_name);
      }
    });

    // 그룹명 드롭다운 채우기
    const groupSelect = document.getElementById('costFlightGroupSelect');
    if (groupSelect) {
      // 기존 옵션 제거 (첫 번째 제외)
      while (groupSelect.options.length > 1) {
        groupSelect.remove(1);
      }

      // 그룹명 추가
      Array.from(groupNames)
        .sort()
        .forEach((groupName) => {
          const option = new Option(groupName, groupName);
          groupSelect.add(option);
        });
    }
  } catch (error) {
    console.error('항공 스케줄 불러오기 실패:', error);
    // 백엔드 서버 없어도 페이지는 정상 작동
  }
}

// 그룹 선택 시 스케줄 필터링
async function onGroupChange() {
  const groupSelect = document.getElementById('costFlightGroupSelect');
  const scheduleSelect = document.getElementById('costFlightScheduleSelect');

  if (!groupSelect || !scheduleSelect) return;

  const selectedGroup = groupSelect.value;

  // 기존 옵션 제거 (첫 번째 제외)
  while (scheduleSelect.options.length > 1) {
    scheduleSelect.remove(1);
  }

  if (!selectedGroup) {
    return; // 그룹 미선택 시 종료
  }

  try {
    // 선택한 그룹의 스케줄 조회
    const schedules = await fetchJSON(
      `/api/schedules?group=${encodeURIComponent(selectedGroup)}`
    );

    // 항공편 정보가 있는 스케줄만 필터링
    const flightSchedules = schedules.filter(
      (s) => s.transport && s.transport.trim() !== ''
    );

    if (flightSchedules.length === 0) {
      showToast('해당 그룹에 항공편 정보가 없습니다.', 'warning');
      return;
    }

    // 스케줄 옵션 추가
    flightSchedules.forEach((schedule) => {
      const displayText = `${schedule.event_date || ''} - ${schedule.location || ''} (${schedule.transport || ''})`;
      const option = new Option(displayText, schedule.id);
      option.dataset.scheduleData = JSON.stringify(schedule);
      scheduleSelect.add(option);
    });
  } catch (error) {
    showToast('스케줄 필터링에 실패했습니다.', 'error');
  }
}

// 선택한 항공 스케줄 불러오기
function loadSelectedFlightSchedule() {
  const select = document.getElementById('costFlightScheduleSelect');
  if (!select || !select.value) {
    showToast('항공 스케줄을 선택하세요.', 'warning');
    return;
  }

  const selectedOption = select.options[select.selectedIndex];
  const scheduleData = JSON.parse(selectedOption.dataset.scheduleData || '{}');

  if (!scheduleData || !scheduleData.transport) {
    showToast('항공편 정보가 없습니다.', 'warning');
    return;
  }

  // transport 필드에서 항공사와 항공편 번호 추출
  const transport = scheduleData.transport || '';
  let airline = '';

  // 항공편 번호 패턴 추출
  const flightMatch = transport.match(/([A-Z]{2})(\d+)/);
  if (flightMatch) {
    const airlineCode = flightMatch[1];

    // 항공사 코드를 한글명으로 변환
    const airlineMap = {
      KE: '대한항공',
      OZ: '아시아나항공',
      TW: '티웨이항공',
      LJ: '진에어',
      BX: '에어부산',
      ZE: '이스타항공',
      RS: '에어서울',
      '7C': '제주항공',
      YP: '에어프레미아',
      LH: '루프트한자',
      AF: '에어프랑스',
      BA: '브리티시항공',
      NH: '전일본공수',
      JL: '일본항공',
      CZ: '중국남방항공',
      CA: '중국국제항공',
      MU: '중국동방항공',
    };

    airline = airlineMap[airlineCode] || airlineCode;
  } else {
    airline = transport;
  }

  // 노선 추출
  const route = scheduleData.location || '';

  // 폼에 입력
  const airlineInput = document.getElementById('costAirline');
  const routeInput = document.getElementById('costRoute');

  if (airlineInput) airlineInput.value = airline;
  if (routeInput) routeInput.value = route;

  showToast('항공 정보가 입력되었습니다.', 'success');
}

// 항공요금 행 추가
function addFlightFareRow() {
  const container = document.getElementById('flightFareRows');
  if (!container) return;

  const rows = container.querySelectorAll('.flight-fare-row');
  const newRowIndex = rows.length;
  const fareLabel = String.fromCharCode(65 + newRowIndex) + '요금'; // A, B, C...

  const newRow = document.createElement('div');
  newRow.className =
    'flight-fare-row grid grid-cols-12 gap-2 mb-2 items-center';
  newRow.innerHTML = `
        <div class="col-span-4">
            <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm fare-name" type="text" placeholder="예: A요금" value="${fareLabel}"/>
        </div>
        <div class="col-span-3">
            <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm text-right fare-price" type="number" min="0" value="0"/>
        </div>
        <div class="col-span-2">
            <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm text-center fare-pax" type="number" min="0" value="0"/>
        </div>
        <div class="col-span-2">
            <span class="text-sm font-semibold text-gray-900 dark:text-white block text-right fare-total">0원</span>
        </div>
        <div class="col-span-1 text-center">
            <button class="text-red-500 hover:text-red-700 btn-remove-fare" title="삭제">
                <span class="material-icons text-sm">close</span>
            </button>
        </div>
    `;

  container.appendChild(newRow);
  setupFlightFareRowEvents();
  calculateFlightCosts();
}

// 항공요금 행 이벤트 설정
function setupFlightFareRowEvents() {
  const container = document.getElementById('flightFareRows');
  if (!container) return;

  // 모든 입력 필드에 이벤트 리스너 추가
  const inputs = container.querySelectorAll('input');
  inputs.forEach((input) => {
    input.removeEventListener('input', calculateFlightCosts);
    input.addEventListener('input', calculateFlightCosts);
  });

  // 모든 삭제 버튼에 이벤트 리스너 추가
  const removeBtns = container.querySelectorAll('.btn-remove-fare');
  removeBtns.forEach((btn) => {
    btn.removeEventListener('click', removeFlightFareRow);
    btn.addEventListener('click', removeFlightFareRow);
  });
}

// 항공요금 행 삭제
function removeFlightFareRow(event) {
  const container = document.getElementById('flightFareRows');
  if (!container) return;

  const rows = container.querySelectorAll('.flight-fare-row');

  // 최소 1개 행은 유지
  if (rows.length <= 1) {
    showToast('최소 1개의 항공요금 행이 필요합니다.', 'warning');
    return;
  }

  const row = event.target.closest('.flight-fare-row');
  if (row) {
    row.remove();
    calculateFlightCosts();
  }
}

// 항공요금 계산
function calculateFlightCosts() {
  const container = document.getElementById('flightFareRows');
  if (!container) return;

  const rows = container.querySelectorAll('.flight-fare-row');

  let totalPax = 0;
  let totalFareAmount = 0;

  // 각 행별 계산
  rows.forEach((row) => {
    const priceInput = row.querySelector('.fare-price');
    const paxInput = row.querySelector('.fare-pax');
    const totalSpan = row.querySelector('.fare-total');

    const price = parseFloat(priceInput.value) || 0;
    const pax = parseFloat(paxInput.value) || 0;
    const rowTotal = price * pax;

    totalSpan.textContent = formatNumber(rowTotal) + '원';

    totalPax += pax;
    totalFareAmount += rowTotal;
  });

  // 인솔자(TC) 항공료 자동 추가 (평균 항공료 기준)
  const tc = getNumValue('costTC');
  const avgFare = totalPax > 0 ? totalFareAmount / totalPax : 0;
  const tcFlightCost = avgFare * tc;
  const grandTotal = totalFareAmount + tcFlightCost;

  // 결과 표시
  const payingPax = getPayingPax();
  document.getElementById('flightTotalPax').textContent =
    formatNumber(totalPax + tc) + '명';
  // 항공료 평균 (1인): (손님+인솔자 총액) / 손님
  const perPayingPerson = payingPax > 0 ? grandTotal / payingPax : 0;
  updateValue('flightAvgFare', perPayingPerson);
  updateValue('costFlightTotal', grandTotal);

  // 전체 원가 재계산
  calculateCosts();
}

// 기타원가 행 추가
function addEtcCostRow() {
  const container = document.getElementById('etcCostRows');
  if (!container) return;

  const newRow = document.createElement('div');
  newRow.className = 'etc-cost-row grid grid-cols-12 gap-2 items-center';
  newRow.innerHTML = `
        <div class="col-span-4">
            <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm etc-name" type="text" placeholder="항목명" value=""/>
        </div>
        <div class="col-span-2">
            <select class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm etc-type">
                <option value="per_person">1인당</option>
                <option value="total">총액</option>
            </select>
        </div>
        <div class="col-span-2">
            <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm text-right etc-amount" type="number" min="0" value="0"/>
        </div>
        <div class="col-span-3">
            <span class="text-sm font-semibold text-gray-900 dark:text-white block text-right etc-total">0원</span>
        </div>
        <div class="col-span-1 text-center">
            <button class="text-red-500 hover:text-red-700 btn-remove-etc" title="삭제">
                <span class="material-icons text-sm">close</span>
            </button>
        </div>
    `;

  container.appendChild(newRow);
  setupEtcCostRowEvents();
  calculateEtcCosts();
}

// 기타원가 행 이벤트 설정
function setupEtcCostRowEvents() {
  const container = document.getElementById('etcCostRows');
  if (!container) return;

  // 모든 입력 필드와 셀렉트에 이벤트 리스너 추가
  const inputs = container.querySelectorAll('input, select');
  inputs.forEach((input) => {
    input.removeEventListener('input', calculateEtcCosts);
    input.removeEventListener('change', calculateEtcCosts);
    input.addEventListener('input', calculateEtcCosts);
    input.addEventListener('change', calculateEtcCosts);
  });

  // 모든 삭제 버튼에 이벤트 리스너 추가
  const removeBtns = container.querySelectorAll('.btn-remove-etc');
  removeBtns.forEach((btn) => {
    btn.removeEventListener('click', removeEtcCostRow);
    btn.addEventListener('click', removeEtcCostRow);
  });
}

// 기타원가 행 삭제
function removeEtcCostRow(event) {
  const container = document.getElementById('etcCostRows');
  if (!container) return;

  const rows = container.querySelectorAll('.etc-cost-row');

  // 최소 1개 행은 유지
  if (rows.length <= 1) {
    showToast('최소 1개의 기타원가 항목이 필요합니다.', 'warning');
    return;
  }

  const row = event.target.closest('.etc-cost-row');
  if (row) {
    row.remove();
    calculateEtcCosts();
  }
}

// 기타원가 계산
function calculateEtcCosts() {
  const container = document.getElementById('etcCostRows');
  if (!container) return;

  const rows = container.querySelectorAll('.etc-cost-row');

  // 인원 계산 (손님만 - TC 제외)
  const totalPax = getPayingPax();

  let etcTotalAmount = 0;

  // 각 행별 계산
  rows.forEach((row) => {
    const typeSelect = row.querySelector('.etc-type');
    const amountInput = row.querySelector('.etc-amount');
    const totalSpan = row.querySelector('.etc-total');

    const type = typeSelect.value; // per_person or total
    const amount = parseFloat(amountInput.value) || 0;

    let rowTotal = 0;
    if (type === 'per_person') {
      rowTotal = amount * totalPax;
    } else {
      rowTotal = amount;
    }

    totalSpan.textContent = formatNumber(rowTotal) + '원';
    etcTotalAmount += rowTotal;
  });

  // 기타 총액 표시
  updateValue('costEtcTotal', etcTotalAmount);

  // 전체 원가 재계산
  calculateCosts();
}

// 날짜 검증 및 박/일 자동 계산
function validateAndCalculateDates() {
  const departureDateInput = document.getElementById('costDepartureDate');
  const arrivalDateInput = document.getElementById('costArrivalDate');
  const nightsInput = document.getElementById('costNights');
  const daysInput = document.getElementById('costDays');

  if (!departureDateInput || !arrivalDateInput) return;

  const departureDate = departureDateInput.value;
  const arrivalDate = arrivalDateInput.value;

  // 날짜가 모두 입력된 경우
  if (departureDate && arrivalDate) {
    const depDate = new Date(departureDate);
    const arrDate = new Date(arrivalDate);

    // 도착일이 출발일보다 이전인 경우
    if (arrDate < depDate) {
      showToast('도착일은 출발일보다 이후여야 합니다.', 'warning');
      arrivalDateInput.value = '';
      return;
    }

    // 출발일 설정 시 도착일의 최소값 설정
    arrivalDateInput.min = departureDate;

    // 도착일 설정 시 출발일의 최대값 설정
    departureDateInput.max = arrivalDate;

    // 박/일 자동 계산
    const timeDiff = arrDate - depDate;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (daysDiff >= 0) {
      const nights = daysDiff;
      const days = daysDiff + 1;

      if (nightsInput) nightsInput.value = nights;
      if (daysInput) daysInput.value = days;
    }
  } else if (departureDate) {
    // 출발일만 입력된 경우 도착일의 최소값 설정
    arrivalDateInput.min = departureDate;
  } else if (arrivalDate) {
    // 도착일만 입력된 경우 출발일의 최대값 설정
    departureDateInput.max = arrivalDate;
  }
}

// 숫자를 천단위 콤마로 포맷팅
function formatNumber(num) {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 입력값을 숫자로 변환
function getNumValue(id) {
  const element = document.getElementById(id);
  if (!element) return 0;
  const value = element.value.replace(/,/g, '');
  return parseFloat(value) || 0;
}

// TC 포함 전체 인원 (비용 발생 기준)
function getTotalPax() {
  return (
    getNumValue('costAdults') +
    getNumValue('costChildren') +
    getNumValue('costInfants') +
    getNumValue('costTC')
  );
}

// 고객만 인원 (비용 분담 기준, TC 제외)
function getPayingPax() {
  return (
    getNumValue('costAdults') +
    getNumValue('costChildren') +
    getNumValue('costInfants')
  );
}

// 값 업데이트
function updateValue(id, value, isWon = true) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = formatNumber(value) + (isWon ? '원' : '');
  }
}

// 전체 계산
function calculateCosts() {
  // 인원 계산
  const totalPax = getTotalPax(); // TC 포함 (비용 발생 기준)
  const payingPax = getPayingPax(); // 고객만 (비용 분담 기준)

  // 항공료는 calculateFlightCosts 함수에서 별도로 계산됨
  // costFlightTotal 값을 읽어옴
  const flightTotal = parseInt(
    document
      .getElementById('costFlightTotal')
      ?.textContent.replace(/[^0-9]/g, '') || 0
  );

  // 랜드 원가 1 계산
  const landTotal1 = calculateLandCost(1);

  // 랜드 원가 2 계산
  const landTotal2 = calculateLandCost(2);

  // 국내 이동 차량 (1인당은 payingPax 기준 - TC 비용도 고객이 분담)
  const domesticVehicleTotal = getNumValue('costDomesticVehicleTotal');
  const domesticVehiclePerPerson =
    payingPax > 0 ? domesticVehicleTotal / payingPax : 0;
  updateValue('costDomesticVehiclePerPerson', domesticVehiclePerPerson);

  // 기타 비용 계산 (calculateEtcCosts에서 계산됨)
  // costEtcTotal 값을 읽어옴
  const etcTotal = parseInt(
    document
      .getElementById('costEtcTotal')
      ?.textContent.replace(/[^0-9]/g, '') || 0
  );

  // 요약 1 계산 (항공료 + 랜드원가1 사용)
  calculateSummary(
    1,
    flightTotal,
    landTotal1,
    etcTotal,
    domesticVehicleTotal,
    totalPax,
    payingPax
  );

  // 요약 2 계산 (항공료 + 랜드원가2 사용)
  calculateSummary(
    2,
    flightTotal,
    landTotal2,
    etcTotal,
    domesticVehicleTotal,
    totalPax,
    payingPax
  );
}

// 랜드원가 계산 함수 (그룹별)
function calculateLandCost(groupNum) {
  // 환율 가져오기
  const exchangeUSD = getNumValue(`costExchangeUSD${groupNum}`);
  const exchangeEUR = getNumValue(`costExchangeEUR${groupNum}`);
  const exchangeJPY = getNumValue(`costExchangeJPY${groupNum}`);

  // 랜드 원가 - 통화별 계산
  const landUSD = getNumValue(`costLandUSD${groupNum}`);
  const landEUR = getNumValue(`costLandEUR${groupNum}`);
  const landJPY = getNumValue(`costLandJPY${groupNum}`);
  const landKRW = getNumValue(`costLandKRW${groupNum}`);

  // 환산 금액 계산
  const landUSDConverted = landUSD * exchangeUSD;
  const landEURConverted = landEUR * exchangeEUR;
  const landJPYConverted = (landJPY / 100) * exchangeJPY; // 100엔 기준
  const landKRWConverted = landKRW;

  // 각 통화별 환산 금액 표시
  updateValue(`costLandUSDConverted${groupNum}`, landUSDConverted);
  updateValue(`costLandEURConverted${groupNum}`, landEURConverted);
  updateValue(`costLandJPYConverted${groupNum}`, landJPYConverted);
  updateValue(`costLandKRWDisplay${groupNum}`, landKRWConverted);

  // 랜드 원가 총액 (모든 통화 합계)
  const landTotal =
    landUSDConverted + landEURConverted + landJPYConverted + landKRWConverted;
  updateValue(`costLandTotalDisplay${groupNum}`, landTotal);

  return landTotal;
}

// 원가 계산 요약 함수 (그룹별)
// totalPax: TC 포함 전체 인원 (비용 발생 기준)
// payingPax: 고객만 인원 (비용 분담/수익 기준, TC 제외)
function calculateSummary(
  summaryNum,
  flightTotal,
  landTotal,
  etcTotal,
  domesticVehicleTotal,
  totalPax,
  payingPax
) {
  // 1인당 요금 계산 - 모든 나누기는 payingPax 기준 (TC 비용을 고객이 분담)

  // 국내버스: 총액을 payingPax로 나눔
  const domesticPerPerson =
    payingPax > 0 ? domesticVehicleTotal / payingPax : 0;

  // 항공료: 총액을 payingPax로 나눔 (TC 항공료도 고객이 분담)
  const flightPerPerson = payingPax > 0 ? flightTotal / payingPax : 0;

  // 랜드원가: 1인당 단가 × totalPax(TC 포함) 후 payingPax로 나눔 (TC 랜드비용도 분담)
  const landPerPerson = payingPax > 0 ? (landTotal * totalPax) / payingPax : 0;

  // 기타원가: 총액(손님만 기준으로 계산됨)을 payingPax로 나눔
  const etcPerPerson = payingPax > 0 ? etcTotal / payingPax : 0;

  // 1인당 원가 합계
  const perPersonCost =
    domesticPerPerson + etcPerPerson + flightPerPerson + landPerPerson;

  // 각 항목별 1인당 비용 표시
  updateValue(
    `costDomesticPerPerson${summaryNum}`,
    Math.round(domesticPerPerson)
  );
  updateValue(`costFlightPerPerson${summaryNum}`, Math.round(flightPerPerson));
  updateValue(`costLandPerPerson${summaryNum}`, Math.round(landPerPerson));
  updateValue(`costEtcPerPerson${summaryNum}`, Math.round(etcPerPerson));

  // 순원가 합계 (1인당)
  const netPerPerson = perPersonCost;
  updateValue(`costNetTotal${summaryNum}`, Math.round(netPerPerson));

  // 마진 계산 (금액 직접 입력 - 1인당)
  const marginAmount = getNumValue(`costMarginAmount${summaryNum}`);

  // 마진율 자동 계산 및 표시
  const marginPercent =
    netPerPerson > 0 ? (marginAmount / netPerPerson) * 100 : 0;
  const marginPercentElement = document.getElementById(
    `costMarginPercent${summaryNum}`
  );
  if (marginPercentElement) {
    marginPercentElement.textContent = `(${marginPercent.toFixed(1)}%)`;
  }

  // 1인당 판매가
  const perPersonSell = netPerPerson + marginAmount;
  updateValue(`costPerPerson${summaryNum}`, Math.round(perPersonSell));

  // 총 판매가 = 1인당 판매가 × payingPax (수익은 고객 수 기준)
  const sellTotal = perPersonSell * payingPax;
  updateValue(`costSellTotal${summaryNum}`, Math.round(sellTotal));

  // 전체 원가 (TC 비용 포함)
  const totalCost =
    flightTotal + landTotal * totalPax + domesticVehicleTotal + etcTotal;

  // 손익 분석 계산
  updateProfitAnalysis(
    summaryNum,
    totalCost,
    sellTotal,
    payingPax,
    perPersonSell,
    marginPercent
  );
}

// 손익 분석 업데이트
function updateProfitAnalysis(
  summaryNum,
  netTotal,
  sellTotal,
  totalPax,
  perPerson,
  marginPercent
) {
  // 손익분기점: 원가를 회수하기 위한 최소 인원
  const breakEven = perPerson > 0 ? Math.ceil(netTotal / perPerson) : 0;
  const breakEvenElement = document.getElementById(
    `breakEvenPoint${summaryNum}`
  );
  if (breakEvenElement) {
    breakEvenElement.textContent = breakEven > 0 ? `${breakEven}명` : '-';
  }

  // 최소 참가 인원 (현재 인원과 동일하게 표시)
  const minPaxElement = document.getElementById(`minParticipants${summaryNum}`);
  if (minPaxElement) {
    minPaxElement.textContent = totalPax > 0 ? `${totalPax}명` : '-';
  }

  // 마진율 (계산된 값 표시)
  const marginRateElement = document.getElementById(`marginRate${summaryNum}`);
  if (marginRateElement) {
    marginRateElement.textContent = `${marginPercent.toFixed(1)}%`;
  }
}

// 템플릿 저장
function saveCostTemplate() {
  // 항공요금 행 데이터 수집
  const flightFares = [];
  const rows = document.querySelectorAll('#flightFareRows .flight-fare-row');
  rows.forEach((row) => {
    const name = row.querySelector('.fare-name')?.value || '';
    const price = parseFloat(row.querySelector('.fare-price')?.value) || 0;
    const pax = parseFloat(row.querySelector('.fare-pax')?.value) || 0;
    flightFares.push({ name, price, pax });
  });

  const templateData = {
    destination: document.getElementById('costDestination')?.value || '',
    nights: getNumValue('costNights'),
    days: getNumValue('costDays'),
    departureDate: document.getElementById('costDepartureDate')?.value || '',
    adults: getNumValue('costAdults'),
    children: getNumValue('costChildren'),
    infants: getNumValue('costInfants'),

    flightFares: flightFares,

    exchangeUSD: getNumValue('costExchangeUSD1'),
    exchangeEUR: getNumValue('costExchangeEUR1'),
    exchangeJPY: getNumValue('costExchangeJPY1'),

    landUSD: getNumValue('costLandUSD1'),
    landEUR: getNumValue('costLandEUR1'),
    landJPY: getNumValue('costLandJPY1'),
    landKRW: getNumValue('costLandKRW1'),

    domesticVehicleType:
      document.getElementById('costDomesticVehicleType')?.value || '',
    domesticVehicleTotal: getNumValue('costDomesticVehicleTotal'),

    insurance: getNumValue('costInsurance'),
    visa: getNumValue('costVisa'),
    reserve: getNumValue('costReserve'),

    marginAmount: getNumValue('costMarginAmount1'),
  };

  try {
    localStorage.setItem('costCalculatorTemplate', JSON.stringify(templateData));
    showToast('템플릿이 저장되었습니다.', 'success');
  } catch (_e) {
    showToast('저장 공간이 부족합니다. 불필요한 데이터를 정리해주세요.', 'error');
  }
}

// 템플릿 불러오기
function loadCostTemplate() {
  try {
    const saved = localStorage.getItem('costCalculatorTemplate');
    if (!saved) {
      showToast('저장된 템플릿이 없습니다.', 'warning');
      return;
    }

    const data = JSON.parse(saved);

    // 기본 정보
    if (document.getElementById('costDestination'))
      document.getElementById('costDestination').value = data.destination || '';
    if (document.getElementById('costNights'))
      document.getElementById('costNights').value = data.nights || 3;
    if (document.getElementById('costDays'))
      document.getElementById('costDays').value = data.days || 4;
    if (document.getElementById('costDepartureDate'))
      document.getElementById('costDepartureDate').value =
        data.departureDate || '';
    if (document.getElementById('costAdults'))
      document.getElementById('costAdults').value = data.adults || 0;
    if (document.getElementById('costChildren'))
      document.getElementById('costChildren').value = data.children || 0;
    if (document.getElementById('costInfants'))
      document.getElementById('costInfants').value = data.infants || 0;

    // 항공요금 행 복원
    const container = document.getElementById('flightFareRows');
    if (container && data.flightFares && Array.isArray(data.flightFares)) {
      // 기존 행 모두 삭제
      container.innerHTML = '';

      // 저장된 행 복원
      data.flightFares.forEach((fare) => {
        const newRow = document.createElement('div');
        newRow.className =
          'flight-fare-row grid grid-cols-12 gap-2 mb-2 items-center';
        newRow.innerHTML = `
                    <div class="col-span-4">
                        <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm fare-name" type="text" placeholder="예: A요금" value="${_escapeHtml(fare.name || '')}"/>
                    </div>
                    <div class="col-span-3">
                        <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm text-right fare-price" type="number" min="0" value="${fare.price || 0}"/>
                    </div>
                    <div class="col-span-2">
                        <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm text-center fare-pax" type="number" min="0" value="${fare.pax || 0}"/>
                    </div>
                    <div class="col-span-2">
                        <span class="text-sm font-semibold text-gray-900 dark:text-white block text-right fare-total">0원</span>
                    </div>
                    <div class="col-span-1 text-center">
                        <button class="text-red-500 hover:text-red-700 btn-remove-fare" title="삭제">
                            <span class="material-icons text-sm">close</span>
                        </button>
                    </div>
                `;
        container.appendChild(newRow);
      });

      setupFlightFareRowEvents();
    }

    // 환율
    if (document.getElementById('costExchangeUSD1'))
      document.getElementById('costExchangeUSD1').value =
        data.exchangeUSD || DEFAULT_EXCHANGE_USD;
    if (document.getElementById('costExchangeEUR1'))
      document.getElementById('costExchangeEUR1').value =
        data.exchangeEUR || DEFAULT_EXCHANGE_EUR;
    if (document.getElementById('costExchangeJPY1'))
      document.getElementById('costExchangeJPY1').value =
        data.exchangeJPY || DEFAULT_EXCHANGE_JPY;

    // 랜드 원가 (통화별)
    if (document.getElementById('costLandUSD1'))
      document.getElementById('costLandUSD1').value = data.landUSD || 0;
    if (document.getElementById('costLandEUR1'))
      document.getElementById('costLandEUR1').value = data.landEUR || 0;
    if (document.getElementById('costLandJPY1'))
      document.getElementById('costLandJPY1').value = data.landJPY || 0;
    if (document.getElementById('costLandKRW1'))
      document.getElementById('costLandKRW1').value = data.landKRW || 0;

    // 국내 이동
    if (document.getElementById('costDomesticVehicleType'))
      document.getElementById('costDomesticVehicleType').value =
        data.domesticVehicleType || '';
    if (document.getElementById('costDomesticVehicleTotal'))
      document.getElementById('costDomesticVehicleTotal').value =
        data.domesticVehicleTotal || 0;

    // 기타
    if (document.getElementById('costInsurance'))
      document.getElementById('costInsurance').value = data.insurance || 0;
    if (document.getElementById('costVisa'))
      document.getElementById('costVisa').value = data.visa || 0;
    if (document.getElementById('costReserve'))
      document.getElementById('costReserve').value = data.reserve || 0;

    // 마진 (금액)
    if (document.getElementById('costMarginAmount1'))
      document.getElementById('costMarginAmount1').value =
        data.marginAmount || 0;

    calculateFlightCosts();
    calculateCosts();
    showToast('템플릿을 불러왔습니다.', 'success');
  } catch (error) {
    showToast('템플릿 불러오기에 실패했습니다.', 'error');
  }
}

// 엑셀 내보내기
function exportCostToExcel() {
  const destination =
    document.getElementById('costDestination')?.value || '미정';
  const departureDate =
    document.getElementById('costDepartureDate')?.value || '';

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += `원가 계산서\n\n`;
  csvContent += `여행지,${destination}\n`;
  csvContent += `출발일,${departureDate}\n`;
  csvContent += `인원,성인 ${getNumValue('costAdults')}명 / 소인 ${getNumValue('costChildren')}명 / 유아 ${getNumValue('costInfants')}명\n\n`;

  // 항공요금 상세
  csvContent += `[항공요금 상세]\n`;
  csvContent += `항목명,1인 항공료,인원,총액\n`;

  const rows = document.querySelectorAll('#flightFareRows .flight-fare-row');
  rows.forEach((row) => {
    const name = row.querySelector('.fare-name')?.value || '';
    const price = row.querySelector('.fare-price')?.value || '0';
    const pax = row.querySelector('.fare-pax')?.value || '0';
    const total = row.querySelector('.fare-total')?.textContent || '0원';
    csvContent += `${name},${formatNumber(parseFloat(price))}원,${pax}명,${total}\n`;
  });

  csvContent += `\n전체 인원,${document.getElementById('flightTotalPax')?.textContent || '0명'}\n`;
  csvContent += `항공료 평균(1인),${document.getElementById('flightAvgFare')?.textContent || '0원'}\n`;
  csvContent += `항공 최종 총액,${document.getElementById('costFlightTotal')?.textContent || '0원'}\n\n`;

  // 랜드 원가 상세
  csvContent += `[랜드 원가 상세]\n`;
  csvContent += `USD (${getNumValue('costLandUSD1')} USD),${document.getElementById('costLandUSDConverted1')?.textContent || '0원'}\n`;
  csvContent += `EUR (${getNumValue('costLandEUR1')} EUR),${document.getElementById('costLandEURConverted1')?.textContent || '0원'}\n`;
  csvContent += `JPY (${getNumValue('costLandJPY1')} JPY),${document.getElementById('costLandJPYConverted1')?.textContent || '0원'}\n`;
  csvContent += `KRW,${document.getElementById('costLandKRWDisplay1')?.textContent || '0원'}\n`;
  csvContent += `랜드 원가 합계,${document.getElementById('costLandTotalDisplay1')?.textContent || '0원'}\n\n`;

  csvContent += `국내 이동 (총액: ${getNumValue('costDomesticVehicleTotal')}원),${document.getElementById('costDomesticVehiclePerPerson')?.textContent || '0원'} (1인당)\n`;
  csvContent += `기타,${document.getElementById('costEtcTotal1')?.textContent || '0원'}\n`;
  csvContent += `직접원가,${document.getElementById('costDirectTotal1')?.textContent || '0원'}\n`;
  csvContent += `간접원가,${document.getElementById('costIndirectTotal1')?.textContent || '0원'}\n`;
  csvContent += `총 원가,${document.getElementById('costNetTotal1')?.textContent || '0원'}\n`;

  // 마진 정보 (금액과 퍼센트)
  const marginAmount = getNumValue('costMarginAmount1');
  const marginPercentText =
    document.getElementById('costMarginPercent1')?.textContent || '(0%)';
  csvContent += `마진 ${marginPercentText},${formatNumber(marginAmount)}원\n`;

  csvContent += `판매가,${document.getElementById('costSellTotal1')?.textContent || '0원'}\n`;
  csvContent += `1인당,${document.getElementById('costPerPerson1')?.textContent || '0원'}\n`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `원가계산서_${destination}_${new Date().toISOString().split('T')[0]}.csv`
  );
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 견적서로 변환
function convertCostToQuote() {
  const quoteData = {
    destination: document.getElementById('costDestination')?.value || '',
    departureDate: document.getElementById('costDepartureDate')?.value || '',
    arrivalDate: document.getElementById('costArrivalDate')?.value || '',
    nights: getNumValue('costNights'),
    days: getNumValue('costDays'),
    adults: getNumValue('costAdults'),
    children: getNumValue('costChildren'),
    infants: getNumValue('costInfants'),
    totalPrice: parseInt(
      document
        .getElementById('costSellTotal1')
        ?.textContent.replace(/[^0-9]/g, '') || 0
    ),
    pricePerPerson: parseInt(
      document
        .getElementById('costPerPerson1')
        ?.textContent.replace(/[^0-9]/g, '') || 0
    ),
    airline: document.getElementById('costAirline')?.value || '',
    route: document.getElementById('costRoute')?.value || '',
  };

  try {
    localStorage.setItem('quoteDataFromCost', JSON.stringify(quoteData));
  } catch (_e) {
    showToast('저장 공간이 부족합니다.', 'error');
    return;
  }

  // iframe에서 실행되는지 확인
  if (window.parent && window.parent !== window) {
    // 부모 창에서 견적서 페이지로 이동
    const parentDoc = window.parent.document;
    const quoteNavItem = parentDoc.querySelector('[data-page="quote"]');
    if (quoteNavItem) {
      quoteNavItem.click();
    }
  } else {
    // 독립 페이지로 실행되는 경우
    const quoteNavItem = document.querySelector('[data-page="quote"]');
    if (quoteNavItem) {
      quoteNavItem.click();
    } else {
      // 견적서 페이지가 없는 경우 index.html로 이동
      window.location.href = 'index.html?page=quote';
    }
  }
}

// DB에 저장
async function saveCostToDB() {
  const costCode = document.getElementById('costCode')?.value.trim();
  const costName = document.getElementById('costName')?.value.trim();

  if (!costName) {
    showToast('행사명을 입력하세요.', 'warning');
    return;
  }

  // 항공요금 행 데이터 수집
  const flightFares = [];
  const rows = document.querySelectorAll('#flightFareRows .flight-fare-row');
  rows.forEach((row) => {
    const name = row.querySelector('.fare-name')?.value || '';
    const price = parseFloat(row.querySelector('.fare-price')?.value) || 0;
    const pax = parseFloat(row.querySelector('.fare-pax')?.value) || 0;
    flightFares.push({ name, price, pax });
  });

  // 기타원가 행 데이터 수집 (금액 0인 항목 제외)
  const etcCosts = [];
  const etcRows = document.querySelectorAll('#etcCostRows .etc-cost-row');
  etcRows.forEach((row) => {
    const name = row.querySelector('.etc-name')?.value || '';
    const type = row.querySelector('.etc-type')?.value || 'per_person';
    const amount = parseFloat(row.querySelector('.etc-amount')?.value) || 0;
    if (amount > 0) {
      etcCosts.push({ name, type, amount });
    }
  });

  const costData = {
    code: costCode || null,
    name: costName,
    destination: document.getElementById('costDestination')?.value || '',
    departure_date: document.getElementById('costDepartureDate')?.value || null,
    arrival_date: document.getElementById('costArrivalDate')?.value || null,
    nights: getNumValue('costNights'),
    days: getNumValue('costDays'),
    adults: getNumValue('costAdults'),
    children: getNumValue('costChildren'),
    infants: getNumValue('costInfants'),
    tc: getNumValue('costTC'),

    domestic_vehicle_type:
      document.getElementById('costDomesticVehicleType')?.value || '',
    domestic_vehicle_total: getNumValue('costDomesticVehicleTotal'),

    flight_data: flightFares,
    etc_costs: etcCosts,

    // 랜드원가 1
    land_cost_1: {
      exchangeUSD: getNumValue('costExchangeUSD1'),
      exchangeEUR: getNumValue('costExchangeEUR1'),
      exchangeJPY: getNumValue('costExchangeJPY1'),
      landUSD: getNumValue('costLandUSD1'),
      landEUR: getNumValue('costLandEUR1'),
      landJPY: getNumValue('costLandJPY1'),
      landKRW: getNumValue('costLandKRW1'),
    },

    // 랜드원가 2
    land_cost_2: {
      exchangeUSD: getNumValue('costExchangeUSD2'),
      exchangeEUR: getNumValue('costExchangeEUR2'),
      exchangeJPY: getNumValue('costExchangeJPY2'),
      landUSD: getNumValue('costLandUSD2'),
      landEUR: getNumValue('costLandEUR2'),
      landJPY: getNumValue('costLandJPY2'),
      landKRW: getNumValue('costLandKRW2'),
    },

    margin_amount_1: getNumValue('costMarginAmount1'),
    margin_amount_2: getNumValue('costMarginAmount2'),
    notes_1: document.getElementById('costNotes1')?.value || '',
    notes_2: document.getElementById('costNotes2')?.value || '',
  };

  try {
    const result = await fetchJSON('/api/cost-calculations', {
      method: 'POST',
      body: JSON.stringify(costData),
    });

    // 생성된 코드를 입력 필드에 설정
    if (result.data && result.data.code) {
      document.getElementById('costCode').value = result.data.code;
    }
    showToast(result.message || '원가 계산서가 저장되었습니다.', 'success');
  } catch (error) {
    showToast('저장에 실패했습니다: ' + error.message, 'error');
  }
}

// DB에서 불러오기 (목록에서 선택)
async function loadCostFromDB() {
  try {
    // 목록 조회
    const items = await fetchJSON('/api/cost-calculations');

    if (items.length === 0) {
      showToast('저장된 원가 계산서가 없습니다.', 'warning');
      return;
    }

    // 선택 목록 생성
    const options = items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.code} - ${item.name} (${item.destination || '여행지 미지정'})`
      )
      .join('\n');

    const selectedIdx = await showPromptModal(
      '원가 계산서 불러오기',
      '',
      `불러올 원가 계산서 번호를 입력하세요:\n\n${options}`
    );

    if (!selectedIdx) return;

    const idx = parseInt(selectedIdx) - 1;
    if (isNaN(idx) || idx < 0 || idx >= items.length) {
      showToast('올바른 번호를 입력하세요.', 'warning');
      return;
    }

    const selectedItem = items[idx];

    // 상세 조회
    const data = await fetchJSON(`/api/cost-calculations/${selectedItem.id}`);

    // 저장 정보
    if (document.getElementById('costCode'))
      document.getElementById('costCode').value = data.code || '';
    if (document.getElementById('costName'))
      document.getElementById('costName').value = data.name || '';

    // 기본 정보
    if (document.getElementById('costDestination'))
      document.getElementById('costDestination').value = data.destination || '';
    if (document.getElementById('costNights'))
      document.getElementById('costNights').value = data.nights || 3;
    if (document.getElementById('costDays'))
      document.getElementById('costDays').value = data.days || 4;
    if (document.getElementById('costDepartureDate'))
      document.getElementById('costDepartureDate').value =
        data.departure_date || '';
    if (document.getElementById('costArrivalDate'))
      document.getElementById('costArrivalDate').value =
        data.arrival_date || '';
    if (document.getElementById('costAdults'))
      document.getElementById('costAdults').value = data.adults || 0;
    if (document.getElementById('costChildren'))
      document.getElementById('costChildren').value = data.children || 0;
    if (document.getElementById('costInfants'))
      document.getElementById('costInfants').value = data.infants || 0;
    if (document.getElementById('costTC'))
      document.getElementById('costTC').value = data.tc || 0;

    // 국내 이동
    if (document.getElementById('costDomesticVehicleType'))
      document.getElementById('costDomesticVehicleType').value =
        data.domestic_vehicle_type || '';
    if (document.getElementById('costDomesticVehicleTotal'))
      document.getElementById('costDomesticVehicleTotal').value =
        data.domestic_vehicle_total || 0;

    // 항공요금 행 복원
    const flightContainer = document.getElementById('flightFareRows');
    if (
      flightContainer &&
      data.flight_data &&
      Array.isArray(data.flight_data)
    ) {
      flightContainer.innerHTML = '';
      data.flight_data.forEach((fare) => {
        const newRow = document.createElement('div');
        newRow.className =
          'flight-fare-row grid grid-cols-12 gap-2 mb-2 items-center';
        newRow.innerHTML = `
                    <div class="col-span-4">
                        <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm fare-name" type="text" placeholder="예: A요금" value="${_escapeHtml(fare.name || '')}"/>
                    </div>
                    <div class="col-span-3">
                        <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm text-right fare-price" type="number" min="0" value="${fare.price || 0}"/>
                    </div>
                    <div class="col-span-2">
                        <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm text-center fare-pax" type="number" min="0" value="${fare.pax || 0}"/>
                    </div>
                    <div class="col-span-2">
                        <span class="text-sm font-semibold text-gray-900 dark:text-white block text-right fare-total">0원</span>
                    </div>
                    <div class="col-span-1 text-center">
                        <button class="text-red-500 hover:text-red-700 btn-remove-fare" title="삭제">
                            <span class="material-icons text-sm">close</span>
                        </button>
                    </div>
                `;
        flightContainer.appendChild(newRow);
      });
      setupFlightFareRowEvents();
    }

    // 기타원가 행 복원 + 토글 상태 결정
    const etcContainer = document.getElementById('etcCostRows');
    const etcBody = document.getElementById('etcCostBody');
    const etcIcon = document.getElementById('etcCostToggleIcon');
    const etcSummary = document.getElementById('etcCostToggleSummary');
    const hasEtcData = data.etc_costs && Array.isArray(data.etc_costs) && data.etc_costs.length > 0;

    if (etcContainer && hasEtcData) {
      etcContainer.innerHTML = '';
      data.etc_costs.forEach((item) => {
        const newRow = document.createElement('div');
        newRow.className = 'etc-cost-row grid grid-cols-12 gap-2 items-center';
        newRow.innerHTML = `
                    <div class="col-span-4">
                        <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm etc-name" type="text" placeholder="항목명" value="${_escapeHtml(item.name || '')}"/>
                    </div>
                    <div class="col-span-2">
                        <select class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm etc-type">
                            <option value="per_person" ${item.type === 'per_person' ? 'selected' : ''}>1인당</option>
                            <option value="total" ${item.type === 'total' ? 'selected' : ''}>총액</option>
                        </select>
                    </div>
                    <div class="col-span-2">
                        <input class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary focus:ring-primary text-sm text-right etc-amount" type="number" min="0" value="${item.amount || 0}"/>
                    </div>
                    <div class="col-span-3">
                        <span class="text-sm font-semibold text-gray-900 dark:text-white block text-right etc-total">0원</span>
                    </div>
                    <div class="col-span-1 text-center">
                        <button class="text-red-500 hover:text-red-700 btn-remove-etc" title="삭제">
                            <span class="material-icons text-sm">close</span>
                        </button>
                    </div>
                `;
        etcContainer.appendChild(newRow);
      });
      setupEtcCostRowEvents();
      // 데이터가 있으면 펼치기
      if (etcBody) { etcBody.classList.remove('hidden'); }
      if (etcIcon) { etcIcon.textContent = 'expand_less'; }
      if (etcSummary) { etcSummary.textContent = ''; }
    } else {
      // 데이터 없으면 접기
      if (etcBody) { etcBody.classList.add('hidden'); }
      if (etcIcon) { etcIcon.textContent = 'expand_more'; }
      if (etcSummary) { etcSummary.textContent = ''; }
    }

    // 랜드원가 1
    if (data.land_cost_1) {
      const lc1 = data.land_cost_1;
      if (document.getElementById('costExchangeUSD1'))
        document.getElementById('costExchangeUSD1').value =
          lc1.exchangeUSD || DEFAULT_EXCHANGE_USD;
      if (document.getElementById('costExchangeEUR1'))
        document.getElementById('costExchangeEUR1').value =
          lc1.exchangeEUR || DEFAULT_EXCHANGE_EUR;
      if (document.getElementById('costExchangeJPY1'))
        document.getElementById('costExchangeJPY1').value =
          lc1.exchangeJPY || DEFAULT_EXCHANGE_JPY;
      if (document.getElementById('costLandUSD1'))
        document.getElementById('costLandUSD1').value = lc1.landUSD || 0;
      if (document.getElementById('costLandEUR1'))
        document.getElementById('costLandEUR1').value = lc1.landEUR || 0;
      if (document.getElementById('costLandJPY1'))
        document.getElementById('costLandJPY1').value = lc1.landJPY || 0;
      if (document.getElementById('costLandKRW1'))
        document.getElementById('costLandKRW1').value = lc1.landKRW || 0;
    }

    // 랜드원가 2
    if (data.land_cost_2) {
      const lc2 = data.land_cost_2;
      if (document.getElementById('costExchangeUSD2'))
        document.getElementById('costExchangeUSD2').value =
          lc2.exchangeUSD || DEFAULT_EXCHANGE_USD;
      if (document.getElementById('costExchangeEUR2'))
        document.getElementById('costExchangeEUR2').value =
          lc2.exchangeEUR || DEFAULT_EXCHANGE_EUR;
      if (document.getElementById('costExchangeJPY2'))
        document.getElementById('costExchangeJPY2').value =
          lc2.exchangeJPY || DEFAULT_EXCHANGE_JPY;
      if (document.getElementById('costLandUSD2'))
        document.getElementById('costLandUSD2').value = lc2.landUSD || 0;
      if (document.getElementById('costLandEUR2'))
        document.getElementById('costLandEUR2').value = lc2.landEUR || 0;
      if (document.getElementById('costLandJPY2'))
        document.getElementById('costLandJPY2').value = lc2.landJPY || 0;
      if (document.getElementById('costLandKRW2'))
        document.getElementById('costLandKRW2').value = lc2.landKRW || 0;
    }

    // 마진 및 비고
    if (document.getElementById('costMarginAmount1'))
      document.getElementById('costMarginAmount1').value =
        data.margin_amount_1 || 0;
    if (document.getElementById('costMarginAmount2'))
      document.getElementById('costMarginAmount2').value =
        data.margin_amount_2 || 0;
    if (document.getElementById('costNotes1'))
      document.getElementById('costNotes1').value = data.notes_1 || '';
    if (document.getElementById('costNotes2'))
      document.getElementById('costNotes2').value = data.notes_2 || '';

    calculateFlightCosts();
    calculateEtcCosts();
    calculateCosts();
    showToast('원가 계산서를 불러왔습니다.', 'success');
  } catch (error) {
    showToast('불러오기에 실패했습니다: ' + error.message, 'error');
  }
}

// 원가 코드 자동 생성
async function generateCostCode() {
  const costCodeInput = document.getElementById('costCode');
  if (!costCodeInput) return;

  // 이미 코드가 있으면 생성하지 않음
  if (costCodeInput.value && costCodeInput.value.trim() !== '') {
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  try {
    // 해당 월의 기존 원가 계산서 개수 조회
    const items = await fetchJSON('/api/cost-calculations');

    // 해당 월의 코드 필터링 (COST-YYYY-MM-XXX 형식)
    const prefix = `COST-${year}-${month}-`;
    const monthCodes = items.filter(
      (item) => item.code && item.code.startsWith(prefix)
    );

    // 다음 순번 계산
    let nextNumber = 1;
    if (monthCodes.length > 0) {
      const numbers = monthCodes.map((item) => {
        const parts = item.code.split('-');
        return parseInt(parts[3]) || 0;
      });
      nextNumber = Math.max(...numbers) + 1;
    }

    // 코드 생성 (3자리 숫자)
    const newCode = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    costCodeInput.value = newCode;
  } catch (error) {
    // 오류 발생 시 기본 코드 생성
    console.error('원가 코드 생성 오류:', error);
    const newCode = `COST-${year}-${month}-001`;
    costCodeInput.value = newCode;
  }
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCostCalculator);
} else {
  initCostCalculator();
}
