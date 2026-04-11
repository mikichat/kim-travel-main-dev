const { showConfirmModal } = window;

/**
 * StorageManager - 서버 DB 전용 데이터 관리
 *
 * 모든 데이터는 서버 DB에만 저장. localStorage 사용하지 않음.
 */

class StorageManager {
  /**
   * 항공편 데이터 저장 → 서버 DB (flight_saves + air_bookings)
   */
  static async saveFlightData(flightData) {
    try {
      if (!flightData.id) {
        flightData.id = 'FLIGHT-' + Date.now();
      }
      flightData.saveDate = new Date().toISOString();

      // 중복 PNR 체크
      if (flightData.pnr) {
        const flights = await this.getFlightList();
        const existing = flights.find((f) => f.pnr === flightData.pnr);
        if (existing) {
          const overwrite = await showConfirmModal(
            '중복 예약번호',
            `동일한 예약번호(${flightData.pnr})가 이미 존재합니다.\n덮어쓰시겠습니까?`
          );
          if (!overwrite) {
            return { success: false, message: '저장이 취소되었습니다.' };
          }
        }
      }

      // 서버 DB에 저장 (flight_saves + air_bookings 동시 저장)
      const res = await fetch('/api/flight-saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: flightData.id,
          name: flightData.name || null,
          pnr: flightData.pnr || null,
          data: flightData,
        }),
      });

      if (!res.ok) throw new Error('서버 저장 실패: ' + res.status);

      return {
        success: true,
        id: flightData.id,
        message: '항공편 정보가 저장되었습니다.',
      };
    } catch (error) {
      console.error('항공편 저장 오류:', error);
      return { success: false, message: '저장 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 모든 항공편 목록 조회 (서버 DB에서만)
   */
  static async getFlightList() {
    try {
      const res = await fetch('/api/flight-saves', { credentials: 'include' });
      if (!res.ok) throw new Error('서버 응답 오류: ' + res.status);
      const rows = await res.json();
      const flights = rows.map(r => {
        const obj = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return { ...obj, id: r.id, _source: r.source || 'portal' };
      });
      flights.sort((a, b) => new Date(b.saveDate || 0) - new Date(a.saveDate || 0));
      return flights;
    } catch (error) {
      console.error('항공편 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * ID로 특정 항공편 조회
   */
  static async getFlightById(id) {
    try {
      const res = await fetch(`/api/flight-saves/${encodeURIComponent(id)}`, { credentials: 'include' });
      if (!res.ok) return null;
      const row = await res.json();
      const obj = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      return { ...obj, id: row.id };
    } catch {
      return null;
    }
  }

  /**
   * ID로 항공편 삭제 (서버 DB에서)
   */
  static async deleteFlightById(id) {
    try {
      const res = await fetch(`/api/flight-saves/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return res.ok;
    } catch (error) {
      console.error('항공편 삭제 오류:', error);
      return false;
    }
  }

  /**
   * 버스 예약 데이터 저장
   */
  static async saveBusReservation(busData) {
    try {
      if (!busData.id) {
        busData.id = 'BUS-' + Date.now();
      }
      busData.saveDate = new Date().toISOString();

      const res = await fetch('/api/bus-reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: busData.id, data: busData }),
      });
      if (!res.ok) throw new Error('서버 응답 오류: ' + res.status);
      return { success: true, id: busData.id };
    } catch (error) {
      console.error('버스 예약 저장 오류:', error);
      return { success: false, message: '저장 실패' };
    }
  }

  /**
   * 버스 예약 목록 조회
   */
  static async getBusReservationList() {
    try {
      const res = await fetch('/api/bus-reservations', { credentials: 'include' });
      if (!res.ok) throw new Error('서버 응답 오류: ' + res.status);
      const rows = await res.json();
      const reservations = rows.map((r) =>
        typeof r.data === 'string' ? JSON.parse(r.data) : r.data
      );
      if (!Array.isArray(reservations)) return [];
      return reservations.sort((a, b) => new Date(b.saveDate) - new Date(a.saveDate));
    } catch (error) {
      console.error('버스 예약 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 안내문 저장
   */
  static async saveNotice(noticeData) {
    try {
      if (!noticeData.id) {
        noticeData.id = 'NOTICE-' + Date.now();
      }
      noticeData.saveDate = new Date().toISOString();

      const res = await fetch('/api/saved-notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: noticeData.id, data: noticeData }),
      });
      if (!res.ok) throw new Error('서버 응답 오류: ' + res.status);
      return { success: true, id: noticeData.id };
    } catch (error) {
      console.error('안내문 저장 오류:', error);
      return { success: false, message: '저장 실패' };
    }
  }

  /**
   * 안내문 목록 조회
   */
  static async getNoticeList() {
    try {
      const res = await fetch('/api/saved-notices', { credentials: 'include' });
      if (!res.ok) throw new Error('서버 응답 오류: ' + res.status);
      const rows = await res.json();
      const notices = rows.map((r) =>
        typeof r.data === 'string' ? JSON.parse(r.data) : r.data
      );
      if (!Array.isArray(notices)) return [];
      return notices.sort((a, b) => new Date(b.saveDate) - new Date(a.saveDate));
    } catch (error) {
      console.error('안내문 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 모든 데이터 내보내기 (JSON 파일 다운로드)
   */
  static async exportAllData() {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        flights: await this.getFlightList(),
        busReservations: await this.getBusReservationList(),
        notices: await this.getNoticeList(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      link.download = `air1-backup-${today}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      return { success: true, message: '데이터가 내보내기되었습니다.' };
    } catch (error) {
      console.error('데이터 내보내기 오류:', error);
      return { success: false, message: '내보내기에 실패했습니다.' };
    }
  }

  /**
   * JSON 파일에서 데이터 가져오기
   */
  static async importData(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.version) {
        return { success: false, message: '유효하지 않은 백업 파일입니다.' };
      }

      // 서버 DB에 일괄 저장
      let count = 0;
      if (importData.flights && Array.isArray(importData.flights)) {
        const res = await fetch('/api/flight-saves/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ items: importData.flights }),
        });
        if (res.ok) {
          const result = await res.json();
          count = result.success || 0;
        }
      }

      return {
        success: true,
        message: `데이터 가져오기 완료! 항공편 ${count}개를 가져왔습니다.`,
      };
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
      return { success: false, message: '가져오기에 실패했습니다.' };
    }
  }
}

// 전역 접근
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}

export { StorageManager };
