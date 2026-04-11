/**
 * 일정 관리 화면
 */

let groupId = null;
let groupData = null;
let itineraries = [];
let editingItinerary = null; // 수정 중인 일정 ID

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    groupId = getUrlParameter('group_id');

    if (!groupId) {
        showError('단체 ID가 없습니다.');
        setTimeout(() => {
            window.location.href = '/pages/group_list.html';
        }, 2000);
        return;
    }

    loadGroupInfo();
    loadItineraries();
    setupEventListeners();
});

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 일정 추가 버튼
    document.getElementById('btnAddItinerary').addEventListener('click', () => {
        openItineraryModal();
    });

    // 단체 정보로 돌아가기
    document.getElementById('btnBackToGroup').addEventListener('click', () => {
        window.location.href = `/pages/group_form.html?mode=edit&id=${groupId}`;
    });

    // 모달 닫기
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeItineraryModal);
    });

    // 모달 배경 클릭 시 닫기
    document.getElementById('itineraryModal').addEventListener('click', (e) => {
        if (e.target.id === 'itineraryModal') {
            closeItineraryModal();
        }
    });

    // 일정 저장 버튼
    document.getElementById('btnSaveItinerary').addEventListener('click', handleSaveItinerary);
}

/**
 * 단체 정보 로드
 */
async function loadGroupInfo() {
    try {
        groupData = await getGroup(groupId);

        document.getElementById('groupName').textContent = groupData.name;
        document.getElementById('groupInfoContent').innerHTML = `
            <div class="d-flex gap-20">
                <div><strong>단체명:</strong> ${escapeHtml(groupData.name)}</div>
                <div><strong>출발일:</strong> ${formatDate(groupData.start_date, 'YYYY-MM-DD')}</div>
                <div><strong>도착일:</strong> ${formatDate(groupData.end_date, 'YYYY-MM-DD')}</div>
                <div><strong>기간:</strong> ${groupData.nights}박 ${groupData.days}일</div>
                <div><strong>인원:</strong> ${groupData.pax}명</div>
            </div>
        `;

    } catch (error) {
        console.error('단체 정보 로드 오류:', error);
        showError('단체 정보를 불러올 수 없습니다: ' + error.message);
    }
}

/**
 * 일정 목록 로드
 */
async function loadItineraries() {
    try {
        const listDiv = document.getElementById('itineraryList');
        listDiv.innerHTML = `
            <div class="loading show">
                <div class="spinner"></div>
                <p>일정을 불러오는 중...</p>
            </div>
        `;

        itineraries = await getItineraries(groupId);

        // 일차 순으로 정렬
        itineraries.sort((a, b) => a.day_no - b.day_no);

        renderItineraryList();

        document.getElementById('totalInfo').textContent = `총 ${itineraries.length}개 일정`;

    } catch (error) {
        console.error('일정 목록 로드 오류:', error);
        document.getElementById('itineraryList').innerHTML = `
            <div class="empty-itinerary">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">일정을 불러올 수 없습니다.</div>
                <div class="empty-state-text text-muted">${escapeHtml(error.message)}</div>
            </div>
        `;
        showError('일정을 불러올 수 없습니다: ' + error.message);
    }
}

/**
 * 일정 목록 렌더링
 */
function renderItineraryList() {
    const listDiv = document.getElementById('itineraryList');

    if (itineraries.length === 0) {
        listDiv.innerHTML = `
            <div class="empty-itinerary">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-text">등록된 일정이 없습니다.</div>
                <div class="empty-state-text text-muted">상단의 "+ 일정 추가" 버튼을 클릭하여 일정을 추가하세요.</div>
            </div>
        `;
        return;
    }

    listDiv.innerHTML = '';

    itineraries.forEach(itinerary => {
        const item = createItineraryItem(itinerary);
        listDiv.appendChild(item);
    });
}

/**
 * 일정 아이템 생성
 */
