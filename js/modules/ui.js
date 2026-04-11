// js/modules/ui.js
import { state } from './state.js';

// ==================== Security: HTML Sanitization ====================

/**
 * HTML 특수문자 이스케이프 - XSS 방지
 * @param {string} str - 이스케이프할 문자열
 * @returns {string} 안전한 문자열
 */
export function sanitizeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==================== UI Rendering ====================

export function showNotification(message, type = 'info') {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b',
  };

  const notification = document.createElement('div');
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

export function navigateToPage(page) {
  // Deactivate all page content sections
  document.querySelectorAll('.page-content').forEach((p) => {
    if (p) p.classList.remove('active');
  });

  // Deactivate all navigation items
  document.querySelectorAll('.nav-item').forEach((item) => {
    if (item) item.classList.remove('active');
  });

  // Activate the target page content, if it exists
  const pageElement = document.getElementById(`page-${page}`);
  if (pageElement) {
    pageElement.classList.add('active');
  }

  // Activate the target nav item, if it exists
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) {
    navItem.classList.add('active');
  }

  // Update the page title, if it exists in the titles map
  const titles = {
    dashboard: '대시보드',
    bookings: '예약 관리',
    customers: '고객 관리',
    products: '상품 관리',
    quote: '견적서 생성',
    'invoice-list': '인보이스 목록',
    'invoice-editor': '새 인보이스',
    notifications: '알림 관리',
  };
  const pageTitleElement = document.getElementById('pageTitle');
  if (pageTitleElement && titles[page]) {
    pageTitleElement.textContent = titles[page];
  }

  state.currentPage = page;

  // Run page-specific updates
  if (page === 'dashboard') {
    updateDashboard();
  }
  if (page === 'notifications') {
    renderNotifications();
  }
  if (page === 'quote') {
    loadQuoteDataFromCost();
  }
}

export function updateDashboard() {
  // 총 예약 수 (개별 예약 + 단체)
  const totalBookings = state.bookings.length + state.groups.length;
  document.getElementById('statTotalBookings').textContent = totalBookings;

  document.getElementById('statTotalCustomers').textContent =
    state.customers.length;

  const pendingBookings = state.bookings.filter((b) =>
    ['문의', '견적발송', '예약확정'].includes(b.status)
  ).length;
  document.getElementById('statPendingBookings').textContent = pendingBookings;

  const totalRevenue = state.bookings
    .filter((b) => b.status === '여행완료')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);
  document.getElementById('statTotalRevenue').textContent =
    totalRevenue.toLocaleString() + '원';

  renderRecentBookings();
  // renderCalendar는 app.js에서 직접 호출됨
  renderUpcomingSchedules();
  renderPastSchedules();
  renderPassportWarnings();
}

