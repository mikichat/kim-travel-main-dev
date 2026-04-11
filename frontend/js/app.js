// js/app.js (Main Orchestrator)
import { state } from './modules/state.js';
import * as api from './modules/api.js';
import * as ui from './modules/ui.js';
import * as handlers from './modules/eventHandlers.js';
import * as modals from './modules/modals.js';
import { checkAndAddSampleData } from './modules/sampleData.js';
const { showToast, showPromptModal, showConfirmModal } = window;
const { fetchJSON } = window;
const { FlightSyncManager } = window;

// 자주 사용하는 함수들을 편의상 직접 import
const showNotification = ui.showNotification;
const openModal = ui.openModal;

/** 고유 ID 생성 (타임스탬프 + 랜덤 영숫자) */
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}

// ==================== 예약 → 단체명단 동기화 ====================

// 예약을 단체명단으로 동기화하는 함수
async function syncBookingToGroupRoster(bookingId) {
  try {
    // 예약 정보 가져오기
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      ui.showNotification('예약 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    // 고객 상세 정보 가져오기
    const customer = await fetchJSON(
      `/tables/customers/${booking.customer_id}`
    );

    // 단체명 입력 받기
    let groupName = booking.group_name || '';
    if (!groupName) {
      groupName = await showPromptModal(
        '단체명 입력',
        `${booking.product_name} ${booking.departure_date}`
      );
      if (!groupName) {
        return; // 사용자가 취소한 경우
      }
    }

    // DB API에서 단체 데이터 가져오기
    const groupsResult = await fetchJSON('/tables/groups');
    const groups = groupsResult.data || groupsResult;

    // 같은 이름의 단체 찾기
    const targetGroup = groups.find((g) => g.name === groupName);

    // 고객 데이터를 단체명단 형식으로 변환
    const memberData = {
      nameKr: customer.name_kor || '',
      nameKor: customer.name_kor || '',
      nameEn: customer.name_eng || '',
      nameEng: customer.name_eng || '',
      passportNo: customer.passport_number || '',
      birthDate: customer.birth_date || '',
      passportExpire: customer.passport_expiry || '',
      phone: customer.phone || '',
      gender: customer.gender || '',
      room: '',
      idNo: '',
    };

    if (targetGroup) {
      // 기존 단체의 멤버 파싱
      let members = [];
      try {
        members =
          typeof targetGroup.members === 'string'
            ? JSON.parse(targetGroup.members)
            : targetGroup.members || [];
      } catch (_e) {
        members = [];
      }

      // 중복 체크
      const exists = members.some(
        (m) => m.passportNo === memberData.passportNo
      );
      if (exists) {
        ui.showNotification('이미 단체명단에 등록된 고객입니다.', 'warning');
        return;
      }
      members.push(memberData);

      // DB 업데이트
      await fetchJSON(`/tables/groups/${targetGroup.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...targetGroup,
          members: JSON.stringify(members),
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      // 새 단체 생성
      const newGroup = {
        name: groupName,
        destination: booking.product_name || '',
        departure_date: booking.departure_date || '',
        return_date: booking.return_date || '',
        members: JSON.stringify([memberData]),
      };
      await fetchJSON('/tables/groups', {
        method: 'POST',
        body: JSON.stringify(newGroup),
      });
    }

    // 예약의 group_name 업데이트
    if (booking.group_name !== groupName) {
      await api.updateTableData('bookings', bookingId, {
        ...booking,
        group_name: groupName,
      });
      await handlers.loadAllData();
    }

    ui.showNotification(`단체명단 "${groupName}"에 추가되었습니다.`, 'success');
  } catch (error) {
    ui.showNotification(`동기화 실패: ${error.message}`, 'error');
  }
}

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', async () => {
  await checkAndAddSampleData();
  initializeEventListeners();
  await handlers.loadAllData();
  // 항공편 캐시 워밍업 (캘린더에서 동기 접근용)
  if (typeof FlightSyncManager !== 'undefined') {
    FlightSyncManager.getFlights().catch(() => {});
  }
  ui.updateDashboard();
  renderCalendar(); // 달력 렌더링
  renderTodoList(); // 할 일 목록 렌더링
  updateCurrentDate();

  // Handle page navigation from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page');
  if (page) {
    ui.navigateToPage(page);
  }

  // 테이블 스크롤 힌트 (모바일)
  document.querySelectorAll('.table-wrapper').forEach((wrapper) => {
    function checkScroll() {
      const hasOverflow = wrapper.scrollWidth > wrapper.clientWidth;
      const atEnd =
        wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 5;
      wrapper.classList.toggle('scrollable', hasOverflow && !atEnd);
    }
    checkScroll();
    wrapper.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
  });
});

function updateCurrentDate() {
  const dateElement = document.getElementById('currentDate');
  const now = new Date();
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  };
  dateElement.textContent = now.toLocaleDateString('ko-KR', options);
}

// ==================== Event Listeners Setup ====================

function initializeEventListeners() {
  // Navigation
  document.querySelector('.sidebar-nav').addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-page]');
    if (navItem && navItem.dataset.page) {
      e.preventDefault();
      ui.navigateToPage(navItem.dataset.page);
    }
  });

  // Sidebar Toggle
  document.getElementById('btnToggleSidebar').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('active');
  });

  // 단체명단에서 고객 추가 시 고객 목록 새로고침
  window.addEventListener('reloadCustomers', async () => {
    await handlers.loadAllData();
    ui.updateDashboard();
  });

  // TASK-516: 그룹 데이터 변경 시 달력 자동 갱신 (Storage Event)
  window.addEventListener('storage', async (e) => {
    if (e.key === 'group-roster-data') {
      await handlers.loadAllData();
      renderCalendar();
      ui.updateDashboard();
    }
  });

  // Modals Close
  document.addEventListener('click', (e) => {
    if (e.target.matches('.modal-close') || e.target.closest('.modal-close')) {
      const modal = e.target.closest('.modal');
      if (modal) ui.closeModal(modal.id);
    }
  });

  // Form Submissions
  document
    .getElementById('formCustomer')
    .addEventListener('submit', handlers.handleCustomerSubmit);
  document
    .getElementById('formProduct')
    .addEventListener('submit', handlers.handleProductSubmit);
  document
    .getElementById('formBooking')
    .addEventListener('submit', handlers.handleBookingSubmit);
  document
    .getElementById('formTodo')
    .addEventListener('submit', handlers.handleTodoSubmit);
  document
    .getElementById('formSchedule')
    .addEventListener('submit', handleScheduleSubmit);
  document
    .getElementById('formGroupEdit')
    .addEventListener('submit', handleGroupEditSubmit);

  // 알림 관리 버튼
  document
    .getElementById('btnRefreshNotifications')
    ?.addEventListener('click', async () => {
      await handlers.loadAllData();
      ui.renderNotifications();
      ui.showNotification('알림 목록을 새로고침했습니다.', 'success');
    });
  document
    .getElementById('btnClearAllNotifications')
    ?.addEventListener('click', async () => {
      if (
        !(await showConfirmModal(
          '알림 전체 삭제',
          '모든 알림을 삭제하시겠습니까?',
          { danger: true }
        ))
      )
        return;
      try {
        const notifications = state.notifications || [];
        for (const n of notifications) {
          await api.deleteTableData('notifications', n.id);
        }
        await handlers.loadAllData();
        ui.renderNotifications();
        ui.showNotification('모든 알림이 삭제되었습니다.', 'success');
      } catch (error) {
        ui.showNotification('알림 삭제 중 오류가 발생했습니다.', 'error');
      }
    });

  // 개별 알림 읽음/삭제 버튼 (이벤트 위임)
  document
    .getElementById('notificationsContainer')
    ?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;
      try {
        if (action === 'mark-notification-read') {
          await fetchJSON(`/tables/notifications/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ is_read: 1 }),
          });
          await handlers.loadAllData();
          ui.renderNotifications();
        } else if (action === 'delete-notification') {
          await api.deleteTableData('notifications', id);
          await handlers.loadAllData();
          ui.renderNotifications();
        }
      } catch (error) {
        ui.showNotification('알림 처리 중 오류가 발생했습니다.', 'error');
      }
    });

  // Filters and Search
  document
    .getElementById('searchCustomers')
    .addEventListener('input', handlers.filterCustomers);
  document
    .getElementById('searchProducts')
    .addEventListener('input', handlers.filterProducts);
  // 상품 서브탭 (진행 행사 / 완료 행사) 이벤트
  document.querySelectorAll('[data-product-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handlers.handleProductFilterChange(btn.dataset.productFilter);
    });
  });
  document
    .getElementById('searchBookings')
    .addEventListener('input', handlers.filterBookings);
  document
    .getElementById('filterBookingStatus')
    .addEventListener('change', handlers.filterBookings);

  // Add/Open Modal Buttons
  document
    .getElementById('btnAddCustomer')
    .addEventListener('click', () => modals.openCustomerModal());
  document
    .getElementById('btnAddProduct')
    .addEventListener('click', () => modals.openProductModal());
  document
    .getElementById('btnAddBooking')
    .addEventListener('click', () => modals.openBookingModal());
  document
    .getElementById('btnAddTodo')
    .addEventListener('click', () => modals.openTodoModal());

  // 견적서/확정서 엑셀 업로드
  document.getElementById('btnImportProducts').addEventListener('click', () => {
    document.getElementById('productFileInput').click();
  });
  document
    .getElementById('productFileInput')
    .addEventListener('change', handlers.handleProductFileUpload);
  document
    .getElementById('btnImportSave')
    .addEventListener('click', handlers.handleImportSave);
  document
    .getElementById('btnImportEdit')
    .addEventListener('click', handlers.handleImportEdit);
  document
    .getElementById('btnImportMerge')
    .addEventListener('click', handlers.handleImportMerge);

  // 여권 OCR 스캔 버튼
  document
    .getElementById('btnPassportOcr')
    .addEventListener('click', handlers.handlePassportOcr);

  // 여권 파일 선택 시 OCR 버튼 활성화/비활성화
  document
    .getElementById('customerPassportFile')
    .addEventListener('change', function () {
      const ocrBtn = document.getElementById('btnPassportOcr');
      ocrBtn.disabled = !this.files.length;
    });

  // 여권 파일 삭제 버튼
  document
    .getElementById('btnRemovePassport')
    .addEventListener('click', modals.removePassportFile);

  // Customer checkbox - 전체 선택
  document
    .getElementById('selectAllCustomers')
    .addEventListener('change', handlers.handleSelectAllCustomers);

  // Customer 일괄 삭제 버튼
  document
    .getElementById('btnDeleteSelected')
    .addEventListener('click', handlers.handleDeleteSelectedCustomers);

  // 단체명단으로 보내기 버튼
  document
    .getElementById('btnSendToGroup')
    .addEventListener('click', handleSendToGroupClick);

  // 단체명단으로 보내기 확인 버튼
  document
    .getElementById('btnConfirmSendToGroup')
    .addEventListener('click', handleConfirmSendToGroup);

  // 단체명단 모달 라디오 버튼 변경
  document.querySelectorAll('input[name="groupOption"]').forEach((radio) => {
    radio.addEventListener('change', handleGroupOptionChange);
  });

  // 견적서 미리보기 버튼
  document
    .getElementById('btnPreviewQuote')
    .addEventListener('click', handleQuotePreview);

  // 견적서 생성 버튼
  document
    .getElementById('btnGenerateQuote')
    .addEventListener('click', handleQuoteGenerate);

  // 보안 모드 토글 버튼 (전체 고객 탭)
  document.getElementById('toggleSecurity').addEventListener('click', () => {
    state.securityMode = !state.securityMode;
    const btn = document.getElementById('toggleSecurity');
    const icon = btn.querySelector('i');
    const text = document.getElementById('securityBtnText');

    // 단체별 조회 탭 버튼도 동기화
    const btnGroup = document.getElementById('toggleSecurityGroup');
    const btnTextGroup = document.getElementById('securityBtnTextGroup');
    const iconGroup = btnGroup?.querySelector('i');

    if (state.securityMode) {
      // 보안 모드 활성화 (마스킹 ON)
      icon.className = 'fas fa-eye-slash';
      text.textContent = '암호화 데이터 보기';
      btn.className = 'btn btn-warning';
      if (iconGroup) iconGroup.className = 'fas fa-eye-slash';
      if (btnTextGroup) btnTextGroup.textContent = '암호화 데이터 보기';
      if (btnGroup) btnGroup.className = 'btn btn-warning';
    } else {
      // 보안 모드 비활성화 (마스킹 OFF - 평문 표시)
      icon.className = 'fas fa-eye';
      text.textContent = '데이터 숨기기';
      btn.className = 'btn btn-success';
      if (iconGroup) iconGroup.className = 'fas fa-eye';
      if (btnTextGroup) btnTextGroup.textContent = '데이터 숨기기';
      if (btnGroup) btnGroup.className = 'btn btn-success';
    }

    // 고객 테이블 다시 렌더링 (페이지네이션 유지)
    ui.renderCustomersTablePaginated(
      state.filteredCustomers,
      state.customerPage,
      state.customerPageSize
    );
    // 단체별 조회 탭도 새로고침
    if (state.selectedGroup) {
      ui.renderGroupCustomersTable(state.selectedGroup);
    }
  });

  // 고객 관리 탭 버튼 이벤트
  document.querySelectorAll('.customer-tabs .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      handlers.handleCustomerTabChange(btn.dataset.tab);
    });
  });

  // 고객 관리 페이지네이션 이벤트 (이벤트 위임)
  document
    .getElementById('customerPagination')
    .addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (btn && !btn.disabled) {
        const page = parseInt(btn.dataset.page);
        handlers.handleCustomerPageChange(page);
      }
    });

  // 단체 서브탭 (활성 단체 / 지난 행사) 이벤트
  document.querySelectorAll('.group-sub-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      handlers.handleGroupFilterChange(btn.dataset.groupFilter);
    });
  });

  // 단체 드롭다운 이벤트
  document.getElementById('groupDropdown').addEventListener('change', (e) => {
    handlers.handleGroupSelect(e.target.value);
  });

  // 달력 이전/다음 버튼
  document.getElementById('btnPrevMonth').addEventListener('click', prevMonth);
  document.getElementById('btnNextMonth').addEventListener('click', nextMonth);

  // 일정 색상 선택 변경 이벤트
  document.getElementById('scheduleColor').addEventListener('input', (e) => {
    document.getElementById('colorLabel').textContent =
      e.target.value.toUpperCase();
  });

  // 일정 가져오기 버튼
  document.getElementById('btnImportSchedule').addEventListener('click', () => {
    document.getElementById('scheduleFileInput').click();
  });
  document
    .getElementById('scheduleFileInput')
    .addEventListener('change', handleScheduleImport);

  // Event delegation for dynamic elements (edit/delete buttons and checkboxes)
  document
    .getElementById('customersTable')
    .addEventListener('click', async (e) => {
      // 체크박스 클릭 처리
      if (e.target.classList.contains('customer-checkbox')) {
        handlers.handleCustomerCheckbox(e);
        return;
      }

      const target = e.target.closest('button');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;

      if (action === 'edit-customer') {
        modals.openCustomerModal(id);
      } else if (action === 'delete-customer') {
        if (
          await showConfirmModal(
            '고객 삭제',
            '정말 이 고객을 삭제하시겠습니까?',
            { danger: true }
          )
        ) {
          try {
            await api.deleteTableData('customers', id);
            await handlers.loadAllData();
            ui.updateDashboard();
            showToast('고객이 삭제되었습니다.', 'success');
          } catch (error) {
            showToast(`고객 삭제 실패: ${error.message}`, 'error');
          }
        }
      }
    });

  // 단체별 조회 테이블 - 수정/삭제 버튼 클릭 (이벤트 위임)
  document
    .getElementById('groupCustomersTable')
    .addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;

      if (action === 'edit-customer') {
        modals.openCustomerModal(id);
      } else if (action === 'delete-customer') {
        if (
          await showConfirmModal(
            '고객 삭제',
            '정말 이 고객을 삭제하시겠습니까?',
            { danger: true }
          )
        ) {
          try {
            await api.deleteTableData('customers', id);
            await handlers.loadAllData();
            showToast('고객이 삭제되었습니다.', 'success');
          } catch (error) {
            showToast(`고객 삭제 실패: ${error.message}`, 'error');
          }
        }
      }
    });

  // 단체별 조회 - 암호화 데이터 보기 버튼
  document
    .getElementById('toggleSecurityGroup')
    .addEventListener('click', () => {
      state.securityMode = !state.securityMode;
      const btn = document.getElementById('toggleSecurityGroup');
      const btnText = document.getElementById('securityBtnTextGroup');
      const icon = btn.querySelector('i');

      // 전체 고객 탭 버튼도 동기화
      const btnAll = document.getElementById('toggleSecurity');
      const btnTextAll = document.getElementById('securityBtnText');
      const iconAll = btnAll?.querySelector('i');

      if (state.securityMode) {
        btnText.textContent = '암호화 데이터 보기';
        icon.className = 'fas fa-eye-slash';
        btn.className = 'btn btn-warning';
        if (btnTextAll) btnTextAll.textContent = '암호화 데이터 보기';
        if (iconAll) iconAll.className = 'fas fa-eye-slash';
        if (btnAll) btnAll.className = 'btn btn-warning';
      } else {
        btnText.textContent = '데이터 숨기기';
        icon.className = 'fas fa-eye';
        btn.className = 'btn btn-success';
        if (btnTextAll) btnTextAll.textContent = '데이터 숨기기';
        if (iconAll) iconAll.className = 'fas fa-eye';
        if (btnAll) btnAll.className = 'btn btn-success';
      }

      // 단체별 조회 테이블 다시 렌더링
      if (state.selectedGroup) {
        ui.renderGroupCustomersTable(state.selectedGroup);
      }
      // 전체 고객 테이블도 다시 렌더링
      ui.renderCustomersTablePaginated(
        state.filteredCustomers,
        state.customerPage,
        state.customerPageSize
      );
    });

  document
    .getElementById('productsGrid')
    .addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;

      if (action === 'edit-product') {
        modals.openProductModal(id);
      } else if (action === 'delete-product') {
        if (
          await showConfirmModal(
            '상품 삭제',
            '정말 이 상품을 삭제하시겠습니까?',
            { danger: true }
          )
        ) {
          try {
            await api.deleteTableData('products', id);
            await handlers.loadAllData();
            ui.updateDashboard();
            showToast('상품이 삭제되었습니다.', 'success');
          } catch (error) {
            showToast(`상품 삭제 실패: ${error.message}`, 'error');
          }
        }
      } else if (action === 'preview-product') {
        ui.showProductPreview(id);
      } else if (action === 'upload-confirmation') {
        // 확정서 업로드: 해당 상품 ID를 기억하고 파일 선택 트리거
        state._confirmationTargetProductId = id;
        document.getElementById('productFileInput').click();
      }
    });

  document
    .getElementById('bookingsTable')
    .addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;

      if (action === 'edit-booking') {
        modals.openBookingModal(id);
      } else if (action === 'delete-booking') {
        if (
          await showConfirmModal(
            '예약 삭제',
            '정말 이 예약을 삭제하시겠습니까?',
            { danger: true }
          )
        ) {
          try {
            await api.deleteTableData('bookings', id);
            await handlers.loadAllData();
            ui.updateDashboard();
            showToast('예약이 삭제되었습니다.', 'success');
          } catch (error) {
            showToast(`예약 삭제 실패: ${error.message}`, 'error');
          }
        }
      } else if (action === 'sync-to-group') {
        await syncBookingToGroupRoster(id);
      }
    });
}


