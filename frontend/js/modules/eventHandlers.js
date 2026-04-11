// js/modules/eventHandlers.js
import { state } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { parseProductExcel, mapToProductData } from './excelParser.js';
const { showToast, showConfirmModal } = window;
const { FlightSyncManager } = window;
const { GroupSyncManager } = window;

// ==================== 전화번호 자동 포맷 ====================
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-.()]/g, '');
  if (/^\+82\s?\d{1,2}-\d{3,4}-\d{4}$/.test(phone.trim())) return phone.trim();
  if (cleaned.startsWith('+82')) cleaned = '0' + cleaned.substring(3);
  else if (cleaned.startsWith('82') && cleaned.length >= 11)
    cleaned = '0' + cleaned.substring(2);
  if (/^010\d{8}$/.test(cleaned)) {
    return `+82 10-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
  }
  if (/^01[1-9]\d{7,8}$/.test(cleaned)) {
    const prefix = cleaned.substring(1, 3);
    const rest = cleaned.substring(3);
    if (rest.length === 8)
      return `+82 ${prefix}-${rest.substring(0, 4)}-${rest.substring(4)}`;
    if (rest.length === 7)
      return `+82 ${prefix}-${rest.substring(0, 3)}-${rest.substring(3)}`;
  }
  return phone;
}

// ==================== 여행이력 자동 업데이트 ====================

/**
 * 출발일이 지난 고객의 여행지역을 여행이력에 자동 추가
 * - 출발일이 오늘 이전인 경우
 * - 여행지역이 있고, 아직 여행이력에 포함되지 않은 경우
 * - 형식: "여행지역(연도)" 예: "일본(2025)"
 */
async function autoUpdateTravelHistory() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const customersToUpdate = [];

  for (const customer of state.customers) {
    // 출발일과 여행지역이 있는 경우만 처리
    if (!customer.departure_date || !customer.travel_region) continue;

    const departureDate = new Date(customer.departure_date);
    departureDate.setHours(0, 0, 0, 0);

    // 출발일이 오늘 이전인 경우 (여행 완료)
    if (departureDate < today) {
      const travelEntry = `${customer.travel_region}(${customer.departure_date})`;

      // 이미 여행이력에 포함되어 있는지 확인
      const currentHistory = customer.travel_history || '';
      if (!currentHistory.includes(customer.travel_region)) {
        // 여행이력 업데이트
        const newHistory = currentHistory
          ? `${currentHistory}, ${travelEntry}`
          : travelEntry;

        customersToUpdate.push({
          id: customer.id,
          travel_history: newHistory,
          travel_region: '', // 여행지역 초기화 (완료된 여행)
          name_kor: customer.name_kor, // 로그용
        });
      }
    }
  }

  // 업데이트가 필요한 고객이 있으면 일괄 처리
  if (customersToUpdate.length > 0) {
    for (const update of customersToUpdate) {
      try {
        await api.updateTableData('customers', update.id, {
          travel_history: update.travel_history,
          travel_region: update.travel_region,
        });

        // state도 업데이트
        const customer = state.customers.find((c) => c.id === update.id);
        if (customer) {
          customer.travel_history = update.travel_history;
          customer.travel_region = update.travel_region;
        }
      } catch (error) {
        console.error(`  ❌ ${update.name_kor} 업데이트 실패:`, error);
      }
    }

    ui.showNotification(
      `${customersToUpdate.length}명의 여행이력이 자동 업데이트되었습니다.`,
      'info'
    );
  }
}

// ==================== 여권 OCR ====================

export async function handlePassportOcr() {
  const fileInput = document.getElementById('customerPassportFile');
  const ocrBtn = document.getElementById('btnPassportOcr');
  const ocrLoading = document.getElementById('passportOcrLoading');

  if (!fileInput.files.length) {
    ui.showNotification('여권 이미지를 먼저 선택해주세요.', 'warning');
    return;
  }

  const file = fileInput.files[0];

  // 이미지 파일만 허용 (PDF 제외 - OCR은 이미지만 가능)
  if (!file.type.startsWith('image/')) {
    ui.showNotification(
      'OCR은 이미지 파일만 지원합니다. (PDF 불가)',
      'warning'
    );
    return;
  }

  try {
    ocrBtn.disabled = true;
    ocrLoading.style.display = 'inline';

    // base64 변환
    const dataUrl = await api.fileToBase64(file);
    // "data:image/jpeg;base64,..." → base64 부분만 추출
    const base64 = dataUrl.split(',')[1];
    const mimeType = file.type;

    const response = await fetch('/api/passport-ocr/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: [{ filename: file.name, base64, mimeType }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `서버 오류 (${response.status})`);
    }

    const result = await response.json();
    const scanResult = result.results[0];

    if (!scanResult.success) {
      throw new Error(scanResult.error || '여권 인식에 실패했습니다.');
    }

    const data = scanResult.data;

    // 폼 필드 매핑
    if (data.nameKor) {
      document.getElementById('customerNameKor').value = data.nameKor;
    }
    if (data.surname || data.givenName) {
      document.getElementById('customerNameEng').value =
        `${data.surname || ''} ${data.givenName || ''}`.trim();
    }
    if (data.passportNo) {
      document.getElementById('customerPassportNumber').value = data.passportNo;
    }
    if (data.gender) {
      document.getElementById('customerGender').value = data.gender;
    }
    if (data.birthDate) {
      document.getElementById('customerBirthDate').value = data.birthDate;
    }
    if (data.passportExpire) {
      document.getElementById('customerPassportExpiry').value =
        data.passportExpire;
    }

    ui.showNotification('여권 정보가 자동 입력되었습니다.', 'success');

    // OCR 성공 시 자동 저장
    const customerId = document.getElementById('customerId').value;
    if (customerId) {
      // 기존 고객 수정: 여권 데이터만 즉시 저장
      const passportFileData = await api.fileToBase64(file);
      const patchData = {
        passport_number: document
          .getElementById('customerPassportNumber')
          .value.toUpperCase(),
        passport_expiry: document.getElementById('customerPassportExpiry')
          .value,
        gender: document.getElementById('customerGender').value,
        birth_date: document.getElementById('customerBirthDate').value,
        name_eng: document
          .getElementById('customerNameEng')
          .value.toUpperCase(),
        passport_file_name: file.name,
        passport_file_data: passportFileData,
        last_modified: new Date().toISOString(),
      };
      const nameKor = document.getElementById('customerNameKor').value;
      if (nameKor) patchData.name_kor = nameKor;

      await api.patchTableData('customers', customerId, patchData);
      ui.showNotification('여권 정보가 자동 저장되었습니다.', 'success');
    }
  } catch (error) {
    ui.showNotification(`여권 OCR 실패: ${error.message}`, 'error');
  } finally {
    ocrBtn.disabled = !fileInput.files.length;
    ocrLoading.style.display = 'none';
  }
}

// ==================== 출발 미리알림 자동 등록 ====================

/**
 * 단체/항공편 출발일 기준 D-7, D-3 할일을 자동 생성
 * - 출발일이 오늘 이후인 경우만 처리
 * - 같은 title + due_date의 할일이 이미 있으면 중복 생성하지 않음
 */
async function generateDepartureReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 출발일 목록 수집: { name, departureDate }
  const departures = [];

  // 1) state.groups에서 수집
  for (const group of state.groups) {
    if (group.departureDate) {
      departures.push({ name: group.name, departureDate: group.departureDate });
    }
  }

  // 2) FlightSyncManager에서 수집 (단체에 없는 항공편만)
  try {
    if (FlightSyncManager) {
      const groupNames = new Set(state.groups.map((g) => g.name));
      const allFlights = await FlightSyncManager.getFlights();
      allFlights.forEach((flightSave) => {
        if (
          flightSave.flights &&
          flightSave.flights.length > 0 &&
          flightSave.name
        ) {
          // 이미 단체에 있는 이름이면 중복 방지 (단체에서 이미 처리됨)
          if (groupNames.has(flightSave.name)) return;
          const firstFlight = flightSave.flights[0];
          if (firstFlight.date) {
            const flightDate = firstFlight.date
              .split('(')[0]
              .replace(/\./g, '-');
            departures.push({
              name: flightSave.name,
              departureDate: flightDate,
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('항공편 미리알림 수집 오류:', error);
  }

  // 기존 할일 title+due_date Set 구성 (중복 검사용)
  const existingTodoKeys = new Set(
    state.todos.map((t) => `${t.title}||${t.due_date}`)
  );

  const remindersToCreate = [];

  for (const dep of departures) {
    const depDate = new Date(dep.departureDate);
    depDate.setHours(0, 0, 0, 0);

    // 출발일이 오늘 이후인 경우만
    if (depDate <= today) continue;

    // D-7
    const d7Date = new Date(depDate);
    d7Date.setDate(d7Date.getDate() - 7);
    const d7Str = d7Date.toISOString().split('T')[0];
    const d7Title = `[출발 D-7] ${dep.name} 사전 준비 확인`;

    if (d7Date >= today && !existingTodoKeys.has(`${d7Title}||${d7Str}`)) {
      remindersToCreate.push({
        title: d7Title,
        due_date: d7Str,
        priority: '보통',
        description: `${dep.name} 출발 7일 전 사전 준비 확인 (출발일: ${dep.departureDate})`,
      });
      existingTodoKeys.add(`${d7Title}||${d7Str}`);
    }

    // D-3
    const d3Date = new Date(depDate);
    d3Date.setDate(d3Date.getDate() - 3);
    const d3Str = d3Date.toISOString().split('T')[0];
    const d3Title = `[출발 D-3] ${dep.name} 최종 확인`;

    if (d3Date >= today && !existingTodoKeys.has(`${d3Title}||${d3Str}`)) {
      remindersToCreate.push({
        title: d3Title,
        due_date: d3Str,
        priority: '높음',
        description: `${dep.name} 출발 3일 전 최종 확인 (출발일: ${dep.departureDate})`,
      });
      existingTodoKeys.add(`${d3Title}||${d3Str}`);
    }
  }

  // 미리알림 일괄 생성
  if (remindersToCreate.length > 0) {
    for (const todo of remindersToCreate) {
      try {
        const result = await api.createTableData('todos', todo);
        // state.todos에도 추가 (화면 즉시 반영)
        state.todos.push({ ...todo, id: result.id, is_completed: false });
      } catch (error) {
        console.error(`  ❌ ${todo.title} 생성 실패:`, error);
      }
    }
  }
}

// ==================== Data Loading ====================

export async function loadAllData() {
  try {
    const [customers, products, bookings, todos, notifications, groups] =
      await Promise.all([
        api.getTableData('customers', 'limit=1000'),
        api.getTableData('products', 'limit=1000'),
        api.getTableData('bookings', 'limit=1000'),
        api.getTableData('todos', 'limit=1000'),
        api.getTableData(
          'notifications',
          'limit=1000&sort=created_at&order=desc'
        ),
        api.getTableData('groups', 'limit=1000'),
      ]);

    state.customers = customers.data || [];
    state.products = products.data || [];
    state.bookings = bookings.data || [];
    state.todos = todos.data || [];
    state.notifications = notifications.data || [];

    // 지난 할일 자동 삭제 (due_date가 오늘 이전인 항목)
    const todayStr = new Date();
    todayStr.setHours(0, 0, 0, 0);
    const expiredTodos = state.todos.filter(
      (t) => t.due_date && new Date(t.due_date) < todayStr
    );
    if (expiredTodos.length > 0) {
      for (const todo of expiredTodos) {
        try {
          await api.deleteTableData('todos', todo.id);
        } catch (err) {
          console.error('지난 할일 자동 삭제 실패:', todo.title, err);
        }
      }
      state.todos = state.todos.filter(
        (t) => !expiredTodos.some((e) => e.id === t.id)
      );
    }

    // 전화번호 자동 포맷 마이그레이션 (기존 010-XXXX-XXXX → +82 10-XXXX-XXXX)
    const phoneFixCustomers = state.customers.filter((c) => {
      if (!c.phone) return false;
      const formatted = formatPhoneNumber(c.phone);
      return formatted !== c.phone;
    });
    if (phoneFixCustomers.length > 0) {
      for (const c of phoneFixCustomers) {
        const newPhone = formatPhoneNumber(c.phone);
        c.phone = newPhone;
        try {
          await api.updateTableData('customers', c.id, { phone: newPhone });
        } catch (err) {
          console.error('전화번호 포맷 저장 실패:', c.name_kor, err);
        }
      }
    }

    // 여행이력 자동 업데이트 (출발일 지난 고객)
    await autoUpdateTravelHistory();

    // groups 데이터를 파싱하여 저장
    const groupsData = groups.data || [];
    state.groups = groupsData.map((g) => ({
      id: g.id,
      name: g.name,
      destination: g.destination || '',
      departureDate: g.departure_date || '',
      returnDate: g.return_date || '',
      createdAt: g.created_at,
      updatedAt: g.updated_at,
      members: JSON.parse(g.members || '[]'),
    }));

    // 검색창에 텍스트가 있으면 필터 적용 유지
    const searchInput = document.getElementById('searchCustomers');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    if (searchTerm) {
      // 검색어가 있으면 필터 적용
      state.filteredCustomers = state.customers.filter(
        (customer) =>
          (customer.name_kor &&
            customer.name_kor.toLowerCase().includes(searchTerm)) ||
          (customer.name_eng &&
            customer.name_eng.toLowerCase().includes(searchTerm)) ||
          (customer.passport_number &&
            customer.passport_number.toLowerCase().includes(searchTerm)) ||
          (customer.phone && customer.phone.includes(searchTerm)) ||
          (customer.travel_history &&
            customer.travel_history.toLowerCase().includes(searchTerm)) ||
          (customer.group_name &&
            customer.group_name.toLowerCase().includes(searchTerm))
      );
    } else {
      // 검색어가 없으면 전체 고객
      state.filteredCustomers = state.customers;
    }

    // 페이지네이션 적용된 고객 테이블 렌더링
    ui.renderCustomersTablePaginated(
      state.filteredCustomers,
      state.customerPage,
      state.customerPageSize
    );
    // 단체 드롭다운 렌더링
    ui.renderGroupDropdown();
    // 선택된 단체가 있으면 단체 고객 테이블도 렌더링
    if (state.selectedGroup) {
      ui.renderGroupCustomersTable(state.selectedGroup);
    }

    // 탭 상태 복원 (단체별 조회 탭이었거나 선택된 단체가 있으면 유지)
    if (state.customerTab === 'group' || state.selectedGroup) {
      state.customerTab = 'group'; // 상태도 확실히 설정

      const tabAllCustomers = document.getElementById('tabAllCustomers');
      const tabGroupCustomers = document.getElementById('tabGroupCustomers');
      const tabBtns = document.querySelectorAll('.customer-tabs .tab-btn');

      if (tabAllCustomers) tabAllCustomers.classList.remove('active');
      if (tabGroupCustomers) tabGroupCustomers.classList.add('active');

      tabBtns.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === 'group');
      });
    }

    ui.updateCustomerSelects();
    ui.renderProductsGrid();
    ui.updateProductSelects();
    ui.renderBookingsTable();
    ui.renderTodos();
    // Notifications are rendered when the panel is opened or on page load

    // 출발 미리알림 자동 생성 (D-7, D-3)
    await generateDepartureReminders();
  } catch (_error) {
    ui.showNotification('데이터 로드 중 오류가 발생했습니다.', 'error');
  }
}

// ==================== Event Handlers ====================

export async function handleCustomerSubmit(e) {
  e.preventDefault();
  const customerId = document.getElementById('customerId').value;
  const fileInput = document.getElementById('customerPassportFile');
  let passportFileData = null;
  let passportFileName = null;

  try {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      passportFileData = await api.fileToBase64(file);
      passportFileName = file.name;
    } else if (customerId) {
      const customer = state.customers.find((c) => c.id === customerId);
      if (customer) {
        passportFileData = customer.passport_file_data;
        passportFileName = customer.passport_file_name;
      }
    }

    // 여행지역과 여행이력 동기화 로직
    const travelRegion = document
      .getElementById('customerTravelRegion')
      .value.trim();
    const departureDate = document.getElementById(
      'customerDepartureDate'
    ).value;
    let travelHistory = document
      .getElementById('customerTravelHistory')
      .value.trim();

    // 규칙 2: 고객 관리에서 여행지역 수동 입력 시
    if (travelRegion) {
      // 출발일이 있으면 → 여행이력에 "여행지역(출발일)" 형식으로 자동 추가
      if (departureDate) {
        const newHistoryItem = `${travelRegion}(${departureDate})`;
        // 중복 체크: 동일한 "여행지역(출발일)" 조합이 이미 있으면 추가하지 않음
        const historyItems = travelHistory
          ? travelHistory.split(',').map((item) => item.trim())
          : [];
        const isDuplicate = historyItems.some(
          (item) => item === newHistoryItem
        );

        if (!isDuplicate) {
          // 가장 최근 항목으로 추가 (앞에 추가)
          travelHistory = travelHistory
            ? `${newHistoryItem}, ${travelHistory}`
            : newHistoryItem;
        }
      } else {
        // 출발일이 없으면 → 여행이력에 "여행지역"만 추가
        const historyItems = travelHistory
          ? travelHistory.split(',').map((item) => item.trim())
          : [];
        const isDuplicate = historyItems.some((item) => item === travelRegion);

        if (!isDuplicate) {
          travelHistory = travelHistory
            ? `${travelRegion}, ${travelHistory}`
            : travelRegion;
        }
      }
    }

    // 규칙 3: 여행이력에서 여행지역 추출
    // 가장 최근 항목(첫 번째)의 여행지역을 현재 여행지역으로 자동 설정
    let finalTravelRegion = travelRegion;
    if (!finalTravelRegion && travelHistory) {
      const firstItem = travelHistory.split(',')[0].trim();
      const match = firstItem.match(/^([^(]+)/);
      if (match) {
        finalTravelRegion = match[1].trim();
      }
    }

    const customerData = {
      name_kor: document.getElementById('customerNameKor').value,
      name_eng: document.getElementById('customerNameEng').value.toUpperCase(),
      passport_number: document
        .getElementById('customerPassportNumber')
        .value.toUpperCase(),
      birth_date: document.getElementById('customerBirthDate').value,
      gender: document.getElementById('customerGender').value,
      passport_expiry: document.getElementById('customerPassportExpiry').value,
      phone: formatPhoneNumber(document.getElementById('customerPhone').value),
      email: document.getElementById('customerEmail').value,
      address: document.getElementById('customerAddress').value,
      departure_date: departureDate,
      group_name: document.getElementById('customerGroupName').value,
      travel_region: finalTravelRegion,
      travel_history: travelHistory,
      notes: document.getElementById('customerNotes').value,
      passport_file_name: passportFileName,
      passport_file_data: passportFileData,
      last_modified: new Date().toISOString(),
    };

    if (customerId) {
      // 기존 고객 정보 가져오기
      const oldCustomer = state.customers.find((c) => c.id === customerId);

      // 변경 이력 생성
      if (oldCustomer) {
        const changes = [];
        const now = new Date().toLocaleString('ko-KR');

        if (oldCustomer.name_kor !== customerData.name_kor) {
          changes.push(
            `한글명: ${oldCustomer.name_kor} → ${customerData.name_kor}`
          );
        }
        if (oldCustomer.name_eng !== customerData.name_eng) {
          changes.push(
            `영문명: ${oldCustomer.name_eng} → ${customerData.name_eng}`
          );
        }
        if (oldCustomer.passport_number !== customerData.passport_number) {
          changes.push(
            `여권번호: ${oldCustomer.passport_number} → ${customerData.passport_number}`
          );
        }
        if (oldCustomer.birth_date !== customerData.birth_date) {
          changes.push(
            `생년월일: ${oldCustomer.birth_date} → ${customerData.birth_date}`
          );
        }
        if (oldCustomer.passport_expiry !== customerData.passport_expiry) {
          changes.push(
            `여권만료일: ${oldCustomer.passport_expiry} → ${customerData.passport_expiry}`
          );
        }
        if (oldCustomer.phone !== customerData.phone) {
          changes.push(`연락처: ${oldCustomer.phone} → ${customerData.phone}`);
        }
        if (oldCustomer.email !== customerData.email) {
          changes.push(`이메일: ${oldCustomer.email} → ${customerData.email}`);
        }
        if (oldCustomer.departure_date !== customerData.departure_date) {
          changes.push(
            `출발일: ${oldCustomer.departure_date || '없음'} → ${customerData.departure_date || '없음'}`
          );
        }
        if (oldCustomer.group_name !== customerData.group_name) {
          changes.push(
            `단체명: ${oldCustomer.group_name || '없음'} → ${customerData.group_name || '없음'}`
          );
        }

        if (changes.length > 0) {
          const changeLog = `\n[${now} 수정]\n${changes.join('\n')}`;
          customerData.notes = (customerData.notes || '') + changeLog;
        }
      }

      await api.updateTableData('customers', customerId, customerData);
      ui.showNotification('고객 정보가 수정되었습니다.', 'success');

      // TASK-515: 고객 → 그룹 역동기화
      if (GroupSyncManager && GroupSyncManager.syncCustomerToGroup) {
        await GroupSyncManager.syncCustomerToGroup(customerId, customerData);
      }

      // 단체명단에 수정 알림
      notifyGroupRosterUpdate(customerId, customerData);
    } else {
      await api.createTableData('customers', customerData);
      ui.showNotification('고객이 추가되었습니다.', 'success');

      // 단체명단에 새 고객 알림
      if (typeof window.notifyGroupRoster === 'function') {
        window.notifyGroupRoster(customerData);
      }
    }

    ui.closeModal('modalCustomer');
    await loadAllData();
    ui.updateDashboard();
  } catch (error) {
    ui.showNotification(`저장 중 오류: ${error.message}`, 'error');
  }
}

// 단체명단에 고객 수정 알림
function notifyGroupRosterUpdate(customerId, customerData) {
  const groupRosterFrame = document.getElementById('groupRosterFrame');
  if (groupRosterFrame) {
    groupRosterFrame.contentWindow.postMessage(
      {
        type: 'CUSTOMER_UPDATED',
        customerId: customerId,
        customerData: customerData,
      },
      '*'
    );
  } else {
    console.error('❌ 단체명단 iframe을 찾을 수 없습니다');
  }
}

export async function handleProductSubmit(e) {
  e.preventDefault();
  const productId = document.getElementById('productId').value;
  const productData = {
    // 기본 정보
    name: document.getElementById('productName').value,
    destination: document.getElementById('productDestination').value,
    duration: parseInt(document.getElementById('productDuration').value) || 0,
    price: parseInt(document.getElementById('productPrice').value) || 0,
    status: document.getElementById('productStatus').value,
    description: document.getElementById('productDescription').value,

    // 항공편 정보
    flight_id: document.getElementById('productFlightSelector').value || '',
    airline: document.getElementById('productAirline').value || '',
    outbound_flight:
      document.getElementById('productOutboundFlight').value || '',
    return_flight: document.getElementById('productReturnFlight').value || '',
    flight_note: document.getElementById('productFlightNote').value || '',

    // 호텔 정보
    hotel_name: document.getElementById('productHotelName').value || '',
    hotel_checkin: document.getElementById('productHotelCheckin').value || '',
    hotel_checkout: document.getElementById('productHotelCheckout').value || '',
    hotel_room_type:
      document.getElementById('productHotelRoomType').value || '',
    hotel_rooms:
      parseInt(document.getElementById('productHotelRooms').value) || 0,
    hotel_note: document.getElementById('productHotelNote').value || '',

    // 차량 정보
    vehicle_type: document.getElementById('productVehicleType').value || '',
    vehicle_count:
      parseInt(document.getElementById('productVehicleCount').value) || 0,
    vehicle_company:
      document.getElementById('productVehicleCompany').value || '',
    vehicle_note: document.getElementById('productVehicleNote').value || '',

    // 가이드 정보
    guide_name: document.getElementById('productGuideName').value || '',
    guide_phone: document.getElementById('productGuidePhone').value || '',
    guide_language: document.getElementById('productGuideLanguage').value || '',
    guide_note: document.getElementById('productGuideNote').value || '',

    // 수배업무
    procurement_flight: document.getElementById('productProcurementFlight')
      .checked,
    procurement_hotel: document.getElementById('productProcurementHotel')
      .checked,
    procurement_vehicle: document.getElementById('productProcurementVehicle')
      .checked,
    procurement_guide: document.getElementById('productProcurementGuide')
      .checked,
    procurement_visa: document.getElementById('productProcurementVisa').checked,
    procurement_insurance: document.getElementById(
      'productProcurementInsurance'
    ).checked,
    procurement_status:
      document.getElementById('productProcurementStatus').value || '',
    procurement_note:
      document.getElementById('productProcurementNote').value || '',
  };

  try {
    if (productId) {
      await api.updateTableData('products', productId, productData);
      ui.showNotification('상품 정보가 수정되었습니다.', 'success');
    } else {
      await api.createTableData('products', productData);
      ui.showNotification('상품이 추가되었습니다.', 'success');
    }
    ui.closeModal('modalProduct');
    await loadAllData();
    ui.updateDashboard();
  } catch (error) {
    ui.showNotification(`저장 중 오류: ${error.message}`, 'error');
  }
}

export async function handleBookingSubmit(e) {
  e.preventDefault();
  const bookingId = document.getElementById('bookingId').value;
  const customerSelect = document.getElementById('bookingCustomer');
  const productSelect = document.getElementById('bookingProduct');
  const customerName =
    customerSelect.options[customerSelect.selectedIndex].dataset.name;
  const productName =
    productSelect.options[productSelect.selectedIndex].dataset.name;

  const bookingData = {
    customer_id: customerSelect.value,
    customer_name: customerName,
    product_id: productSelect.value,
    product_name: productName,
    departure_date: document.getElementById('bookingDepartureDate').value,
    return_date: document.getElementById('bookingReturnDate').value,
    participants:
      parseInt(document.getElementById('bookingParticipants').value) || 0,
    total_price:
      parseInt(document.getElementById('bookingTotalPrice').value) || 0,
    hotel_name: document.getElementById('bookingHotel').value,
    flight_number: document.getElementById('bookingFlight').value,
    status: document.getElementById('bookingStatus').value,
    group_name: document.getElementById('bookingGroupName').value,
    notes: document.getElementById('bookingNotes').value,
  };

  try {
    if (bookingId) {
      await api.updateTableData('bookings', bookingId, bookingData);
      ui.showNotification('예약 정보가 수정되었습니다.', 'success');
    } else {
      const result = await api.createTableData('bookings', bookingData);
      // 생성된 예약번호를 알림에 포함
      const newBookingNumber = result.id.substring(0, 8).toUpperCase();
      ui.showNotification(
        `예약이 추가되었습니다. (예약번호: ${newBookingNumber})`,
        'success'
      );
    }
    ui.closeModal('modalBooking');
    await loadAllData();
    ui.updateDashboard();
  } catch (error) {
    ui.showNotification(`저장 중 오류: ${error.message}`, 'error');
  }
}

export async function handleTodoSubmit(e) {
  e.preventDefault();
  const todoId = document.getElementById('todoId').value;
  const todoData = {
    title: document.getElementById('todoTitle').value,
    due_date: document.getElementById('todoDate').value,
    priority: document.getElementById('todoPriority').value,
    description: document.getElementById('todoDescription').value,
  };

  try {
    if (todoId) {
      await api.updateTableData('todos', todoId, todoData);
      ui.showNotification('할 일이 수정되었습니다.', 'success');
    } else {
      await api.createTableData('todos', todoData);
      ui.showNotification('할 일이 추가되었습니다.', 'success');
    }
    ui.closeModal('modalTodo');
    await loadAllData();
    ui.updateDashboard();
  } catch (error) {
    ui.showNotification(`저장 중 오류: ${error.message}`, 'error');
  }
}

export function filterCustomers() {
  const searchTerm = document
    .getElementById('searchCustomers')
    .value.toLowerCase();
  const filtered = state.customers.filter(
    (customer) =>
      (customer.name_kor &&
        customer.name_kor.toLowerCase().includes(searchTerm)) ||
      (customer.name_eng &&
        customer.name_eng.toLowerCase().includes(searchTerm)) ||
      (customer.passport_number &&
        customer.passport_number.toLowerCase().includes(searchTerm)) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.travel_history &&
        customer.travel_history.toLowerCase().includes(searchTerm)) ||
      (customer.group_name &&
        customer.group_name.toLowerCase().includes(searchTerm))
  );

  // 검색 시 첫 페이지로 리셋
  state.customerPage = 1;
  state.filteredCustomers = filtered;

  // 페이지네이션 적용된 렌더링
  ui.renderCustomersTablePaginated(filtered, 1, state.customerPageSize);
}

// ==================== 고객 관리 탭/페이지네이션 핸들러 ====================

export function handleCustomerTabChange(tabName) {
  state.customerTab = tabName;

  // 탭 버튼 활성화 상태 변경
  document.querySelectorAll('.customer-tabs .tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // 탭 컨텐츠 활성화 상태 변경
  document
    .getElementById('tabAllCustomers')
    .classList.toggle('active', tabName === 'all');
  document
    .getElementById('tabGroupCustomers')
    .classList.toggle('active', tabName === 'group');

  // 탭 전환 시 단체 드롭다운 새로고침
  if (tabName === 'group') {
    ui.renderGroupDropdown();
    // 선택된 단체가 있으면 테이블 렌더링
    if (state.selectedGroup) {
      ui.renderGroupCustomersTable(state.selectedGroup);
    }
  }
}

export function handleCustomerPageChange(page) {
  // filteredCustomers는 항상 사용 (검색 중이든 아니든)
  const customers = state.filteredCustomers;
  const totalPages = Math.max(
    1,
    Math.ceil(customers.length / state.customerPageSize)
  );

  // 페이지 범위 체크
  if (page < 1 || page > totalPages) return;

  state.customerPage = page;
  ui.renderCustomersTablePaginated(customers, page, state.customerPageSize);

  // 스크롤을 테이블 상단으로 이동
  const tableWrapper = document.querySelector(
    '#tabAllCustomers .table-wrapper'
  );
  if (tableWrapper) {
    tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function handleGroupSelect(groupName) {
  state.selectedGroup = groupName || null;
  ui.renderGroupCustomersTable(groupName);
}

export function handleGroupFilterChange(filter) {
  state.groupFilter = filter;

  // 서브탭 버튼 활성화 상태 변경
  document.querySelectorAll('.group-sub-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.groupFilter === filter);
  });

  // 드롭다운 재렌더링
  ui.renderGroupDropdown();
}

export function filterProducts() {
  const searchTerm = document
    .getElementById('searchProducts')
    .value.toLowerCase();

  if (searchTerm) {
    const filtered = state.products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.destination.toLowerCase().includes(searchTerm)
    );
    ui.renderProductsGrid(filtered);
  } else {
    ui.renderProductsGrid();
  }
}

export function handleProductFilterChange(filter) {
  state.productFilter = filter;

  document.querySelectorAll('[data-product-filter]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.productFilter === filter);
  });

  ui.renderProductsGrid();
}

export function filterBookings() {
  const searchTerm = document
    .getElementById('searchBookings')
    .value.toLowerCase();
  const statusFilter = document.getElementById('filterBookingStatus').value;

  const filtered = state.bookings.filter((booking) => {
    const matchesSearch =
      booking.customer_name.toLowerCase().includes(searchTerm) ||
      booking.product_name.toLowerCase().includes(searchTerm) ||
      booking.id.toLowerCase().includes(searchTerm);
    const matchesStatus = !statusFilter || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  ui.renderBookingsTable(filtered);
}

// ==================== Customer Selection ====================

export function handleSelectAllCustomers(e) {
  const isChecked = e.target.checked;
  const checkboxes = document.querySelectorAll('.customer-checkbox');

  checkboxes.forEach((checkbox) => {
    checkbox.checked = isChecked;
    const customerId = checkbox.dataset.customerId;

    if (isChecked) {
      if (!state.selectedCustomers.includes(customerId)) {
        state.selectedCustomers.push(customerId);
      }
    } else {
      const index = state.selectedCustomers.indexOf(customerId);
      if (index > -1) {
        state.selectedCustomers.splice(index, 1);
      }
    }
  });

  updateSendToGroupButton();
}

export function handleCustomerCheckbox(e) {
  const customerId = e.target.dataset.customerId;
  const isChecked = e.target.checked;

  if (isChecked) {
    if (!state.selectedCustomers.includes(customerId)) {
      state.selectedCustomers.push(customerId);
    }
  } else {
    const index = state.selectedCustomers.indexOf(customerId);
    if (index > -1) {
      state.selectedCustomers.splice(index, 1);
    }
  }

  // 전체 선택 체크박스 상태 업데이트
  const selectAllCheckbox = document.getElementById('selectAllCustomers');
  const allCheckboxes = document.querySelectorAll('.customer-checkbox');
  const checkedCheckboxes = document.querySelectorAll(
    '.customer-checkbox:checked'
  );

  if (selectAllCheckbox) {
    selectAllCheckbox.checked =
      allCheckboxes.length === checkedCheckboxes.length &&
      allCheckboxes.length > 0;
  }

  updateSendToGroupButton();
}

function updateSendToGroupButton() {
  const sendButton = document.getElementById('btnSendToGroup');
  const deleteButton = document.getElementById('btnDeleteSelected');

  const hasSelection = state.selectedCustomers.length > 0;

  if (sendButton) {
    sendButton.disabled = !hasSelection;
  }
  if (deleteButton) {
    deleteButton.disabled = !hasSelection;
  }
}

export async function handleDeleteSelectedCustomers() {
  const selectedCount = state.selectedCustomers.length;

  if (selectedCount === 0) {
    showToast('삭제할 고객을 선택해주세요.', 'warning');
    return;
  }

  const confirmed = await showConfirmModal(
    `${selectedCount}명 고객 삭제`,
    `선택한 ${selectedCount}명의 고객을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
    { confirmText: '삭제', danger: true }
  );
  if (!confirmed) {
    return;
  }

  try {
    let successCount = 0;
    let failCount = 0;

    // 선택된 고객들을 순차적으로 삭제
    for (const customerId of state.selectedCustomers) {
      try {
        await api.deleteTableData('customers', customerId);
        successCount++;
      } catch (error) {
        console.error(`❌ 고객 ID ${customerId} 삭제 실패:`, error);
        failCount++;
      }
    }

    // 선택 상태 초기화
    state.selectedCustomers = [];

    // 전체 선택 체크박스 해제
    const selectAllCheckbox = document.getElementById('selectAllCustomers');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }

    // 데이터 새로고침
    await loadAllData();
    ui.updateDashboard();

    // 결과 알림
    if (failCount === 0) {
      showToast(`${successCount}명의 고객이 삭제되었습니다.`, 'success');
    } else {
      showToast(
        `${successCount}명 삭제 성공, ${failCount}명 삭제 실패`,
        'warning'
      );
    }

    updateSendToGroupButton();
  } catch (error) {
    showToast('고객 삭제 중 오류가 발생했습니다.', 'error');
  }
}

