// frontend/js/freetravel-api.js
// 자유여행 예약내역 API 유틸리티

const FreeTravelAPI = {
    baseURL: '/api/freetravel',

    // ==========================================
    // bookings CRUD
    // ==========================================

    async getBookings() {
        const res = await fetch(`${this.baseURL}/bookings`);
        if (!res.ok) throw new Error(`목록 조회 실패: ${res.status}`);
        return res.json();
    },

    async getBooking(id) {
        const res = await fetch(`${this.baseURL}/bookings/${id}`);
        if (!res.ok) throw new Error(`조회 실패: ${res.status}`);
        return res.json();
    },

    async saveBooking({ name, recipient, sender, travel_period, destination, data, sections }) {
        const res = await fetch(`${this.baseURL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, recipient, sender, travel_period, destination, data, sections })
        });
        if (!res.ok) throw new Error(`저장 실패: ${res.status}`);
        return res.json();
    },

    async updateBooking(id, { name, recipient, sender, travel_period, destination, data, sections }) {
        const res = await fetch(`${this.baseURL}/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, recipient, sender, travel_period, destination, data, sections })
        });
        if (!res.ok) throw new Error(`수정 실패: ${res.status}`);
        return res.json();
    },

    async deleteBooking(id) {
        const res = await fetch(`${this.baseURL}/bookings/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`삭제 실패: ${res.status}`);
        return res.json();
    },

    // ==========================================
    // company_defaults
    // ==========================================

    async getCompany() {
        const res = await fetch(`${this.baseURL}/company`);
        if (!res.ok) throw new Error(`회사정보 조회 실패: ${res.status}`);
        return res.json();
    },

    async saveCompany({ name, ceo, address, phone, fax, manager_name, manager_phone, stamp_image }) {
        const res = await fetch(`${this.baseURL}/company`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, ceo, address, phone, fax, manager_name, manager_phone, stamp_image })
        });
        if (!res.ok) throw new Error(`회사정보 저장 실패: ${res.status}`);
        return res.json();
    },

    // ==========================================
    // 미리보기 URL 생성
    // ==========================================

    generatePreviewURL(compressedData) {
        return `preview-free.html?d=${encodeURIComponent(compressedData)}`;
    },

    // LZString 압축 (전역 lz-string 사용)
    compress(data) {
        if (typeof LZString === 'undefined') {
            console.error('LZString이 로드되지 않았습니다');
            return null;
        }
        return LZString.compressToEncodedURIComponent(JSON.stringify(data));
    },

    // LZString】解압
    decompress(compressed) {
        if (typeof LZString === 'undefined') {
            console.error('LZString이 로드되지 않았습니다');
            return null;
        }
        const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
        return decompressed ? JSON.parse(decompressed) : null;
    }
};

// 전역 객체로 노출
window.FreeTravelAPI = FreeTravelAPI;