// 엑셀 파일 읽기
function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

// 엑셀 날짜 형식 변환
function formatDateFromExcel(dateValue, isPassportExpiry = false) {
  if (!dateValue) return '';

  // 이미 문자열 형식인 경우
  if (typeof dateValue === 'string') {
    // YYYY-MM-DD 형식인지 확인
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      // 여권 만료일이 1900년대인 경우 2000년대로 수정
      if (isPassportExpiry && dateValue.startsWith('19')) {
        const correctedDate = '20' + dateValue.substring(2);
        console.warn(
          `⚠️ 여권 만료일 자동 수정: ${dateValue} → ${correctedDate}`
        );
        return correctedDate;
      }
      return dateValue;
    }
    // 다른 형식이면 파싱 시도
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      const isoDate = date.toISOString().split('T')[0];
      // 여권 만료일이 1900년대인 경우 2000년대로 수정
      if (isPassportExpiry && isoDate.startsWith('19')) {
        const correctedDate = '20' + isoDate.substring(2);
        console.warn(`⚠️ 여권 만료일 자동 수정: ${isoDate} → ${correctedDate}`);
        return correctedDate;
      }
      return isoDate;
    }
  }

  // 엑셀 숫자 날짜 형식인 경우
  if (typeof dateValue === 'number') {
    const date = XLSX.SSF.parse_date_code(dateValue);
    let year = date.y;

    // 여권 만료일이 1900년대인 경우 2000년대로 수정
    if (isPassportExpiry && year < 2000) {
      year = 2000 + (year % 100);
      console.warn(`⚠️ 여권 만료일 자동 수정: ${date.y} → ${year}`);
    }

    return `${year}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // Date 객체인 경우
  if (dateValue instanceof Date) {
    const isoDate = dateValue.toISOString().split('T')[0];
    // 여권 만료일이 1900년대인 경우 2000년대로 수정
    if (isPassportExpiry && isoDate.startsWith('19')) {
      const correctedDate = '20' + isoDate.substring(2);
      console.warn(`⚠️ 여권 만료일 자동 수정: ${isoDate} → ${correctedDate}`);
      return correctedDate;
    }
    return isoDate;
  }

  return String(dateValue);
}

// ==================== 달력 및 할 일 관리 ====================

// 할 일 데이터 로드
async function loadTodos() {
  try {
    const data = await fetchJSON('tables/todos?limit=1000');
    state.todos = data.data || [];
    renderTodoList();
    renderCalendar();
  } catch (error) {
    showToast('할 일 데이터를 불러오는데 실패했습니다.', 'error');
  }
}

// 달력 렌더링
export async function renderCalendar() {
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();

  // 타이틀 업데이트
  document.getElementById('calendarTitle').textContent =
    `${year}년 ${month + 1}월`;

  // 데이터베이스에서 일정 가져오기
  try {
    const schedules = await fetchJSON('/api/schedules');
    state.schedules = schedules;
  } catch (error) {
    showToast('일정 데이터를 불러오는데 실패했습니다.', 'error');
    state.schedules = [];
  }

  // 이번 달의 첫날과 마지막날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);

  const firstDayOfWeek = firstDay.getDay();
  const lastDate = lastDay.getDate();
  const prevLastDate = prevLastDay.getDate();

  const calendarDays = document.getElementById('calendarDays');
  calendarDays.innerHTML = '';

  // 이전 달 날짜
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevLastDate - i;
    const dayElement = createDayElement(year, month - 1, day, 'other-month');
    calendarDays.appendChild(dayElement);
  }

  // 이번 달 날짜
  for (let day = 1; day <= lastDate; day++) {
    const dayElement = createDayElement(year, month, day, 'current-month');
    calendarDays.appendChild(dayElement);
  }

  // 다음 달 날짜 (6주 채우기)
  const totalCells = calendarDays.children.length;
  const remainingCells = 42 - totalCells; // 6주 * 7일
  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createDayElement(year, month + 1, day, 'other-month');
    calendarDays.appendChild(dayElement);
  }
}

// 날짜 요소 생성
function createDayElement(year, month, day, className) {
  const dayElement = document.createElement('div');
  dayElement.className = `calendar-day ${className}`;

  const date = new Date(year, month, day);
  // UTC 변환으로 인한 날짜 오류 방지: 직접 YYYY-MM-DD 형식 생성
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateString = `${yyyy}-${mm}-${dd}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 오늘 표시
  if (date.getTime() === today.getTime()) {
    dayElement.classList.add('today');
  }

  // 요일별 색상 적용 (일요일=0, 토요일=6)
  const dayOfWeek = date.getDay();
  let dayNumberColor = '#333';
  if (dayOfWeek === 0) dayNumberColor = '#f44336'; // 일요일 빨간색
  if (dayOfWeek === 6) dayNumberColor = '#2196F3'; // 토요일 파란색

  dayElement.innerHTML = `<div class="day-number" style="color: ${dayNumberColor}">${day}</div>`;

  // 출발/도착 표시
  const bookingsOnDate = state.bookings.filter((b) => {
    const departure = b.departure_date === dateString;
    const arrival = b.return_date === dateString;
    return departure || arrival;
  });

  // 단체 일정 표시 (state에서 가져오기)
  const groupsOnDate = state.groups.filter(
    (g) => g.departureDate === dateString || g.returnDate === dateString
  );

  // DB 일정 표시
  const dbSchedules = (state.schedules || []).filter(
    (s) => s.event_date === dateString
  );

  // 항공편 정보 표시
  const flightsOnDate = [];
  try {
    if (FlightSyncManager) {
      const allFlights = FlightSyncManager.getFlightsSync();
      // 각 항공편의 모든 구간을 확인
      allFlights.forEach((flightSave) => {
        if (flightSave.flights && flightSave.flights.length > 0) {
          flightSave.flights.forEach((flight, index) => {
            // 날짜 파싱
            const flightDate = flight.date
              ? flight.date.split('(')[0].replace(/\./g, '-')
              : '';
            if (flightDate === dateString) {
              flightsOnDate.push({
                flightId: `${flightSave.id}-${index}`, // 항공편 ID 추가
                groupName: flightSave.name || '',
                flightNumber: flight.flightNumber || '',
                departure: flight.departure?.airport || '',
                arrival: flight.arrival?.airport || '',
                segmentType:
                  index === 0
                    ? 'departure'
                    : index === flightSave.flights.length - 1
                      ? 'arrival'
                      : 'stopover',
              });
            }
          });
        }
      });
    }
  } catch (error) {
  }

  // 항공편 → 단체 병합: 같은 이름의 항공편은 단체 이벤트에 편명 추가 표시
  const groupNameSet = new Set(groupsOnDate.map((g) => g.name));
  const mergedFlightMap = new Map(); // groupName → [flightNumber, ...]
  const unmatchedFlights = [];

  flightsOnDate.forEach((flight) => {
    if (flight.groupName && groupNameSet.has(flight.groupName)) {
      if (!mergedFlightMap.has(flight.groupName)) {
        mergedFlightMap.set(flight.groupName, []);
      }
      const numbers = mergedFlightMap.get(flight.groupName);
      if (flight.flightNumber && !numbers.includes(flight.flightNumber)) {
        numbers.push(flight.flightNumber);
      }
    } else {
      unmatchedFlights.push(flight);
    }
  });

  // 이벤트가 있는 경우에만 eventsDiv 생성
  if (
    bookingsOnDate.length > 0 ||
    groupsOnDate.length > 0 ||
    dbSchedules.length > 0 ||
    flightsOnDate.length > 0
  ) {
    const eventsDiv = document.createElement('div');
    eventsDiv.className = 'day-events';

    // 과거 날짜인지 확인
    const isPastDate = date < today;

    // 예약 표시
    bookingsOnDate.forEach((booking) => {
      if (booking.departure_date === dateString) {
        const event = document.createElement('div');
        event.className = 'event departure';
        event.innerHTML = `🛫 ${ui.sanitizeHtml(booking.customer_name)}`;
        event.title = `출발: ${booking.product_name}`;
        if (isPastDate) {
          event.style.textDecoration = 'line-through';
          event.style.opacity = '0.6';
        }
        // 클릭 시 예약 편집 모달 열기
        event.addEventListener('click', (e) => {
          e.stopPropagation(); // 날짜 클릭 이벤트 방지
          openBookingEditModal(booking.id);
        });
        event.style.cursor = 'pointer';
        eventsDiv.appendChild(event);
      }
      if (booking.return_date === dateString) {
        const event = document.createElement('div');
        event.className = 'event arrival';
        event.innerHTML = `🛬 ${ui.sanitizeHtml(booking.customer_name)}`;
        event.title = `도착: ${booking.product_name}`;
        if (isPastDate) {
          event.style.textDecoration = 'line-through';
          event.style.opacity = '0.6';
        }
        // 클릭 시 예약 편집 모달 열기
        event.addEventListener('click', (e) => {
          e.stopPropagation(); // 날짜 클릭 이벤트 방지
          openBookingEditModal(booking.id);
        });
        event.style.cursor = 'pointer';
        eventsDiv.appendChild(event);
      }
    });

    // 단체 일정 표시
    groupsOnDate.forEach((group) => {
      const isDeparture = group.departureDate === dateString;
      const isReturn = group.returnDate === dateString;

      if (isDeparture) {
        const event = document.createElement('div');
        event.className = 'event departure';
        const flightNumbers = mergedFlightMap.get(group.name);
        const flightSuffix = flightNumbers ? ` ${flightNumbers.join('/')}` : '';
        event.innerHTML = `🛫 ${ui.sanitizeHtml(group.name)} (${group.members?.length || 0}명)${ui.sanitizeHtml(flightSuffix)}`;
        event.title = `단체 출발: ${group.name} - ${group.destination || ''}${flightSuffix ? ' / 편명: ' + flightNumbers.join(', ') : ''}`;
        if (isPastDate) {
          event.style.textDecoration = 'line-through';
          event.style.opacity = '0.6';
        }
        // 클릭 시 단체 편집 모달 열기
        event.addEventListener('click', (e) => {
          e.stopPropagation(); // 날짜 클릭 이벤트 방지
          openGroupEditModal(group.id);
        });
        event.style.cursor = 'pointer';
        eventsDiv.appendChild(event);
      }
      if (isReturn) {
        const event = document.createElement('div');
        event.className = 'event arrival';
        const flightNumbersReturn = mergedFlightMap.get(group.name);
        const flightSuffixReturn = flightNumbersReturn
          ? ` ${flightNumbersReturn.join('/')}`
          : '';
        event.innerHTML = `🛬 ${ui.sanitizeHtml(group.name)} (${group.members?.length || 0}명)${ui.sanitizeHtml(flightSuffixReturn)}`;
        event.title = `단체 귀국: ${group.name} - ${group.destination || ''}${flightSuffixReturn ? ' / 편명: ' + flightNumbersReturn.join(', ') : ''}`;
        if (isPastDate) {
          event.style.textDecoration = 'line-through';
          event.style.opacity = '0.6';
        }
        // 클릭 시 단체 편집 모달 열기
        event.addEventListener('click', (e) => {
          e.stopPropagation(); // 날짜 클릭 이벤트 방지
          openGroupEditModal(group.id);
        });
        event.style.cursor = 'pointer';
        eventsDiv.appendChild(event);
      }
    });

    // DB 일정 표시
    dbSchedules.forEach((schedule) => {
      const event = document.createElement('div');
      event.className = 'event schedule';
      const displayText = schedule.group_name
        ? `📅 ${ui.sanitizeHtml(schedule.group_name)}`
        : `📅 ${ui.sanitizeHtml(schedule.schedule.substring(0, 15))}${schedule.schedule.length > 15 ? '...' : ''}`;
      event.innerHTML = displayText;
      event.title = `${schedule.schedule}${schedule.location ? ' - ' + schedule.location : ''}`;

      // 커스텀 색상 적용
      const eventColor = schedule.color || '#7B61FF';
      event.style.background = eventColor;

      if (isPastDate) {
        event.style.textDecoration = 'line-through';
        event.style.opacity = '0.6';
      }
      // 일정 클릭 시 수정 모달 열기
      event.addEventListener('click', (e) => {
        e.stopPropagation(); // 날짜 클릭 이벤트 방지
        openScheduleModal(dateString, schedule);
      });
      event.style.cursor = 'pointer';
      eventsDiv.appendChild(event);
    });

    // 항공편 표시 (단체에 병합되지 않은 것만)
    unmatchedFlights.forEach((flight) => {
      const event = document.createElement('div');
      event.className = 'event flight';

      // 아이콘 선택
      let icon = '✈️';
      let bgColor = '#FF9800';
      if (flight.segmentType === 'departure') {
        icon = '🛫';
        bgColor = '#4CAF50';
      } else if (flight.segmentType === 'arrival') {
        icon = '🛬';
        bgColor = '#FF9800';
      }

      const displayText = `${icon} ${ui.sanitizeHtml(flight.groupName || flight.flightNumber)}`;
      event.innerHTML = displayText;
      event.title = `${flight.flightNumber}: ${flight.departure} → ${flight.arrival}`;
      event.style.background = bgColor;
      event.style.color = 'white';

      if (isPastDate) {
        event.style.textDecoration = 'line-through';
        event.style.opacity = '0.6';
      }

      // 항공편 클릭 시 항공 스케줄 페이지로 이동
      event.addEventListener('click', (e) => {
        e.stopPropagation(); // 날짜 클릭 이벤트 방지
        openFlightSchedulePage(flight.flightId, flight.groupName);
      });
      event.style.cursor = 'pointer';

      eventsDiv.appendChild(event);
    });

    dayElement.appendChild(eventsDiv);
  }

  // 할 일 표시
  const todosOnDate = state.todos.filter(
    (t) => t.due_date === dateString && !t.is_completed
  );
  if (todosOnDate.length > 0) {
    const todoDiv = document.createElement('div');
    todoDiv.className = 'day-todos';
    todoDiv.innerHTML = `<i class="fas fa-tasks"></i> ${todosOnDate.length}`;
    todoDiv.title = `할 일 ${todosOnDate.length}개`;
    dayElement.appendChild(todoDiv);
  }

  // 클릭 이벤트 - 이벤트 추가 모달 열기
  dayElement.addEventListener('click', () => openScheduleModal(dateString));

  return dayElement;
}