export function renderRecentBookings() {
  const tbody = document.querySelector('#recentBookingsTable tbody');

  // 오늘 날짜 기준
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 예약 데이터 (출발일이 오늘 이후)
  const recentBookings = [...state.bookings]
    .filter((booking) => {
      if (!booking.departure_date) return true;
      const departureDate = new Date(booking.departure_date);
      return departureDate >= today;
    })
    .map((booking) => ({
      type: 'booking',
      id: booking.id,
      name: booking.customer_name,
      product: booking.product_name,
      date: booking.departure_date || '-',
      status: booking.status,
      created_at: booking.created_at,
    }));

  // 단체 데이터 (출발일이 오늘 이후)
  const recentGroups = [...state.groups]
    .filter((group) => {
      if (!group.departureDate) return true;
      const departureDate = new Date(group.departureDate);
      return departureDate >= today;
    })
    .map((group) => ({
      type: 'group',
      id: group.id,
      name: group.name,
      product: group.destination || '단체 여행',
      date: group.departureDate || '-',
      status: '단체',
      created_at: group.createdAt,
      memberCount: group.members ? group.members.length : 0,
    }));

  // 예약과 단체를 합쳐서 최근 생성순으로 정렬
  const combined = [...recentBookings, ...recentGroups]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  if (combined.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-message">예약 및 단체 데이터가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = combined
    .map((item) => {
      const displayName =
        item.type === 'group'
          ? `${item.name} (${item.memberCount}명)`
          : item.name;
      const statusClass =
        item.type === 'group' ? 'status-단체' : `status-${item.status}`;

      return `
            <tr>
                <td>${item.id.substring(0, 8)}</td>
                <td>${sanitizeHtml(displayName)}</td>
                <td>${sanitizeHtml(item.product)}</td>
                <td>${item.date}</td>
                <td><span class="status-badge ${statusClass}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="handleRecentItemDelete('${item.type}', '${item.id}')" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    })
    .join('');
}

export function renderCustomersTable(customers = state.customers) {
  const tbody = document.querySelector('#customersTable tbody');

  if (!tbody) {
    console.error('❌ 고객 테이블 tbody를 찾을 수 없습니다.');
    return;
  }

  try {
    if (customers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="14" class="empty-message">고객 데이터가 없습니다.</td></tr>';
      return;
    }

    tbody.innerHTML = customers
      .map((customer, index) => {
        const isChecked = state.selectedCustomers.includes(String(customer.id));

        // 여권 만료 체크
        let passportWarning = '';
        if (customer.departure_date && customer.passport_expiry) {
          try {
            const departureDate = new Date(customer.departure_date);
            const passportExpiry = new Date(customer.passport_expiry);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 출발일이 미래인 경우만 체크
            if (departureDate >= today) {
              // 출발일 + 6개월 (180일) 계산
              const sixMonthsAfterDeparture = new Date(
                departureDate.getTime() + 180 * 24 * 60 * 60 * 1000
              );

              // 여권 만료일이 출발일 + 6개월보다 이전인 경우 경고
              if (passportExpiry < sixMonthsAfterDeparture) {
                // 출발일부터 만료일까지 남은 일수 계산
                const daysUntilExpiry = Math.floor(
                  (passportExpiry - departureDate) / (1000 * 60 * 60 * 24)
                );

                // 90일(3개월) 미만: 긴급 경고
                if (daysUntilExpiry < 90) {
                  passportWarning =
                    '<span style="color: #f44336; font-weight: bold;" title="긴급: 출발 후 3개월(90일) 미만">🚨</span> ';
                }
                // 180일(6개월) 미만: 주의 경고
                else {
                  passportWarning =
                    '<span style="color: #ff9800; font-weight: bold;" title="주의: 출발 후 6개월(180일) 미만">⚠️</span> ';
                }
              }
            }
          } catch (error) {
            console.warn('여권 체크 오류:', customer.name_kor, error);
          }
        }

        return `
            <tr data-customer-id="${customer.id}">
                <td><input type="checkbox" class="customer-checkbox" data-customer-id="${customer.id}" ${isChecked ? 'checked' : ''}></td>
                <td>${index + 1}</td>
                <td>${sanitizeHtml(customer.group_name) || '-'}</td>
                <td>${customer.departure_date ? formatDate(customer.departure_date) : '-'}</td>
                <td>${sanitizeHtml(customer.name_kor) || '-'}</td>
                <td>${sanitizeHtml(customer.name_eng) || '-'}</td>
                <td class="sensitive-data">${customer.passport_number ? maskSensitiveData(customer.passport_number, 'passport') : '-'}</td>
                <td class="sensitive-data">${customer.birth_date ? maskSensitiveData(customer.birth_date, 'birth') : '-'}</td>
                <td>${passportWarning}${customer.passport_expiry ? formatDate(customer.passport_expiry) : '-'}</td>
                <td class="sensitive-data">${customer.phone ? maskSensitiveData(customer.phone, 'phone') : '-'}</td>
                <td>${sanitizeHtml(customer.travel_region) || '-'}</td>
                <td>${customer.travel_history ? sanitizeHtml(customer.travel_history.substring(0, 20) + (customer.travel_history.length > 20 ? '...' : '')) : '-'}</td>
                <td>${customer.passport_file_name ? `<i class="fas fa-file-image text-success"></i> ${sanitizeHtml(customer.passport_file_name)}` : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" data-action="edit-customer" data-id="${customer.id}" title="수정">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete-customer" data-id="${customer.id}" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
      })
      .join('');

    // 호버 이벤트 리스너 추가
    attachCustomerTooltipListeners();
  } catch (error) {
    console.error('❌ 고객 테이블 렌더링 중 오류:', error);
    tbody.innerHTML =
      '<tr><td colspan="14" class="empty-message">테이블 렌더링 중 오류가 발생했습니다.</td></tr>';
  }
}

// ==================== 고객 관리 페이지네이션 ====================

export function renderCustomersTablePaginated(
  customers = state.customers,
  page = state.customerPage,
  pageSize = state.customerPageSize
) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageCustomers = customers.slice(start, end);
  const totalPages = Math.ceil(customers.length / pageSize);

  // 테이블 렌더링 (renderCustomersTable 활용, 인덱스 조정)
  const tbody = document.querySelector('#customersTable tbody');

  if (!tbody) {
    console.error('❌ 고객 테이블 tbody를 찾을 수 없습니다.');
    return;
  }

  try {
    if (customers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="14" class="empty-message">고객 데이터가 없습니다.</td></tr>';
      renderPagination(1, 1, 0);
      return;
    }

    tbody.innerHTML = pageCustomers
      .map((customer, index) => {
        const isChecked = state.selectedCustomers.includes(String(customer.id));
        const globalIndex = start + index + 1; // 전체 인덱스 (1부터 시작)

        // 여권 만료 체크
        let passportWarning = '';
        if (customer.departure_date && customer.passport_expiry) {
          try {
            const departureDate = new Date(customer.departure_date);
            const passportExpiry = new Date(customer.passport_expiry);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (departureDate >= today) {
              const sixMonthsAfterDeparture = new Date(
                departureDate.getTime() + 180 * 24 * 60 * 60 * 1000
              );
              if (passportExpiry < sixMonthsAfterDeparture) {
                const daysUntilExpiry = Math.floor(
                  (passportExpiry - departureDate) / (1000 * 60 * 60 * 24)
                );
                if (daysUntilExpiry < 90) {
                  passportWarning =
                    '<span style="color: #f44336; font-weight: bold;" title="긴급: 출발 후 3개월(90일) 미만">🚨</span> ';
                } else {
                  passportWarning =
                    '<span style="color: #ff9800; font-weight: bold;" title="주의: 출발 후 6개월(180일) 미만">⚠️</span> ';
                }
              }
            }
          } catch (error) {
            console.warn('여권 체크 오류:', customer.name_kor, error);
          }
        }

        return `
            <tr data-customer-id="${customer.id}">
                <td><input type="checkbox" class="customer-checkbox" data-customer-id="${customer.id}" ${isChecked ? 'checked' : ''}></td>
                <td>${globalIndex}</td>
                <td>${sanitizeHtml(customer.group_name) || '-'}</td>
                <td>${customer.departure_date ? formatDate(customer.departure_date) : '-'}</td>
                <td>${sanitizeHtml(customer.name_kor) || '-'}</td>
                <td>${sanitizeHtml(customer.name_eng) || '-'}</td>
                <td class="sensitive-data">${customer.passport_number ? maskSensitiveData(customer.passport_number, 'passport') : '-'}</td>
                <td class="sensitive-data">${customer.birth_date ? maskSensitiveData(customer.birth_date, 'birth') : '-'}</td>
                <td>${passportWarning}${customer.passport_expiry ? formatDate(customer.passport_expiry) : '-'}</td>
                <td class="sensitive-data">${customer.phone ? maskSensitiveData(customer.phone, 'phone') : '-'}</td>
                <td>${sanitizeHtml(customer.travel_region) || '-'}</td>
                <td>${customer.travel_history ? sanitizeHtml(customer.travel_history.substring(0, 20) + (customer.travel_history.length > 20 ? '...' : '')) : '-'}</td>
                <td>${customer.passport_file_name ? `<i class="fas fa-file-image text-success"></i> ${sanitizeHtml(customer.passport_file_name)}` : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" data-action="edit-customer" data-id="${customer.id}" title="수정">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete-customer" data-id="${customer.id}" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
      })
      .join('');

    // 호버 이벤트 리스너 추가
    attachCustomerTooltipListeners();
  } catch (error) {
    console.error('❌ 고객 테이블 렌더링 중 오류:', error);
    tbody.innerHTML =
      '<tr><td colspan="14" class="empty-message">테이블 렌더링 중 오류가 발생했습니다.</td></tr>';
  }

  // 페이지네이션 UI 렌더링
  renderPagination(page, totalPages, customers.length);
}

export function renderPagination(currentPage, totalPages, totalItems) {
  const container = document.getElementById('customerPagination');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML =
      totalItems > 0
        ? `<span class="pagination-info">총 ${totalItems}명</span>`
        : '';
    return;
  }

  // 페이지 번호 범위 계산 (최대 5개 표시)
  let startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  let paginationHtml = `
        <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> 이전
        </button>
        <div class="pagination-numbers">
    `;

  if (startPage > 1) {
    paginationHtml += `<button class="pagination-number" data-page="1">1</button>`;
    if (startPage > 2) {
      paginationHtml += `<span style="padding: 0 0.5rem;">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHtml += `
            <button class="pagination-number ${i === currentPage ? 'active' : ''}" data-page="${i}" ${i === currentPage ? 'aria-current="page"' : ''}>${i}</button>
        `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHtml += `<span style="padding: 0 0.5rem;">...</span>`;
    }
    paginationHtml += `<button class="pagination-number" data-page="${totalPages}">${totalPages}</button>`;
  }

  paginationHtml += `
        </div>
        <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            다음 <i class="fas fa-chevron-right"></i>
        </button>
        <span class="pagination-info">총 ${totalItems}명 (${currentPage}/${totalPages} 페이지)</span>
    `;

  container.innerHTML = paginationHtml;
}

// ==================== 단체별 조회 기능 ====================

export function getUniqueGroups(customers = state.customers) {
  const groups = new Map();
  customers.forEach((c) => {
    if (c.group_name) {
      if (!groups.has(c.group_name)) {
        groups.set(c.group_name, {
          name: c.group_name,
          count: 0,
          departureDate: c.departure_date,
          travelRegion: c.travel_region,
        });
      }
      groups.get(c.group_name).count++;
    }
  });
  return Array.from(groups.values()).sort((a, b) => {
    // 출발일 기준 내림차순 정렬 (최신순)
    const dateA = a.departureDate ? new Date(a.departureDate) : new Date(0);
    const dateB = b.departureDate ? new Date(b.departureDate) : new Date(0);
    return dateB - dateA;
  });
}

export function renderGroupDropdown(customers = state.customers) {
  const dropdown = document.getElementById('groupDropdown');
  if (!dropdown) return;

  const allGroups = getUniqueGroups(customers);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // state.groups에서 returnDate 매핑 생성
  const returnDateMap = new Map();
  state.groups.forEach((g) => {
    if (g.returnDate) returnDateMap.set(g.name, g.returnDate);
  });

  // groupFilter에 따라 필터링
  // 기준: 귀국일(returnDate) > 출발일(departureDate) 순으로 fallback
  const groups = allGroups.filter((group) => {
    const returnDateStr = returnDateMap.get(group.name);
    const dateStr = returnDateStr || group.departureDate;
    if (!dateStr) {
      return state.groupFilter === 'active';
    }
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const isPast = date < today;
    if (state.groupFilter === 'past') {
      return isPast;
    }
    return !isPast;
  });

  const label = state.groupFilter === 'past' ? '지난 행사' : '단체';

  dropdown.innerHTML = `
        <option value="">${label}를 선택하세요 (${groups.length}개)</option>
        ${groups
          .map(
            (group) => `
            <option value="${sanitizeHtml(group.name)}">${sanitizeHtml(group.name)} (${group.count}명${group.departureDate ? ` - ${formatDate(group.departureDate)}` : ''})</option>
        `
          )
          .join('')}
    `;

  // 선택된 단체가 필터링 결과에 있으면 선택 상태 유지
  if (
    state.selectedGroup &&
    groups.some((g) => g.name === state.selectedGroup)
  ) {
    dropdown.value = state.selectedGroup;
  } else if (state.selectedGroup) {
    // 현재 필터에 없는 단체가 선택되어 있으면 초기화
    state.selectedGroup = null;
    renderGroupCustomersTable(null);
  }
}

export function renderGroupCustomersTable(groupName) {
  const summary = document.getElementById('groupSummary');
  const noSelection = document.getElementById('groupNoSelection');
  const tableWrapper = document.getElementById('groupTableWrapper');
  const tbody = document.querySelector('#groupCustomersTable tbody');

  if (!groupName) {
    // 선택된 단체가 없는 경우
    if (summary) summary.style.display = 'none';
    if (noSelection) noSelection.style.display = 'block';
    if (tableWrapper) tableWrapper.style.display = 'none';
    return;
  }

  // 단체 필터링
  const groupCustomers = state.customers.filter(
    (c) => c.group_name === groupName
  );

  if (groupCustomers.length === 0) {
    if (summary) summary.style.display = 'none';
    if (noSelection) {
      noSelection.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <p>"${sanitizeHtml(groupName)}" 단체에 등록된 고객이 없습니다.</p>
            `;
      noSelection.style.display = 'block';
    }
    if (tableWrapper) tableWrapper.style.display = 'none';
    return;
  }

  // 단체 요약 정보 업데이트
  const firstCustomer = groupCustomers[0];
  if (summary) {
    document.getElementById('groupMemberCount').textContent =
      `${groupCustomers.length}명`;
    document.getElementById('groupDepartureDate').textContent =
      firstCustomer.departure_date
        ? formatDate(firstCustomer.departure_date)
        : '-';
    document.getElementById('groupDestination').textContent =
      firstCustomer.travel_region || '-';
    summary.style.display = 'flex';
  }

  if (noSelection) noSelection.style.display = 'none';
  if (tableWrapper) tableWrapper.style.display = 'block';

  // 그룹 목적지 조회
  const groupInfo = state.groups.find((g) => g.name === groupName);
  const groupDestination = groupInfo ? groupInfo.destination : '';

  // 테이블 렌더링
  if (tbody) {
    tbody.innerHTML = groupCustomers
      .map((customer, index) => {
        // 여권 만료 체크
        let passportWarning = '';
        if (customer.departure_date && customer.passport_expiry) {
          try {
            const departureDate = new Date(customer.departure_date);
            const passportExpiry = new Date(customer.passport_expiry);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (departureDate >= today) {
              const sixMonthsAfterDeparture = new Date(
                departureDate.getTime() + 180 * 24 * 60 * 60 * 1000
              );
              if (passportExpiry < sixMonthsAfterDeparture) {
                const daysUntilExpiry = Math.floor(
                  (passportExpiry - departureDate) / (1000 * 60 * 60 * 24)
                );
                if (daysUntilExpiry < 90) {
                  passportWarning =
                    '<span style="color: #f44336; font-weight: bold;" title="긴급: 출발 후 3개월(90일) 미만">🚨</span> ';
                } else {
                  passportWarning =
                    '<span style="color: #ff9800; font-weight: bold;" title="주의: 출발 후 6개월(180일) 미만">⚠️</span> ';
                }
              }
            }
          } catch (error) {
            console.warn('여권 체크 오류:', customer.name_kor, error);
          }
        }

        return `
            <tr data-customer-id="${customer.id}">
                <td>${index + 1}</td>
                <td>${sanitizeHtml(customer.name_kor) || '-'}</td>
                <td>${sanitizeHtml(customer.name_eng) || '-'}</td>
                <td class="sensitive-data">${customer.passport_number ? maskSensitiveData(customer.passport_number, 'passport') : '-'}</td>
                <td class="sensitive-data">${customer.birth_date ? maskSensitiveData(customer.birth_date, 'birth') : '-'}</td>
                <td>${passportWarning}${customer.passport_expiry ? formatDate(customer.passport_expiry) : '-'}</td>
                <td class="sensitive-data">${customer.phone ? maskSensitiveData(customer.phone, 'phone') : '-'}</td>
                <td>${customer.departure_date ? formatDate(customer.departure_date) : ''}${groupDestination ? ' ' + sanitizeHtml(groupDestination) : ''}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" data-action="edit-customer" data-id="${customer.id}" title="수정">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete-customer" data-id="${customer.id}" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
      })
      .join('');
  }
}

