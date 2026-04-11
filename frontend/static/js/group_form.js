/**
 * 단체 입력/수정 화면
 */

// 상태 관리
let mode = 'create'; // 'create' or 'edit'
let groupId = null;
let groupData = {
    // 기본 필드
    name: '',
    start_date: '',
    end_date: '',
    pax: 0,
    price_per_pax: 0,
    deposit: 0,
    status: 'estimate',

    // 자동 계산 필드
    nights: 0,
    days: 0,
    total_price: 0,
    balance: 0,
    balance_due_date: '',

    // Manual 플래그
    nights_manual: false,
    days_manual: false,
    total_price_manual: false,
    balance_manual: false,
    balance_due_date_manual: false,

    // 항공편 정보
    flight_id: '',
    airline: '',
    outbound_flight: '',
    return_flight: '',
    flight_note: '',

    // 호텔 정보
    hotel_name: '',
    hotel_checkin: '',
    hotel_checkout: '',
    hotel_room_type: '',
    hotel_rooms: 0,
    hotel_note: '',

    // 차량 정보
    vehicle_type: '',
    vehicle_count: 0,
    vehicle_company: '',
    vehicle_note: '',

    // 가이드 정보
    guide_name: '',
    guide_phone: '',
    guide_language: '',
    guide_note: '',

    // 수배업무
    procurement_flight: false,
    procurement_hotel: false,
    procurement_vehicle: false,
    procurement_guide: false,
    procurement_visa: false,
    procurement_insurance: false,
    procurement_status: '',
    procurement_note: '',
};

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    // URL에서 모드와 ID 확인
    const urlMode = getUrlParameter('mode');
    const urlId = getUrlParameter('id');

    if (urlMode === 'edit' && urlId) {
        mode = 'edit';
        groupId = urlId;
        document.getElementById('pageTitle').textContent = '상품 수정';
        document.getElementById('breadcrumbAction').textContent = '수정';
        document.getElementById('btnRecalculate').style.display = 'inline-block';
        loadGroupData(groupId);
    } else {
        mode = 'create';
        setupAutoCalculation();
    }

    setupEventListeners();
    loadFlightOptions();
});

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 폼 제출
    document.getElementById('groupForm').addEventListener('submit', handleSubmit);

    // 취소 버튼
    document.getElementById('btnCancel').addEventListener('click', () => {
        showConfirm(
            '취소 확인',
            '변경 사항이 저장되지 않습니다. 취소하시겠습니까?',
            () => {
                window.location.href = '/pages/group_list.html';
            }
        );
    });

    // 재계산 버튼
    document.getElementById('btnRecalculate').addEventListener('click', handleRecalculate);

    // 자동 계산 트리거 필드
    const autoCalcFields = ['start_date', 'end_date', 'pax', 'price_per_pax', 'deposit'];
    autoCalcFields.forEach(field => {
        const input = document.getElementById(field);
        input.addEventListener('input', () => {
            updateGroupDataFromForm();
            performAutoCalculation();
        });
        input.addEventListener('change', () => {
            updateGroupDataFromForm();
            performAutoCalculation();
        });
    });

    // 수동 수정 버튼 설정
    setupManualEditButtons();

    // 항공편 셀렉터 변경 이벤트
    document.getElementById('flightSelector').addEventListener('change', handleFlightSelection);
}

/**
 * 수동 수정 버튼 설정
 */
function setupManualEditButtons() {
    const editableFields = ['nights', 'days', 'total_price', 'balance', 'balance_due_date'];

    editableFields.forEach(field => {
        // 수정 버튼
        document.getElementById(`btn-edit-${field}`).addEventListener('click', () => {
            enableManualEdit(field);
        });

        // 되돌리기 버튼
        document.getElementById(`btn-reset-${field}`).addEventListener('click', () => {
            resetToAutoCalculation(field);
        });

        // 수동 수정된 필드의 값 변경 감지
        document.getElementById(field).addEventListener('input', () => {
            if (groupData[`${field}_manual`]) {
                groupData[field] = document.getElementById(field).value;
            }
        });
    });
}

