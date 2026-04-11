const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendLoginNotification } = require('../services/notify');
const logger = require('../logger');
const router = express.Router();

// DB 인스턴스는 서버에서 주입
let db = null;
function setDb(dbInstance) {
    db = dbInstance;
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     description: 이메일과 비밀번호로 로그인하여 세션 쿠키를 획득합니다.
 *     tags: [인증]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *                 role:
 *                   type: string
 *                   enum: [admin, user]
 *                 profile_image:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: 이메일 또는 비밀번호 미입력
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 이메일 또는 비밀번호 불일치
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 비활성화된 계정
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/auth/login - 로그인
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    try {
        const user = await db.get(
            'SELECT * FROM users WHERE email = ? AND provider = ?',
            [email, 'local']
        );

        if (!user) {
            return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: '비활성화된 계정입니다.' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        // 마지막 로그인 시각 업데이트
        await db.run(
            'UPDATE users SET last_login_at = datetime("now","localtime") WHERE id = ?',
            [user.id]
        );

        // 세션에 사용자 정보 저장
        req.session.userId = user.id;
        req.session.userName = user.name;

        // 로그인 알림 발송 (비동기, 실패해도 로그인에 영향 없음)
        sendLoginNotification(user, req).catch(err => {
            logger.error('[알림] 발송 실패:', err.message);
        });

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile_image: user.profile_image
        });
    } catch (error) {
        logger.error('로그인 오류:', error);
        res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     description: 현재 세션을 종료하고 쿠키를 삭제합니다.
 *     tags: [인증]
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 로그아웃되었습니다.
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/auth/bridge - air-booking 브릿지 토큰으로 자동 로그인 + 리다이렉트
router.get('/bridge', async (req, res) => {
    const { token, redirect } = req.query;

    if (!token || !redirect) {
        return res.status(400).json({ error: 'token과 redirect가 필요합니다.' });
    }

    try {
        // 토큰 검증 (60초 이내)
        const row = await db.get(
            `SELECT * FROM bridge_tokens WHERE token = ? AND created_at >= datetime('now','localtime','-60 seconds')`,
            [token]
        );

        if (!row) {
            return res.status(401).send('<!DOCTYPE html><html><body><p>토큰이 만료되었습니다. air-booking에서 다시 시도해주세요.</p></body></html>');
        }

        // 토큰 삭제 (일회용)
        await db.run('DELETE FROM bridge_tokens WHERE token = ?', [token]);

        // 같은 이메일로 main users 테이블에서 사용자 찾기
        const user = await db.get('SELECT * FROM users WHERE email = ?', [row.email]);
        if (!user) {
            return res.status(401).send('<!DOCTYPE html><html><body><p>해당 계정이 메인 시스템에 등록되어 있지 않습니다.</p></body></html>');
        }

        // 세션 생성
        req.session.userId = user.id;
        req.session.userName = user.name;

        // 안전한 리다이렉트 (같은 도메인만)
        const safeRedirect = String(redirect).startsWith('/') ? redirect : '/';
        res.redirect(safeRedirect);
    } catch (error) {
        logger.error('브릿지 로그인 오류:', error);
        res.status(500).send('<!DOCTYPE html><html><body><p>자동 로그인 중 오류가 발생했습니다.</p></body></html>');
    }
});

// POST /api/auth/logout - 로그아웃
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            logger.error('세션 삭제 오류:', err);
            return res.status(500).json({ error: '로그아웃 처리 중 오류가 발생했습니다.' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: '로그아웃되었습니다.' });
    });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 현재 사용자 정보 조회
 *     description: 로그인된 사용자의 프로필 정보를 반환합니다.
 *     tags: [인증]
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 로그인이 필요하거나 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/auth/me - 현재 사용자 정보
router.get('/me', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    try {
        const user = await db.get(
            'SELECT id, name, email, role, profile_image, provider, last_login_at, created_at FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (!user) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        res.json(user);
    } catch (error) {
        logger.error('사용자 정보 조회 오류:', error);
        res.status(500).json({ error: '사용자 정보 조회 중 오류가 발생했습니다.' });
    }
});

// ==================== 관리자용 사용자 관리 API ====================

// 관리자 권한 체크 미들웨어
async function requireAdmin(req, res, next) {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: '로그인이 필요합니다.' });
        }
        const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
        }
        next();
    } catch (error) {
        logger.error('인증 확인 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
}

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: 사용자 목록 조회
 *     description: 전체 사용자 목록을 반환합니다. 관리자 권한이 필요합니다.
 *     tags: [사용자 관리]
 *     responses:
 *       200:
 *         description: 사용자 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: 로그인이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 관리자 권한이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/auth/users - 사용자 목록 조회
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await db.all(
            'SELECT id, name, email, role, provider, is_active, last_login_at, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ data: users });
    } catch (error) {
        logger.error('사용자 목록 조회 오류:', error);
        res.status(500).json({ error: '사용자 목록 조회 실패' });
    }
});

