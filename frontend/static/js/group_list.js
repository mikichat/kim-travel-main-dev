/**
 * 단체 목록 화면
 */

// 상태 관리
let currentPage = 1;
let currentFilters = {
    name: '',
    status: '',
    start_date_from: '',
    start_date_to: '',
};

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    loadGroups();
    setupEventListeners();
});

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 검색 버튼
    document.getElementById('btnSearch').addEventListener('click', () => {
        currentPage = 1;
        updateFilters();
        loadGroups();
    });

    // 초기화 버튼
    document.getElementById('btnReset').addEventListener('click', () => {
        document.getElementById('searchName').value = '';
        document.getElementById('filterStartDateFrom').value = '';
        document.getElementById('filterStartDateTo').value = '';
        document.getElementById('filterStatus').value = '';
        currentPage = 1;
        currentFilters = {
            name: '',
            status: '',
            start_date_from: '',
            start_date_to: '',
        };
        loadGroups();
    });

    // 신규 생성 버튼
    document.getElementById('btnCreateNew').addEventListener('click', () => {
        window.location.href = '/pages/group_form.html?mode=create';
    });

    // 실시간 검색 (debounce)
    const debouncedSearch = debounce(() => {
        currentPage = 1;
        updateFilters();
        loadGroups();
    }, 300);

    document.getElementById('searchName').addEventListener('input', debouncedSearch);

    // Enter 키로 검색
    document.getElementById('searchName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            updateFilters();
            loadGroups();
        }
    });
}

/**
 * 필터 업데이트
 */
function updateFilters() {
    currentFilters = {
        name: document.getElementById('searchName').value.trim(),
        status: document.getElementById('filterStatus').value,
        start_date_from: document.getElementById('filterStartDateFrom').value,
        start_date_to: document.getElementById('filterStartDateTo').value,
    };
}

/**
 * 단체 목록 조회
 */
async function loadGroups() {
    try {
        // 로딩 표시
        const tbody = document.getElementById('groupTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="loading show">
                        <div class="spinner"></div>
                        <p>데이터를 불러오는 중...</p>
                    </div>
                </td>
            </tr>
        `;

        // API 호출
        const params = {
            page: currentPage,
            limit: 20,
            ...currentFilters,
        };

        // 빈 값 제거
        Object.keys(params).forEach(key => {
            if (!params[key]) delete params[key];
        });

        const data = await getGroups(params);

        // 테이블 렌더링
        renderTable(data.data || []);

        // 페이징 렌더링
        renderPagination(data.page, data.total, data.limit);

        // 전체 개수 표시
        document.getElementById('totalInfo').textContent = `전체 ${data.total || 0}개`;

    } catch (error) {
        console.error('단체 목록 조회 오류:', error);

        const tbody = document.getElementById('groupTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <div class="empty-state-text">데이터를 불러올 수 없습니다.</div>
                        <div class="empty-state-text text-muted">${escapeHtml(error.message)}</div>
                    </div>
                </td>
            </tr>
        `;

        showError('단체 목록을 불러올 수 없습니다: ' + error.message);
    }
}

/**
 * 테이블 렌더링
 */
function renderTable(groups) {
    const tbody = document.getElementById('groupTableBody');
    tbody.innerHTML = '';

    if (groups.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-text">조회된 단체가 없습니다.</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    groups.forEach(group => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(group.name)}</strong></td>
            <td>${formatDate(group.start_date, 'YYYY-MM-DD')}</td>
            <td>${formatDate(group.end_date, 'YYYY-MM-DD')}</td>
            <td>${group.nights}박 ${group.days}일</td>
            <td>${formatNumber(group.pax)}명</td>
            <td>${renderStatusBadge(group.status)}</td>
            <td>${formatDateTime(group.updated_at)}</td>
        `;

        // 행 클릭 시 대시보드로 이동
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            window.location.href = `/pages/group_dashboard.html?id=${group.id}`;
        });

        // 마우스 오버 효과
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#f1f3f5';
        });

        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = '';
        });

        tbody.appendChild(row);
    });
}

/**
 * 페이징 렌더링
 */
function renderPagination(page, totalItems, limit) {
    const totalPages = Math.ceil(totalItems / limit);
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';

    if (totalPages === 0) return;

    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '이전';
    prevBtn.disabled = page === 1;
    prevBtn.addEventListener('click', () => {
        if (page > 1) {
            currentPage = page - 1;
            loadGroups();
        }
    });
    paginationDiv.appendChild(prevBtn);

    // 페이지 번호 (최대 5개 표시)
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        if (i === page) pageBtn.classList.add('active');
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            loadGroups();
        });
        paginationDiv.appendChild(pageBtn);
    }

    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '다음';
    nextBtn.disabled = page === totalPages;
    nextBtn.addEventListener('click', () => {
        if (page < totalPages) {
            currentPage = page + 1;
            loadGroups();
        }
    });
    paginationDiv.appendChild(nextBtn);

    // 전체 페이지 정보
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `${page} / ${totalPages} 페이지`;
    paginationDiv.appendChild(pageInfo);
}