/**
 * 수동 수정 활성화
 */
function enableManualEdit(field) {
    const input = document.getElementById(field);
    input.readOnly = false;
    input.classList.remove('auto-calculated');
    input.classList.add('manual-edited');

    document.getElementById(`btn-edit-${field}`).style.display = 'none';
    document.getElementById(`btn-reset-${field}`).style.display = 'inline-block';

    const status = document.getElementById(`status-${field}`);
    status.textContent = '수동 수정됨';
    status.classList.remove('auto');
    status.classList.add('manual');

    groupData[`${field}_manual`] = true;

    input.focus();
}

/**
 * 자동 계산으로 되돌리기
 */
function resetToAutoCalculation(field) {
    const input = document.getElementById(field);
    input.readOnly = true;
    input.classList.remove('manual-edited');
    input.classList.add('auto-calculated');

    document.getElementById(`btn-edit-${field}`).style.display = 'inline-block';
    document.getElementById(`btn-reset-${field}`).style.display = 'none';

    const status = document.getElementById(`status-${field}`);
    status.textContent = '자동 계산됨';
    status.classList.remove('manual');
    status.classList.add('auto');

    groupData[`${field}_manual`] = false;

    // 자동 계산 다시 수행
    performAutoCalculation();
}

/**
 * 단체 데이터 로드 (수정 모드)
 */
async function loadGroupData(id) {
    try {
        showLoading('#groupForm');

        const data = await getGroup(id);

        // 데이터 설정
        groupData = { ...data };

        // 기본 정보
        document.getElementById('name').value = data.name || '';
        document.getElementById('start_date').value = data.start_date || '';
        document.getElementById('end_date').value = data.end_date || '';
        document.getElementById('pax').value = data.pax || 0;
        document.getElementById('price_per_pax').value = data.price_per_pax || 0;
        document.getElementById('deposit').value = data.deposit || 0;

        // 자동 계산 필드
        document.getElementById('nights').value = data.nights || 0;
        document.getElementById('days').value = data.days || 0;
        document.getElementById('total_price').value = data.total_price || 0;
        document.getElementById('balance').value = data.balance || 0;
        document.getElementById('balance_due_date').value = data.balance_due_date || '';

        // 항공편 정보
        if (data.flight_id) {
            document.getElementById('flightSelector').value = data.flight_id;
        }
        document.getElementById('airline').value = data.airline || '';
        document.getElementById('outbound_flight').value = data.outbound_flight || '';
        document.getElementById('return_flight').value = data.return_flight || '';
        document.getElementById('flight_note').value = data.flight_note || '';

        // 호텔 정보
        document.getElementById('hotel_name').value = data.hotel_name || '';
        document.getElementById('hotel_checkin').value = data.hotel_checkin || '';
        document.getElementById('hotel_checkout').value = data.hotel_checkout || '';
        document.getElementById('hotel_room_type').value = data.hotel_room_type || '';
        document.getElementById('hotel_rooms').value = data.hotel_rooms || 0;
        document.getElementById('hotel_note').value = data.hotel_note || '';

        // 차량 정보
        document.getElementById('vehicle_type').value = data.vehicle_type || '';
        document.getElementById('vehicle_count').value = data.vehicle_count || 0;
        document.getElementById('vehicle_company').value = data.vehicle_company || '';
        document.getElementById('vehicle_note').value = data.vehicle_note || '';

        // 가이드 정보
        document.getElementById('guide_name').value = data.guide_name || '';
        document.getElementById('guide_phone').value = data.guide_phone || '';
        document.getElementById('guide_language').value = data.guide_language || '';
        document.getElementById('guide_note').value = data.guide_note || '';

        // 수배업무
        document.getElementById('procurement_flight').checked = data.procurement_flight || false;
        document.getElementById('procurement_hotel').checked = data.procurement_hotel || false;
        document.getElementById('procurement_vehicle').checked = data.procurement_vehicle || false;
        document.getElementById('procurement_guide').checked = data.procurement_guide || false;
        document.getElementById('procurement_visa').checked = data.procurement_visa || false;
        document.getElementById('procurement_insurance').checked = data.procurement_insurance || false;
        document.getElementById('procurement_status').value = data.procurement_status || '';
        document.getElementById('procurement_note').value = data.procurement_note || '';

        // Manual 플래그에 따라 UI 업데이트
        updateManualFieldsUI();

        // 상단 요약 정보 업데이트
        updateSummaryInfo();

        showSuccess('단체 정보를 불러왔습니다.');

    } catch (error) {
        console.error('단체 정보 로드 오류:', error);
        showError('단체 정보를 불러올 수 없습니다: ' + error.message);
        setTimeout(() => {
            window.location.href = '/pages/group_list.html';
        }, 2000);
    }
}

