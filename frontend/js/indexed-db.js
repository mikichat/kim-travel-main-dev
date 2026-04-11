/**
 * TravelAgencyDB - IndexedDB 관리자
 *
 * 목적: 로컬스토리지의 백업 저장소로 활용 (이중 저장)
 */
class TravelAgencyDB {
  static DB_NAME = 'TravelAgencyDB';
  static DB_VERSION = 1;
  static STORE_NAME = 'backups';

  /**
   * DB 연결 정보
   */
  static get dbPromise() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'id',
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  /**
   * 백업 저장 (Local Storage 스냅샷 저장)
   */
  static async saveBackup(backupData) {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);

      // 백업 객체 (TRD 3.3 Specs 준수)
      const backupItem = {
        id: backupData.timestamp, // Use timestamp as ID
        timestamp: backupData.timestamp,
        data: backupData.data,
        note: backupData.note || 'Auto Backup',
      };

      await new Promise((resolve, reject) => {
        const req = store.put(backupItem);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      // 오래된 백업 삭제 (최근 5개만 유지 - PRD 2.9 Specs)
      await this.cleanupOldBackups();

      return true;
    } catch (error) {
      console.error('❌ IndexedDB 저장 실패:', error);
      return false;
    }
  }

  /**
   * 오래된 백업 정리
   */
  static async cleanupOldBackups() {
    const db = await this.dbPromise;
    const tx = db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    const index = store.index('timestamp');

    const request = index.getAllKeys();

    return new Promise((resolve) => {
      request.onsuccess = async () => {
        const keys = request.result;
        if (keys.length > 5) {
          // Max 5 backups
          // Sort keys (timestamps) ascending -> oldest first
          keys.sort((a, b) => a - b);
          const keysToDelete = keys.slice(0, keys.length - 5);

          for (const key of keysToDelete) {
            store.delete(key);
          }
        }
        resolve();
      };
    });
  }

  /**
   * 전체 백업 목록 조회
   */
  static async getAllBackups() {
    const db = await this.dbPromise;
    const tx = db.transaction(this.STORE_NAME, 'readonly');
    const store = tx.objectStore(this.STORE_NAME);

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });
  }

  /**
   * 특정 백업 로드
   */
  static async getBackup(id) {
    const db = await this.dbPromise;
    const tx = db.transaction(this.STORE_NAME, 'readonly');
    const store = tx.objectStore(this.STORE_NAME);

    return new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
    });
  }
}

// 전역 공개
window.TravelAgencyDB = TravelAgencyDB;
