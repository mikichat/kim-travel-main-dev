/**
 * 자동 백업 시스템
 *
 * 기능:
 * 1. localStorage 데이터 자동 백업
 * 2. 백업 스케줄링 (매일 자정)
 * 3. 최대 5개 백업 보관
 * 4. 백업 복원 기능
 * 5. 유효성 검사 및 데이터 검증
 */

class AutoBackup {
  static BACKUP_KEY = 'auto_backups';
  static MAX_BACKUPS = 5; // PRD 2.9: 최근 5개 유지
  static BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24시간
  static _backupTimeout = null;
  static _backupInterval = null;
  static BACKUP_VERSION = '2.0'; // 백업 파일 버전
  static APP_NAME = '여행사 관리 시스템';

  // 백업에 포함되는 데이터 키와 설명
  static DATA_KEYS = {
    'group-roster-data': { name: '단체명단', required: false },
    customers: { name: '고객', required: false },
    products: { name: '상품', required: false },
    bookings: { name: '예약', required: false },
    todos: { name: '할일', required: false },
    notifications: { name: '알림', required: false },
  };

  /**
   * 백업 초기화 및 스케줄 시작
   */
  static initialize() {
    // 페이지 로드 시 백업 필요 여부 확인
    this.checkAndBackup();

    // 매일 자정에 자동 백업
    this.scheduleBackup();

    // 페이지 종료 전 백업 (선택사항)
    window.addEventListener('beforeunload', () => {
      const lastBackup = this.getLastBackupTime();
      const now = Date.now();

      // 마지막 백업이 6시간 이상 지났으면 백업
      if (!lastBackup || now - lastBackup > 6 * 60 * 60 * 1000) {
        this.createBackup();
      }
    });
  }

  /**
   * 백업 필요 여부 확인 후 실행
   */
  static checkAndBackup() {
    const lastBackup = this.getLastBackupTime();
    const now = Date.now();

    if (!lastBackup || now - lastBackup >= this.BACKUP_INTERVAL) {
      this.createBackup();
    }
  }

  /**
   * 백업 스케줄링
   */
  static scheduleBackup() {
    // 다음 자정까지 남은 시간 계산
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow - now;

    // 기존 타이머 정리
    if (this._backupTimeout) clearTimeout(this._backupTimeout);
    if (this._backupInterval) clearInterval(this._backupInterval);

    // 자정에 백업 실행
    this._backupTimeout = setTimeout(() => {
      this.createBackup();
      // 그 다음부터는 24시간마다 실행
      this._backupInterval = setInterval(() => {
        this.createBackup();
      }, this.BACKUP_INTERVAL);
    }, timeUntilMidnight);
  }

  /**
   * 백업 생성
   */
  static createBackup() {
    try {
      // 데이터 수집 및 통계
      const data = {};
      const stats = {};

      Object.keys(this.DATA_KEYS).forEach((key) => {
        const value = localStorage.getItem(key);
        data[key] = value;

        // 데이터 통계 수집
        if (value) {
          try {
            const parsed = JSON.parse(value);
            stats[key] = Array.isArray(parsed) ? parsed.length : 1;
          } catch {
            stats[key] = value ? 1 : 0;
          }
        } else {
          stats[key] = 0;
        }
      });

      const backup = {
        // 메타데이터
        version: this.BACKUP_VERSION,
        appName: this.APP_NAME,
        timestamp: Date.now(),
        date: new Date().toISOString(),

        // 데이터 통계 (복원 전 미리보기용)
        stats: stats,

        // 실제 데이터
        data: data,

        // 체크섬 (데이터 무결성 검증용)
        checksum: this.generateChecksum(data),

        size: 0,
      };

      // 백업 크기 계산
      backup.size = new Blob([JSON.stringify(backup.data)]).size;

      // 기존 백업 목록 가져오기
      const backups = this.getBackups();

      // 새 백업 추가
      backups.push(backup);

      // 오래된 백업 삭제 (최대 개수 유지)
      while (backups.length > this.MAX_BACKUPS) {
        backups.shift();
      }

      // 백업 저장 (LocalStorage)
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));

      // 이중 저장 (IndexedDB)
      if (window.TravelAgencyDB) {
        TravelAgencyDB.saveBackup(backup);
      }

      // 백업 완료 알림 (선택사항)
      this.showBackupNotification(backup);

