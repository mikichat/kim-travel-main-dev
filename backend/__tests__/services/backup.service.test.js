// @TASK P3-T1 - 백업 서비스 테스트
// @TEST tests for backup.service.js

const fs = require('fs');
const path = require('path');

// logger mock
jest.mock('../../logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

const backupService = require('../../services/backup.service');

// 테스트용 임시 디렉토리
const TEST_BACKUP_DIR = path.join(__dirname, '..', '..', 'backups', '__test_backups__');
const TEST_DB_PATH = path.join(__dirname, '..', '..', 'backups', '__test_source__.db');

// 모듈 내부 상수 오버라이드를 위한 설정
// backup.service.js가 사용하는 경로를 환경변수로 제어할 수 없으므로
// 실제 backups/ 디렉토리에서 테스트하되, 생성한 파일은 정리

describe('backup.service', () => {
    // 테스트 전 더미 DB 파일 생성
    beforeAll(async () => {
        const backupDir = backupService.BACKUP_DIR;
        await fs.promises.mkdir(backupDir, { recursive: true });

        // 소스 DB 파일이 없으면 더미 생성
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'travel_agency.db');
        try {
            await fs.promises.access(dbPath);
        } catch {
            // 테스트 환경에서 DB 파일이 없으면 더미 생성
            await fs.promises.writeFile(dbPath, 'SQLITE_DUMMY_FOR_TEST');
        }
    });

    // 테스트에서 생성한 backup-*.db 파일 정리
    const createdBackups = [];
    afterAll(async () => {
        for (const filename of createdBackups) {
            const filePath = path.join(backupService.BACKUP_DIR, filename);
            try {
                await fs.promises.unlink(filePath);
            } catch {
                // 이미 삭제됨
            }
        }
    });

    describe('createBackup', () => {
        it('백업 파일을 생성하고 메타데이터를 반환해야 한다', async () => {
            const result = await backupService.createBackup('test');

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('filename');
            expect(result).toHaveProperty('created_at');
            expect(result).toHaveProperty('size_bytes');
            expect(result.filename).toMatch(/^backup-\d{4}-\d{2}-\d{2}-\d{6}\.db$/);
            expect(result.size_bytes).toBeGreaterThan(0);

            createdBackups.push(result.filename);
        });
    });

    describe('listBackups', () => {
        it('백업 목록을 최신순으로 반환해야 한다', async () => {
            const backups = await backupService.listBackups();

            expect(Array.isArray(backups)).toBe(true);
            expect(backups.length).toBeGreaterThan(0);

            // 최신순 확인
            if (backups.length >= 2) {
                expect(backups[0].created_at >= backups[1].created_at).toBe(true);
            }

            // 각 백업 객체 구조 확인
            const backup = backups[0];
            expect(backup).toHaveProperty('id');
            expect(backup).toHaveProperty('filename');
            expect(backup).toHaveProperty('created_at');
            expect(backup).toHaveProperty('size_bytes');
        });
    });

    describe('getBackupFilePath', () => {
        it('존재하는 백업의 절대 경로를 반환해야 한다', async () => {
            const backups = await backupService.listBackups();
            const latest = backups[0];

            const filePath = await backupService.getBackupFilePath(latest.id);
            expect(path.isAbsolute(filePath)).toBe(true);
            expect(filePath).toContain(latest.filename);
        });

        it('존재하지 않는 백업은 에러를 던져야 한다', async () => {
            await expect(
                backupService.getBackupFilePath('backup-9999-99-99-999999')
            ).rejects.toThrow('백업 파일을 찾을 수 없습니다');
        });
    });

    describe('deleteBackup', () => {
        it('백업 파일을 삭제해야 한다', async () => {
            // 삭제용 백업 생성
            const backup = await backupService.createBackup('delete-test');
            createdBackups.push(backup.filename);

            const result = await backupService.deleteBackup(backup.id);
            expect(result.success).toBe(true);

            // 파일이 실제로 삭제되었는지 확인
            const filePath = path.join(backupService.BACKUP_DIR, backup.filename);
            await expect(
                fs.promises.access(filePath)
            ).rejects.toThrow();

            // cleanup 목록에서 제거
            const idx = createdBackups.indexOf(backup.filename);
            if (idx >= 0) createdBackups.splice(idx, 1);
        });

        it('존재하지 않는 백업 삭제 시 에러를 던져야 한다', async () => {
            await expect(
                backupService.deleteBackup('backup-nonexistent-000000')
            ).rejects.toThrow('백업 파일을 찾을 수 없습니다');
        });
    });

    describe('getNextBackupTime', () => {
        it('미래 시각의 ISO 문자열을 반환해야 한다', () => {
            const nextTime = backupService.getNextBackupTime();
            expect(nextTime).toBeTruthy();
            const nextDate = new Date(nextTime);
            expect(nextDate.getTime()).toBeGreaterThan(Date.now());
        });
    });

    describe('auto backup schedule', () => {
        it('스케줄러를 시작하고 중지할 수 있어야 한다', () => {
            // 시작
            expect(() => backupService.startAutoBackupSchedule()).not.toThrow();
            // 중지
            expect(() => backupService.stopAutoBackupSchedule()).not.toThrow();
        });
    });
});