// 일정 모달 열기
function openScheduleModal(dateString, schedule = null) {
  const _modal = document.getElementById('modalSchedule');
  const form = document.getElementById('formSchedule');

  // 폼 초기화
  form.reset();

  const date = new Date(dateString);
  const dateText = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

  if (schedule) {
    // 수정 모드
    document.getElementById('scheduleId').value = schedule.id;
    document.getElementById('scheduleEventDate').value = schedule.event_date;
    document.getElementById('scheduleTime').value = schedule.time || '';
    document.getElementById('scheduleGroupName').value =
      schedule.group_name || '';
    document.getElementById('scheduleContent').value = schedule.schedule;
    document.getElementById('scheduleLocation').value = schedule.location || '';
    document.getElementById('scheduleTransport').value =
      schedule.transport || '';
    document.getElementById('scheduleMeals').value = schedule.meals || '';
    const color = schedule.color || '#7B61FF';
    document.getElementById('scheduleColor').value = color;
    document.getElementById('colorLabel').textContent = color.toUpperCase();

    document.getElementById('modalScheduleTitle').textContent =
      `일정 수정 - ${dateText}`;

    // 삭제 버튼 표시
    const deleteBtn = document.getElementById('btnDeleteSchedule');
    if (deleteBtn) {
      deleteBtn.style.display = 'inline-flex';
    }
  } else {
    // 신규 추가 모드
    document.getElementById('scheduleId').value = '';
    document.getElementById('scheduleEventDate').value = dateString;
    document.getElementById('scheduleColor').value = '#7B61FF';
    document.getElementById('colorLabel').textContent = '#7B61FF';

    document.getElementById('modalScheduleTitle').textContent =
      `일정 추가 - ${dateText}`;

    // 삭제 버튼 숨김
    const deleteBtn = document.getElementById('btnDeleteSchedule');
    if (deleteBtn) {
      deleteBtn.style.display = 'none';
    }
  }

  // 모달 열기
  ui.openModal('modalSchedule');
}

