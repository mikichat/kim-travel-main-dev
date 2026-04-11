/**
 * 단체 관리 대시보드
 * T-UI-04, T-UI-05, T-UI-06, T-UI-07 통합
 */

let groupId = null;
let groupData = null;
let currentTab = 'info';

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    groupId = getUrlParameter('id');

    if (!groupId) {
        showError('단체 ID가 없습니다.');
        setTimeout(() => {
            window.location.href = '/pages/group_list.html';
        }, 2000);
        return;
    }

    loadGroupData();
    setupEventListeners();
    setupTabs();
});

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 기본 정보 수정
    document.getElementById('btnEditGroup').addEventListener('click', () => {
        window.location.href = `/pages/group_form.html?mode=edit&id=${groupId}`;
    });

    // 상태 변경
    document.getElementById('btnChangeStatus').addEventListener('click', handleChangeStatus);

    // 단체 삭제
    document.getElementById('btnDeleteGroup').addEventListener('click', handleDeleteGroup);

    // 일정 추가
    document.getElementById('btnAddItinerary').addEventListener('click', () => {
        window.location.href = `/pages/itinerary.html?group_id=${groupId}`;
    });

    // 취소 규정 추가
    document.getElementById('btnAddCancelRule').addEventListener('click', () => handleAddCancelRule());

    // 포함/불포함 항목 추가
    document.getElementById('btnAddInclude').addEventListener('click', () => handleAddInclude('include'));
    document.getElementById('btnAddExclude').addEventListener('click', () => handleAddInclude('exclude'));

    // 문서 생성 버튼들
    document.querySelectorAll('.btn-generate-doc').forEach(btn => {
        btn.addEventListener('click', () => {
            const docType = btn.getAttribute('data-type');
            handleGenerateDocument(docType);
        });
    });

    // 목록으로 돌아가기
    document.getElementById('btnBackToList').addEventListener('click', () => {
        window.location.href = '/pages/group_list.html';
    });
}

/**
 * 탭 설정
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

/**
 * 탭 전환
 */
function switchTab(tabName) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 탭 컨텐츠 활성화
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');

    currentTab = tabName;

    // 탭별 데이터 로드
    loadTabData(tabName);
}

/**
 * 탭별 데이터 로드
 */
async function loadTabData(tabName) {
    switch (tabName) {
        case 'info':
            await loadGroupDetailInfo();
            break;
        case 'itinerary':
            await loadItinerariesTab();
            break;
        case 'cancel-rules':
            await loadCancelRulesTab();
            break;
        case 'includes':
            await loadIncludesTab();
            break;
        case 'documents':
            await loadDocumentsTab();
            break;
    }
}

/**
 * 단체 데이터 로드
 */
async function loadGroupData() {
    try {
        groupData = await getGroup(groupId);

        document.getElementById('groupName').textContent = groupData.name;
        document.getElementById('breadcrumbName').textContent = groupData.name;

        // 요약 카드 렌더링
        renderSummaryCards();

        // 기본 정보 로드
        await loadGroupDetailInfo();

    } catch (error) {
        console.error('단체 데이터 로드 오류:', error);
        showError('단체 정보를 불러올 수 없습니다: ' + error.message);
    }
}

/**
 * 요약 카드 렌더링
 */
function renderSummaryCards() {
    const summaryDiv = document.getElementById('dashboardSummary');
    summaryDiv.innerHTML = `
        <div class="summary-card">
            <h3>여행 기간</h3>
            <div class="value">${groupData.nights}박 ${groupData.days}일</div>
        </div>
        <div class="summary-card">
            <h3>인원수</h3>
            <div class="value">${groupData.pax}명</div>
        </div>
        <div class="summary-card">
            <h3>총 금액</h3>
            <div class="value">${formatCurrency(groupData.total_price)}</div>
        </div>
        <div class="summary-card">
            <h3>상태</h3>
            <div class="value">${renderStatusBadge(groupData.status)}</div>
        </div>
    `;
}

/**
 * 기본 정보 상세 로드
 */
