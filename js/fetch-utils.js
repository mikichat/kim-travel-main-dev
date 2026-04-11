// fetchJSON: fetch() boilerplate 통합 유틸
// <script src="js/fetch-utils.js"> 로 로드, window.fetchJSON 전역 함수

/**
 * JSON API 호출 유틸. response.ok 체크 + 에러 메시지 추출 + JSON 파싱을 한 줄로.
 * @param {string} url - 요청 URL
 * @param {RequestInit} [options={}] - fetch options (method, body, headers 등)
 * @returns {Promise<any>} 파싱된 JSON 데이터 (204면 null)
 * @throws {Error} response.ok가 false이거나 네트워크 오류 시
 */
async function fetchJSON(url, options = {}) {
  const { headers, ...rest } = options;
  const response = await fetch(url, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      msg = body.error || msg;
    } catch (_e) {
      /* ignore parse error */
    }
    throw new Error(msg);
  }
  if (response.status === 204) return null;
  return response.json();
}

// 브라우저 환경: window 전역
if (typeof window !== 'undefined') {
  window.fetchJSON = fetchJSON;
}

// Node/테스트 환경: module.exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fetchJSON };
}