// 일정 저장
async function handleScheduleSubmit(e) {
  e.preventDefault();

  const scheduleId = document.getElementById('scheduleId').value;
  const scheduleData = {
    event_date: document.getElementById('scheduleEventDate').value,
    time: document.getElementById('scheduleTime').value || null,
    group_name: document.getElementById('scheduleGroupName').value || null,
    schedule: document.getElementById('scheduleContent').value,
    location: document.getElementById('scheduleLocation').value || null,
    transport: document.getElementById('scheduleTransport').value || null,
    meals: document.getElementById('scheduleMeals').value || null,
    color: document.getElementById('scheduleColor').value || '#7B61FF',
  };

  try {
    if (scheduleId) {
      // 수정
      await fetchJSON(`/api/schedules/${scheduleId}`, {
        method: 'PUT',
        body: JSON.stringify(scheduleData),
      });
    } else {
      // 신규 추가
      await fetchJSON('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(scheduleData),
      });
    }

    showNotification(
      scheduleId ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.',
      'success'
    );
    ui.closeModal('modalSchedule');

    // 달력과 대시보드 다시 렌더링
    renderCalendar();
    await handlers.loadAllData();
    ui.updateDashboard();
  } catch (error) {
    showNotification('일정 저장 중 오류가 발생했습니다.', 'error');
  }
}

// 일정 삭제
async function handleScheduleDelete() {
  const scheduleId = document.getElementById('scheduleId').value;

  if (!scheduleId) return;

  if (
    !(await showConfirmModal('일정 삭제', '이 일정을 삭제하시겠습니까?', {
      danger: true,
    }))
  )
    return;

  try {
    await fetchJSON(`/api/schedules/${scheduleId}`, { method: 'DELETE' });

    showToast('일정이 삭제되었습니다.', 'success');
    ui.closeModal('modalSchedule');

    // 달력과 대시보드 다시 렌더링
    renderCalendar();
    await handlers.loadAllData();
    ui.updateDashboard();
  } catch (error) {
    showNotification('일정 삭제 중 오류가 발생했습니다.', 'error');
  }
}

// 전역 함수로 노출
window.handleScheduleDelete = handleScheduleDelete;

// 예약 편집 모달 열기 (달력에서)
function openBookingEditModal(bookingId) {
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) return;

  // 폼 데이터 채우기 (null 체크 포함)
  const setFieldValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };

  setFieldValue('bookingId', booking.id);
  setFieldValue('bookingCustomer', booking.customer_id);
  setFieldValue('bookingProduct', booking.product_id);
  setFieldValue('bookingDepartureDate', booking.departure_date);
  setFieldValue('bookingReturnDate', booking.return_date);
  setFieldValue('bookingParticipants', booking.participants || 1);
  setFieldValue('bookingTotalPrice', booking.total_price || 0);
  setFieldValue('bookingHotel', booking.hotel_name || '');
  setFieldValue('bookingFlight', booking.flight_number || '');
  setFieldValue('bookingStatus', booking.status);
  setFieldValue('bookingGroupName', booking.group_name || '');
  setFieldValue('bookingNotes', booking.notes || '');

  // 예약번호 표시
  const bookingNumber = document.getElementById('bookingNumber');
  const bookingNumberGroup = document.getElementById('bookingNumberGroup');
  if (bookingNumber && bookingNumberGroup && booking.booking_number) {
    bookingNumber.value = booking.booking_number;
    bookingNumberGroup.style.display = 'block';
  }

  // 모달 타이틀 변경
  document.getElementById('modalBookingTitle').textContent = '예약 수정';

  // 삭제 버튼 표시
  const deleteBtn = document.getElementById('btnDeleteBooking');
  if (deleteBtn) {
    deleteBtn.style.display = 'inline-flex';
  }

  // 모달 열기
  ui.openModal('modalBooking');
}

// 예약 삭제
async function handleBookingDelete() {
  const bookingId = document.getElementById('bookingId').value;

  if (!bookingId) return;

  if (
    !(await showConfirmModal('예약 삭제', '이 예약을 삭제하시겠습니까?', {
      danger: true,
    }))
  )
    return;

  try {
    await api.deleteTableData('bookings', bookingId);

    showToast('예약이 삭제되었습니다.', 'success');
    ui.closeModal('modalBooking');

    // 데이터 다시 로드 및 달력 업데이트
    await handlers.loadAllData();
    ui.updateDashboard();
    renderCalendar();
  } catch (error) {
    showToast('예약 삭제 중 오류가 발생했습니다.', 'error');
  }
}

// 단체 편집 모달 열기 (달력에서)
function openGroupEditModal(groupId) {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) return;

  // 폼 데이터 채우기
  document.getElementById('groupEditId').value = group.id;
  document.getElementById('groupEditName').value = group.name || '';
  document.getElementById('groupEditDestination').value =
    group.destination || '';
  document.getElementById('groupEditDepartureDate').value =
    group.departureDate || '';
  document.getElementById('groupEditReturnDate').value = group.returnDate || '';
  document.getElementById('groupEditMemberCount').value =
    `${group.members?.length || 0}명`;

  // 모달 열기
  ui.openModal('modalGroupEdit');
}

