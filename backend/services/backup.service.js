// @TASK P3-T1 - 자동 백업 서비스
// @SPEC v1.6 로드맵: SQLite 파일 기반 백업/복원/스케줄링

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'travel_agency.db');
const MAX_BACKUPS = 5;

/**
 * 백업 디렉토리 초기화 (없으면 생성)
 */
async function ensureBackupDir() {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
}

/**
 * 백업 파일 목록 조회 (최신순 정렬)
 * @returns {Promise<Array<{id: string, filename: string, created_at: string, size_bytes: number}>>}
 */
async function listBackups() {
    await ensureBackupDir();

    const files = await fs.promises.readdir(BACKUP_DIR);
    const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.db'));

    const backups = await Promise.all(
        backupFiles.map(async (filename) => {
            const filePath = path.join(BACKUP_DIR, filename);
            const stat = await fs.promises.stat(filePath);

            // 파일명에서 날짜 추출: backup-YYYY-MM-DD-HHmmss.db
            const dateMatch = filename.match(/^backup-(\d{4}-\d{2}-\d{2}-\d{6})\.db$/);
            let created_at;
            if (dateMatch) {
                // backup-2026-03-16-230000.db -> 2026-03-16T23:00:00
                const raw = dateMatch[1]; // 2026-03-16-230000
                const datePart = raw.substring(0, 10); // 2026-03-16
                const timePart = raw.substring(11); // 230000
                const hh = timePart.substring(0, 2);
                const mm = timePart.substring(2, 4);
                const ss = timePart.substring(4, 6);
                created_at = `${datePart}T${hh}:${mm}:${ss}`;
            } else {
                created_at = stat.mtime.toISOString();
            }

            // id: 파일명 해시 대신 파일명 자체를 ID로 사용 (확장자 제외)
            const id = filename.replace('.db', '');

            return {
                id,
                filename,
                created_at,
                size_bytes: stat.size,
            };
        })
    );

    // 최신순 정렬
    backups.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return backups;
}

/**
 * 백업 생성 (SQLite 파일 복사)
 * @param {string} [source='manual'] - 백업 소스 (manual, auto)
 * @returns {Promise<{id: string, filename: string, created_at: string, size_bytes: number}>}
 */
