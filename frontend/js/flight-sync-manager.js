/**
 * FlightSyncManager - 항공편 데이터 동기화 관리자
 *
 * v2: 서버 DB 기반 (localStorage 완전 제거)
 * 모든 CRUD는 /api/flight-saves API를 통해 서버 DB에 저장
 * → 어떤 PC에서든 동일한 데이터 접근 가능
 */

class FlightSyncManager {
  static API_BASE = '/api/flight-saves';
  static _cache = null;
  static _cacheTime = 0;
  static CACHE_TTL = 5000; // 5초 캐시

  // ========== API 헬퍼 ==========

  static async _fetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    if (!res.ok) {
      let msg = `API 오류: ${res.status}`;
      try { const body = await res.text(); if (body) msg += ' - ' + body.substring(0, 100); } catch (e) {}
      throw new Error(msg);
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('서버 응답이 JSON이 아닙니다');
    }
    return res.json();
  }

  static _invalidateCache() {
    this._cache = null;
    this._cacheTime = 0;
  }

  // ========== CRUD (async) ==========

  /**
   * 전체 항공편 조회
   * @returns {Promise<Array>} 항공편 목록
   */
  static async getFlights() {
    try {
      // 캐시 확인
      if (this._cache && (Date.now() - this._cacheTime) < this.CACHE_TTL) {
        return this._cache;
      }

      // localStorage → 서버 DB 자동 마이그레이션 (1회)
      await this._migrateLocalStorage();

      const rows = await this._fetch(this.API_BASE);
      // data 필드가 전체 항공편 객체 → 펼쳐서 반환
      const flights = rows.map(r => {
        const obj = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return { ...obj, id: r.id, _dbName: r.name, _dbPnr: r.pnr };
      });
      // 날짜순 정렬 (최신순)
      flights.sort((a, b) => {
        const dateA = new Date(a.saveDate || a.updated_at || 0);
        const dateB = new Date(b.saveDate || b.updated_at || 0);
        return dateB - dateA;
      });
      this._cache = flights;
      this._cacheTime = Date.now();
      return flights;
    } catch (error) {
      console.error('항공편 조회 실패:', error);
      // 서버 실패 시 localStorage 폴백 (읽기만)
      try {
        const local = localStorage.getItem('flight_saves_v2');
        if (local) return JSON.parse(local);
      } catch (e) {}
      return [];
    }
  }

  /**
   * localStorage 데이터를 서버 DB로 자동 마이그레이션 (1회만 실행)
   * 마이그레이션 완료 후 localStorage에 플래그 설정
   */
  static async _migrateLocalStorage() {
    try {
      if (localStorage.getItem('flight_saves_migrated')) return;

      const localData = localStorage.getItem('flight_saves_v2');
      if (!localData) {
        localStorage.setItem('flight_saves_migrated', 'true');
        return;
      }

      const items = JSON.parse(localData);
      if (!Array.isArray(items) || items.length === 0) {
        localStorage.setItem('flight_saves_migrated', 'true');
        return;
      }

      console.log(`[FlightSyncManager] localStorage → 서버 DB 마이그레이션 시작 (${items.length}건)`);

      const res = await this._fetch(`${this.API_BASE}/bulk`, {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            name: item.name || null,
            pnr: item.pnr || null,
            ...item
          }))
        })
      });

      console.log(`[FlightSyncManager] 마이그레이션 완료: ${res.success}/${res.total}건`);
      localStorage.setItem('flight_saves_migrated', 'true');
    } catch (error) {
      console.warn('[FlightSyncManager] 마이그레이션 실패 (다음에 재시도):', error);
    }
  }

  /**
   * 동기 버전 (하위 호환용 - 캐시된 데이터 반환)
   * ⚠️ 초기 로드 전에는 빈 배열 반환. 가능하면 getFlights() 사용 권장.
   */
  static getFlightsSync() {
    if (this._cache) return this._cache;
    // 캐시 없으면 비동기 로드 트리거
    if (!this._loadingPromise) {
      this._loadingPromise = this.getFlights().finally(() => { this._loadingPromise = null; });
    }
    // localStorage 폴백으로 즉시 반환 (빈 화면 방지)
    try {
      const local = localStorage.getItem('flight_saves_v2');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
  }

  /**
   * ID로 항공편 조회
   */
  static async getFlightById(id) {
    try {
      const row = await this._fetch(`${this.API_BASE}/${id}`);
      const obj = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      return { ...obj, id: row.id };
    } catch (error) {
      console.error('항공편 조회 실패:', error);
      return null;
    }
  }

  /**
   * 새 항공편 추가
   */
  static async addFlight(flightData) {
    try {
      if (!flightData.id) {
        flightData.id = 'FLIGHT-' + Date.now();
      }
      if (!flightData.saveDate) {
        flightData.saveDate = new Date().toISOString();
      }

      await this._fetch(this.API_BASE, {
        method: 'POST',
        body: JSON.stringify({
          id: flightData.id,
          name: flightData.name || null,
          pnr: flightData.pnr || null,
          data: flightData
        })
      });

      this._invalidateCache();

      // flight_schedules 테이블에도 동기화
      this.syncToFlightSchedules(flightData, 'add');

      // 변경 알림 (같은 탭)
      this._notifyLocal('add', flightData.id);

      return flightData;
    } catch (error) {
      console.error('항공편 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 항공편 수정
   */
  static async updateFlight(id, updates) {
    try {
      const existing = await this.getFlightById(id);
      if (!existing) throw new Error(`항공편을 찾을 수 없음: ${id}`);

      const updated = {
        ...existing,
        ...updates,
        id: id,
        updateDate: new Date().toISOString()
      };

      await this._fetch(`${this.API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: updated.name || null,
          pnr: updated.pnr || null,
          data: updated
        })
      });

      this._invalidateCache();
      this.syncToFlightSchedules(updated, 'update');
      this._notifyLocal('update', id);

      return updated;
    } catch (error) {
      console.error('항공편 수정 실패:', error);
      throw error;
    }
  }

  /**
   * 항공편 삭제
   */
  static async deleteFlight(id) {
    try {
      await this._fetch(`${this.API_BASE}/${id}`, { method: 'DELETE' });
      this._invalidateCache();
      this._notifyLocal('delete', id);
      return true;
    } catch (error) {
      console.error('항공편 삭제 실패:', error);
      throw error;
    }
  }

  // ========== 변경 알림 ==========

  static _changeCallbacks = [];

  static _notifyLocal(eventType, flightId) {
    this._changeCallbacks.forEach(cb => {
      try { cb(eventType, flightId); } catch (e) {}
    });
  }

  static onFlightChange(callback) {
    if (typeof callback !== 'function') throw new Error('콜백은 함수여야 합니다');
    this._changeCallbacks.push(callback);
  }

  // ========== flight_schedules 동기화 ==========

  static async syncToFlightSchedules(flightData, action) {
    try {
      if (!flightData || !flightData.flights || flightData.flights.length === 0) return;

      const pnr = flightData.pnr || null;
      const groupName = flightData.name || null;

      for (const flight of flightData.flights) {
        const departureDate = this.parseFlightDate(flight.date);
        const airline = this.getAirlineName(flight.airline || flight.flightNumber?.split(' ')[0] || '');
        const flightNumber = flight.flightNumber || '';
        const departureAirport = flight.departure || '';
        const arrivalAirport = flight.arrival || '';
        const departureTime = flight.departureTime || '00:00';
        const arrivalTime = flight.arrivalTime || '00:00';
        const passengers = parseInt(flightData.customerInfo?.totalPeople) || 0;

        const body = {
          group_name: groupName,
          airline: airline || 'TBA',
          flight_number: flightNumber,
          departure_date: departureDate || new Date().toISOString().split('T')[0],
          departure_airport: departureAirport || 'TBA',
          departure_time: departureTime,
          arrival_date: departureDate || new Date().toISOString().split('T')[0],
          arrival_airport: arrivalAirport || 'TBA',
          arrival_time: arrivalTime,
          passengers: passengers,
          pnr: pnr,
          source: 'portal'
        };

        const fetchOpts = { headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
        if (action === 'add') {
          await fetch('/api/flight-schedules', { ...fetchOpts, method: 'POST', body: JSON.stringify(body) });
        } else if (action === 'update' && pnr) {
          const checkRes = await fetch(`/api/flight-schedules/check-pnr/${encodeURIComponent(pnr)}`, { credentials: 'include' });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.exists && checkData.schedule) {
              await fetch(`/api/flight-schedules/${checkData.schedule.id}`, { ...fetchOpts, method: 'PUT', body: JSON.stringify(body) });
            }
          }
        }
      }
    } catch (error) {
      console.warn('[FlightSyncManager] flight_schedules 동기화 실패:', error);
    }
  }

  // ========== 형식 변환 (기존과 동일) ==========

  static convertToScheduleFormat(flightSave) {
    try {
      if (!flightSave || !flightSave.flights || flightSave.flights.length === 0) return [];

      const schedules = [];
      const totalFlights = flightSave.flights.length;
      const groupId = `group_${flightSave.id}`;

      flightSave.flights.forEach((flight, index) => {
        const departureDate = this.parseFlightDate(flight.date);
        const airline = this.getAirlineName(flight.airline || flight.flightNumber?.split(' ')[0] || '');

        let segmentType = '경유';
        if (totalFlights === 1) segmentType = '출발';
        else if (index === 0) segmentType = '출발';
        else if (index === totalFlights - 1) segmentType = '도착';

        schedules.push({
          id: `${flightSave.id}-${index}`,
          groupId, segmentOrder: index,
          sourceId: flightSave.id, sourceIndex: index,
          groupName: flightSave.name || '',
          pnr: flightSave.pnr || '',
          flightNumber: flight.flightNumber || '',
          airline,
          departure: this.formatAirport(flight.departure),
          arrival: this.formatAirport(flight.arrival),
          departureDate,
          departureTime: flight.departure?.time || '',
          arrivalDate: departureDate,
          arrivalTime: flight.arrival?.time || '',
          passengers: this.convertPassengers(flightSave.customerInfo),
          status: 'scheduled',
          segmentType
        });
      });

      return schedules;
    } catch (error) {
      console.error('스케줄 형식 변환 실패:', error);
      return [];
    }
  }

  static convertFromScheduleFormat(schedule) {
    try {
      return {
        id: schedule.id || 'FLIGHT-' + Date.now(),
        name: schedule.groupName || '',
        pnr: schedule.pnr || '',
        saveDate: new Date().toISOString(),
        flights: [{
          flightNumber: schedule.flightNumber,
          airline: schedule.airline,
          date: this.formatFlightDate(schedule.departureDate),
          departure: {
            airport: this.extractAirportName(schedule.departure),
            code: this.extractAirportCode(schedule.departure),
            time: schedule.departureTime
          },
          arrival: {
            airport: this.extractAirportName(schedule.arrival),
            code: this.extractAirportCode(schedule.arrival),
            time: schedule.arrivalTime
          }
        }],
        customerInfo: this.convertFromPassengers(schedule.passengers)
      };
    } catch (error) {
      console.error('flight_saves_v2 형식 변환 실패:', error);
      return null;
    }
  }

  // ========== 유틸리티 ==========

  static parseFlightDate(dateStr) {
    if (!dateStr) return '';
    try {
      const match = dateStr.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
      if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    } catch (e) {}
    return dateStr;
  }

  static formatFlightDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      const dow = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      return `${y}.${m}.${d}(${dow})`;
    } catch (e) { return dateStr; }
  }

  static formatAirport(airportObj) {
    if (!airportObj) return '';
    if (typeof airportObj === 'string') return airportObj;
    const code = airportObj.code || '';
    if (code && typeof AirportDatabase !== 'undefined') {
      const info = AirportDatabase.getAirportByCode(code);
      if (info) return `${info.name} (${code})`;
    }
    const name = airportObj.airport || airportObj.name || '';
    if (name && code) return `${name} (${code})`;
    return name || code || '';
  }

  static extractAirportName(str) {
    if (!str) return '';
    const m = str.match(/^(.+?)\s*\(/);
    return m ? m[1].trim() : str;
  }

  static extractAirportCode(str) {
    if (!str) return '';
    const m = str.match(/\(([^)]+)\)/);
    return m ? m[1].trim() : '';
  }

  static getAirlineName(code) {
    const map = {
      KE: '대한항공', OZ: '아시아나항공', LJ: '진에어', TW: '티웨이항공',
      ZE: '이스타항공', BX: '에어부산', RS: '에어서울', RF: '플라이강원',
      YP: '에어프레미아', AA: '아메리칸항공', DL: '델타항공', UA: '유나이티드항공',
      NH: '전일본공수', JL: '일본항공', CA: '중국국제항공', MU: '중국동방항공',
      CZ: '중국남방항공', '7C': '제주항공', PR: '필리핀항공', VN: '베트남항공',
      SQ: '싱가포르항공', TG: '타이항공', CX: '캐세이퍼시픽'
    };
    return map[code] || code || '기타';
  }

  static convertPassengers(customerInfo) {
    if (!customerInfo) return [];
    if (customerInfo.passengers && Array.isArray(customerInfo.passengers) && customerInfo.passengers.length > 0) {
      return customerInfo.passengers.map((p, i) => {
        if (typeof p === 'object' && p.name) return p.name;
        if (typeof p === 'string') return p;
        return `승객 ${i + 1}`;
      });
    }
    const passengers = [];
    if (customerInfo.name) passengers.push(customerInfo.name);
    const total = parseInt(customerInfo.totalPeople) || 0;
    for (let i = passengers.length; i < total && i < 100; i++) passengers.push(`승객 ${i + 1}`);
    return passengers;
  }

  static convertFromPassengers(passengers) {
    if (!passengers || passengers.length === 0) return { name: '', phone: '', totalPeople: '0' };
    const rep = passengers.find(p => p.isRepresentative) || passengers[0];
    return { name: rep.name || '', phone: rep.phone || '', totalPeople: passengers.length.toString() };
  }

  // ========== 백업/복원 ==========

  static async backup() {
    const flights = await this.getFlights();
    return JSON.stringify(flights, null, 2);
  }

  static async restore(jsonStr) {
    try {
      const flights = JSON.parse(jsonStr);
      if (!Array.isArray(flights)) throw new Error('올바른 형식이 아닙니다');
      await this._fetch(`${this.API_BASE}/bulk`, {
        method: 'POST',
        body: JSON.stringify({ items: flights })
      });
      this._invalidateCache();
      this._notifyLocal('restore', null);
      return true;
    } catch (error) { throw error; }
  }

  static async clear() {
    const flights = await this.getFlights();
    for (const f of flights) {
      await this._fetch(`${this.API_BASE}/${f.id}`, { method: 'DELETE' });
    }
    this._invalidateCache();
    this._notifyLocal('clear', null);
  }

  static async getStats() {
    const flights = await this.getFlights();
    const stats = { total: flights.length, byAirline: {}, byMonth: {}, totalPassengers: 0 };
    flights.forEach(f => {
      if (f.flights) {
        f.flights.forEach(fl => {
          const airline = fl.airline || '기타';
          stats.byAirline[airline] = (stats.byAirline[airline] || 0) + 1;
          const date = this.parseFlightDate(fl.date);
          if (date) {
            const month = date.substring(0, 7);
            stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
          }
        });
      }
      const pax = parseInt(f.customerInfo?.totalPeople) || 0;
      stats.totalPassengers += pax;
    });
    return stats;
  }

  // ========== 마이그레이션: localStorage → 서버 DB ==========

  static async migrateFromLocalStorage() {
    const OLD_KEY = 'flight_saves_v2';
    const raw = localStorage.getItem(OLD_KEY);
    if (!raw) return { migrated: 0, message: 'localStorage에 데이터 없음' };

    try {
      const items = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0) return { migrated: 0 };

      const result = await this._fetch(`${this.API_BASE}/bulk`, {
        method: 'POST',
        body: JSON.stringify({ items })
      });

      // 이관 성공 시 localStorage 정리
      if (result.success > 0) {
        localStorage.removeItem(OLD_KEY);
        localStorage.removeItem('flight_sync_event');
      }

      this._invalidateCache();
      return { migrated: result.success, total: items.length };
    } catch (error) {
      console.error('마이그레이션 실패:', error);
      throw error;
    }
  }
}

// 전역 노출
window.FlightSyncManager = FlightSyncManager;