// 단체 일정 수정
async function handleGroupEditSubmit(e) {
  e.preventDefault();

  const groupId = document.getElementById('groupEditId').value;
  const departureDate = document.getElementById('groupEditDepartureDate').value;
  const returnDate = document.getElementById('groupEditReturnDate').value;

  if (!groupId) return;

  try {
    await api.updateTableData('groups', groupId, {
      departure_date: departureDate,
      return_date: returnDate,
      updated_at: new Date().toISOString(),
    });

    showNotification('단체 일정이 수정되었습니다.', 'success');
    ui.closeModal('modalGroupEdit');

    // 데이터 다시 로드 및 달력 업데이트
    await handlers.loadAllData();
    ui.updateDashboard();
    renderCalendar();
  } catch (error) {
    showNotification('단체 일정 수정 중 오류가 발생했습니다.', 'error');
  }
}

// 단체 삭제
async function handleGroupDelete() {
  const groupId = document.getElementById('groupEditId').value;

  if (!groupId) return;

  if (
    !(await showConfirmModal(
      '단체 삭제',
      '이 단체를 삭제하시겠습니까? 모든 멤버 정보가 삭제됩니다.',
      { danger: true }
    ))
  )
    return;

  try {
    await api.deleteTableData('groups', groupId);

    showToast('단체가 삭제되었습니다.', 'success');
    ui.closeModal('modalGroupEdit');

    // 데이터 다시 로드 및 달력 업데이트
    await handlers.loadAllData();
    ui.updateDashboard();
    renderCalendar();
  } catch (error) {
    showToast('단체 삭제 중 오류가 발생했습니다.', 'error');
  }
}

// 최근 예약/단체 삭제 (대시보드에서)
async function handleRecentItemDelete(type, id) {
  if (type === 'booking') {
    if (
      !(await showConfirmModal('예약 삭제', '이 예약을 삭제하시겠습니까?', {
        danger: true,
      }))
    )
      return;

    try {
      await api.deleteTableData('bookings', id);
      showToast('예약이 삭제되었습니다.', 'success');

      // 데이터 다시 로드 및 UI 업데이트
      await handlers.loadAllData();
      ui.updateDashboard();
      renderCalendar();
    } catch (error) {
      showToast('예약 삭제 중 오류가 발생했습니다.', 'error');
    }
  } else if (type === 'group') {
    if (
      !(await showConfirmModal(
        '단체 삭제',
        '이 단체를 삭제하시겠습니까? 모든 멤버 정보가 삭제됩니다.',
        { danger: true }
      ))
    )
      return;

    try {
      await api.deleteTableData('groups', id);
      showToast('단체가 삭제되었습니다.', 'success');

      // 데이터 다시 로드 및 UI 업데이트
      await handlers.loadAllData();
      ui.updateDashboard();
      renderCalendar();
    } catch (error) {
      showToast('단체 삭제 중 오류가 발생했습니다.', 'error');
    }
  }
}

// 전역 함수로 노출
window.handleBookingDelete = handleBookingDelete;
window.handleGroupDelete = handleGroupDelete;
window.handleRecentItemDelete = handleRecentItemDelete;

// 이전 달
function prevMonth() {
  state.currentMonth = new Date(
    state.currentMonth.getFullYear(),
    state.currentMonth.getMonth() - 1
  );
  renderCalendar();
}

// 다음 달
function nextMonth() {
  state.currentMonth = new Date(
    state.currentMonth.getFullYear(),
    state.currentMonth.getMonth() + 1
  );
  renderCalendar();
}

// 항공편 편집 페이지 열기
function openFlightSchedulePage(flightId, groupName) {
  // 항공 스케줄 페이지로 이동하면서 URL 파라미터로 항공편 ID 전달
  const url = `flight-schedule.html?editFlight=${encodeURIComponent(flightId)}&groupName=${encodeURIComponent(groupName || '')}`;
  window.location.href = url;
}

// 할 일 목록 렌더링
function renderTodoList() {
  const todoList = document.getElementById('todoList');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 오늘 이후의 할 일만 표시 (지난 항목은 loadAllData에서 자동 삭제됨)
  const activeTodos = state.todos
    .filter((t) => new Date(t.due_date) >= today)
    .sort((a, b) => {
      // 날짜순 정렬
      if (a.due_date !== b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date);
      }
      // 같은 날이면 우선순위 순
      const priorityOrder = { 높음: 0, 보통: 1, 낮음: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  if (activeTodos.length === 0) {
    todoList.innerHTML = '<div class="empty-message">할 일이 없습니다.</div>';
    return;
  }

  todoList.innerHTML = activeTodos
    .map((todo) => {
      const date = new Date(todo.due_date);
      const dateText = `${date.getMonth() + 1}/${date.getDate()}`;
      const isOverdue = date < today && !todo.is_completed;
      const priorityClass =
        todo.priority === '높음'
          ? 'high'
          : todo.priority === '낮음'
            ? 'low'
            : '';

      return `
            <div class="todo-item ${todo.is_completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} ${priorityClass}">
                <div class="todo-checkbox">
                    <input type="checkbox" ${todo.is_completed ? 'checked' : ''} 
                           onchange="toggleTodo('${todo.id}')" 
                           id="todo-${todo.id}">
                    <label for="todo-${todo.id}"></label>
                </div>
                <div class="todo-content" onclick="editTodo('${todo.id}')">
                    <div class="todo-title">${ui.sanitizeHtml(todo.title)}</div>
                    <div class="todo-meta">
                        <span class="todo-date"><i class="fas fa-calendar"></i> ${dateText}</span>
                        <span class="todo-priority priority-${ui.sanitizeHtml(todo.priority)}">${ui.sanitizeHtml(todo.priority)}</span>
                    </div>
                    ${todo.description ? `<div class="todo-description">${ui.sanitizeHtml(todo.description)}</div>` : ''}
                </div>
                <button class="btn-icon-sm" onclick="deleteTodo('${todo.id}')" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    })
    .join('');
}

// 할 일 모달 열기
function openTodoModal(todoId = null) {
  const _modal = document.getElementById('modalTodo');
  const title = document.getElementById('modalTodoTitle');
  const form = document.getElementById('formTodo');

  form.reset();
  document.getElementById('todoId').value = '';
  document.getElementById('todoDate').value = new Date()
    .toISOString()
    .split('T')[0];

  if (todoId) {
    const todo = state.todos.find((t) => t.id === todoId);
    if (todo) {
      title.textContent = '할 일 수정';
      document.getElementById('todoId').value = todo.id;
      document.getElementById('todoTitle').value = todo.title;
      document.getElementById('todoDate').value = todo.due_date;
      document.getElementById('todoPriority').value = todo.priority;
      document.getElementById('todoDescription').value = todo.description || '';
    }
  } else {
    title.textContent = '할 일 추가';
  }

  openModal('modalTodo');
}

function editTodo(id) {
  openTodoModal(id);
}

// 할 일 토글
async function toggleTodo(id) {
  try {
    const todo = state.todos.find((t) => t.id === id);
    if (todo) {
      await fetchJSON(`/tables/todos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_completed: !todo.is_completed }),
      });
      await loadTodos();
    }
  } catch (error) {
    showToast('처리 중 오류가 발생했습니다.', 'error');
  }
}

// 할 일 삭제
async function deleteTodo(id) {
  if (
    !(await showConfirmModal('할 일 삭제', '이 할 일을 삭제하시겠습니까?', {
      danger: true,
    }))
  )
    return;

  try {
    await fetchJSON(`/tables/todos/${id}`, { method: 'DELETE' });
    await loadTodos();
    showToast('할 일이 삭제되었습니다.', 'success');
  } catch (error) {
    showToast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

// 전역 함수로 노출 (HTML onclick에서 사용)
window.editTodo = editTodo;
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
// wizard monkey-patch가 이미 설정된 경우 보존
const existingOpenModal = window.openModal;
const existingCloseModal = window.closeModal;
window.openModal = function (modalId) {
  ui.openModal(modalId);
  if (existingOpenModal && existingOpenModal !== window.openModal) {
    // wizard 초기화 로직만 실행 (원본 openModal은 이미 위에서 호출)
    if (
      modalId === 'modalProduct' &&
      typeof currentWizardStep !== 'undefined'
    ) {
      currentWizardStep = 1;
      if (typeof updateWizardUI === 'function') updateWizardUI();
    }
  }
};
window.closeModal = function (modalId) {
  ui.closeModal(modalId);
  if (existingCloseModal && existingCloseModal !== window.closeModal) {
    if (
      modalId === 'modalProduct' &&
      typeof currentWizardStep !== 'undefined'
    ) {
      currentWizardStep = 1;
      if (typeof updateWizardUI === 'function') updateWizardUI();
      const errorDiv = document.getElementById('step1Error');
      if (errorDiv) errorDiv.classList.remove('show');
      document
        .querySelectorAll(
          '.wizard-step input, .wizard-step select, .wizard-step textarea'
        )
        .forEach((f) => {
          f.style.borderColor = '';
        });
    }
  }
};

// 달력 네비게이션 함수 노출
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;

// 항공편 페이지 열기 함수 노출
window.openFlightSchedulePage = openFlightSchedulePage;

// 페이지 네비게이션 함수 노출
window.navigateToPage = ui.navigateToPage;

// 단체명단 페이지 열기
window.openGroupRoster = function () {
  // 모달 닫기
  ui.closeModal('modalProduct');

  // 단체명단 페이지로 이동
  ui.navigateToPage('group-roster');

  ui.showNotification('단체명단 페이지로 이동합니다.', 'info');
};

// ==================== 일정 가져오기 ====================

// 엑셀 파일에서 일정 가져오기
async function handleScheduleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  showNotification('파일을 읽는 중...', 'info');

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      defval: '',
    });

    if (rows.length === 0) {
      showNotification('파일에 데이터가 없습니다.', 'error');
      return;
    }

    // DB에서 단체명단 데이터 가져오기
    let groups = [];
    try {
      const groupsResult = await fetchJSON('/tables/groups');
      groups = groupsResult.data || groupsResult;
    } catch (e) {
      showToast('단체 목록을 불러오는데 실패했습니다.', 'error');
      groups = [];
    }

    let importedCount = 0;
    let skippedCount = 0;

    // 각 행을 파싱하여 단체 일정 생성
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      // 첫 번째 열을 문자열로 변환
      const firstCol = String(row[0] || '').trim();
      if (!firstCol || firstCol.length < 5) continue;

      // 항공편 정보 파싱
      const flightInfo = parseFlightInfoFromExcel(firstCol);
      if (!flightInfo) {
        skippedCount++;
        continue;
      }

      // 단체명 생성 (파일명에서 추출 또는 기본값)
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const groupName = `${fileName} ${flightInfo.date}`;

      // 같은 이름의 단체가 있는지 확인
      let existingGroup = groups.find((g) => g.name === groupName);

      if (!existingGroup) {
        // 새 단체 생성
        existingGroup = {
          id: generateId(),
          name: groupName,
          destination: `${flightInfo.departure} → ${flightInfo.arrival}`,
          departureDate: convertDateToISO(flightInfo.date),
          returnDate: flightInfo.arrivalDate
            ? convertDateToISO(flightInfo.arrivalDate)
            : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          members: [],
          flightInfo: {
            flightNumber: flightInfo.flightNumber,
            departure: flightInfo.departure,
            arrival: flightInfo.arrival,
            departureTime: flightInfo.departureTime,
            arrivalTime: flightInfo.arrivalTime,
          },
          _isNew: true,
        };
        groups.push(existingGroup);
        importedCount++;
      }
    }

    // 새로 생성된 단체를 DB에 저장
    for (const group of groups) {
      if (group._isNew) {
        delete group._isNew;
        try {
          await fetchJSON('/tables/groups', {
            method: 'POST',
            body: JSON.stringify({
              name: group.name,
              destination: group.destination || '',
              departure_date: group.departureDate || '',
              return_date: group.returnDate || '',
              members: JSON.stringify(group.members || []),
            }),
          });
        } catch (saveErr) {
          showToast(
            `단체 저장 중 오류가 발생했습니다: ${saveErr.message}`,
            'error'
          );
        }
      }
    }

    // 달력 다시 렌더링
    renderCalendar();

    showNotification(
      `일정 가져오기 완료! (${importedCount}개 가져옴, ${skippedCount}개 건너뜀)`,
      importedCount > 0 ? 'success' : 'warning'
    );
  } catch (error) {
    showNotification('파일 읽기 중 오류가 발생했습니다.', 'error');
  }

  // 파일 입력 초기화
  e.target.value = '';
}