      return backup;
    } catch (error) {
      console.error('❌ 백업 생성 실패:', error);
      return null;
    }
  }

  /**
   * 백업 목록 가져오기
   */
  static getBackups() {
    try {
      const data = localStorage.getItem(this.BACKUP_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('백업 목록 로드 실패:', error);
      return [];
    }
  }

  /**
   * 마지막 백업 시간 가져오기
   */
  static getLastBackupTime() {
    const backups = this.getBackups();
    return backups.length > 0 ? backups[backups.length - 1].timestamp : null;
  }

  /**
   * 백업 복원
   */
  static async restoreBackup(index) {
    try {
      const backups = this.getBackups();

      if (index < 0 || index >= backups.length) {
        throw new Error('잘못된 백업 인덱스');
      }

      const backup = backups[index];

      if (
        !(await showConfirmModal(
          '백업 복원',
          `${new Date(backup.timestamp).toLocaleString()} 백업으로 복원하시겠습니까?\n\n현재 데이터가 덮어씌워집니다!`,
          { danger: true }
        ))
      ) {
        return false;
      }

      // 데이터 복원
      Object.keys(backup.data).forEach((key) => {
        if (backup.data[key]) {
          localStorage.setItem(key, backup.data[key]);
        }
      });

      showToast('백업이 복원되었습니다. 페이지를 새로고침합니다.', 'success');

      // 페이지 새로고침
      window.location.reload();

      return true;
    } catch (error) {
      showToast('백업 복원 중 오류가 발생했습니다: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * 백업 삭제
   */
  static async deleteBackup(index) {
    try {
      const backups = this.getBackups();

      if (index < 0 || index >= backups.length) {
        throw new Error('잘못된 백업 인덱스');
      }

      const backup = backups[index];

      if (
        !(await showConfirmModal(
          '백업 삭제',
          `${new Date(backup.timestamp).toLocaleString()} 백업을 삭제하시겠습니까?`,
          { danger: true }
        ))
      ) {
        return false;
      }

      backups.splice(index, 1);
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));

      return true;
    } catch (error) {
      console.error('백업 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 백업 파일로 다운로드 (개선된 버전)
   */
  static downloadBackup(index) {
    try {
      const backups = this.getBackups();

      if (index < 0 || index >= backups.length) {
        throw new Error('잘못된 백업 인덱스');
      }

      const backup = backups[index];

      // 메타데이터 보강
      const exportBackup = {
        ...backup,
        version: backup.version || this.BACKUP_VERSION,
        appName: backup.appName || this.APP_NAME,
        exportedAt: new Date().toISOString(),
      };

      // 통계 정보가 없으면 생성
      if (!exportBackup.stats && backup.data) {
        exportBackup.stats = {};
        Object.keys(backup.data).forEach((key) => {
          if (backup.data[key]) {
            try {
              const parsed = JSON.parse(backup.data[key]);
              exportBackup.stats[key] = Array.isArray(parsed)
                ? parsed.length
                : 1;
            } catch {
              exportBackup.stats[key] = 1;
            }
          }
        });
      }

      // 체크섬이 없으면 생성
      if (!exportBackup.checksum && backup.data) {
        exportBackup.checksum = this.generateChecksum(backup.data);
      }

      const date = new Date(backup.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '');
      const filename = `travel-backup-${dateStr}-${timeStr}.json`;

      const blob = new Blob([JSON.stringify(exportBackup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      showToast('백업 다운로드 실패: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * 모든 백업을 하나의 파일로 다운로드
   */
  static downloadAllBackups() {
    try {
      const backups = this.getBackups();

      if (backups.length === 0) {
        showToast('다운로드할 백업이 없습니다.', 'warning');
        return false;
      }

      const exportData = {
        version: this.BACKUP_VERSION,
        appName: this.APP_NAME,
        exportedAt: new Date().toISOString(),
        totalBackups: backups.length,
        backups: backups.map((backup) => ({
          ...backup,
          checksum: backup.checksum || this.generateChecksum(backup.data),
        })),
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `travel-backup-all-${dateStr}.json`;

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      showToast(`${backups.length}개의 백업을 다운로드했습니다.`, 'success');
      return true;
    } catch (error) {
      showToast('전체 백업 다운로드 실패: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * 파일에서 백업 복원 (유효성 검사 강화)
   */
  static async importBackup(file) {
    try {
      const text = await file.text();
      let backup;

      // JSON 파싱 검증
      try {
        backup = JSON.parse(text);
      } catch (_e) {
        throw new Error('JSON 파싱 실패: 올바른 백업 파일이 아닙니다.');
      }

      // 유효성 검사
      const validation = this.validateBackup(backup);
      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'));
      }

      // 복원 미리보기 생성
      const preview = this.generateRestorePreview(backup);

      // 확인 대화상자
      const confirmMessage =
        `백업 파일 검증 완료!\n\n` +
        `📅 백업 날짜: ${new Date(backup.timestamp).toLocaleString()}\n` +
        `📦 버전: ${backup.version || '1.0 (레거시)'}\n` +
        `📊 데이터 크기: ${(backup.size / 1024).toFixed(2)} KB\n\n` +
        `복원될 데이터:\n${preview}\n\n` +
        `⚠️ 현재 데이터가 덮어씌워집니다!\n계속하시겠습니까?`;

      if (
        !(await showConfirmModal('백업 복원', confirmMessage, { danger: true }))
      ) {
        return false;
      }

      // 데이터 복원
      let _restoredCount = 0;
      Object.keys(backup.data).forEach((key) => {
        if (backup.data[key]) {
          localStorage.setItem(key, backup.data[key]);
          _restoredCount++;
        }
      });

      showToast('백업이 복원되었습니다. 페이지를 새로고침합니다.', 'success');

      // 페이지 새로고침
      window.location.reload();

      return true;
    } catch (error) {
      showToast('백업 파일 가져오기 실패: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * 백업 파일 유효성 검사
   */
  static validateBackup(backup) {
    const errors = [];

    // 필수 필드 확인
    if (!backup) {
      errors.push('백업 데이터가 비어있습니다.');
      return { valid: false, errors };
    }

    if (!backup.timestamp) {
      errors.push('백업 타임스탬프가 없습니다.');
    }

    if (!backup.data) {
      errors.push('백업 데이터 객체가 없습니다.');
    }

    // 타임스탬프 유효성
    if (backup.timestamp) {
      const backupDate = new Date(backup.timestamp);
      if (isNaN(backupDate.getTime())) {
        errors.push('잘못된 타임스탬프 형식입니다.');
      } else if (backupDate > new Date()) {
        errors.push('미래 날짜의 백업은 복원할 수 없습니다.');
      }
    }

    // 데이터 무결성 검사 (체크섬이 있는 경우)
    if (backup.checksum && backup.data) {
      const currentChecksum = this.generateChecksum(backup.data);
      if (currentChecksum !== backup.checksum) {
        errors.push(
          '⚠️ 데이터 무결성 검사 실패: 백업 파일이 손상되었을 수 있습니다.'
        );
      }
    }

    // 각 데이터 필드 JSON 유효성 검사
    if (backup.data) {
      Object.keys(backup.data).forEach((key) => {
        if (backup.data[key]) {
          try {
            JSON.parse(backup.data[key]);
          } catch (_e) {
            errors.push(`'${key}' 데이터가 올바른 JSON 형식이 아닙니다.`);
          }
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * 복원 미리보기 생성
   */
  static generateRestorePreview(backup) {
    const lines = [];

    if (backup.stats) {
      // 새 형식 (stats 포함)
      Object.keys(this.DATA_KEYS).forEach((key) => {
        const info = this.DATA_KEYS[key];
        const count = backup.stats[key] || 0;
        if (count > 0) {
          lines.push(`  • ${info.name}: ${count}건`);
        }
      });
    } else if (backup.data) {
      // 레거시 형식
      Object.keys(backup.data).forEach((key) => {
        if (backup.data[key]) {
          try {
            const parsed = JSON.parse(backup.data[key]);
            const count = Array.isArray(parsed) ? parsed.length : 1;
            const name = this.DATA_KEYS[key]?.name || key;
            lines.push(`  • ${name}: ${count}건`);
          } catch {
            lines.push(`  • ${key}: 있음`);
          }
        }
      });
    }

    return lines.length > 0 ? lines.join('\n') : '  (데이터 없음)';
  }

  /**
   * 체크섬 생성 (간단한 해시)
   */
  static generateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return hash.toString(16);
  }

  /**
   * 백업 완료 알림 표시 (선택사항)
   */
  static showBackupNotification(backup) {
    // 알림 권한 확인 후 표시
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('자동 백업 완료', {
        body: `데이터가 안전하게 백업되었습니다.\n크기: ${(backup.size / 1024).toFixed(2)} KB`,
        icon: '/favicon.ico',
      });
    }
  }

  /**
   * 전체 백업 삭제
   */
  static async clearAllBackups() {
    if (
      !(await showConfirmModal('전체 삭제', '모든 백업을 삭제하시겠습니까?', {
        danger: true,
      }))
    ) {
      return false;
    }

    try {
      localStorage.removeItem(this.BACKUP_KEY);
    } catch (_e) {
      showToast('백업 삭제 중 오류가 발생했습니다.', 'error');
      return false;
    }
    return true;
  }

  /**
   * 백업 상태 확인
   */
  static getBackupStatus() {
    const backups = this.getBackups();
    const lastBackup = this.getLastBackupTime();

    return {
      totalBackups: backups.length,
      lastBackupTime: lastBackup
        ? new Date(lastBackup).toLocaleString()
        : '없음',
      nextBackupTime: lastBackup
        ? new Date(lastBackup + this.BACKUP_INTERVAL).toLocaleString()
        : '페이지 새로고침 시',
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
    };
  }
}

// 자동 초기화 (페이지 로드 시)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    AutoBackup.initialize();
  });
} else {
  AutoBackup.initialize();
}

// 전역 접근 가능하도록 export
window.AutoBackup = AutoBackup;