async function loadGroupDetailInfo() {
    const infoDiv = document.getElementById('groupDetailInfo');
    infoDiv.innerHTML = `
        <table style="width: 100%;">
            <tr>
                <th style="width: 200px; background-color: #f8f9fa;">단체명</th>
                <td>${escapeHtml(groupData.name)}</td>
            </tr>
            <tr>
                <th>출발일</th>
                <td>${formatDate(groupData.start_date, 'YYYY년 MM월 DD일')}</td>
            </tr>
            <tr>
                <th>도착일</th>
                <td>${formatDate(groupData.end_date, 'YYYY년 MM월 DD일')}</td>
            </tr>
            <tr>
                <th>여행 기간</th>
                <td>${groupData.nights}박 ${groupData.days}일 ${groupData.nights_manual || groupData.days_manual ? renderManualBadge(true) : ''}</td>
            </tr>
            <tr>
                <th>인원수</th>
                <td>${groupData.pax}명</td>
            </tr>
            <tr>
                <th>1인당 요금</th>
                <td>${formatCurrency(groupData.price_per_pax)}</td>
            </tr>
            <tr>
                <th>총 금액</th>
                <td>${formatCurrency(groupData.total_price)} ${groupData.total_price_manual ? renderManualBadge(true) : ''}</td>
            </tr>
            <tr>
                <th>계약금</th>
                <td>${formatCurrency(groupData.deposit)}</td>
            </tr>
            <tr>
                <th>잔액</th>
                <td>${formatCurrency(groupData.balance)} ${groupData.balance_manual ? renderManualBadge(true) : ''}</td>
            </tr>
            <tr>
                <th>잔액 완납일</th>
                <td>${groupData.balance_due_date ? formatDate(groupData.balance_due_date, 'YYYY년 MM월 DD일') : '-'} ${groupData.balance_due_date_manual ? renderManualBadge(true) : ''}</td>
            </tr>
            <tr>
                <th>상태</th>
                <td>${renderStatusBadge(groupData.status)}</td>
            </tr>
            <tr>
                <th>생성일</th>
                <td>${formatDateTime(groupData.created_at)}</td>
            </tr>
            <tr>
                <th>최종 수정일</th>
                <td>${formatDateTime(groupData.updated_at)}</td>
            </tr>
        </table>
    `;
}

/**
 * 일정 탭 로드
 */