/**
 * Manual 플래그에 따라 UI 업데이트
 */
function updateManualFieldsUI() {
    const editableFields = ['nights', 'days', 'total_price', 'balance', 'balance_due_date'];

    editableFields.forEach(field => {
        const input = document.getElementById(field);
        const isManual = groupData[`${field}_manual`];

        if (isManual) {
            input.readOnly = false;
            input.classList.remove('auto-calculated');
            input.classList.add('manual-edited');

            document.getElementById(`btn-edit-${field}`).style.display = 'none';
            document.getElementById(`btn-reset-${field}`).style.display = 'inline-block';

            const status = document.getElementById(`status-${field}`);
            status.textContent = '수동 수정됨';
            status.classList.remove('auto');
            status.classList.add('manual');
        }
    });
}

/**
 * 자동 계산 설정 (생성 모드)
 */
function setupAutoCalculation() {
    // 기본값 설정
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    document.getElementById('start_date').value = dateToYYYYMMDD(today);
    document.getElementById('end_date').value = dateToYYYYMMDD(nextWeek);
    document.getElementById('pax').value = 1;
    document.getElementById('price_per_pax').value = 0;
    document.getElementById('deposit').value = 0;

    // 초기 자동 계산
    updateGroupDataFromForm();
    performAutoCalculation();
}

/**
 * 폼에서 groupData 업데이트
 */
function updateGroupDataFromForm() {
    groupData.name = document.getElementById('name').value;
    groupData.start_date = document.getElementById('start_date').value;
    groupData.end_date = document.getElementById('end_date').value;
    groupData.pax = parseInt(document.getElementById('pax').value) || 0;
    groupData.price_per_pax = parseInt(document.getElementById('price_per_pax').value) || 0;
    groupData.deposit = parseInt(document.getElementById('deposit').value) || 0;

    // 상단 요약 정보 업데이트
    updateSummaryInfo();
}

/**
 * 자동 계산 수행
 */
function performAutoCalculation() {
    const startDate = new Date(groupData.start_date);
    const endDate = new Date(groupData.end_date);

    // 박수 계산 (수동 수정되지 않은 경우)
    if (!groupData.nights_manual) {
        if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
            const diffTime = endDate - startDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            groupData.nights = Math.max(0, diffDays);
            document.getElementById('nights').value = groupData.nights;
        }
    }

    // 일수 계산 (수동 수정되지 않은 경우)
    if (!groupData.days_manual) {
        groupData.days = groupData.nights + 1;
        document.getElementById('days').value = groupData.days;
    }

    // 총액 계산 (수동 수정되지 않은 경우)
    if (!groupData.total_price_manual) {
        groupData.total_price = groupData.pax * groupData.price_per_pax;
        document.getElementById('total_price').value = groupData.total_price;
    }

    // 잔액 계산 (수동 수정되지 않은 경우)
    if (!groupData.balance_manual) {
        groupData.balance = groupData.total_price - groupData.deposit;
        document.getElementById('balance').value = groupData.balance;
    }

    // 잔액 완납일 계산 (수동 수정되지 않은 경우)
    if (!groupData.balance_due_date_manual) {
        if (startDate && !isNaN(startDate)) {
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() - 7);
            groupData.balance_due_date = dateToYYYYMMDD(dueDate);
            document.getElementById('balance_due_date').value = groupData.balance_due_date;
        }
    }
}