export function renderProductsGrid(products = state.products) {
  const grid = document.getElementById('productsGrid');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 종료일 기준으로 진행/완료 판단
  const filtered = products.filter((product) => {
    let endDate = null;

    // 1) hotel_checkout 필드 (가장 정확)
    if (product.hotel_checkout) {
      endDate = new Date(product.hotel_checkout);
    }

    // 2) description에서 종료일 파싱: "~ YYYY-MM-DD)" 또는 "~ YYYY-MM-DD |" 등
    if (!endDate && product.description) {
      const dateMatch = product.description.match(/~\s*(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) endDate = new Date(dateMatch[1]);
    }

    // 3) groups에서 매칭
    if (!endDate) {
      const matchedGroup = state.groups.find((g) =>
        product.description?.includes(g.name)
      );
      if (matchedGroup && matchedGroup.returnDate) {
        endDate = new Date(matchedGroup.returnDate);
      }
    }

    if (!endDate) {
      return state.productFilter === 'active';
    }

    endDate.setHours(0, 0, 0, 0);
    const isPast = endDate < today;
    return state.productFilter === 'past' ? isPast : !isPast;
  });

  // 출발일 기준 정렬
  filtered.sort((a, b) => {
    const getStartDate = (p) => {
      if (p.hotel_checkin) return new Date(p.hotel_checkin);
      const m = p.description?.match(/(\d{4}-\d{2}-\d{2})\s*~/);
      if (m) return new Date(m[1]);
      return null;
    };
    const da = getStartDate(a);
    const db = getStartDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    // 진행 행사: 가까운 날짜 먼저, 완료 행사: 최근 완료 먼저
    return state.productFilter === 'past' ? db - da : da - db;
  });

  if (filtered.length === 0) {
    const label =
      state.productFilter === 'past' ? '완료 행사가' : '진행 행사가';
    grid.innerHTML = `<div class="empty-message">${label} 없습니다.</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((product) => {
      const isActive = product.status === 'active' || product.status === '활성';
      const statusLabel = isActive ? '진행' : '완료';

      // 날짜 포맷
      const checkin = product.hotel_checkin || '';
      const checkout = product.hotel_checkout || '';
      let dateDisplay = '';
      if (checkin && checkout) {
        dateDisplay = `${checkin.replace(/-/g, '.')} — ${checkout.replace(/-/g, '.')}`;
      } else {
        // description에서 날짜 추출
        const dm = product.description?.match(
          /(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/
        );
        if (dm)
          dateDisplay = `${dm[1].replace(/-/g, '.')} — ${dm[2].replace(/-/g, '.')}`;
      }

      // 뱃지 (정보 없으면 미정으로 표시)
      const guideName = sanitizeHtml(product.guide_name) || '미정';
      const hotelName = product.hotel_name
        ? sanitizeHtml(
            product.hotel_name.length > 8
              ? product.hotel_name.substring(0, 8) + '..'
              : product.hotel_name
          )
        : '미정';
      const vehicleName = sanitizeHtml(product.vehicle_type) || '미정';
      const badges = [
        `<div class="pc-badge pc-badge-guide ${!product.guide_name ? 'pc-badge-empty' : ''}"><i class="fas fa-user-tie"></i><span>${guideName}</span></div>`,
        `<div class="pc-badge pc-badge-hotel ${!product.hotel_name ? 'pc-badge-empty' : ''}"><i class="fas fa-hotel"></i><span>${hotelName}</span></div>`,
        `<div class="pc-badge pc-badge-vehicle ${!product.vehicle_type ? 'pc-badge-empty' : ''}"><i class="fas fa-shuttle-van"></i><span>${vehicleName}</span></div>`,
      ];

      return `
        <div class="pc-card">
            <div class="pc-header">
                <div class="pc-header-top">
                    <h4 class="pc-title">${sanitizeHtml(product.name)}</h4>
                    <span class="pc-status ${isActive ? 'pc-status-active' : 'pc-status-done'}">${statusLabel}</span>
                </div>
                <div class="pc-meta">
                    <div class="pc-meta-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${sanitizeHtml(product.destination) || '-'}</span>
                    </div>
                    ${
                      dateDisplay
                        ? `<div class="pc-meta-row pc-meta-date">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${dateDisplay}</span>
                    </div>`
                        : ''
                    }
                </div>
            </div>
            <div class="pc-stats">
                <div class="pc-stat-box">
                    <span class="pc-stat-label">여행 기간</span>
                    <span class="pc-stat-value">${product.duration || 0}일</span>
                </div>
                <div class="pc-stat-box">
                    <span class="pc-stat-label">총 가격</span>
                    <span class="pc-stat-value">${(product.price || 0).toLocaleString()}원</span>
                </div>
            </div>
            <div class="pc-badges">${badges.join('')}</div>
            <div class="pc-actions">
                <button class="pc-btn-confirm" data-action="upload-confirmation" data-id="${product.id}">
                    <i class="fas fa-file-signature"></i> 확정서
                </button>
                <div class="pc-btn-row">
                    <button class="pc-btn pc-btn-default" data-action="preview-product" data-id="${product.id}">
                        <i class="fas fa-eye"></i>
                        <span>미리보기</span>
                    </button>
                    <button class="pc-btn pc-btn-default" data-action="edit-product" data-id="${product.id}">
                        <i class="fas fa-pen"></i>
                        <span>편집</span>
                    </button>
                    <button class="pc-btn pc-btn-delete" data-action="delete-product" data-id="${product.id}">
                        <i class="fas fa-trash-alt"></i>
                        <span>삭제</span>
                    </button>
                </div>
            </div>
        </div>`;
    })
    .join('');
}

export function renderBookingsTable(bookings = state.bookings) {
  const tbody = document.querySelector('#bookingsTable tbody');

  if (bookings.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" class="empty-message">예약 데이터가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = bookings
    .map((booking) => {
      // 여행완료 상태이거나 귀국일이 과거인 경우 취소선 추가
      const isCompleted = booking.status === '여행완료';
      const returnDate = booking.return_date
        ? new Date(booking.return_date)
        : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPastTrip = returnDate && returnDate < today;
      const shouldStrikethrough = isCompleted || isPastTrip;
      const rowStyle = shouldStrikethrough
        ? 'style="text-decoration: line-through; opacity: 0.6;"'
        : '';

      return `
        <tr ${rowStyle}>
            <td>${booking.id.substring(0, 8)}</td>
            <td>${sanitizeHtml(booking.customer_name)}</td>
            <td>${sanitizeHtml(booking.product_name)}</td>
            <td>${booking.departure_date || '-'}</td>
            <td>${booking.return_date || '-'}</td>
            <td>${booking.participants}</td>
            <td>${(booking.total_price || 0).toLocaleString()}원</td>
            <td>${sanitizeHtml(booking.group_name) || '-'}</td>
            <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
            <td>
                <button class="btn btn-sm btn-success" data-action="sync-to-group" data-id="${booking.id}" title="단체명단으로 보내기">
                    <i class="fas fa-users"></i>
                </button>
                <button class="btn btn-sm btn-secondary" data-action="edit-booking" data-id="${booking.id}" title="수정">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" data-action="delete-booking" data-id="${booking.id}" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
    })
    .join('');
}