// 엑셀에서 항공편 정보 파싱 (air1/js/main.js 로직 참고)
function parseFlightInfoFromExcel(line) {
  const parts = line.split(/\s+/).filter(Boolean);

  if (parts.length < 8) {
    return null;
  }

  let flightNumber, dateIndex, routeIndex, departureTimeIndex, arrivalTimeIndex;
  let arrivalDate = null;

  // 형식4: parts[2]가 날짜인 경우 (항공편명이 하나로 붙어있음)
  if (/^\d{2}[A-Z]{3}$/.test(parts[2])) {
    flightNumber = parts[1];
    const match = flightNumber.match(/^([A-Z0-9]{2})(\d+)[A-Z]?$/);
    if (match) {
      flightNumber = match[1] + ' ' + match[2];
    }
    dateIndex = 2;
    routeIndex = 4;
    departureTimeIndex = 6;
    arrivalTimeIndex = 7;
    if (parts.length > 8 && /^\d{2}[A-Z]{3}$/.test(parts[8])) {
      arrivalDate = parts[8];
    }
  }
  // 형식1 또는 형식2/형식3
  else if (/^\d{2}[A-Z]{3}$/.test(parts[3])) {
    flightNumber = parts[1] + ' ' + parts[2];
    flightNumber = flightNumber.replace(/(\d+)[A-Z]$/, '$1');
    dateIndex = 3;
    routeIndex = 5;
    departureTimeIndex = 7;
    arrivalTimeIndex = 8;
    if (parts.length > 9 && /^\d{2}[A-Z]{3}$/.test(parts[9])) {
      arrivalDate = parts[9];
    }
  } else {
    flightNumber = parts[1] + ' ' + parts[2];
    dateIndex = 4;
    routeIndex = 6;
    departureTimeIndex = 8;
    arrivalTimeIndex = 9;
    if (parts.length > 10 && /^\d{2}[A-Z]{3}$/.test(parts[10])) {
      arrivalDate = parts[10];
    }
  }

  const date = parts[dateIndex];
  const route = parts[routeIndex];
  const departure = route.substring(0, 3);
  const arrival = route.substring(3, 6);
  const departureTime = parts[departureTimeIndex];
  const arrivalTime = parts[arrivalTimeIndex];

  return {
    flightNumber,
    date,
    departure,
    arrival,
    departureTime,
    arrivalTime,
    arrivalDate,
  };
}

// 날짜 변환 함수 (예: 14NOV -> 2026-11-14)
function convertDateToISO(dateStr) {
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
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

  let year = currentYear;
  let date = new Date(`${year}-${month}-${day}`);
  date.setHours(0, 0, 0, 0);

  if (date <= today) {
    year = currentYear + 1;
    date = new Date(`${year}-${month}-${day}`);
  }

  return `${year}-${month}-${day}`;
}

// ==================== 단체명단으로 보내기 ====================

// 선택된 고객을 단체명단으로 보내기 모달 열기
async function handleSendToGroupClick() {
  const checkboxes = document.querySelectorAll('.customer-checkbox:checked');

  if (checkboxes.length === 0) {
    ui.showNotification('단체명단으로 보낼 고객을 선택해주세요.', 'warning');
    return;
  }

  // 선택된 고객 수 표시
  document.getElementById('selectedCustomerCount').textContent =
    checkboxes.length;

  // 기존 단체 목록을 DB에서 직접 로드 (state.groups가 비어있을 수 있으므로)
  let groups = state.groups;
  if (!groups || groups.length === 0) {
    try {
      const result = await fetchJSON('/tables/groups?limit=1000');
      const raw = result.data || result;
      groups = raw.map((g) => ({
        id: g.id,
        name: g.name,
        destination: g.destination || '',
        departureDate: g.departure_date || '',
        returnDate: g.return_date || '',
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        members: JSON.parse(g.members || '[]'),
      }));
      state.groups = groups;
    } catch (e) {
      showToast('단체 목록을 불러오는데 실패했습니다.', 'error');
      groups = [];
    }
  }

  const existingGroupSelect = document.getElementById('existingGroupSelect');
  existingGroupSelect.innerHTML = '<option value="">단체를 선택하세요</option>';

  groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = `${group.name} (${group.members?.length || 0}명)`;
    existingGroupSelect.appendChild(option);
  });

  // 모달 열기
  ui.openModal('modalSendToGroup');
}

// 단체 옵션 변경 (새 단체 / 기존 단체)
function handleGroupOptionChange() {
  const groupOption = document.querySelector(
    'input[name="groupOption"]:checked'
  ).value;
  const newGroupSection = document.getElementById('newGroupSection');
  const existingGroupSection = document.getElementById('existingGroupSection');

  if (groupOption === 'new') {
    newGroupSection.style.display = 'block';
    existingGroupSection.style.display = 'none';
  } else {
    newGroupSection.style.display = 'none';
    existingGroupSection.style.display = 'block';
  }
}

// 단체명단으로 보내기 확인
async function handleConfirmSendToGroup() {
  const checkboxes = document.querySelectorAll('.customer-checkbox:checked');

  if (checkboxes.length === 0) {
    ui.showNotification('단체명단으로 보낼 고객을 선택해주세요.', 'warning');
    return;
  }

  const groupOption = document.querySelector(
    'input[name="groupOption"]:checked'
  ).value;
  const departureDate = document.getElementById('sendGroupDepartureDate').value;

  if (!departureDate) {
    ui.showNotification('출발일을 입력해주세요.', 'warning');
    return;
  }

  let groupName, groupId;

  if (groupOption === 'new') {
    groupName = document.getElementById('newGroupName').value.trim();
    if (!groupName) {
      ui.showNotification('새 단체명을 입력해주세요.', 'warning');
      return;
    }
  } else {
    groupId = document.getElementById('existingGroupSelect').value;
    if (!groupId) {
      ui.showNotification('기존 단체를 선택해주세요.', 'warning');
      return;
    }
  }

  // 선택된 고객들 가져오기
  const selectedCustomers = [];
  checkboxes.forEach((checkbox) => {
    const customerId = checkbox.dataset.customerId;
    const customer = state.customers.find((c) => c.id === customerId);
    if (customer) {
      selectedCustomers.push(customer);
    }
  });

  // state.groups에서 단체명단 데이터 가져오기
  const groups = state.groups || [];

  let targetGroup;

  if (groupOption === 'new') {
    // 새 단체 생성
    targetGroup = {
      id: Date.now().toString(),
      name: groupName,
      destination: '',
      departureDate: departureDate,
      returnDate: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [],
    };
    groups.push(targetGroup);
  } else {
    // 기존 단체에 추가
    targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) {
      ui.showNotification('선택한 단체를 찾을 수 없습니다.', 'error');
      return;
    }
  }

  // 고객들을 단체 멤버로 추가
  let addedCount = 0;
  let duplicateCount = 0;

  selectedCustomers.forEach((customer) => {
    // 중복 체크 (여권번호 또는 이름으로)
    const exists = targetGroup.members.some(
      (m) =>
        (m.passportNo && m.passportNo === customer.passport_number) ||
        (m.nameKor && m.nameKor === customer.name_kor)
    );

    if (!exists) {
      const memberData = {
        id: generateId(),
        no: targetGroup.members.length + 1,
        nameKor: customer.name_kor || '',
        nameEn: customer.name_eng || '',
        passportNo: customer.passport_number || '',
        birthDate: customer.birth_date || '',
        passportExpire: customer.passport_expiry || '',
        phone: customer.phone || '',
        gender: customer.gender || '',
        idNo: '',
        room: '',
      };
      targetGroup.members.push(memberData);
      addedCount++;
    } else {
      duplicateCount++;
    }
  });

  // 단체 업데이트 시간 갱신
  targetGroup.updatedAt = new Date().toISOString();

  // API + localStorage에 저장
  const apiGroup = {
    id: targetGroup.id,
    name: targetGroup.name,
    destination: targetGroup.destination || '',
    departure_date: targetGroup.departureDate || departureDate || '',
    return_date: targetGroup.returnDate || '',
    members: JSON.stringify(targetGroup.members || []),
    updated_at: new Date().toISOString(),
  };
  try {
    await (groupOption === 'new'
      ? fetchJSON('/tables/groups', {
          method: 'POST',
          body: JSON.stringify(apiGroup),
        })
      : fetchJSON(`/tables/groups/${targetGroup.id}`, {
          method: 'PUT',
          body: JSON.stringify(apiGroup),
        }));
  } catch (err) {
    showToast(`단체명단 저장 실패: ${err.message}`, 'error');
    return;
  }
  state.groups = groups;
  try {
    await fetch('/api/group-rosters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: 'main-roster', name: '단체명단', data: groups })
    });
  } catch (_e) {
    // 서버 실패 시 localStorage 폴백
    try { localStorage.setItem('group-roster-data', JSON.stringify(groups)); } catch (_e2) {}
  }

  // 모달 닫기
  ui.closeModal('modalSendToGroup');

  // 체크박스 초기화
  checkboxes.forEach((checkbox) => (checkbox.checked = false));
  document.getElementById('selectAllCustomers').checked = false;
  document.getElementById('btnDeleteSelected').disabled = true;
  document.getElementById('btnSendToGroup').disabled = true;

  // 알림 표시
  let message = `${addedCount}명이 "${targetGroup.name}" 단체에 추가되었습니다.`;
  if (duplicateCount > 0) {
    message += `\n(${duplicateCount}명은 이미 등록되어 건너뛰었습니다.)`;
  }
  ui.showNotification(message, 'success');

  // 단체명단 iframe에 새로고침 신호 전송
  const groupRosterFrame = document.getElementById('groupRosterFrame');
  if (groupRosterFrame) {
    groupRosterFrame.contentWindow.postMessage(
      {
        type: 'RELOAD_GROUPS',
      },
      '*'
    );
  }
}