function createItineraryItem(itinerary) {
    const div = document.createElement('div');
    div.className = 'itinerary-item';

    const dateText = itinerary.itinerary_date
        ? formatDate(itinerary.itinerary_date, 'YYYY-MM-DD')
        : '-';

    div.innerHTML = `
        <div class="itinerary-header">
            <div class="itinerary-day">${itinerary.day_no}일차</div>
            <div class="itinerary-date">${dateText}</div>
        </div>
        <div class="itinerary-body">
            ${itinerary.location ? `
                <div class="itinerary-field">
                    <span class="itinerary-label">📍 장소:</span>
                    <span class="itinerary-value"><strong>${escapeHtml(itinerary.location)}</strong></span>
                </div>
            ` : ''}
            ${itinerary.transport ? `
                <div class="itinerary-field">
                    <span class="itinerary-label">🚌 교통:</span>
                    <span class="itinerary-value">${escapeHtml(itinerary.transport)}</span>
                </div>
            ` : ''}
            ${itinerary.time ? `
                <div class="itinerary-field">
                    <span class="itinerary-label">🕐 시간:</span>
                    <span class="itinerary-value">${escapeHtml(itinerary.time)}</span>
                </div>
            ` : ''}
            ${itinerary.schedule ? `
                <div class="itinerary-field">
                    <span class="itinerary-label">📋 일정:</span>
                    <div class="itinerary-value" style="white-space: pre-wrap; margin-left: 80px;">${escapeHtml(itinerary.schedule)}</div>
                </div>
            ` : ''}
            ${itinerary.meals ? `
                <div class="itinerary-field">
                    <span class="itinerary-label">🍽️ 식사:</span>
                    <span class="itinerary-value">${escapeHtml(itinerary.meals)}</span>
                </div>
            ` : ''}
            ${itinerary.accommodation ? `
                <div class="itinerary-field">
                    <span class="itinerary-label">🏨 숙박:</span>
                    <span class="itinerary-value">${escapeHtml(itinerary.accommodation)}</span>
                </div>
            ` : ''}
            ${!itinerary.location && !itinerary.transport && !itinerary.time && !itinerary.schedule && !itinerary.meals && !itinerary.accommodation ? `
                <div style="text-align: center; color: #9CA3AF; padding: 20px;">
                    상세 일정이 입력되지 않았습니다.
                </div>
            ` : ''}
        </div>
        <div class="itinerary-actions">
            <button class="btn btn-sm btn-primary btn-edit" data-id="${itinerary.id}">수정</button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${itinerary.id}">삭제</button>
        </div>
    `;

    // 수정 버튼
    div.querySelector('.btn-edit').addEventListener('click', () => {
        openItineraryModal(itinerary);
    });

    // 삭제 버튼
    div.querySelector('.btn-delete').addEventListener('click', () => {
        handleDeleteItinerary(itinerary.id);
    });

    return div;
}

/**
 * 일정 모달 열기
 */
function openItineraryModal(itinerary = null) {
    editingItinerary = itinerary;

    if (itinerary) {
        // 수정 모드
        document.getElementById('modalTitle').textContent = '일정 수정';
        document.getElementById('day_no').value = itinerary.day_no || '';
        document.getElementById('itinerary_date').value = itinerary.itinerary_date || '';
        document.getElementById('location').value = itinerary.location || '';
        document.getElementById('transport').value = itinerary.transport || '';
        document.getElementById('time').value = itinerary.time || '';
        document.getElementById('schedule').value = itinerary.schedule || '';
        document.getElementById('meals').value = itinerary.meals || '';
        document.getElementById('accommodation').value = itinerary.accommodation || '';
    } else {
        // 추가 모드
        document.getElementById('modalTitle').textContent = '일정 추가';
        document.getElementById('itineraryForm').reset();
    }

    document.getElementById('itineraryModal').classList.add('show');
}

/**
 * 일정 모달 닫기
 */
function closeItineraryModal() {
    document.getElementById('itineraryModal').classList.remove('show');
    editingItinerary = null;
}

/**
 * 일정 저장
 */
async function handleSaveItinerary() {
    try {
        const formData = {
            day_no: document.getElementById('day_no').value ? parseInt(document.getElementById('day_no').value) : null,
            itinerary_date: document.getElementById('itinerary_date').value || null,
            location: document.getElementById('location').value || null,
            transport: document.getElementById('transport').value || null,
            time: document.getElementById('time').value || null,
            schedule: document.getElementById('schedule').value || null,
            meals: document.getElementById('meals').value || null,
            accommodation: document.getElementById('accommodation').value || null,
        };

        // null 값 제거
        Object.keys(formData).forEach(key => {
            if (formData[key] === null || formData[key] === '') {
                delete formData[key];
            }
        });

        if (editingItinerary) {
            // 수정
            await updateItinerary(groupId, editingItinerary.id, formData);
            showSuccess('일정이 수정되었습니다.');
        } else {
            // 추가
            await createItinerary(groupId, formData);
            showSuccess('일정이 추가되었습니다.');
        }

        closeItineraryModal();
        await loadItineraries();

    } catch (error) {
        console.error('일정 저장 오류:', error);
        showError('일정 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 일정 삭제
 */
async function handleDeleteItinerary(itineraryId) {
    showConfirm(
        '일정 삭제',
        '이 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
        async () => {
            try {
                await deleteItinerary(groupId, itineraryId);
                showSuccess('일정이 삭제되었습니다.');
                await loadItineraries();
            } catch (error) {
                console.error('일정 삭제 오류:', error);
                showError('일정 삭제 중 오류가 발생했습니다: ' + error.message);
            }
        }
    );
}