// ==================== 견적서/확정서 파일 업로드 ====================

// 파싱된 데이터 임시 저장
let _parsedProductData = null;

/**
 * 견적서/확정서 파일 업로드 핸들러 (엑셀 + HWP 지원)
 */
export async function handleProductFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 파일 형식 검증
  const ext = file.name.split('.').pop().toLowerCase();
  const supportedExcel = ['xlsx', 'xls'];
  const supportedHwp = ['hwp', 'hwpx'];

  if (!supportedExcel.includes(ext) && !supportedHwp.includes(ext)) {
    ui.showNotification(
      `"${ext}" 파일은 자동 파싱이 안 됩니다.\n엑셀(.xlsx) 또는 한글(.hwp) 파일로 업로드해주세요.`,
      'warning'
    );
    e.target.value = '';
    return;
  }

  // 상품 카드에서 확정서 업로드한 경우 타겟 ID가 설정됨
  const targetProductId = state._confirmationTargetProductId || null;
  state._confirmationTargetProductId = null;

  try {
    let parsed;

    if (supportedHwp.includes(ext)) {
      // HWP 파일: 백엔드로 전송하여 파싱
      ui.showNotification('한글 파일을 분석 중... (AI 처리 중)', 'info');
      parsed = await parseHwpFile(file);
    } else {
      // 엑셀 파일: 클라이언트에서 파싱
      ui.showNotification('엑셀 파일을 분석 중...', 'info');
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const arr = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(arr, { type: 'array' });
            resolve(workbook);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
      parsed = parseProductExcel(data);
    }

    _parsedProductData = parsed;

    // 상품 카드에서 확정서 업로드한 경우: 미리보기 후 자동 선택
    if (targetProductId) {
      ui.renderProductImportModal(parsed);
      const mergeSelect = document.getElementById('importMergeTarget');
      if (mergeSelect) {
        mergeSelect.value = targetProductId;
      }
      const mergeSection = document.getElementById('importMergeSection');
      if (mergeSection) mergeSection.style.display = 'block';
      ui.showNotification(
        `확정서 파싱 완료! 내용 확인 후 "반영" 버튼을 눌러주세요.`,
        'success'
      );
    } else {
      ui.renderProductImportModal(parsed);
      ui.showNotification(
        `${parsed.type === 'quotation' ? '견적서' : '확정서'} 파싱 완료!`,
        'success'
      );
    }

    // 미리보기 모드 해제: 저장/수정 버튼 복원
    const btnSave = document.getElementById('btnImportSave');
    const btnEdit = document.getElementById('btnImportEdit');
    if (btnSave) btnSave.style.display = '';
    if (btnEdit) btnEdit.style.display = '';
  } catch (error) {
    ui.showNotification(`파일 파싱 실패: ${error.message}`, 'error');
  }

  e.target.value = '';
}