async function createBackup(source = 'manual') {
    await ensureBackupDir();

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `backup-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, filename);

    // SQLite 파일 복사
    await fs.promises.copyFile(DB_PATH, backupPath);

    const stat = await fs.promises.stat(backupPath);
    const id = filename.replace('.db', '');
    const created_at = now.toISOString();

    logger.info(`백업 생성 완료 [${source}]: ${filename} (${(stat.size / 1024).toFixed(1)} KB)`);

    // 오래된 백업 정리 (MAX_BACKUPS 초과 시)
    await pruneOldBackups();

    return { id, filename, created_at, size_bytes: stat.size };
}

/**
 * 최대 개수 초과 백업 삭제 (가장 오래된 것부터)
 */
async function pruneOldBackups() {
    const backups = await listBackups();
    if (backups.length > MAX_BACKUPS) {
        const toDelete = backups.slice(MAX_BACKUPS);
        for (const backup of toDelete) {
            const filePath = path.join(BACKUP_DIR, backup.filename);
            try {
                await fs.promises.unlink(filePath);
                logger.info(`오래된 백업 삭제: ${backup.filename}`);
            } catch (err) {
                logger.error(`백업 삭제 실패: ${backup.filename}`, { error: err.message });
            }
        }
    }
}

/**
 * 백업 복원 (백업 파일 -> DB 파일 덮어쓰기)
 * @param {string} backupId - 백업 ID (파일명에서 .db 제외)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function restoreBackup(backupId) {
    const filename = `${backupId}.db`;
    const backupPath = path.join(BACKUP_DIR, filename);

    // 파일 존재 확인
    try {
        await fs.promises.access(backupPath, fs.constants.R_OK);
    } catch {
        throw new Error(`백업 파일을 찾을 수 없습니다: ${filename}`);
    }

    // 복원 전 현재 DB를 안전 백업
    const safetyBackup = await createBackup('pre-restore');
    logger.info(`복원 전 안전 백업 생성: ${safetyBackup.filename}`);

    // 백업 파일로 DB 덮어쓰기
    await fs.promises.copyFile(backupPath, DB_PATH);
    logger.info(`백업 복원 완료: ${filename} -> ${path.basename(DB_PATH)}`);

    return {
        success: true,
        message: `백업이 복원되었습니다. (${filename}) 서버를 재시작하면 적용됩니다.`,
        safetyBackup: safetyBackup.filename,
    };
}

/**
 * 백업 삭제
 * @param {string} backupId - 백업 ID
 * @returns {Promise<{success: boolean}>}
 */
async function deleteBackup(backupId) {
    const filename = `${backupId}.db`;
    const backupPath = path.join(BACKUP_DIR, filename);

    try {
        await fs.promises.access(backupPath, fs.constants.R_OK);
    } catch {
        throw new Error(`백업 파일을 찾을 수 없습니다: ${filename}`);
    }

    await fs.promises.unlink(backupPath);
    logger.info(`백업 삭제: ${filename}`);

    return { success: true };
}

/**
 * 백업 파일 경로 반환 (다운로드용)
 * @param {string} backupId - 백업 ID
 * @returns {Promise<string>} 절대 파일 경로
 */
async function getBackupFilePath(backupId) {
    const filename = `${backupId}.db`;
    const backupPath = path.join(BACKUP_DIR, filename);

    try {
        await fs.promises.access(backupPath, fs.constants.R_OK);
    } catch {
        throw new Error(`백업 파일을 찾을 수 없습니다: ${filename}`);
    }

    return backupPath;
}

// --- 자동 스케줄링 ---

let schedulerTimer = null;

/**
 * 다음 23:00까지 남은 밀리초 계산
 */
function msUntilNext2300() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(23, 0, 0, 0);

    // 이미 23:00 이후면 내일 23:00
    if (now >= target) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
}

/**
 * 자동 백업 스케줄 시작 (매일 23:00)
 */
function startAutoBackupSchedule() {
    if (schedulerTimer) {
        clearTimeout(schedulerTimer);
    }

    function scheduleNext() {
        const delay = msUntilNext2300();
        const nextTime = new Date(Date.now() + delay);
        logger.info(`다음 자동 백업 예정: ${nextTime.toLocaleString('ko-KR')}`);

        schedulerTimer = setTimeout(async () => {
            try {
                const result = await createBackup('auto');
                logger.info(`[자동 백업] 성공: ${result.filename}`);
            } catch (err) {
                logger.error('[자동 백업] 실패:', { error: err.message });
            }
            // 다음 백업 스케줄
            scheduleNext();
        }, delay);

        // 서버 종료 시 타이머가 프로세스를 붙잡지 않도록
        if (schedulerTimer.unref) {
            schedulerTimer.unref();
        }
    }

    scheduleNext();
    logger.info('자동 백업 스케줄러가 시작되었습니다 (매일 23:00)');
}

/**
 * 자동 백업 스케줄 중지
 */
function stopAutoBackupSchedule() {
    if (schedulerTimer) {
        clearTimeout(schedulerTimer);
        schedulerTimer = null;
        logger.info('자동 백업 스케줄러가 중지되었습니다');
    }
}

/**
 * 다음 자동 백업 시각 반환
 */
function getNextBackupTime() {
    const ms = msUntilNext2300();
    return new Date(Date.now() + ms).toISOString();
}

module.exports = {
    listBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    getBackupFilePath,
    startAutoBackupSchedule,
    stopAutoBackupSchedule,
    getNextBackupTime,
    BACKUP_DIR,
};