export async function renderUpcomingSchedules() {
  const container = document.getElementById('upcomingSchedulesList');

  if (!container) {
    console.warn('upcomingSchedulesList 컨테이너를 찾을 수 없습니다.');
    return;
  }

  try {
    // 항공편관리에서 데이터 가져오기
    let flightSchedules = [];
    try {
      const result = await fetchJSON('/api/flight-schedules');
      flightSchedules = result.data || [];
    } catch (error) {
      console.warn('항공편 데이터 가져오기 실패:', error);
    }

    // DB에서 단체명단 데이터 가져오기
    let groups = state.groups || [];
    if (groups.length === 0) {
      try {
        const result = await fetchJSON('/tables/groups');
        const raw = result.data || result;
        groups = raw.map((g) => ({
          ...g,
          departureDate: g.departureDate || g.departure_date,
          returnDate: g.returnDate || g.return_date,
        }));
      } catch (_e) {
        groups = [];
      }
    }

    // 오늘 날짜 기준
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // D-day 계산 함수
    const getDday = (dateStr) => {
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    // D-day 표시 문자열
    const getDdayText = (days) => {
      if (days === 0) return '오늘 출발';
      if (days === 1) return '내일 출발';
      if (days > 0) return `출발 ${days}일 전`;
      return `${Math.abs(days)}일 지남`;
    };

    // 항공편 → 일정 형식 변환 (30일 이내 출발)
    const flightItems = flightSchedules
      .filter((f) => {
        if (!f.departure_date) return false;
        const dday = getDday(f.departure_date);
        return dday >= 0 && dday <= 30;
      })
      .map((f) => ({
        group_name: f.group_name || '미지정',
        departure_date: f.departure_date,
        destination: f.arrival_airport || '',
        passengers: f.passengers || 0,
        airline: f.airline || '',
        dday: getDday(f.departure_date),
        source: 'flight',
      }));

    // 단체명단 → 일정 형식 변환 (30일 이내 출발)
    const groupItems = groups
      .filter((g) => {
        if (!g.departureDate) return false;
        const dday = getDday(g.departureDate);
        return dday >= 0 && dday <= 30;
      })
      .map((g) => ({
        group_name: g.name || '미지정',
        departure_date: g.departureDate,
        destination: g.destination || '',
        passengers: g.members?.length || 0,
        airline: '',
        dday: getDday(g.departureDate),
        source: 'group',
      }));

    // 두 데이터 합치기 (중복 제거: group_name 기준)
    const seen = new Set();
    const allItems = [...flightItems, ...groupItems]
      .filter((item) => {
        const key = item.group_name;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.dday - b.dday)
      .slice(0, 10);

    if (allItems.length === 0) {
      container.innerHTML =
        '<div class="empty-message">30일 이내 예정된 출발이 없습니다.</div>';
      return;
    }

    // 렌더링
    container.innerHTML = allItems
      .map((item) => {
        const safeGroupName = sanitizeHtml(item.group_name);
        const safeDestination = sanitizeHtml(item.destination);
        const safeAirline = sanitizeHtml(item.airline);
        const ddayText = getDdayText(item.dday);

        // D-day에 따른 스타일
        let ddayClass = '';
        if (item.dday <= 3)
          ddayClass = 'style="color: #ef4444; font-weight: bold;"'; // 빨강
        else if (item.dday <= 7)
          ddayClass = 'style="color: #f59e0b; font-weight: bold;"'; // 주황

        return `
                <div class="schedule-item">
                    <div class="schedule-header">
                        <div class="schedule-group">${safeGroupName}</div>
                        <div class="schedule-date" ${ddayClass}>
                            <i class="fas fa-plane-departure"></i>
                            ${ddayText}
                        </div>
                    </div>
                    <div class="schedule-details">
                        <i class="fas fa-calendar"></i> ${formatDate(item.departure_date)}
                        ${item.destination ? ` · <i class="fas fa-map-marker-alt"></i> ${safeDestination}` : ''}
                    </div>
                    <div class="schedule-details" style="margin-top: 0.3rem; color: #666;">
                        <i class="fas fa-users"></i> ${item.passengers}명
                        ${item.airline ? ` · <i class="fas fa-plane"></i> ${safeAirline}` : ''}
                    </div>
                </div>
            `;
      })
      .join('');
  } catch (error) {
    console.error('일정 렌더링 오류:', error);
    container.innerHTML =
      '<div class="empty-message">일정을 불러오는데 실패했습니다.</div>';
  }
}

export async function renderPastSchedules() {
  const container = document.getElementById('pastSchedulesList');

  if (!container) {
    console.warn('pastSchedulesList 컨테이너를 찾을 수 없습니다.');
    return;
  }

  try {
    // 항공편관리에서 데이터 가져오기
    let flightSchedules = [];
    try {
      const result = await fetchJSON('/api/flight-schedules');
      flightSchedules = result.data || [];
    } catch (error) {
      console.warn('항공편 데이터 가져오기 실패:', error);
    }

    // DB에서 단체명단 데이터 가져오기
    let groups = state.groups || [];
    if (groups.length === 0) {
      try {
        const result = await fetchJSON('/tables/groups');
        const raw = result.data || result;
        groups = raw.map((g) => ({
          ...g,
          departureDate: g.departureDate || g.departure_date,
          returnDate: g.returnDate || g.return_date,
        }));
      } catch (_e) {
        groups = [];
      }
    }

    // 오늘 날짜 기준
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // D-day 계산 함수
    const getDday = (dateStr) => {
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    // 항공편 → 과거 일정 (최근 30일)
    const flightItems = flightSchedules
      .filter((f) => {
        if (!f.departure_date) return false;
        const dday = getDday(f.departure_date);
        return dday < 0 && dday >= -30;
      })
      .map((f) => ({
        group_name: f.group_name || '미지정',
        departure_date: f.departure_date,
        destination: f.arrival_airport || '',
        passengers: f.passengers || 0,
        airline: f.airline || '',
        daysAgo: Math.abs(getDday(f.departure_date)),
        source: 'flight',
      }));

    // 단체명단 → 과거 일정 (최근 30일)
    const groupItems = groups
      .filter((g) => {
        if (!g.departureDate) return false;
        const dday = getDday(g.departureDate);
        return dday < 0 && dday >= -30;
      })
      .map((g) => ({
        group_name: g.name || '미지정',
        departure_date: g.departureDate,
        destination: g.destination || '',
        passengers: g.members?.length || 0,
        airline: '',
        daysAgo: Math.abs(getDday(g.departureDate)),
        source: 'group',
      }));

    // 두 데이터 합치기 (중복 제거: group_name 기준)
    const seen = new Set();
    const allItems = [...flightItems, ...groupItems]
      .filter((item) => {
        const key = item.group_name;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.daysAgo - b.daysAgo)
      .slice(0, 10);

    if (allItems.length === 0) {
      container.innerHTML =
        '<div class="empty-message">30일 이내 과거 출발이 없습니다.</div>';
      return;
    }

    // 렌더링
    container.innerHTML = allItems
      .map((item) => {
        const safeGroupName = sanitizeHtml(item.group_name);
        const safeDestination = sanitizeHtml(item.destination);
        const safeAirline = sanitizeHtml(item.airline);

        return `
                <div class="schedule-item" style="opacity: 0.7;">
                    <div class="schedule-header">
                        <div class="schedule-group">${safeGroupName}</div>
                        <div class="schedule-date" style="color: #888;">
                            <i class="fas fa-plane-arrival"></i>
                            ${item.daysAgo}일 전 출발
                        </div>
                    </div>
                    <div class="schedule-details">
                        <i class="fas fa-calendar"></i> ${formatDate(item.departure_date)}
                        ${item.destination ? ` · <i class="fas fa-map-marker-alt"></i> ${safeDestination}` : ''}
                    </div>
                    <div class="schedule-details" style="margin-top: 0.3rem; color: #888;">
                        <i class="fas fa-users"></i> ${item.passengers}명
                        ${item.airline ? ` · <i class="fas fa-plane"></i> ${safeAirline}` : ''}
                    </div>
                </div>
            `;
      })
      .join('');
  } catch (error) {
    console.error('과거 일정 렌더링 오류:', error);
    container.innerHTML =
      '<div class="empty-message">과거 일정을 불러오는데 실패했습니다.</div>';
  }
}

export function renderNotifications(notifications = state.notifications) {
  const container = document.getElementById('notificationsContainer');

  if (notifications.length === 0) {
    container.innerHTML = '<div class="empty-message">알림이 없습니다.</div>';
    return;
  }

  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  container.innerHTML = sortedNotifications
    .map((notification) => {
      const iconClass = getNotificationIcon(notification.notification_type);
      const iconColor = getNotificationColor(notification.notification_type);
      const readClass = notification.is_read ? 'read' : '';
      const priorityBadge =
        notification.priority === '높음'
          ? '<span class="priority-badge">긴급</span>'
          : '';

      return `
            <div class="notification-card ${readClass}">
                <div class="notification-card-icon" style="background: ${iconColor};">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notification-card-content">
                    <div class="notification-card-header">
                        <h4>${sanitizeHtml(notification.notification_type)} ${priorityBadge}</h4>
                        <span class="notification-card-time">${formatDateTime(notification.created_at)}</span>
                    </div>
                    <p class="notification-card-message">${sanitizeHtml(notification.message)}</p>
                    <div class="notification-card-meta">
                        <span><i class="fas fa-user"></i> ${sanitizeHtml(notification.customer_name)}</span>
                        <span><i class="fas fa-map-marked-alt"></i> ${sanitizeHtml(notification.product_name)}</span>
                        <span><i class="fas fa-calendar"></i> 출발: ${notification.departure_date}</span>
                        <span><i class="fas fa-clock"></i> D-${notification.days_before}</span>
                    </div>
                </div>
                <div class="notification-card-actions">
                    ${
                      !notification.is_read
                        ? `<button class="btn btn-sm btn-secondary" data-action="mark-notification-read" data-id="${notification.id}">
                            <i class="fas fa-check"></i> 읽음
                        </button>`
                        : '<span class="text-muted"><i class="fas fa-check-double"></i> 읽음</span>'
                    }
                    <button class="btn btn-sm btn-danger" data-action="delete-notification" data-id="${notification.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    })
    .join('');
}

// renderCalendar는 app.js에서 export됨 - 여기서는 제거

export function renderTodos() {
  const todoList = document.getElementById('todoList');
  const sortedTodos = [...state.todos].sort(
    (a, b) => new Date(a.due_date) - new Date(b.due_date)
  );

  if (sortedTodos.length === 0) {
    todoList.innerHTML = '<div class="empty-message">할 일이 없습니다.</div>';
    return;
  }

  todoList.innerHTML = sortedTodos
    .map((todo) => {
      const isOverdue =
        new Date(todo.due_date) < new Date() && !todo.is_completed;
      let itemClass = 'todo-item';
      if (todo.is_completed) itemClass += ' completed';
      if (isOverdue) itemClass += ' overdue';
      if (todo.priority === '높음') itemClass += ' high';

      // 완료된 항목의 제목에 취소선 스타일 추가
      const titleStyle = todo.is_completed
        ? 'style="text-decoration: line-through; opacity: 0.6;"'
        : '';

      return `
            <div class="${itemClass}" data-id="${todo.id}">
                <div class="todo-checkbox">
                    <input type="checkbox" data-action="toggle-todo" ${todo.is_completed ? 'checked' : ''}>
                </div>
                <div class="todo-content">
                    <div class="todo-title" ${titleStyle}>${sanitizeHtml(todo.title)}</div>
                    <div class="todo-meta">
                        <span class="todo-date"><i class="fas fa-calendar-alt"></i> ${todo.due_date}</span>
                        <span class="todo-priority priority-${sanitizeHtml(todo.priority)}">${sanitizeHtml(todo.priority)}</span>
                    </div>
                    ${todo.description ? `<div class="todo-description" ${titleStyle}>${sanitizeHtml(todo.description)}</div>` : ''}
                </div>
                <button class="btn-icon-sm" data-action="delete-todo" title="삭제"><i class="fas fa-trash"></i></button>
            </div>
        `;
    })
    .join('');
}

// 여권 만료 경고 렌더링
export function renderPassportWarnings() {
  const warningsContainer = document.getElementById('passportWarnings');

  if (!warningsContainer) {
    return;
  }

  // 출발일이 있고, 여권 만료일이 있는 고객만 체크
  const customersWithDeparture = state.customers.filter(
    (customer) =>
      customer.departure_date &&
      customer.passport_expiry &&
      customer.departure_date !== '' &&
      customer.passport_expiry !== ''
  );

  const warnings = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  customersWithDeparture.forEach((customer) => {
    try {
      const departureDate = new Date(customer.departure_date);
      const passportExpiry = new Date(customer.passport_expiry);

      // 출발일이 과거가 아닌 경우만 체크
      if (departureDate >= today) {
        // 출발일 + 6개월 (180일) 계산
        const sixMonthsAfterDeparture = new Date(
          departureDate.getTime() + 180 * 24 * 60 * 60 * 1000
        );

        // 여권 만료일이 출발일 + 6개월보다 이전인 경우 경고
        if (passportExpiry < sixMonthsAfterDeparture) {
          // 출발일부터 만료일까지 남은 일수 계산
          const daysUntilExpiry = Math.floor(
            (passportExpiry - departureDate) / (1000 * 60 * 60 * 24)
          );
          const monthsUntilExpiry = Math.floor(daysUntilExpiry / 30);

          warnings.push({
            customer: customer,
            departureDate: departureDate,
            passportExpiry: passportExpiry,
            daysUntilExpiry: daysUntilExpiry,
            monthsUntilExpiry: monthsUntilExpiry,
          });
        }
      }
    } catch (error) {
      console.warn('날짜 파싱 오류:', customer.name_kor, error);
    }
  });

  // 경고가 없으면 숨김
  if (warnings.length === 0) {
    warningsContainer.style.display = 'none';
    return;
  }

  // 출발일이 가까운 순서로 정렬
  warnings.sort((a, b) => a.departureDate - b.departureDate);

  // 경고 표시
  warningsContainer.style.display = 'block';
  warningsContainer.innerHTML = `
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i>
                <strong style="color: #856404;">여권 만료 주의 (${warnings.length}명)</strong>
            </div>
            <div style="font-size: 0.9rem; color: #856404;">
                출발일 기준 6개월 이내 여권 만료 고객이 있습니다.
            </div>
        </div>
        ${warnings
          .map((warning) => {
            const urgencyClass =
              warning.monthsUntilExpiry < 3 ? 'urgent' : 'warning';
            const urgencyIcon = warning.monthsUntilExpiry < 3 ? '🚨' : '⚠️';

            return `
                <div class="passport-warning-item ${urgencyClass}" style="background: ${warning.monthsUntilExpiry < 3 ? '#ffebee' : '#fff8e1'}; border-left: 3px solid ${warning.monthsUntilExpiry < 3 ? '#f44336' : '#ff9800'}; padding: 10px; margin-bottom: 8px; border-radius: 4px; font-size: 0.9rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px;">
                                ${urgencyIcon} ${sanitizeHtml(warning.customer.name_kor)} ${warning.customer.name_eng ? '(' + sanitizeHtml(warning.customer.name_eng) + ')' : ''}
                            </div>
                            <div style="color: #666; font-size: 0.85rem;">
                                <div>단체: ${sanitizeHtml(warning.customer.group_name) || '미지정'}</div>
                                <div>출발일: ${warning.departureDate.toLocaleDateString('ko-KR')}</div>
                                <div>여권만료: ${warning.passportExpiry.toLocaleDateString('ko-KR')}
                                    <span style="color: ${warning.monthsUntilExpiry < 3 ? '#d32f2f' : '#f57c00'}; font-weight: 600;">
                                        (출발 후 약 ${warning.monthsUntilExpiry}개월)
                                    </span>
                                </div>
                            </div>
                        </div>
                        <a href="#" class="btn btn-sm" style="background: #2196F3; color: white; padding: 4px 8px; text-decoration: none; border-radius: 4px; font-size: 0.8rem;"
                           onclick="event.preventDefault(); window.navigateToPage('customers');">
                            확인
                        </a>
                    </div>
                </div>
            `;
          })
          .join('')}
    `;
}

// ==================== Modals and Selects ====================

export function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

export function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

/**
 * 견적서/확정서 파싱 결과 미리보기 모달 렌더링
 */
export function renderProductImportModal(parsed) {
  const title = document.getElementById('modalProductImportTitle');
  const body = document.getElementById('productImportBody');

  const typeLabel = parsed.type === 'quotation' ? '견적서' : '확정서';
  title.textContent = `${typeLabel} 파싱 결과 - ${parsed.destination || '알 수 없음'}`;

  let html = '';

  // 단체명 입력 (최상단에 눈에 띄게)
  html += `<div style="background:#eff6ff; border:2px solid #3b82f6; border-radius:10px; padding:14px 16px;">
        <label style="font-size:13px; color:#1d4ed8; font-weight:600; display:block; margin-bottom:6px;">
            <i class="fas fa-tag"></i> 단체명 / 피켓명 (직접 입력)
        </label>
        <input type="text" id="importGroupName"
               value="${sanitizeHtml(parsed.groupName || '')}"
               placeholder="단체명을 입력하세요"
               style="width:100%; padding:10px 14px; border:2px solid #93c5fd; border-radius:8px; font-size:16px; font-weight:bold; outline:none; box-sizing:border-box; background:#fff;">
    </div>`;

  // 기본 정보 카드
  html += `<div class="import-card">
        <h4 class="import-card-title"><i class="fas fa-info-circle"></i> 기본 정보</h4>
        <div class="import-card-grid">
            <div class="import-field">
                <span class="import-label">문서 유형</span>
                <span class="import-value import-badge ${parsed.type === 'quotation' ? 'badge-warning' : 'badge-success'}">${typeLabel}</span>
            </div>
            <div class="import-field">
                <span class="import-label">목적지</span>
                <span class="import-value">${sanitizeHtml(parsed.destination) || '-'}</span>
            </div>
            <div class="import-field">
                <span class="import-label">여행기간</span>
                <span class="import-value">${parsed.travelDates.from || '-'} ~ ${parsed.travelDates.to || '-'} (${parsed.duration || 0}일)</span>
            </div>
            <div class="import-field">
                <span class="import-label">인원 (PAX)</span>
                <span class="import-value">${parsed.pax.total}명 (유료 ${parsed.pax.paid} + FOC ${parsed.pax.foc})</span>
            </div>
            ${
              parsed.roomConfig
                ? `<div class="import-field">
                <span class="import-label">객실 구성</span>
                <span class="import-value">${sanitizeHtml(parsed.roomConfig)}</span>
            </div>`
                : ''
            }
        </div>
    </div>`;

  // 가이드 정보
  if (parsed.guide.name) {
    html += `<div class="import-card">
            <h4 class="import-card-title"><i class="fas fa-user"></i> 가이드</h4>
            <div class="import-card-grid">
                <div class="import-field">
                    <span class="import-label">이름</span>
                    <span class="import-value">${sanitizeHtml(parsed.guide.name)}</span>
                </div>
                ${
                  parsed.guide.phone
                    ? `<div class="import-field">
                    <span class="import-label">연락처</span>
                    <span class="import-value">${sanitizeHtml(parsed.guide.phone)}</span>
                </div>`
                    : ''
                }
            </div>
        </div>`;
  }

  // 호텔 정보
  if (parsed.hotel.name) {
    html += `<div class="import-card">
            <h4 class="import-card-title"><i class="fas fa-hotel"></i> 호텔</h4>
            <div class="import-card-grid">
                <div class="import-field">
                    <span class="import-label">호텔명</span>
                    <span class="import-value">${sanitizeHtml(parsed.hotel.name)}</span>
                </div>
                ${
                  parsed.hotel.roomType
                    ? `<div class="import-field">
                    <span class="import-label">객실 타입</span>
                    <span class="import-value">${sanitizeHtml(parsed.hotel.roomType)}</span>
                </div>`
                    : ''
                }
                ${
                  parsed.hotel.rooms
                    ? `<div class="import-field">
                    <span class="import-label">객실 수</span>
                    <span class="import-value">${parsed.hotel.rooms}실</span>
                </div>`
                    : ''
                }
                ${
                  parsed.hotel.nights
                    ? `<div class="import-field">
                    <span class="import-label">숙박</span>
                    <span class="import-value">${parsed.hotel.nights}박</span>
                </div>`
                    : ''
                }
            </div>
        </div>`;
  }

  // 차량 정보
  if (parsed.vehicle.type) {
    html += `<div class="import-card">
            <h4 class="import-card-title"><i class="fas fa-bus"></i> 차량</h4>
            <div class="import-card-grid">
                <div class="import-field">
                    <span class="import-label">차량 종류</span>
                    <span class="import-value">${sanitizeHtml(parsed.vehicle.type)}</span>
                </div>
                ${
                  parsed.vehicle.count
                    ? `<div class="import-field">
                    <span class="import-label">대수</span>
                    <span class="import-value">${parsed.vehicle.count}대</span>
                </div>`
                    : ''
                }
            </div>
        </div>`;
  }

  // 비용 요약 (견적서만)
  if (parsed.costs && (parsed.costs.total > 0 || parsed.costs.perPerson > 0)) {
    html += `<div class="import-card import-card-costs">
            <h4 class="import-card-title"><i class="fas fa-dollar-sign"></i> 비용 요약 (USD)</h4>
            <div class="import-costs-grid">`;

    const costItems = [
      { label: '호텔', value: parsed.costs.hotel },
      { label: '식사', value: parsed.costs.meals },
      { label: '입장료', value: parsed.costs.entrance },
      { label: '옵션', value: parsed.costs.options },
      { label: '가이드', value: parsed.costs.guide },
      { label: '차량/기사', value: parsed.costs.vehicle },
      { label: '기타', value: parsed.costs.other },
      { label: '핸드링', value: parsed.costs.handling },
    ];

    costItems.forEach((item) => {
      if (item.value > 0) {
        html += `<div class="import-cost-item">
                    <span>${item.label}</span>
                    <span>$${item.value.toLocaleString()}</span>
                </div>`;
      }
    });

    html += `<div class="import-cost-total">
                <span>총경비</span>
                <span>$${parsed.costs.total.toLocaleString()}</span>
            </div>
            <div class="import-cost-perperson">
                <span>1인당 경비</span>
                <span>$${parsed.costs.perPerson.toLocaleString()}</span>
            </div>
            </div>
        </div>`;
  }

  // 포함사항
  if (parsed.inclusions) {
    html += `<div class="import-card">
            <h4 class="import-card-title"><i class="fas fa-check-circle"></i> 포함사항</h4>
            <p class="import-inclusions">${sanitizeHtml(parsed.inclusions)}</p>
        </div>`;
  }

  // 일정표 (확정서만)
  if (parsed.itinerary && parsed.itinerary.length > 0) {
    html += `<div class="import-card">
            <h4 class="import-card-title"><i class="fas fa-calendar-alt"></i> 일정표</h4>
            <div class="import-itinerary">`;
    parsed.itinerary.forEach((day) => {
      html += `<div class="import-itinerary-day">
                <span class="import-day-num">DAY ${day.day}</span>
                <span class="import-day-content">${sanitizeHtml(day.schedule || day.content || '')}</span>
                ${day.meals ? `<span class="import-day-meals" style="color:#e67e22;font-size:0.85em;margin-top:2px;">🍽 ${sanitizeHtml(day.meals)}</span>` : ''}
            </div>`;
    });
    html += `</div></div>`;
  }

  body.innerHTML = html;

  // 기존 상품 목록으로 셀렉트 채우기
  const mergeSection = document.getElementById('importMergeSection');
  const mergeSelect = document.getElementById('importMergeTarget');
  if (mergeSection && mergeSelect) {
    const activeProducts = state.products.filter(
      (p) => p.status === '활성' || p.status === 'active'
    );
    const options = activeProducts.map((p) => {
      const label = `${sanitizeHtml(p.name)} (${sanitizeHtml(p.destination) || ''} ${p.duration || ''}일)`;
      return `<option value="${p.id}">${label}</option>`;
    });
    mergeSelect.innerHTML =
      '<option value="">-- 반영할 상품 선택 --</option>' + options.join('');
    // 기존 상품 반영 섹션 항상 표시
    mergeSection.style.display = 'block';
  }

  openModal('modalProductImport');
}

/**
 * 상품 카드 미리보기 모달 (가이드, 호텔, 식사 요약)
 */
export function showProductPreview(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  const title = document.getElementById('modalProductImportTitle');
  const body = document.getElementById('productImportBody');

  title.textContent = `${product.name} - 수배 현황`;

  // 수배 메모에서 식사 정보 추출
  const mealInfo = extractMeals(
    product.procurement_note || product.description || ''
  );

  let html = '';

  // 기본 정보
  html += `<div class="import-card">
        <h4 class="import-card-title"><i class="fas fa-info-circle"></i> 기본 정보</h4>
        <div class="import-card-grid">
            <div class="import-field">
                <span class="import-label">단체명</span>
                <span class="import-value"><strong>${sanitizeHtml(product.name)}</strong></span>
            </div>
            <div class="import-field">
                <span class="import-label">목적지</span>
                <span class="import-value">${sanitizeHtml(product.destination || '-')}</span>
            </div>
            <div class="import-field">
                <span class="import-label">기간</span>
                <span class="import-value">${product.hotel_checkin || '-'} ~ ${product.hotel_checkout || '-'} (${product.duration || 0}일)</span>
            </div>
            <div class="import-field">
                <span class="import-label">가격</span>
                <span class="import-value">${(product.price || 0).toLocaleString()}원</span>
            </div>
        </div>
    </div>`;

  // 가이드 정보
  html += `<div class="import-card">
        <h4 class="import-card-title"><i class="fas fa-user"></i> 가이드</h4>
        ${
          product.guide_name
            ? `<div class="import-card-grid">
            <div class="import-field">
                <span class="import-label">이름</span>
                <span class="import-value">${sanitizeHtml(product.guide_name)}</span>
            </div>
            <div class="import-field">
                <span class="import-label">연락처</span>
                <span class="import-value">${sanitizeHtml(product.guide_phone || '-')}</span>
            </div>
        </div>`
            : '<p class="import-empty">미정</p>'
        }
    </div>`;

  // 호텔 정보
  html += `<div class="import-card">
        <h4 class="import-card-title"><i class="fas fa-hotel"></i> 호텔</h4>
        ${
          product.hotel_name
            ? `<div class="import-card-grid">
            <div class="import-field">
                <span class="import-label">호텔명</span>
                <span class="import-value">${sanitizeHtml(product.hotel_name)}</span>
            </div>
            ${
              product.hotel_room_type
                ? `<div class="import-field">
                <span class="import-label">객실</span>
                <span class="import-value">${sanitizeHtml(product.hotel_room_type)}</span>
            </div>`
                : ''
            }
            ${
              product.hotel_rooms
                ? `<div class="import-field">
                <span class="import-label">객실 수</span>
                <span class="import-value">${product.hotel_rooms}실</span>
            </div>`
                : ''
            }
        </div>`
            : '<p class="import-empty">미정</p>'
        }
    </div>`;

  // 식사 정보
  html += `<div class="import-card">
        <h4 class="import-card-title"><i class="fas fa-utensils"></i> 식사</h4>
        ${
          mealInfo.length > 0
            ? `<div class="import-meals-list">
            ${mealInfo.map((m) => `<div class="import-meal-item">${sanitizeHtml(m)}</div>`).join('')}
        </div>`
            : '<p class="import-empty">정보 없음</p>'
        }
    </div>`;

  // 차량 정보
  if (product.vehicle_type) {
    html += `<div class="import-card">
            <h4 class="import-card-title"><i class="fas fa-bus"></i> 차량</h4>
            <div class="import-card-grid">
                <div class="import-field">
                    <span class="import-label">종류</span>
                    <span class="import-value">${sanitizeHtml(product.vehicle_type)}</span>
                </div>
                ${
                  product.vehicle_count
                    ? `<div class="import-field">
                    <span class="import-label">대수</span>
                    <span class="import-value">${product.vehicle_count}대</span>
                </div>`
                    : ''
                }
            </div>
        </div>`;
  }

  // 수배 진행 상태
  const checkItems = [
    { key: 'procurement_flight', icon: '✈️', label: '항공권' },
    { key: 'procurement_hotel', icon: '🏨', label: '호텔' },
    { key: 'procurement_vehicle', icon: '🚌', label: '차량' },
    { key: 'procurement_guide', icon: '👤', label: '가이드' },
    { key: 'procurement_visa', icon: '📄', label: '비자' },
    { key: 'procurement_insurance', icon: '🛡️', label: '보험' },
  ];
  const checkedItems = checkItems.filter((c) => product[c.key]);
  if (checkedItems.length > 0) {
    html += `<div class="import-card">
            <h4 class="import-card-title"><i class="fas fa-tasks"></i> 수배 체크</h4>
            <div class="import-check-list">
                ${checkItems.map((c) => `<span class="import-check-item ${product[c.key] ? 'checked' : ''}">${c.icon} ${c.label}</span>`).join('')}
            </div>
        </div>`;
  }

  body.innerHTML = html;

  // 미리보기에서는 하단 버튼 간소화
  const mergeSection = document.getElementById('importMergeSection');
  if (mergeSection) mergeSection.style.display = 'none';

  // 하단 액션 버튼을 미리보기 모드로 교체
  const btnSave = document.getElementById('btnImportSave');
  const btnEdit = document.getElementById('btnImportEdit');
  if (btnSave) btnSave.style.display = 'none';
  if (btnEdit) btnEdit.style.display = 'none';

  openModal('modalProductImport');
}

/**
 * 수배 메모 또는 설명에서 식사 메뉴 추출
 */
function extractMeals(text) {
  const meals = [];
  // "현지식", "호텔만찬", "씨푸드", "뷔페" 등의 식사 키워드 찾기
  const mealPatterns = text.match(
    /(?:중식|석식|조식|만찬|뷔페|현지식|한식|씨푸드|정찬|호텔식|기내식)[^,)]*(?:[(（][^)）]*[)）])?/g
  );
  if (mealPatterns) {
    mealPatterns.forEach((m) => {
      const cleaned = m.trim();
      if (cleaned && !meals.includes(cleaned)) meals.push(cleaned);
    });
  }
  // "드마리스", "경복궁" 등 레스토랑명이 포함된 패턴
  const restaurantPatterns = text.match(/(?:드마리스|경복궁|앰버서더)[^,)]*/g);
  if (restaurantPatterns) {
    restaurantPatterns.forEach((m) => {
      const cleaned = m.trim();
      if (cleaned && !meals.includes(cleaned)) meals.push(cleaned);
    });
  }
  return meals;
}

export function updateCustomerSelects() {
  const selects = [
    document.getElementById('bookingCustomer'),
    document.getElementById('quoteCustomer'),
  ];

  selects.forEach((select) => {
    if (select) {
      const currentValue = select.value;
      select.innerHTML =
        '<option value="">고객을 선택하세요</option>' +
        state.customers
          .map(
            (c) =>
              `<option value="${c.id}" data-name="${sanitizeHtml(c.name_kor || c.name_eng)}">${sanitizeHtml(c.name_kor || c.name_eng)} (${sanitizeHtml(c.phone)})</option>`
          )
          .join('');
      select.value = currentValue;
    }
  });
}

export function updateProductSelects() {
  const selects = [
    document.getElementById('bookingProduct'),
    document.getElementById('quoteProduct'),
  ];

  selects.forEach((select) => {
    if (select) {
      const currentValue = select.value;
      select.innerHTML =
        '<option value="">상품을 선택하세요</option>' +
        state.products
          .filter((p) => p.status === '활성')
          .map(
            (p) =>
              `<option value="${p.id}" data-name="${sanitizeHtml(p.name)}" data-price="${p.price}">${sanitizeHtml(p.name)} - ${sanitizeHtml(p.destination)} (${p.price.toLocaleString()}원)</option>`
          )
          .join('');
      select.value = currentValue;
    }
  });
}

// ==================== Customer Tooltip ====================

let tooltipElement = null;

function createCustomerTooltip(customer) {
  if (!customer) return '';

  const travelHistoryDisplay = customer.travel_history
    ? customer.travel_history.length > 50
      ? customer.travel_history.substring(0, 50) + '...'
      : customer.travel_history
    : '없음';

  return `
        <div class="customer-tooltip">
            <div class="tooltip-header">
                <strong>${sanitizeHtml(customer.name_kor) || '-'}</strong>
                ${customer.name_eng ? `<span class="tooltip-subtitle">${sanitizeHtml(customer.name_eng)}</span>` : ''}
            </div>
            <div class="tooltip-content">
                <div class="tooltip-row">
                    <span class="tooltip-label">단체명:</span>
                    <span class="tooltip-value">${sanitizeHtml(customer.group_name) || '없음'}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">출발일:</span>
                    <span class="tooltip-value">${customer.departure_date ? formatDate(customer.departure_date) : '없음'}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">여행지역:</span>
                    <span class="tooltip-value">${sanitizeHtml(customer.travel_region) || '없음'}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">여행이력:</span>
                    <span class="tooltip-value">${sanitizeHtml(travelHistoryDisplay)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">연락처:</span>
                    <span class="tooltip-value">${sanitizeHtml(customer.phone) || '없음'}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">이메일:</span>
                    <span class="tooltip-value">${sanitizeHtml(customer.email) || '없음'}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">여권번호:</span>
                    <span class="tooltip-value">${sanitizeHtml(customer.passport_number) || '없음'}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">생년월일:</span>
                    <span class="tooltip-value">${customer.birth_date || '없음'}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">여권만료일:</span>
                    <span class="tooltip-value">${customer.passport_expiry ? formatDate(customer.passport_expiry) : '없음'}</span>
                </div>
                ${
                  customer.passport_file_name
                    ? `
                <div class="tooltip-row">
                    <span class="tooltip-label">여권사본:</span>
                    <span class="tooltip-value">${sanitizeHtml(customer.passport_file_name)}</span>
                </div>
                `
                    : ''
                }
            </div>
        </div>
    `;
}

function showTooltip(event, customer) {
  if (!customer) return;

  // 기존 툴팁 제거
  hideTooltip();

  // 툴팁 요소 생성
  tooltipElement = document.createElement('div');
  tooltipElement.className = 'customer-tooltip-container';
  tooltipElement.innerHTML = createCustomerTooltip(customer);
  document.body.appendChild(tooltipElement);

  // 위치 계산
  const rect = event.currentTarget.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = rect.right + 10;
  let top = rect.top;

  // 화면 오른쪽에 맞추기
  if (left + tooltipRect.width > viewportWidth) {
    left = rect.left - tooltipRect.width - 10;
  }

  // 화면 아래에 맞추기
  if (top + tooltipRect.height > viewportHeight) {
    top = viewportHeight - tooltipRect.height - 10;
  }

  // 화면 위에 맞추기
  if (top < 10) {
    top = 10;
  }

  tooltipElement.style.left = `${left}px`;
  tooltipElement.style.top = `${top}px`;
  tooltipElement.style.opacity = '0';

  // 페이드인 애니메이션
  setTimeout(() => {
    if (tooltipElement) {
      tooltipElement.style.opacity = '1';
    }
  }, 10);
}

function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.style.opacity = '0';
    setTimeout(() => {
      if (tooltipElement && tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
      }
      tooltipElement = null;
    }, 200);
  }
}

function attachCustomerTooltipListeners() {
  // 기존 리스너 제거
  const rows = document.querySelectorAll(
    '#customersTable tbody tr[data-customer-id]'
  );
  rows.forEach((row) => {
    row.removeEventListener('mouseenter', handleRowMouseEnter);
    row.removeEventListener('mouseleave', handleRowMouseLeave);
  });

  // 새 리스너 추가
  rows.forEach((row) => {
    row.addEventListener('mouseenter', handleRowMouseEnter);
    row.addEventListener('mouseleave', handleRowMouseLeave);
  });
}

function handleRowMouseEnter(event) {
  const customerId = event.currentTarget.getAttribute('data-customer-id');
  if (customerId) {
    const customer = state.customers.find(
      (c) => String(c.id) === String(customerId)
    );
    if (customer) {
      showTooltip(event, customer);
    }
  }
}

function handleRowMouseLeave(_event) {
  hideTooltip();
}

// ==================== Helpers ====================

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR');
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function maskSensitiveData(text, type = 'default') {
  if (!text || !state.securityMode) return text;

  switch (type) {
    case 'passport':
      return text.substring(0, 1) + '****' + text.substring(text.length - 4);
    case 'birth':
      return text.substring(0, 5) + '**-**';
    case 'phone': {
      const parts = text.split('-');
      if (parts.length === 3) {
        return parts[0] + '-****-' + parts[2];
      }
      return text;
    }
    case 'email': {
      const [username, domain] = text.split('@');
      if (username && domain) {
        return username.substring(0, 2) + '***@' + domain;
      }
      return text;
    }
    default:
      return text;
  }
}

function getNotificationIcon(type) {
  const icons = {
    여권확인: 'fas fa-passport',
    출발준비: 'fas fa-suitcase',
    출발임박: 'fas fa-exclamation-triangle',
    당일: 'fas fa-plane-departure',
  };
  return icons[type] || 'fas fa-bell';
}

function getNotificationColor(type) {
  const colors = {
    여권확인: 'linear-gradient(135deg, #f59e0b, #d97706)',
    출발준비: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    출발임박: 'linear-gradient(135deg, #ef4444, #dc2626)',
    당일: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  };
  return colors[type] || 'linear-gradient(135deg, #64748b, #475569)';
}

// ==================== 견적서 페이지 자동 채우기 ====================

export function loadQuoteDataFromCost() {
  try {
    const savedData = localStorage.getItem('quoteDataFromCost');
    if (!savedData) {
      return;
    }

    const data = JSON.parse(savedData);

    // 출발일과 귀국일 설정
    if (data.departureDate) {
      const departureDateInput = document.getElementById('quoteDepartureDate');
      if (departureDateInput) {
        departureDateInput.value = data.departureDate;
      }
    }

    if (data.arrivalDate) {
      const returnDateInput = document.getElementById('quoteReturnDate');
      if (returnDateInput) {
        returnDateInput.value = data.arrivalDate;
      }
    }

    // 인원 설정 (성인 + 소아 + 유아)
    const totalParticipants =
      (data.adults || 0) + (data.children || 0) + (data.infants || 0);
    const participantsInput = document.getElementById('quoteParticipants');
    if (participantsInput && totalParticipants > 0) {
      participantsInput.value = totalParticipants;
    }

    // 항공사 설정
    if (data.airline) {
      const airlineInput = document.getElementById('quoteAirline');
      if (airlineInput) {
        airlineInput.value = data.airline;
      }
    }

    // 출발 공항과 도착 공항 설정 (route에서 추출)
    if (data.route) {
      const routeParts = data.route.split('→').map((s) => s.trim());
      if (routeParts.length >= 2) {
        const departureAirportInput = document.getElementById(
          'quoteDepartureAirport'
        );
        const arrivalAirportInput = document.getElementById(
          'quoteArrivalAirport'
        );
        if (departureAirportInput) {
          departureAirportInput.value = routeParts[0];
        }
        if (arrivalAirportInput) {
          arrivalAirportInput.value = routeParts[1];
        }
      }
    }

    // 추가 금액 설정 (판매가에서 상품 가격을 뺀 값)
    if (data.pricePerPerson) {
      const additionalPriceInput = document.getElementById(
        'quoteAdditionalPrice'
      );
      if (additionalPriceInput) {
        additionalPriceInput.value = data.pricePerPerson;
      }
    }

    // 여행지 정보를 메모에 추가
    if (data.destination) {
      const notesInput = document.getElementById('quoteNotes');
      if (notesInput) {
        let notes = `여행지: ${data.destination}`;
        if (data.nights && data.days) {
          notes += `\n일정: ${data.nights}박 ${data.days}일`;
        }
        if (data.pricePerPerson) {
          notes += `\n1인당 가격: ${data.pricePerPerson.toLocaleString()}원`;
        }
        if (data.totalPrice) {
          notes += `\n총 가격: ${data.totalPrice.toLocaleString()}원`;
        }
        notesInput.value = notes;
      }
    }

    // 데이터를 사용한 후 localStorage에서 제거
    localStorage.removeItem('quoteDataFromCost');

    // 사용자에게 알림
    showNotification(
      '원가 계산서 데이터가 자동으로 입력되었습니다.',
      'success'
    );
  } catch (error) {
    console.error('견적서 데이터 로드 오류:', error);
  }
}