async function loadItinerariesTab() {
    try {
        const itineraries = await getItineraries(groupId);
        const listDiv = document.getElementById('itineraryList');

        if (itineraries.length === 0) {
            listDiv.innerHTML = '<div class="empty-state"><div class="empty-state-text">등록된 일정이 없습니다.</div></div>';
            return;
        }

        itineraries.sort((a, b) => a.day_no - b.day_no);

        listDiv.innerHTML = itineraries.map(item => `
            <div class="list-item">
                <div class="list-item-content">
                    <strong>${item.day_no}일차</strong> - ${formatDate(item.itinerary_date, 'YYYY-MM-DD')}
                    ${item.location ? `<br><small>📍 ${escapeHtml(item.location)}</small>` : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('일정 로드 오류:', error);
        document.getElementById('itineraryList').innerHTML = '<div class="alert alert-danger">일정을 불러올 수 없습니다.</div>';
    }
}

/**
 * 취소 규정 탭 로드 (T-UI-04)
 */
async function loadCancelRulesTab() {
    try {
        const rules = await getCancelRules(groupId);
        const listDiv = document.getElementById('cancelRulesList');

        if (rules.length === 0) {
            listDiv.innerHTML = '<div class="empty-state"><div class="empty-state-text">등록된 취소 규정이 없습니다.</div></div>';
            return;
        }

        rules.sort((a, b) => b.days_before - a.days_before);

        listDiv.innerHTML = rules.map(rule => `
            <div class="list-item">
                <div class="list-item-content">
                    <strong>출발 ${rule.days_before}일 전</strong> (${formatDate(rule.cancel_date, 'YYYY-MM-DD')})
                    <br><small>위약금: ${rule.penalty_rate}%</small>
                    ${rule.description ? `<br><small>${escapeHtml(rule.description)}</small>` : ''}
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-sm btn-danger" onclick="handleDeleteCancelRule('${rule.id}')">삭제</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('취소 규정 로드 오류:', error);
        document.getElementById('cancelRulesList').innerHTML = '<div class="alert alert-danger">취소 규정을 불러올 수 없습니다.</div>';
    }
}

/**
 * 포함/불포함 탭 로드 (T-UI-05)
 */
async function loadIncludesTab() {
    try {
        const includes = await getIncludes(groupId);
        const listDiv = document.getElementById('includesList');

        const includedItems = includes.filter(item => item.item_type === 'include');
        const excludedItems = includes.filter(item => item.item_type === 'exclude');

        let html = '<h3 style="color: #10B981;">✓ 포함 사항</h3>';
        if (includedItems.length === 0) {
            html += '<p style="color: #999;">포함 항목이 없습니다.</p>';
        } else {
            includedItems.sort((a, b) => a.display_order - b.display_order);
            html += includedItems.map(item => `
                <div class="list-item">
                    <div class="list-item-content">
                        ${escapeHtml(item.description)}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-sm btn-danger" onclick="handleDeleteInclude('${item.id}')">삭제</button>
                    </div>
                </div>
            `).join('');
        }

        html += '<hr style="margin: 30px 0;"><h3 style="color: #EF4444;">✗ 불포함 사항</h3>';
        if (excludedItems.length === 0) {
            html += '<p style="color: #999;">불포함 항목이 없습니다.</p>';
        } else {
            excludedItems.sort((a, b) => a.display_order - b.display_order);
            html += excludedItems.map(item => `
                <div class="list-item">
                    <div class="list-item-content">
                        ${escapeHtml(item.description)}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-sm btn-danger" onclick="handleDeleteInclude('${item.id}')">삭제</button>
                    </div>
                </div>
            `).join('');
        }

        listDiv.innerHTML = html;

    } catch (error) {
        console.error('포함/불포함 로드 오류:', error);
        document.getElementById('includesList').innerHTML = '<div class="alert alert-danger">포함/불포함 항목을 불러올 수 없습니다.</div>';
    }
}

/**
 * 문서 탭 로드 (T-UI-06)
 */
async function loadDocumentsTab() {
    const listDiv = document.getElementById('documentsList');
    listDiv.innerHTML = '<p style="color: #999;">생성된 문서가 없습니다.</p>';
}

/**
 * 상태 변경 (T-UI-07)
 */
async function handleChangeStatus() {
    const statusMap = {
        'estimate': '견적',
        'contract': '계약',
        'confirmed': '확정'
    };

    const currentStatus = groupData.status;
    const statusOptions = ['estimate', 'contract', 'confirmed']
        .filter(s => s !== currentStatus)
        .map(s => `<option value="${s}">${statusMap[s]}</option>`)
        .join('');

    const html = `
        <div style="margin: 20px 0;">
            <label for="newStatus" style="display: block; margin-bottom: 10px; font-weight: bold;">
                현재 상태: ${renderStatusBadge(currentStatus)}
            </label>
            <select id="newStatus" class="form-control">
                <option value="">새 상태 선택</option>
                ${statusOptions}
            </select>
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>상태 변경</h2>
                <span class="modal-close">&times;</span>
            </div>
            <div class="modal-body">${html}</div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-close">취소</button>
                <button class="btn btn-primary" id="btnConfirmStatus">변경</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
    };

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));

    modal.querySelector('#btnConfirmStatus').addEventListener('click', async () => {
        const newStatus = document.getElementById('newStatus').value;
        if (!newStatus) {
            showWarning('새 상태를 선택해주세요.');
            return;
        }

        try {
            await changeGroupStatus(groupId, newStatus);
            showSuccess('상태가 변경되었습니다.');
            closeModal();
            await loadGroupData();
        } catch (error) {
            showError('상태 변경 중 오류가 발생했습니다: ' + error.message);
        }
    });
}

/**
 * 단체 삭제
 */
async function handleDeleteGroup() {
    showConfirm(
        '단체 삭제',
        `"${groupData.name}" 단체를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 모든 데이터가 함께 삭제됩니다.`,
        async () => {
            try {
                await deleteGroup(groupId);
                showSuccess('단체가 삭제되었습니다.');
                setTimeout(() => {
                    window.location.href = '/pages/group_list.html';
                }, 1000);
            } catch (error) {
                showError('단체 삭제 중 오류가 발생했습니다: ' + error.message);
            }
        }
    );
}

/**
 * 취소 규정 추가
 */
async function handleAddCancelRule() {
    const html = `
        <div class="form-group">
            <label class="form-label">출발 전 며칠</label>
            <input type="number" id="days_before" class="form-control" min="0" required />
        </div>
        <div class="form-group">
            <label class="form-label">위약금 비율 (%)</label>
            <input type="number" id="penalty_rate" class="form-control" min="0" max="100" required />
        </div>
        <div class="form-group">
            <label class="form-label">설명 (선택)</label>
            <input type="text" id="description" class="form-control" />
        </div>
    `;

    showInputModal('취소 규정 추가', html, async () => {
        const data = {
            days_before: parseInt(document.getElementById('days_before').value),
            penalty_rate: parseFloat(document.getElementById('penalty_rate').value),
            description: document.getElementById('description').value || null,
        };

        try {
            await createCancelRule(groupId, data);
            showSuccess('취소 규정이 추가되었습니다.');
            await loadCancelRulesTab();
        } catch (error) {
            showError('취소 규정 추가 중 오류가 발생했습니다: ' + error.message);
        }
    });
}

/**
 * 취소 규정 삭제
 */
async function handleDeleteCancelRule(ruleId) {
    showConfirm('삭제 확인', '이 취소 규정을 삭제하시겠습니까?', async () => {
        try {
            await deleteCancelRule(groupId, ruleId);
            showSuccess('취소 규정이 삭제되었습니다.');
            await loadCancelRulesTab();
        } catch (error) {
            showError('삭제 중 오류가 발생했습니다: ' + error.message);
        }
    });
}

/**
 * 포함/불포함 항목 추가
 */
async function handleAddInclude(itemType) {
    const title = itemType === 'include' ? '포함 항목 추가' : '불포함 항목 추가';
    const html = `
        <div class="form-group">
            <label class="form-label">설명</label>
            <textarea id="description" class="form-control" rows="3" required></textarea>
        </div>
    `;

    showInputModal(title, html, async () => {
        const data = {
            item_type: itemType,
            description: document.getElementById('description').value,
        };

        try {
            await createInclude(groupId, data);
            showSuccess('항목이 추가되었습니다.');
            await loadIncludesTab();
        } catch (error) {
            showError('항목 추가 중 오류가 발생했습니다: ' + error.message);
        }
    });
}

/**
 * 포함/불포함 항목 삭제
 */
async function handleDeleteInclude(includeId) {
    showConfirm('삭제 확인', '이 항목을 삭제하시겠습니까?', async () => {
        try {
            await deleteInclude(groupId, includeId);
            showSuccess('항목이 삭제되었습니다.');
            await loadIncludesTab();
        } catch (error) {
            showError('삭제 중 오류가 발생했습니다: ' + error.message);
        }
    });
}

/**
 * 문서 생성 (T-UI-06)
 */
async function handleGenerateDocument(docType) {
    try {
        const docTypeMap = {
            'estimate': '견적서',
            'contract': '계약서',
            'itinerary': '일정표',
            'bundle': '통합 문서'
        };

        showInfo(`${docTypeMap[docType]}를 생성하고 있습니다...`);

        const result = await generateDocument(groupId, docType);

        showSuccess(`${docTypeMap[docType]}가 생성되었습니다.`);

        // 다운로드
        const downloadUrl = getDocumentDownloadUrl(groupId, result.id);
        window.open(downloadUrl, '_blank');

        await loadDocumentsTab();

    } catch (error) {
        // PDF 생성 실패 시 HTML 미리보기로 대체
        if (error.message && error.message.includes('PDF')) {
            showWarning('PDF 생성이 지원되지 않습니다. HTML 미리보기를 엽니다.');
            const previewUrl = `${API_BASE_URL}/groups/${groupId}/documents/preview/${docType}`;
            window.open(previewUrl, '_blank');
        } else {
            showError('문서 생성 중 오류가 발생했습니다: ' + error.message);
        }
    }
}

/**
 * 문서 HTML 미리보기 (PDF 대체)
 */
function handlePreviewDocument(docType) {
    const docTypeMap = {
        'estimate': '견적서',
        'contract': '계약서',
        'itinerary': '일정표',
        'bundle': '통합 문서'
    };

    showInfo(`${docTypeMap[docType]} 미리보기를 엽니다...`);

    const previewUrl = `${API_BASE_URL}/groups/${groupId}/documents/preview/${docType}`;
    window.open(previewUrl, '_blank');
}

/**
 * 입력 모달 표시
 */
function showInputModal(title, bodyHtml, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${escapeHtml(title)}</h2>
                <span class="modal-close">&times;</span>
            </div>
            <div class="modal-body">${bodyHtml}</div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-close">취소</button>
                <button class="btn btn-success modal-confirm">확인</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
    };

    modal.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    modal.querySelector('.modal-confirm').addEventListener('click', () => {
        onConfirm();
        closeModal();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}