// ==================== 견적서 생성 ====================

// 견적서 미리보기
function handleQuotePreview() {
  const customerType = document.querySelector(
    'input[name="quoteCustomerType"]:checked'
  ).value;
  const productId = document.getElementById('quoteProduct').value;
  const departureDate = document.getElementById('quoteDepartureDate').value;
  const returnDate = document.getElementById('quoteReturnDate').value;
  const participants = document.getElementById('quoteParticipants').value;
  const hotel = document.getElementById('quoteHotel').value;
  const airline = document.getElementById('quoteAirline').value;
  const departureAirport = document.getElementById(
    'quoteDepartureAirport'
  ).value;
  const departureTime = document.getElementById('quoteDepartureTime').value;
  const arrivalAirport = document.getElementById('quoteArrivalAirport').value;
  const arrivalTime = document.getElementById('quoteArrivalTime').value;
  const returnDepartureTime = document.getElementById(
    'quoteReturnDepartureTime'
  ).value;
  const returnArrivalTime = document.getElementById(
    'quoteReturnArrivalTime'
  ).value;
  const roomType = document.getElementById('quoteRoomType').value;
  const additionalPrice =
    document.getElementById('quoteAdditionalPrice').value || 0;
  const notes = document.getElementById('quoteNotes').value;

  // 고객 정보 가져오기
  let customer = null;
  let customerName = '';
  let _customerPhone = '';
  let _customerEmail = '';

  if (customerType === 'existing') {
    // 기존 고객 선택
    const customerId = document.getElementById('quoteCustomer').value;
    if (!customerId) {
      ui.showNotification('고객을 선택해주세요.', 'error');
      return;
    }
    customer = state.customers.find((c) => c.id === customerId);
    if (!customer) {
      ui.showNotification('고객 정보를 찾을 수 없습니다.', 'error');
      return;
    }
    customerName = `${customer.name_kor} / ${customer.name_eng}`;
    _customerPhone = customer.phone || '-';
    _customerEmail = customer.email || '-';
  } else {
    // 직접 입력
    customerName = document.getElementById('quoteCustomerManual').value.trim();
    _customerPhone =
      document.getElementById('quoteCustomerPhone').value.trim() || '-';
    _customerEmail = '-';

    if (!customerName) {
      ui.showNotification('고객명을 입력해주세요.', 'error');
      return;
    }
  }

  // 필수 필드 확인
  if (!productId || !departureDate || !returnDate || !participants) {
    ui.showNotification('필수 정보를 모두 입력해주세요.', 'error');
    return;
  }

  // 상품 정보 가져오기
  const product = state.products.find((p) => p.id === productId);

  if (!product) {
    ui.showNotification('상품 정보를 찾을 수 없습니다.', 'error');
    return;
  }

  // 총 금액 계산
  const basePrice = product.price * (parseInt(participants) || 0);
  const _totalPrice = basePrice + (parseInt(additionalPrice) || 0);

  // 미리보기 HTML 생성 (여행세상 양식)
  const previewHTML = `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px; background: white; font-family: 'Noto Sans KR', sans-serif;">
            <!-- 로고 -->
            <div style="text-align: center; margin-bottom: 10px;">
                <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #ff8c42, #ff6b35); border-radius: 50%; position: relative;">
                    <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); color: white; font-size: 32px; font-weight: bold; line-height: 1;">山</div>
                </div>
            </div>

            <!-- 구분선 -->
            <div style="height: 3px; background: linear-gradient(to right, #ddd 0%, #ff8c42 45%, #ff8c42 55%, #ddd 100%); margin-bottom: 20px;"></div>

            <!-- 제목 -->
            <h1 style="text-align: center; font-size: 36px; font-weight: bold; margin: 20px 0; color: #333;">여행 견적서</h1>

            <!-- 담당자 정보 -->
            <div style="text-align: right; margin-bottom: 30px; color: #333; font-size: 14px;">
                <strong>▪ 담당자: 김국진 010-2662--9009</strong>
            </div>

            <!-- 기본 정보 테이블 -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; width: 120px; font-weight: bold; color: #333;">단체명</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${ui.sanitizeHtml(customerName)}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333;">일 자</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${new Date(departureDate).toLocaleDateString('ko-KR')} - ${new Date(returnDate).toLocaleDateString('ko-KR')}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333;">여행지</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${ui.sanitizeHtml(product.destination)} - (${ui.sanitizeHtml(product.name)})</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333; vertical-align: top;">1인 여행요금</td>
                    <td style="padding: 0; border-bottom: 1px solid #ddd;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f8f8;">
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 80px;">항공사</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 70px;">출발공항</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 50px;">시간</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 20px;"></th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 70px;">도착공항</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 50px;">시간</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 50px;">등급</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 60px;">조건</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px;">요금</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;" rowspan="2">${ui.sanitizeHtml(airline || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(departureAirport || '인천')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${departureTime || '-'}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">→</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(arrivalAirport || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${arrivalTime || '-'}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(hotel || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(roomType || '1인1실')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px; font-weight: bold;">${product.price.toLocaleString()}원</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(arrivalAirport || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${returnDepartureTime || '-'}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">→</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(departureAirport || '인천')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${returnArrivalTime || '-'}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(hotel || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(roomType || '1인1실')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px; font-weight: bold;">${product.price.toLocaleString()}원</td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- 여행조건 박스 -->
            <div style="background: #f5f3f0; padding: 25px; margin: 30px 0; border-radius: 5px;">
                <h3 style="text-align: center; font-size: 20px; font-weight: bold; color: #ff6b35; margin: 0 0 20px 0; border-bottom: 2px solid #ff6b35; padding-bottom: 10px;">❙ 여 행 조 건 ❙</h3>

                <table style="width: 100%; line-height: 2;">
                    <tr>
                        <td style="padding: 5px; width: 100px; font-weight: bold; color: #333;">항공료</td>
                        <td style="padding: 5px;">전 일정에 명시된 항공료 <span style="color: #d00; font-style: italic;">*선발권 기준으로 예약시점에 따라 변동될 수 있습니다.*</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">숙 박</td>
                        <td style="padding: 5px;">일정에 있는 숙박 포함</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">식 사</td>
                        <td style="padding: 5px;">일정에 있는 식사 포함</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">교통편</td>
                        <td style="padding: 5px;">일정에 따른 차량 이용 교통 포함 <span style="color: #d00;">집결지 ↔ 인천국제공항 왕복 포함</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">관 광</td>
                        <td style="padding: 5px;">전 일정에 명시된 관광 비용 포함</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">여행자 보험</td>
                        <td style="padding: 5px;">여행 기간 해외 여행자 보험 가입</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">기타 세금</td>
                        <td style="padding: 5px;">공항 이용료, 출국세, 입국세 포함</td>
                    </tr>
                </table>

                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
                    <div style="font-weight: bold; color: #d00; margin-bottom: 10px;">비고 사항</div>
                    <div style="font-size: 14px; line-height: 1.8;">
                        • 상기 일정은 기상악화나 현지 사정으로 인하여 변동될 수 있습니다.<br>
                        • 견적서 인원에 따른 행사 조건입니다. <span style="color: #d00;">(${participants}명기준 변동 시 요금 변동될 수 있습니다.)</span><br>
                        • 현금 결제 조건<br>
                        • 식사 시 음료(주류) 및 식사 추가는 불포함
                        ${notes ? `<br>• ${ui.sanitizeHtml(notes)}` : ''}
                    </div>
                </div>
            </div>

            <!-- 하단 서명 -->
            <div style="text-align: center; margin: 40px 0 30px 0; font-size: 16px; font-weight: bold;">
                위와 같이 여행 경비 견적서를 제출합니다.
            </div>

            <div style="text-align: center; font-size: 16px; margin-bottom: 30px;">
                ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '년 ').replace(/\.$/, '일')}
            </div>

            <div style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; letter-spacing: 3px;">
                (유) 여 행 세 상  대 표 이 사
            </div>

            <!-- 하단 회사 정보 -->
            <div style="border-top: 2px solid #333; padding-top: 15px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; vertical-align: middle; padding: 5px 0;">
                            <div style="color: #0066cc; font-weight: bold; font-size: 18px; line-height: 1.4;">
                                여행세상<br>
                                <span style="font-size: 12px; color: #666;">TRAVEL WORLD</span>
                            </div>
                        </td>
                        <td style="width: 50%; vertical-align: middle; text-align: right; padding: 5px 0;">
                            <div style="font-size: 13px; line-height: 1.6;">
                                <strong>A:</strong> 전주시 완산구 서신동 856-1번지<br>
                                <strong>T:</strong> 063)271-9090 <strong>F:</strong> 063)271-9030
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    `;

  // 미리보기 영역에 표시
  const previewDiv = document.getElementById('quotePreview');
  previewDiv.innerHTML = previewHTML;
  previewDiv.style.display = 'block';

  // 미리보기 영역으로 스크롤
  previewDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

  ui.showNotification('견적서 미리보기가 생성되었습니다.', 'success');
}