/**
 * HWP 파일을 백엔드로 전송하여 파싱
 */
async function parseHwpFile(file) {
  const formData = new FormData();
  formData.append('product_file', file);

  const response = await fetch('/api/parse-product-file', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch((parseErr) => {
      console.error('서버 오류 응답 파싱 실패:', parseErr);
      return {};
    });
    throw new Error(err.error || `서버 오류 (${response.status})`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error('파싱 결과가 없습니다.');
  }

  return result.data;
}

/**
 * 파싱 결과 바로 저장
 */
export async function handleImportSave() {
  if (!_parsedProductData) {
    ui.showNotification(
      '파싱된 데이터가 없습니다. 파일을 다시 업로드해주세요.',
      'warning'
    );
    return;
  }

  try {
    // 수동 입력 단체명 반영
    const groupNameInput = document.getElementById('importGroupName');
    if (groupNameInput && groupNameInput.value.trim()) {
      _parsedProductData.groupName = groupNameInput.value.trim();
    }
    const productData = mapToProductData(_parsedProductData);
    await api.createTableData('products', productData);
    ui.closeModal('modalProductImport');
    ui.showNotification('상품이 저장되었습니다.', 'success');
    await loadAllData();
    ui.updateDashboard();
    _parsedProductData = null;
  } catch (error) {
    ui.showNotification(`저장 실패: ${error.message}`, 'error');
  }
}

/**
 * 파싱 결과를 상품 모달에 채워서 열기 (수정 후 저장)
 */
export function handleImportEdit() {
  if (!_parsedProductData) return;

  // 수동 입력 단체명 반영
  const groupNameInput = document.getElementById('importGroupName');
  if (groupNameInput && groupNameInput.value.trim()) {
    _parsedProductData.groupName = groupNameInput.value.trim();
  }
  const productData = mapToProductData(_parsedProductData);
  ui.closeModal('modalProductImport');

  // 상품 모달 열기 (새 상품)
  const form = document.getElementById('formProduct');
  form.reset();
  document.getElementById('productId').value = '';
  document.getElementById('modalProductTitle').textContent =
    '상품 추가 (엑셀 데이터)';

  // 기본 정보
  document.getElementById('productName').value = productData.name || '';
  document.getElementById('productDestination').value =
    productData.destination || '';
  document.getElementById('productDuration').value = productData.duration || '';
  document.getElementById('productPrice').value = productData.price || '';
  document.getElementById('productStatus').value = productData.status || '활성';
  document.getElementById('productDescription').value =
    productData.description || '';

  // 호텔
  document.getElementById('productHotelName').value =
    productData.hotel_name || '';
  document.getElementById('productHotelCheckin').value =
    productData.hotel_checkin || '';
  document.getElementById('productHotelCheckout').value =
    productData.hotel_checkout || '';
  document.getElementById('productHotelRoomType').value =
    productData.hotel_room_type || '';
  document.getElementById('productHotelRooms').value =
    productData.hotel_rooms || '';
  document.getElementById('productHotelNote').value =
    productData.hotel_note || '';

  // 차량
  document.getElementById('productVehicleType').value =
    productData.vehicle_type || '';
  document.getElementById('productVehicleCount').value =
    productData.vehicle_count || '';
  document.getElementById('productVehicleNote').value =
    productData.vehicle_note || '';

  // 가이드
  document.getElementById('productGuideName').value =
    productData.guide_name || '';
  document.getElementById('productGuidePhone').value =
    productData.guide_phone || '';

  // 수배
  document.getElementById('productProcurementHotel').checked =
    productData.procurement_hotel;
  document.getElementById('productProcurementVehicle').checked =
    productData.procurement_vehicle;
  document.getElementById('productProcurementGuide').checked =
    productData.procurement_guide;
  document.getElementById('productProcurementStatus').value =
    productData.procurement_status || '';
  document.getElementById('productProcurementNote').value =
    productData.procurement_note || '';

  ui.openModal('modalProduct');
  _parsedProductData = null;
}

/**
 * 확정서 파싱 결과를 기존 상품에 반영 (덮어쓰기)
 */
export async function handleImportMerge() {
  if (!_parsedProductData) return;

  const select = document.getElementById('importMergeTarget');
  const productId = select.value;
  if (!productId) {
    ui.showNotification('반영할 상품을 선택해주세요.', 'warning');
    return;
  }

  const existing = state.products.find((p) => p.id === productId);
  if (!existing) {
    ui.showNotification('선택한 상품을 찾을 수 없습니다.', 'error');
    return;
  }

  try {
    const parsed = _parsedProductData;
    // 수동 입력 단체명 반영
    const groupNameInput = document.getElementById('importGroupName');
    if (groupNameInput && groupNameInput.value.trim()) {
      parsed.groupName = groupNameInput.value.trim();
    }
    // 확정서에서 나온 정보만 업데이트 (빈값은 기존 유지)
    const updates = {};

    if (parsed.guide && parsed.guide.name)
      updates.guide_name = parsed.guide.name;
    if (parsed.guide && parsed.guide.phone)
      updates.guide_phone = parsed.guide.phone;
    if (parsed.hotel && parsed.hotel.name)
      updates.hotel_name = parsed.hotel.name;
    if (parsed.hotel && parsed.hotel.roomType)
      updates.hotel_room_type = parsed.hotel.roomType;
    if (parsed.hotel && parsed.hotel.rooms)
      updates.hotel_rooms = parsed.hotel.rooms;
    if (parsed.hotel && parsed.hotel.nights)
      updates.hotel_note = `${parsed.hotel.nights}박`;
    if (parsed.travelDates && parsed.travelDates.from)
      updates.hotel_checkin = parsed.travelDates.from;
    if (parsed.travelDates && parsed.travelDates.to)
      updates.hotel_checkout = parsed.travelDates.to;
    if (parsed.vehicle && parsed.vehicle.type)
      updates.vehicle_type = parsed.vehicle.type;
    if (parsed.vehicle && parsed.vehicle.count)
      updates.vehicle_count = parsed.vehicle.count;
    if (parsed.groupName) updates.name = parsed.groupName;
    if (parsed.destination) updates.destination = parsed.destination;
    if (parsed.duration) updates.duration = parsed.duration;
    if (parsed.inclusions) updates.procurement_note = parsed.inclusions;

    // 견적서: 비용 정보 반영
    if (parsed.costs && parsed.costs.perPerson)
      updates.price = Math.round(parsed.costs.perPerson);
    if (parsed.roomConfig)
      updates.hotel_room_type = updates.hotel_room_type || parsed.roomConfig;

    // 수배 체크리스트 자동 체크
    if (parsed.guide && parsed.guide.name) updates.procurement_guide = true;
    if (parsed.hotel && parsed.hotel.name) updates.procurement_hotel = true;
    if (parsed.vehicle && parsed.vehicle.type)
      updates.procurement_vehicle = true;
    updates.procurement_status = 'in_progress';

    // 일정표/설명 추가
    const typeLabel = parsed.type === 'quotation' ? '견적서' : '확정서';
    if (parsed.itinerary && parsed.itinerary.length > 0) {
      const itineraryText = parsed.itinerary
        .map((d) => `DAY${d.day}: ${d.schedule || d.content || ''}`)
        .join(' / ');
      const existingDesc = existing.description || '';
      updates.description = existingDesc
        ? `${existingDesc}\n[${typeLabel} 일정] ${itineraryText}`
        : `[${typeLabel} 일정] ${itineraryText}`;
    }

    const merged = { ...existing, ...updates };
    await api.updateTableData('products', productId, merged);

    ui.closeModal('modalProductImport');
    const typeName = parsed.type === 'quotation' ? '견적서' : '확정서';
    ui.showNotification(
      `"${existing.name}" 상품에 ${typeName} 정보가 반영되었습니다.`,
      'success'
    );
    await loadAllData();
    ui.updateDashboard();
    _parsedProductData = null;
  } catch (error) {
    ui.showNotification(`반영 실패: ${error.message}`, 'error');
  }
}
