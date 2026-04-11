jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const { loginAsAdmin } = require('../setup/test-helpers');

let db, app, agent;

beforeAll(async () => {
    db = await createTestDb();
    app = createTestApp(db);
});

beforeEach(async () => {
    const result = await loginAsAdmin(app, db);
    agent = result.agent;
});

afterEach(async () => {
    await cleanupTestDb(db);
});

afterAll(async () => {
    await db.close();
});

// ==================== 인증 체크 ====================

describe('인증 필요', () => {
    it('401: 미인증 요청은 거부', async () => {
        const res = await supertest(app).get('/api/backup/database');
        expect(res.status).toBe(401);
    });
});

// ==================== GET /api/backup/database ====================

describe('GET /api/backup/database', () => {
    it('200: 백업 객체 반환', async () => {
        const res = await agent.get('/api/backup/database');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('date');
        expect(res.body).toHaveProperty('version', '1.0');
        expect(res.body).toHaveProperty('tables');
    });

    it('tables에 6개 키 포함', async () => {
        const res = await agent.get('/api/backup/database');
        const { tables } = res.body;
        expect(tables).toHaveProperty('customers');
        expect(tables).toHaveProperty('products');
        expect(tables).toHaveProperty('bookings');
        expect(tables).toHaveProperty('schedules');
        expect(tables).toHaveProperty('todos');
        expect(tables).toHaveProperty('notifications');
    });

    it('빈 DB → 각 테이블은 빈 배열', async () => {
        const res = await agent.get('/api/backup/database');
        const { tables } = res.body;
        expect(Array.isArray(tables.customers)).toBe(true);
        expect(Array.isArray(tables.schedules)).toBe(true);
        expect(tables.customers).toHaveLength(0);
    });

    it('timestamp는 숫자(ms)', async () => {
        const before = Date.now();
        const res = await agent.get('/api/backup/database');
        const after = Date.now();
        expect(res.body.timestamp).toBeGreaterThanOrEqual(before);
        expect(res.body.timestamp).toBeLessThanOrEqual(after);
    });
});

// ==================== GET /api/backup/download ====================

describe('GET /api/backup/download', () => {
    it('200: 응답 성공', async () => {
        const res = await agent.get('/api/backup/download');
        expect(res.status).toBe(200);
    });

    it('Content-Disposition: attachment', async () => {
        const res = await agent.get('/api/backup/download');
        expect(res.headers['content-disposition']).toMatch(/attachment/);
        expect(res.headers['content-disposition']).toMatch(/database-backup-/);
    });

    it('Content-Type: application/json', async () => {
        const res = await agent.get('/api/backup/download');
        expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('응답 본문이 유효한 JSON 백업 구조', async () => {
        const res = await agent.get('/api/backup/download');
        const parsed = JSON.parse(res.text);
        expect(parsed).toHaveProperty('version', '1.0');
        expect(parsed).toHaveProperty('tables');
    });
});

// ==================== GET /api/backup/file ====================

describe('GET /api/backup/file', () => {
    it('200: 백업 성공 또는 500: DB 파일 없음 (환경 의존)', async () => {
        const res = await agent.get('/api/backup/file');
        expect([200, 500]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('backupFile');
        } else {
            expect(res.body).toHaveProperty('error');
        }
    });
});

// ==================== 신규 REST API ====================

describe('GET /api/backup/list', () => {
    afterEach(() => jest.restoreAllMocks());

    it('200: 백업 목록 반환', async () => {
        const res = await agent.get('/api/backup/list');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.backups)).toBe(true);
        expect(res.body).toHaveProperty('nextAutoBackup');
        expect(res.body).toHaveProperty('maxBackups', 5);
    });

    it('500: 서비스 오류', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'listBackups').mockRejectedValueOnce(new Error('read failed'));
        const res = await agent.get('/api/backup/list');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/백업 목록 조회 실패/);
    });
});

describe('POST /api/backup/create', () => {
    afterEach(() => jest.restoreAllMocks());

    it('200: 수동 백업 생성', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'createBackup').mockResolvedValue({
            id: 'backup-2026-03-16-220000',
            filename: 'backup-2026-03-16-220000.db',
            created_at: '2026-03-16T22:00:00.000Z',
            size_bytes: 2048,
        });

        const res = await agent.post('/api/backup/create');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.backup).toHaveProperty('filename');
    });

    it('500: 생성 실패', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'createBackup').mockRejectedValueOnce(new Error('disk full'));
        const res = await agent.post('/api/backup/create');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/백업 생성 실패/);
    });
});

describe('POST /api/backup/restore/:id', () => {
    afterEach(() => jest.restoreAllMocks());

    it('200: 복원 성공', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'restoreBackup').mockResolvedValue({
            success: true,
            message: '복원 완료',
            safetyBackup: 'backup-safety.db',
        });

        const res = await agent.post('/api/backup/restore/backup-2026-03-16-220000');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('404: 백업 없음', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'restoreBackup').mockRejectedValueOnce(new Error('백업 파일을 찾을 수 없습니다'));
        const res = await agent.post('/api/backup/restore/backup-nonexistent');
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/backup/:id', () => {
    afterEach(() => jest.restoreAllMocks());

    it('200: 삭제 성공', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'deleteBackup').mockResolvedValue({ success: true });

        const res = await agent.delete('/api/backup/backup-2026-03-16-220000');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('404: 백업 없음', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'deleteBackup').mockRejectedValueOnce(new Error('백업 파일을 찾을 수 없습니다'));
        const res = await agent.delete('/api/backup/backup-nonexistent');
        expect(res.status).toBe(404);
    });
});

describe('GET /api/backup/:id/download', () => {
    afterEach(() => jest.restoreAllMocks());

    it('404: 존재하지 않는 백업', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'getBackupFilePath').mockRejectedValueOnce(new Error('백업 파일을 찾을 수 없습니다'));
        const res = await agent.get('/api/backup/backup-nonexistent/download');
        expect(res.status).toBe(404);
    });
});

// ==================== 500 에러 처리 ====================

describe('GET /api/backup/file — 서비스 위임 (파일 백업)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('성공: backupService.createBackup을 통해 백업 생성', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'createBackup').mockResolvedValue({
            id: 'backup-2026-03-16-230000',
            filename: 'backup-2026-03-16-230000.db',
            created_at: '2026-03-16T23:00:00.000Z',
            size_bytes: 1024,
        });
        jest.spyOn(backupService, 'listBackups').mockResolvedValue([
            { id: 'backup-2026-03-16-230000', filename: 'backup-2026-03-16-230000.db', created_at: '2026-03-16T23:00:00.000Z', size_bytes: 1024 },
        ]);

        const res = await agent.get('/api/backup/file');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.backupFile).toBe('backup-2026-03-16-230000.db');
        expect(res.body.totalBackups).toBe(1);
    });

    it('실패: 서비스 에러 시 500 반환', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'createBackup').mockRejectedValue(new Error('Copy failed'));

        const res = await agent.get('/api/backup/file');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/파일 백업 실패/);
    });
});

describe('500 에러 처리', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /database - 500: DB 오류', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB connection error'));
        const res = await agent.get('/api/backup/database');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/백업 실패/);
    });

    it('GET /download - 500: DB 오류', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB connection error'));
        const res = await agent.get('/api/backup/download');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/다운로드 실패/);
    });

    it('GET /file - 500: 서비스 오류', async () => {
        const backupService = require('../../services/backup.service');
        jest.spyOn(backupService, 'createBackup').mockRejectedValueOnce(new Error('Copy failed'));
        const res = await agent.get('/api/backup/file');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/파일 백업 실패/);
    });
});