// 견적서 생성 (인쇄)
function handleQuoteGenerate() {
  const customerType = document.querySelector(
    'input[name="quoteCustomerType"]:checked'
  ).value;
  const productId = document.getElementById('quoteProduct').value;
  const departureDate = document.getElementById('quoteDepartureDate').value;
  const returnDate = document.getElementById('quoteReturnDate').value;
  const participants = document.getElementById('quoteParticipants').value;
  const hotel = document.getElementById('quoteHotel').value;
  const airline = document.getElementById('quoteAirline').value;
  const departureAirport = document.getElementById(
    'quoteDepartureAirport'
  ).value;
  const departureTime = document.getElementById('quoteDepartureTime').value;
  const arrivalAirport = document.getElementById('quoteArrivalAirport').value;
  const arrivalTime = document.getElementById('quoteArrivalTime').value;
  const returnDepartureTime = document.getElementById(
    'quoteReturnDepartureTime'
  ).value;
  const returnArrivalTime = document.getElementById(
    'quoteReturnArrivalTime'
  ).value;
  const roomType = document.getElementById('quoteRoomType').value;
  const additionalPrice =
    document.getElementById('quoteAdditionalPrice').value || 0;
  const notes = document.getElementById('quoteNotes').value;

  // 고객 정보 가져오기
  let customer = null;
  let customerName = '';
  let _customerPhone = '';
  let _customerEmail = '';

  if (customerType === 'existing') {
    // 기존 고객 선택
    const customerId = document.getElementById('quoteCustomer').value;
    if (!customerId) {
      ui.showNotification('고객을 선택해주세요.', 'error');
      return;
    }
    customer = state.customers.find((c) => c.id === customerId);
    if (!customer) {
      ui.showNotification('고객 정보를 찾을 수 없습니다.', 'error');
      return;
    }
    customerName = `${customer.name_kor} / ${customer.name_eng}`;
    _customerPhone = customer.phone || '-';
    _customerEmail = customer.email || '-';
  } else {
    // 직접 입력
    customerName = document.getElementById('quoteCustomerManual').value.trim();
    _customerPhone =
      document.getElementById('quoteCustomerPhone').value.trim() || '-';
    _customerEmail = '-';

    if (!customerName) {
      ui.showNotification('고객명을 입력해주세요.', 'error');
      return;
    }
  }

  // 필수 필드 확인
  if (!productId || !departureDate || !returnDate || !participants) {
    ui.showNotification('필수 정보를 모두 입력해주세요.', 'error');
    return;
  }

  // 상품 정보 가져오기
  const product = state.products.find((p) => p.id === productId);

  if (!product) {
    ui.showNotification('상품 정보를 찾을 수 없습니다.', 'error');
    return;
  }

  // 총 금액 계산
  const basePrice = product.price * (parseInt(participants) || 0);
  const _totalPrice = basePrice + (parseInt(additionalPrice) || 0);

  // 인쇄용 HTML 생성 (여행세상 양식)
  const printHTML = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>여행 견적서 - ${ui.sanitizeHtml(customerName)}</title>
            <style>
                @media print {
                    @page { margin: 1.5cm; }
                    body { margin: 0; }
                }
                body {
                    font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px;
                    background: white;
                }
                table { border-collapse: collapse; }
            </style>
        </head>
        <body>
            <!-- 로고 -->
            <div style="text-align: center; margin-bottom: 10px;">
                <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #ff8c42, #ff6b35); border-radius: 50%; position: relative;">
                    <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); color: white; font-size: 32px; font-weight: bold; line-height: 1;">山</div>
                </div>
            </div>

            <!-- 구분선 -->
            <div style="height: 3px; background: linear-gradient(to right, #ddd 0%, #ff8c42 45%, #ff8c42 55%, #ddd 100%); margin-bottom: 20px;"></div>

            <!-- 제목 -->
            <h1 style="text-align: center; font-size: 36px; font-weight: bold; margin: 20px 0; color: #333;">여행 견적서</h1>

            <!-- 담당자 정보 -->
            <div style="text-align: right; margin-bottom: 30px; color: #333; font-size: 14px;">
                <strong>▪ 담당자: 김국진 010-2662--9009</strong>
            </div>

            <!-- 기본 정보 테이블 -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; width: 120px; font-weight: bold; color: #333;">단체명</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${ui.sanitizeHtml(customerName)}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333;">일 자</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${new Date(departureDate).toLocaleDateString('ko-KR')} - ${new Date(returnDate).toLocaleDateString('ko-KR')}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333;">여행지</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${ui.sanitizeHtml(product.destination)} - (${ui.sanitizeHtml(product.name)})</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333; vertical-align: top;">1인 여행요금</td>
                    <td style="padding: 0; border-bottom: 1px solid #ddd;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f8f8;">
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 80px;">항공사</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 70px;">출발공항</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 50px;">시간</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 20px;"></th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 70px;">도착공항</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 50px;">시간</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 50px;">등급</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; width: 60px;">조건</th>
                                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px;">요금</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;" rowspan="2">${ui.sanitizeHtml(airline || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(departureAirport || '인천')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${departureTime || '-'}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">→</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(arrivalAirport || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${arrivalTime || '-'}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(hotel || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(roomType || '1인1실')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px; font-weight: bold;">${product.price.toLocaleString()}원</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(arrivalAirport || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${returnDepartureTime || '-'}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">→</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(departureAirport || '인천')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${returnArrivalTime || '-'}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(hotel || '-')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px;">${ui.sanitizeHtml(roomType || '1인1실')}</td>
                                    <td style="padding: 8px; text-align: center; font-size: 13px; font-weight: bold;">${product.price.toLocaleString()}원</td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- 여행조건 박스 -->
            <div style="background: #f5f3f0; padding: 25px; margin: 30px 0; border-radius: 5px;">
                <h3 style="text-align: center; font-size: 20px; font-weight: bold; color: #ff6b35; margin: 0 0 20px 0; border-bottom: 2px solid #ff6b35; padding-bottom: 10px;">❙ 여 행 조 건 ❙</h3>

                <table style="width: 100%; line-height: 2;">
                    <tr>
                        <td style="padding: 5px; width: 100px; font-weight: bold; color: #333;">항공료</td>
                        <td style="padding: 5px;">전 일정에 명시된 항공료 <span style="color: #d00; font-style: italic;">*선발권 기준으로 예약시점에 따라 변동될 수 있습니다.*</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">숙 박</td>
                        <td style="padding: 5px;">일정에 있는 숙박 포함</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">식 사</td>
                        <td style="padding: 5px;">일정에 있는 식사 포함</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">교통편</td>
                        <td style="padding: 5px;">일정에 따른 차량 이용 교통 포함 <span style="color: #d00;">집결지 ↔ 인천국제공항 왕복 포함</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">관 광</td>
                        <td style="padding: 5px;">전 일정에 명시된 관광 비용 포함</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">여행자 보험</td>
                        <td style="padding: 5px;">여행 기간 해외 여행자 보험 가입</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold; color: #333;">기타 세금</td>
                        <td style="padding: 5px;">공항 이용료, 출국세, 입국세 포함</td>
                    </tr>
                </table>

                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
                    <div style="font-weight: bold; color: #d00; margin-bottom: 10px;">비고 사항</div>
                    <div style="font-size: 14px; line-height: 1.8;">
                        • 상기 일정은 기상악화나 현지 사정으로 인하여 변동될 수 있습니다.<br>
                        • 견적서 인원에 따른 행사 조건입니다. <span style="color: #d00;">(${participants}명기준 변동 시 요금 변동될 수 있습니다.)</span><br>
                        • 현금 결제 조건<br>
                        • 식사 시 음료(주류) 및 식사 추가는 불포함
                        ${notes ? `<br>• ${ui.sanitizeHtml(notes)}` : ''}
                    </div>
                </div>
            </div>

            <!-- 하단 서명 -->
            <div style="text-align: center; margin: 40px 0 30px 0; font-size: 16px; font-weight: bold;">
                위와 같이 여행 경비 견적서를 제출합니다.
            </div>

            <div style="text-align: center; font-size: 16px; margin-bottom: 30px;">
                ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '년 ').replace(/\.$/, '일')}
            </div>

            <div style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; letter-spacing: 3px;">
                (유) 여 행 세 상  대 표 이 사
            </div>

            <!-- 하단 회사 정보 -->
            <div style="border-top: 2px solid #333; padding-top: 15px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; vertical-align: middle; padding: 5px 0;">
                            <div style="color: #0066cc; font-weight: bold; font-size: 18px; line-height: 1.4;">
                                여행세상<br>
                                <span style="font-size: 12px; color: #666;">TRAVEL WORLD</span>
                            </div>
                        </td>
                        <td style="width: 50%; vertical-align: middle; text-align: right; padding: 5px 0;">
                            <div style="font-size: 13px; line-height: 1.6;">
                                <strong>A:</strong> 전주시 완산구 서신동 856-1번지<br>
                                <strong>T:</strong> 063)271-9090 <strong>F:</strong> 063)271-9030
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `;

  // 새 창으로 열어서 인쇄
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  printWindow.document.write(printHTML);
  printWindow.document.close();

  ui.showNotification('견적서 인쇄 창이 열렸습니다.', 'success');
}
