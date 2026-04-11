/**
 * API 호출 유틸리티
 *
 * FastAPI 백엔드와 통신하는 공통 함수들
 */

// API 기본 URL
const API_BASE_URL = '/api';

/**
 * HTTP 요청 헬퍼 함수
 */
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, mergedOptions);

        // 응답이 성공적이지 않을 경우
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new APIError(
                errorData.message || `HTTP ${response.status}`,
                response.status,
                errorData
            );
        }

        // 204 No Content 처리
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }
        throw new APIError('네트워크 오류가 발생했습니다.', 0, { originalError: error });
    }
}

/**
 * 커스텀 API 에러 클래스
 */
class APIError extends Error {
    constructor(message, status, details = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
}

// ============================================
// 단체 관리 API
// ============================================

/**
 * 단체 목록 조회
 */
async function getGroups(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.name) queryParams.append('name', params.name);
    if (params.status) queryParams.append('status', params.status);
    if (params.start_date_from) queryParams.append('start_date_from', params.start_date_from);
    if (params.start_date_to) queryParams.append('start_date_to', params.start_date_to);

    const url = `${API_BASE_URL}/groups${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await apiRequest(url);
}

/**
 * 단체 상세 조회
 */
async function getGroup(groupId) {
    const url = `${API_BASE_URL}/groups/${groupId}`;
    return await apiRequest(url);
}

/**
 * 단체 생성
 */
async function createGroup(data) {
    const url = `${API_BASE_URL}/groups`;
    return await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 단체 수정
 */
async function updateGroup(groupId, data) {
    const url = `${API_BASE_URL}/groups/${groupId}`;
    return await apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 단체 삭제
 */
async function deleteGroup(groupId) {
    const url = `${API_BASE_URL}/groups/${groupId}`;
    return await apiRequest(url, {
        method: 'DELETE',
    });
}

/**
 * 단체 상태 변경
 */
async function changeGroupStatus(groupId, newStatus) {
    const url = `${API_BASE_URL}/groups/${groupId}/status`;
    return await apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
    });
}

/**
 * 단체 재계산
 */
async function recalculateGroup(groupId, params = {}) {
    const url = `${API_BASE_URL}/groups/${groupId}/recalculate`;
    return await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(params),
    });
}

// ============================================
// 일정 관리 API
// ============================================

/**
 * 일정 목록 조회
 */
async function getItineraries(groupId) {
    const url = `${API_BASE_URL}/groups/${groupId}/itineraries`;
    return await apiRequest(url);
}

/**
 * 일정 상세 조회
 */
async function getItinerary(groupId, itineraryId) {
    const url = `${API_BASE_URL}/groups/${groupId}/itineraries/${itineraryId}`;
    return await apiRequest(url);
}

/**
 * 일정 생성
 */
async function createItinerary(groupId, data) {
    const url = `${API_BASE_URL}/groups/${groupId}/itineraries`;
    return await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 일정 수정
 */
async function updateItinerary(groupId, itineraryId, data) {
    const url = `${API_BASE_URL}/groups/${groupId}/itineraries/${itineraryId}`;
    return await apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 일정 삭제
 */
async function deleteItinerary(groupId, itineraryId) {
    const url = `${API_BASE_URL}/groups/${groupId}/itineraries/${itineraryId}`;
    return await apiRequest(url, {
        method: 'DELETE',
    });
}

// ============================================
// 취소 규정 관리 API
// ============================================

/**
 * 취소 규정 목록 조회
 */
async function getCancelRules(groupId) {
    const url = `${API_BASE_URL}/groups/${groupId}/cancel-rules`;
    return await apiRequest(url);
}

/**
 * 취소 규정 생성
 */
async function createCancelRule(groupId, data) {
    const url = `${API_BASE_URL}/groups/${groupId}/cancel-rules`;
    return await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 취소 규정 수정
 */
async function updateCancelRule(groupId, ruleId, data) {
    const url = `${API_BASE_URL}/groups/${groupId}/cancel-rules/${ruleId}`;
    return await apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 취소 규정 삭제
 */
async function deleteCancelRule(groupId, ruleId) {
    const url = `${API_BASE_URL}/groups/${groupId}/cancel-rules/${ruleId}`;
    return await apiRequest(url, {
        method: 'DELETE',
    });
}

// ============================================
// 포함/불포함 항목 관리 API
// ============================================

/**
 * 포함/불포함 항목 목록 조회
 */
async function getIncludes(groupId) {
    const url = `${API_BASE_URL}/groups/${groupId}/includes`;
    return await apiRequest(url);
}

/**
 * 포함/불포함 항목 생성
 */
async function createInclude(groupId, data) {
    const url = `${API_BASE_URL}/groups/${groupId}/includes`;
    return await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 포함/불포함 항목 수정
 */
async function updateInclude(groupId, includeId, data) {
    const url = `${API_BASE_URL}/groups/${groupId}/includes/${includeId}`;
    return await apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 포함/불포함 항목 삭제
 */
async function deleteInclude(groupId, includeId) {
    const url = `${API_BASE_URL}/groups/${groupId}/includes/${includeId}`;
    return await apiRequest(url, {
        method: 'DELETE',
    });
}

// ============================================
// 문서 생성 API
// ============================================

/**
 * 문서 생성
 */
async function generateDocument(groupId, documentType) {
    const url = `${API_BASE_URL}/groups/${groupId}/documents/generate`;
    return await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify({ document_type: documentType }),
    });
}

/**
 * 문서 다운로드 URL 생성
 */
function getDocumentDownloadUrl(groupId, documentId) {
    return `${API_BASE_URL}/groups/${groupId}/documents/${documentId}/download`;
}

/**
 * 문서 목록 조회
 */
async function getDocuments(groupId) {
    const url = `${API_BASE_URL}/groups/${groupId}/documents`;
    return await apiRequest(url);
}