/**
 * @swagger
 * /api/auth/users:
 *   post:
 *     summary: 사용자 생성
 *     description: 새 사용자 계정을 생성합니다. 관리자 권한이 필요합니다.
 *     tags: [사용자 관리]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: securePass1!
 *               name:
 *                 type: string
 *                 example: 홍길동
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 default: user
 *     responses:
 *       201:
 *         description: 사용자 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                   format: email
 *                 name:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [admin, user]
 *       400:
 *         description: 필수 필드 누락 또는 비밀번호 길이 부족
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 로그인이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 관리자 권한이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: 이미 등록된 이메일
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/auth/users - 사용자 생성 (관리자 전용)
router.post('/users', requireAdmin, async (req, res) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: '이메일, 비밀번호, 이름은 필수입니다.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
    }

    try {
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: '이미 등록된 이메일입니다.' });
        }

        const id = crypto.randomUUID();
        const password_hash = await bcrypt.hash(password, 10);
        const userRole = (role === 'admin') ? 'admin' : 'user';

        await db.run(
            'INSERT INTO users (id, email, password_hash, name, provider, role) VALUES (?, ?, ?, ?, ?, ?)',
            [id, email, password_hash, name, 'local', userRole]
        );

        res.status(201).json({ id, email, name, role: userRole });
    } catch (error) {
        logger.error('사용자 생성 오류:', error);
        res.status(500).json({ error: '사용자 생성 실패' });
    }
});

/**
 * @swagger
 * /api/auth/users/{id}/password:
 *   put:
 *     summary: 비밀번호 변경
 *     description: 특정 사용자의 비밀번호를 변경합니다. 관리자 권한이 필요합니다.
 *     tags: [사용자 관리]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 대상 사용자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: newSecurePass1!
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 비밀번호가 변경되었습니다.
 *       400:
 *         description: 비밀번호 미입력 또는 길이 부족
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 로그인이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 관리자 권한이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PUT /api/auth/users/:id/password - 비밀번호 변경
router.put('/users/:id/password', requireAdmin, async (req, res) => {
    const { password } = req.body;

    if (!password || password.length < 8) {
        return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
    }

    try {
        const user = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.params.id]);

        res.json({ message: '비밀번호가 변경되었습니다.' });
    } catch (error) {
        logger.error('비밀번호 변경 오류:', error);
        res.status(500).json({ error: '비밀번호 변경 실패' });
    }
});

/**
 * @swagger
 * /api/auth/users/{id}/toggle:
 *   put:
 *     summary: 계정 활성/비활성 토글
 *     description: 특정 사용자의 활성 상태를 반전시킵니다. 관리자 권한이 필요합니다.
 *     tags: [사용자 관리]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 대상 사용자 ID
 *     responses:
 *       200:
 *         description: 상태 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 계정이 활성화되었습니다.
 *                 is_active:
 *                   type: integer
 *                   enum: [0, 1]
 *       401:
 *         description: 로그인이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 관리자 권한이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PUT /api/auth/users/:id/toggle - 계정 활성/비활성 토글
router.put('/users/:id/toggle', requireAdmin, async (req, res) => {
    try {
        const user = await db.get('SELECT id, is_active FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const newStatus = user.is_active ? 0 : 1;
        await db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);

        res.json({ message: newStatus ? '계정이 활성화되었습니다.' : '계정이 비활성화되었습니다.', is_active: newStatus });
    } catch (error) {
        logger.error('계정 상태 변경 오류:', error);
        res.status(500).json({ error: '계정 상태 변경 실패' });
    }
});

/**
 * @swagger
 * /api/auth/users/{id}:
 *   delete:
 *     summary: 사용자 삭제
 *     description: 특정 사용자를 삭제합니다. 자기 자신은 삭제할 수 없습니다. 관리자 권한이 필요합니다.
 *     tags: [사용자 관리]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 삭제할 사용자 ID
 *     responses:
 *       200:
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 사용자가 삭제되었습니다.
 *       400:
 *         description: 자기 자신은 삭제할 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 로그인이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 관리자 권한이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DELETE /api/auth/users/:id - 사용자 삭제
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        // 자기 자신은 삭제 불가
        if (req.params.id === req.session.userId) {
            return res.status(400).json({ error: '자기 자신은 삭제할 수 없습니다.' });
        }

        const result = await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        res.json({ message: '사용자가 삭제되었습니다.' });
    } catch (error) {
        logger.error('사용자 삭제 오류:', error);
        res.status(500).json({ error: '사용자 삭제 실패' });
    }
});

module.exports = { router, setDb };
