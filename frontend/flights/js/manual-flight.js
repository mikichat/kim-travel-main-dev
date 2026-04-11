const { showToast } = window;

/**
 * 수동 항공편 추가 및 공항 자동완성 기능
 */

// 모달 열기/닫기
const manualFlightModal = document.getElementById('manualFlightModal');
const manualAddBtn = document.getElementById('manualAddBtn');
const closeManualModal = document.getElementById('closeManualModal');
const cancelManualAdd = document.getElementById('cancelManualAdd');
const manualFlightForm = document.getElementById('manualFlightForm');

// 모달 열기
manualAddBtn.addEventListener('click', () => {
  manualFlightModal.classList.remove('hidden');
  // 오늘 날짜를 기본값으로 설정
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('flightDate').value = today;
});

// 모달 닫기
function closeModal() {
  manualFlightModal.classList.add('hidden');
  manualFlightForm.reset();
  // 드롭다운 숨기기
  document.getElementById('departureDropdown').classList.add('hidden');
  document.getElementById('arrivalDropdown').classList.add('hidden');
  // hidden input 초기화
  document.getElementById('departureCode').value = '';
  document.getElementById('arrivalCode').value = '';
}

closeManualModal.addEventListener('click', closeModal);
cancelManualAdd.addEventListener('click', closeModal);

// 모달 외부 클릭 시 닫기
manualFlightModal.addEventListener('click', (e) => {
  if (e.target === manualFlightModal) {
    closeModal();
  }
});

/**
 * 공항 자동완성 기능
 */
function setupAirportAutocomplete(inputId, dropdownId, hiddenCodeId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  const hiddenCode = document.getElementById(hiddenCodeId);

  // 입력 시 자동완성
  input.addEventListener('input', (e) => {
    const keyword = e.target.value.trim();

    if (keyword.length === 0) {
      dropdown.classList.add('hidden');
      hiddenCode.value = '';
      return;
    }

    // AirportDatabase에서 검색
    const results = AirportDatabase.search(keyword);

    if (results.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }

    // 검색 결과를 드롭다운에 표시 (최대 10개)
    const maxResults = 10;
    dropdown.innerHTML = '';
    results.slice(0, maxResults).forEach((airport) => {
      const item = document.createElement('div');
      item.className = 'airport-item px-4 py-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0';
      item.dataset.code = airport.code;
      item.dataset.name = airport.name;
      item.dataset.airport = airport.airport;
      item.dataset.region = airport.region;

      const flex = document.createElement('div');
      flex.className = 'flex justify-between items-center';

      const leftDiv = document.createElement('div');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'font-semibold text-gray-800';
      nameSpan.textContent = airport.name;
      const airportSpan = document.createElement('span');
      airportSpan.className = 'text-sm text-gray-500 ml-2';
      airportSpan.textContent = airport.airport;
      leftDiv.appendChild(nameSpan);
      leftDiv.appendChild(airportSpan);

      const rightDiv = document.createElement('div');
      rightDiv.className = 'flex items-center gap-2';
      const regionSpan = document.createElement('span');
      regionSpan.className = 'text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded';
      regionSpan.textContent = airport.region;
      const codeSpan = document.createElement('span');
      codeSpan.className = 'font-bold text-purple-600';
      codeSpan.textContent = airport.code;
      rightDiv.appendChild(regionSpan);
      rightDiv.appendChild(codeSpan);

      flex.appendChild(leftDiv);
      flex.appendChild(rightDiv);
      item.appendChild(flex);
      dropdown.appendChild(item);
    });

    dropdown.classList.remove('hidden');

    // 각 아이템 클릭 이벤트
    dropdown.querySelectorAll('.airport-item').forEach((item) => {
      item.addEventListener('click', () => {
        const code = item.dataset.code;
        const name = item.dataset.name;
        const _airportName = item.dataset.airport;

        // 입력 필드에 표시: "도시 (CODE)"
        input.value = `${name} (${code})`;
        // hidden input에 코드 저장
        hiddenCode.value = code;
        // 드롭다운 숨기기
        dropdown.classList.add('hidden');
      });
    });
  });

  // 포커스 아웃 시 드롭다운 숨기기 (약간의 딜레이를 줘서 클릭 이벤트가 먼저 발생하도록)
  input.addEventListener('blur', () => {
    setTimeout(() => {
      dropdown.classList.add('hidden');
    }, 200);
  });

  // 포커스 시 기존 값이 있으면 드롭다운 표시
  input.addEventListener('focus', () => {
    if (input.value.trim().length > 0) {
      input.dispatchEvent(new Event('input'));
    }
  });
}

// 출발지와 도착지 자동완성 설정
setupAirportAutocomplete(
  'departureInput',
  'departureDropdown',
  'departureCode'
);
setupAirportAutocomplete('arrivalInput', 'arrivalDropdown', 'arrivalCode');

/**
 * 폼 제출 처리
 */
manualFlightForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // 공항 코드가 선택되었는지 확인
  const departureCode = document.getElementById('departureCode').value;
  const arrivalCode = document.getElementById('arrivalCode').value;

  if (!departureCode || !arrivalCode) {
    showToast('출발지와 도착지를 검색 결과에서 선택해주세요.', 'warning');
    return;
  }

  // 폼 데이터 수집
  const formData = {
    airline: document.getElementById('airlineCode').value.toUpperCase(),
    flightNumber: document.getElementById('flightNumber').value,
    class: document.getElementById('flightClass').value.toUpperCase(),
    date: document.getElementById('flightDate').value,
    departure: departureCode,
    arrival: arrivalCode,
    departureTime: document.getElementById('departureTime').value,
    arrivalTime: document.getElementById('arrivalTime').value,
    seatStatus: document.getElementById('seatStatus').value,
    seatCount: document.getElementById('seatCount').value,
  };

  // 날짜 포맷 변환 (2025-04-27 -> 27APR)
  const dateObj = new Date(formData.date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const month = monthNames[dateObj.getMonth()];
  const formattedDate = `${day}${month}`;

  // 시간 포맷 변환 (14:30 -> 1430)
  const depTime = formData.departureTime.replace(':', '');
  const arrTime = formData.arrivalTime.replace(':', '');

  // 항공편 텍스트 생성 (예: "3  KE 411 J 27APR 1 ICNAKL HK2  1800 0835  28APR")
  const flightText = `1  ${formData.airline} ${formData.flightNumber} ${formData.class} ${formattedDate} 1 ${formData.departure}${formData.arrival} ${formData.seatStatus}${formData.seatCount}  ${depTime} ${arrTime}  ${formattedDate}`;

  // textarea에 추가
  const inputText = document.getElementById('inputText');
  if (inputText.value.trim()) {
    inputText.value += '\n' + flightText;
  } else {
    inputText.value = flightText;
  }

  // 성공 메시지
  showToast(
    '항공편이 추가되었습니다. "자동 변환하기" 버튼을 눌러주세요.',
    'success'
  );

  // 모달 닫기
  closeModal();
});