/**
 * 전체 재계산 (API 호출)
 */
async function handleRecalculate() {
    if (!groupId) return;

    try {
        showConfirm(
            '전체 재계산',
            '자동 계산 가능한 모든 값을 다시 계산합니다. 계속하시겠습니까?',
            async () => {
                showLoading('#groupForm');

                await recalculateGroup(groupId, {
                    recalculate_all: true,
                });

                showSuccess('재계산이 완료되었습니다.');
                await loadGroupData(groupId);
            }
        );
    } catch (error) {
        console.error('재계산 오류:', error);
        showError('재계산 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 폼 제출 처리
 */
async function handleSubmit(e) {
    e.preventDefault();

    // 유효성 검증
    if (!validateForm()) {
        return;
    }

    try {
        // 제출 데이터 준비
        const submitData = {
            name: groupData.name,
            start_date: groupData.start_date,
            end_date: groupData.end_date,
            pax: groupData.pax,
            price_per_pax: groupData.price_per_pax,
            deposit: groupData.deposit,
            status: groupData.status || 'estimate',

            // 수동 수정된 필드만 포함
            ...(groupData.nights_manual && { nights: parseInt(document.getElementById('nights').value) }),
            ...(groupData.days_manual && { days: parseInt(document.getElementById('days').value) }),
            ...(groupData.total_price_manual && { total_price: parseInt(document.getElementById('total_price').value) }),
            ...(groupData.balance_manual && { balance: parseInt(document.getElementById('balance').value) }),
            ...(groupData.balance_due_date_manual && { balance_due_date: document.getElementById('balance_due_date').value }),

            // Manual 플래그
            nights_manual: groupData.nights_manual,
            days_manual: groupData.days_manual,
            total_price_manual: groupData.total_price_manual,
            balance_manual: groupData.balance_manual,
            balance_due_date_manual: groupData.balance_due_date_manual,

            // 항공편 정보
            flight_id: document.getElementById('flightSelector').value || '',
            airline: document.getElementById('airline').value || '',
            outbound_flight: document.getElementById('outbound_flight').value || '',
            return_flight: document.getElementById('return_flight').value || '',
            flight_note: document.getElementById('flight_note').value || '',

            // 호텔 정보
            hotel_name: document.getElementById('hotel_name').value || '',
            hotel_checkin: document.getElementById('hotel_checkin').value || '',
            hotel_checkout: document.getElementById('hotel_checkout').value || '',
            hotel_room_type: document.getElementById('hotel_room_type').value || '',
            hotel_rooms: parseInt(document.getElementById('hotel_rooms').value) || 0,
            hotel_note: document.getElementById('hotel_note').value || '',

            // 차량 정보
            vehicle_type: document.getElementById('vehicle_type').value || '',
            vehicle_count: parseInt(document.getElementById('vehicle_count').value) || 0,
            vehicle_company: document.getElementById('vehicle_company').value || '',
            vehicle_note: document.getElementById('vehicle_note').value || '',

            // 가이드 정보
            guide_name: document.getElementById('guide_name').value || '',
            guide_phone: document.getElementById('guide_phone').value || '',
            guide_language: document.getElementById('guide_language').value || '',
            guide_note: document.getElementById('guide_note').value || '',

            // 수배업무
            procurement_flight: document.getElementById('procurement_flight').checked,
            procurement_hotel: document.getElementById('procurement_hotel').checked,
            procurement_vehicle: document.getElementById('procurement_vehicle').checked,
            procurement_guide: document.getElementById('procurement_guide').checked,
            procurement_visa: document.getElementById('procurement_visa').checked,
            procurement_insurance: document.getElementById('procurement_insurance').checked,
            procurement_status: document.getElementById('procurement_status').value || '',
            procurement_note: document.getElementById('procurement_note').value || '',
        };

        let result;
        if (mode === 'create') {
            result = await createGroup(submitData);
            showSuccess('상품이 생성되었습니다.');
        } else {
            result = await updateGroup(groupId, submitData);
            showSuccess('상품 정보가 수정되었습니다.');
        }

        // 목록 페이지로 이동
        setTimeout(() => {
            window.location.href = '/pages/group_list.html';
        }, 1000);

    } catch (error) {
        console.error('저장 오류:', error);
        showError('저장 중 오류가 발생했습니다: ' + error.message);

        // API 오류 상세 표시
        if (error.details && error.details.detail) {
            if (Array.isArray(error.details.detail)) {
                error.details.detail.forEach(err => {
                    const field = err.loc && err.loc[err.loc.length - 1];
                    if (field) {
                        showFieldError(field, err.msg);
                    }
                });
            }
        }
    }
}

/**
 * 폼 유효성 검증
 */
function validateForm() {
    // 기존 에러 메시지 제거
    clearAllErrors();

    let isValid = true;

    try {
        // 필수 필드 검증
        validateRequired(groupData.name, '단체명');
        validateRequired(groupData.start_date, '출발일');
        validateRequired(groupData.end_date, '도착일');
        validateRequired(groupData.pax, '인원수');
        validateRequired(groupData.price_per_pax, '1인당 요금');
        validateRequired(groupData.deposit, '계약금');

        // 숫자 검증
        validateNumber(groupData.pax, '인원수', 1);
        validateNumber(groupData.price_per_pax, '1인당 요금', 0);
        validateNumber(groupData.deposit, '계약금', 0);

        // 날짜 검증
        validateDate(groupData.start_date, '출발일');
        validateDate(groupData.end_date, '도착일');

        // 날짜 범위 검증
        validateDateRange(groupData.start_date, groupData.end_date, '출발일', '도착일');

        // 계약금 검증
        const totalPrice = groupData.total_price_manual
            ? parseInt(document.getElementById('total_price').value)
            : groupData.pax * groupData.price_per_pax;

        if (groupData.deposit > totalPrice) {
            throw new Error('계약금은 총액보다 작거나 같아야 합니다.');
        }

    } catch (error) {
        showError(error.message);
        isValid = false;

        // 필드별 에러 표시
        if (error.message.includes('단체명')) {
            showFieldError('name', error.message);
        } else if (error.message.includes('출발일')) {
            showFieldError('start_date', error.message);
        } else if (error.message.includes('도착일')) {
            showFieldError('end_date', error.message);
        } else if (error.message.includes('인원수')) {
            showFieldError('pax', error.message);
        } else if (error.message.includes('1인당 요금')) {
            showFieldError('price_per_pax', error.message);
        } else if (error.message.includes('계약금')) {
            showFieldError('deposit', error.message);
        }
    }

    return isValid;
}

/**
 * 모든 에러 메시지 제거
 */
function clearAllErrors() {
    const errorDivs = document.querySelectorAll('.error-message');
    errorDivs.forEach(div => {
        div.textContent = '';
    });

    const inputs = document.querySelectorAll('.is-invalid');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
    });
}

/**
 * 항공편 옵션 로드 (air1에서 저장된 항공편)
 */
function loadFlightOptions() {
    try {
        const selector = document.getElementById('flightSelector');

        // localStorage에서 항공편 목록 가져오기
        const flights = getFlightListFromStorage();

        // 기존 옵션 제거 (첫 번째 옵션은 유지)
        while (selector.options.length > 1) {
            selector.remove(1);
        }

        // 항공편 옵션 추가
        flights.forEach(flight => {
            const option = document.createElement('option');
            option.value = flight.id;

            // 항공편 요약 텍스트 생성
            const airline = flight.airline || '항공사미정';
            const pnr = flight.pnr || '';
            const date = flight.saveDate ? new Date(flight.saveDate).toLocaleDateString('ko-KR') : '';

            option.textContent = `${airline} ${pnr ? '(' + pnr + ')' : ''} - ${date}`;
            selector.appendChild(option);
        });

        console.log(`${flights.length}개의 항공편을 로드했습니다.`);
    } catch (error) {
        console.error('항공편 옵션 로드 오류:', error);
    }
}

/**
 * localStorage에서 항공편 목록 가져오기
 */
function getFlightListFromStorage() {
    try {
        const data = localStorage.getItem('flight_saves_v2');
        if (!data) return [];

        const flights = JSON.parse(data);
        // 최신순으로 정렬
        return flights.sort((a, b) => new Date(b.saveDate) - new Date(a.saveDate));
    } catch (error) {
        console.error('항공편 목록 조회 오류:', error);
        return [];
    }
}

/**
 * 항공편 선택 처리
 */
function handleFlightSelection(e) {
    const flightId = e.target.value;

    if (!flightId) {
        // 선택 해제 시 항공편 필드 초기화
        document.getElementById('airline').value = '';
        document.getElementById('outbound_flight').value = '';
        document.getElementById('return_flight').value = '';
        groupData.flight_id = '';
        return;
    }

    try {
        // localStorage에서 항공편 데이터 가져오기
        const flights = getFlightListFromStorage();
        const flight = flights.find(f => f.id === flightId);

        if (!flight) {
            showError('항공편 정보를 찾을 수 없습니다.');
            return;
        }

        // 항공편 필드 자동 채우기
        groupData.flight_id = flightId;

        if (flight.airline) {
            document.getElementById('airline').value = flight.airline;
            groupData.airline = flight.airline;
        }

        // 출발편 정보 조합
        if (flight.outbound) {
            const outbound = flight.outbound;
            let outboundText = '';

            if (outbound.flightNumber) {
                outboundText += outbound.flightNumber + ' ';
            }
            if (outbound.departure && outbound.departureTime) {
                outboundText += `${outbound.departure} ${outbound.departureTime}`;
            }
            if (outbound.arrival && outbound.arrivalTime) {
                outboundText += ` → ${outbound.arrival} ${outbound.arrivalTime}`;
            }

            if (outboundText) {
                document.getElementById('outbound_flight').value = outboundText.trim();
                groupData.outbound_flight = outboundText.trim();
            }
        }

        // 귀국편 정보 조합
        if (flight.return) {
            const returnFlight = flight.return;
            let returnText = '';

            if (returnFlight.flightNumber) {
                returnText += returnFlight.flightNumber + ' ';
            }
            if (returnFlight.departure && returnFlight.departureTime) {
                returnText += `${returnFlight.departure} ${returnFlight.departureTime}`;
            }
            if (returnFlight.arrival && returnFlight.arrivalTime) {
                returnText += ` → ${returnFlight.arrival} ${returnFlight.arrivalTime}`;
            }

            if (returnText) {
                document.getElementById('return_flight').value = returnText.trim();
                groupData.return_flight = returnText.trim();
            }
        }

        showSuccess('항공편 정보가 자동으로 입력되었습니다.');
    } catch (error) {
        console.error('항공편 선택 오류:', error);
        showError('항공편 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 상단 요약 정보 업데이트
 */
function updateSummaryInfo() {
    document.getElementById('summaryProductName').textContent = groupData.name || '-';
    document.getElementById('summaryGroupName').textContent = groupData.name || '-';

    const statusBadge = document.getElementById('summaryStatus');
    const statusText = {
        'estimate': '견적',
        'contract': '계약',
        'confirmed': '확정'
    };

    statusBadge.textContent = statusText[groupData.status] || '-';
    statusBadge.className = 'badge ' + (groupData.status || '');
}
