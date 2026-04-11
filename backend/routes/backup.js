// @TASK P3-T1 - 백업 REST API
// @SPEC v1.6 로드맵: 백업 목록/생성/복원/삭제/다운로드

const express = require('express');
const path = require('path');
const backupService = require('../services/backup.service');

// 헬퍼: 6개 테이블 전체를 백업 객체로 조립 (JSON 백업용, 기존 호환)
async function buildBackupData(database) {
    const [customers, products, bookings, schedules, todos, notifications] = await Promise.all([
        database.all('SELECT * FROM customers'),
        database.all('SELECT * FROM products'),
        database.all('SELECT * FROM bookings'),
        database.all('SELECT * FROM schedules'),
        database.all('SELECT * FROM todos'),
        database.all('SELECT * FROM notifications')
    ]);
    return {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        version: '1.0',
        tables: { customers, products, bookings, schedules, todos, notifications }
    };
}

function createBackupRoutes(db) {
    const router = express.Router();

    // === 신규 REST API (SQLite 파일 기반) ===

    // GET /api/backup/list - 백업 목록 (최근 5개)
    router.get('/list', async (_req, res) => {
        try {
            const backups = await backupService.listBackups();
            const nextBackup = backupService.getNextBackupTime();
            res.json({
                success: true,
                backups,
                nextAutoBackup: nextBackup,
                maxBackups: 5,
            });
        } catch (error) {
            res.status(500).json({ error: `백업 목록 조회 실패: ${error.message}` });
        }
    });

    // POST /api/backup/create - 수동 백업 생성
    router.post('/create', async (_req, res) => {
        try {
            const result = await backupService.createBackup('manual');
            res.json({ success: true, backup: result });
        } catch (error) {
            res.status(500).json({ error: `백업 생성 실패: ${error.message}` });
        }
    });

    // POST /api/backup/restore/:id - 백업 복원
    router.post('/restore/:id', async (req, res) => {
        try {
            const result = await backupService.restoreBackup(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    // DELETE /api/backup/:id - 백업 삭제
    router.delete('/:id', async (req, res) => {
        try {
            const result = await backupService.deleteBackup(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    // GET /api/backup/:id/download - 백업 파일 다운로드
    router.get('/:id/download', async (req, res) => {
        try {
            const filePath = await backupService.getBackupFilePath(req.params.id);
            const filename = path.basename(filePath);
            res.download(filePath, filename);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    // === 기존 API (하위 호환) ===

    // GET /api/backup/database - JSON 백업 (기존 호환)
    router.get('/database', async (_req, res) => {
        try {
            const backup = await buildBackupData(db);
            res.json(backup);
        } catch (error) {
            res.status(500).json({ error: `데이터베이스 백업 실패: ${error.message}` });
        }
    });

    // GET /api/backup/download - JSON 다운로드 (기존 호환)
    router.get('/download', async (_req, res) => {
        try {
            const backup = await buildBackupData(db);
            const filename = `database-backup-${new Date().toISOString().split('T')[0]}.json`;

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(JSON.stringify(backup, null, 2));
        } catch (error) {
            res.status(500).json({ error: `백업 다운로드 실패: ${error.message}` });
        }
    });

    // GET /api/backup/file - SQLite 파일 복사 (기존 호환 - 내부적으로 서비스 사용)
    router.get('/file', async (_req, res) => {
        try {
            const result = await backupService.createBackup('legacy-api');
            const backups = await backupService.listBackups();
            res.json({
                success: true,
                message: '데이터베이스 파일 백업 완료',
                backupFile: result.filename,
                totalBackups: backups.length,
            });
        } catch (error) {
            res.status(500).json({ error: `파일 백업 실패: ${error.message}` });
        }
    });

    return router;
}

module.exports = createBackupRoutes;
