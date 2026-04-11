// 은행 계좌 관련 API 라우터
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     BankAccount:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 계좌 고유 ID
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         bank_name:
 *           type: string
 *           description: 은행명
 *           example: "국민은행"
 *         account_number:
 *           type: string
 *           description: 계좌번호
 *           example: "123-456-789012"
 *         account_holder:
 *           type: string
 *           description: 예금주
 *           example: "홍길동"
 *         is_default:
 *           type: integer
 *           enum: [0, 1]
 *           description: 기본 계좌 여부 (1=기본, 0=일반)
 *           example: 0
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 생성일시
 *       required:
 *         - id
 *         - bank_name
 *         - account_number
 *         - account_holder
 *         - is_default
 */

let _db = null;

function getDb() {
    if (!_db) throw new Error('DB가 초기화되지 않았습니다.');
    return _db;
}

/**
 * @swagger
 * /api/bank-accounts:
 *   get:
 *     summary: 은행 계좌 목록 조회
 *     description: 등록된 모든 은행 계좌를 조회합니다. 기본 계좌가 먼저, 그 다음 생성일 역순으로 정렬됩니다.
 *     tags: [은행 계좌]
 *     responses:
 *       200:
 *         description: 계좌 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BankAccount'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/bank-accounts - 은행 계좌 목록 조회
router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const accounts = await db.all('SELECT * FROM bank_accounts ORDER BY is_default DESC, created_at DESC');
        res.json({ data: accounts });
    } catch (error) {
        logger.error('은행 계좌 목록 조회 오류:', error);
        res.status(500).json({ error: '은행 계좌 목록 조회 실패' });
    }
});

/**
 * @swagger
 * /api/bank-accounts/default:
 *   get:
 *     summary: 기본 계좌 조회
 *     description: 기본으로 설정된 은행 계좌를 조회합니다.
 *     tags: [은행 계좌]
 *     responses:
 *       200:
 *         description: 기본 계좌 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BankAccount'
 *       404:
 *         description: 기본 계좌를 찾을 수 없음
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
// GET /api/bank-accounts/default - 기본 계좌 조회
router.get('/default', async (req, res) => {
    try {
        const db = getDb();
        const account = await db.get('SELECT * FROM bank_accounts WHERE is_default = 1 LIMIT 1');

        if (!account) {
            return res.status(404).json({ error: '기본 계좌를 찾을 수 없습니다.' });
        }

        res.json(account);
    } catch (error) {
        logger.error('기본 계좌 조회 오류:', error);
        res.status(500).json({ error: '기본 계좌 조회 실패' });
    }
});

/**
 * @swagger
 * /api/bank-accounts:
 *   post:
 *     summary: 은행 계좌 추가
 *     description: 새로운 은행 계좌를 등록합니다. is_default를 true로 설정하면 기존 기본 계좌가 해제됩니다.
 *     tags: [은행 계좌]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bank_name
 *               - account_number
 *               - account_holder
 *             properties:
 *               bank_name:
 *                 type: string
 *                 description: 은행명
 *                 example: "국민은행"
 *               account_number:
 *                 type: string
 *                 description: 계좌번호
 *                 example: "123-456-789012"
 *               account_holder:
 *                 type: string
 *                 description: 예금주
 *                 example: "홍길동"
 *               is_default:
 *                 type: boolean
 *                 description: 기본 계좌로 설정할지 여부
 *                 example: false
 *     responses:
 *       201:
 *         description: 계좌 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BankAccount'
 *       400:
 *         description: 필수 필드 누락 (bank_name, account_number, account_holder)
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
// POST /api/bank-accounts - 은행 계좌 추가
router.post('/', async (req, res) => {
    try {
        const db = getDb();
        const { bank_name, account_number, account_holder, is_default } = req.body;

        if (!bank_name || !account_number || !account_holder) {
            return res.status(400).json({ error: '은행명, 계좌번호, 예금주는 필수입니다.' });
        }

        if (bank_name.length > 100 || account_number.length > 100 || account_holder.length > 100) {
            return res.status(400).json({ error: '은행명, 계좌번호, 예금주는 100자를 초과할 수 없습니다.' });
        }

        // 기본 계좌로 설정하는 경우, 기존 기본 계좌 해제
        if (is_default) {
            await db.run('UPDATE bank_accounts SET is_default = 0 WHERE is_default = 1');
        }

        const account = {
            id: uuidv4(),
            bank_name,
            account_number,
            account_holder,
            is_default: is_default ? 1 : 0
        };

        await db.run(`
            INSERT INTO bank_accounts (id, bank_name, account_number, account_holder, is_default)
            VALUES (?, ?, ?, ?, ?)
        `, [account.id, account.bank_name, account.account_number, account.account_holder, account.is_default]);

        res.status(201).json(account);
    } catch (error) {
        logger.error('은행 계좌 추가 오류:', error);
        res.status(500).json({ error: '은행 계좌 추가 실패' });
    }
});

/**
 * @swagger
 * /api/bank-accounts/{id}:
 *   put:
 *     summary: 은행 계좌 수정
 *     description: 기존 은행 계좌 정보를 수정합니다. 허용된 필드(bank_name, account_number, account_holder, is_default)만 업데이트할 수 있습니다. is_default를 true로 설정하면 기존 기본 계좌가 해제됩니다.
 *     tags: [은행 계좌]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 수정할 계좌의 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bank_name:
 *                 type: string
 *                 description: 은행명
 *                 example: "신한은행"
 *               account_number:
 *                 type: string
 *                 description: 계좌번호
 *                 example: "110-123-456789"
 *               account_holder:
 *                 type: string
 *                 description: 예금주
 *                 example: "김철수"
 *               is_default:
 *                 type: boolean
 *                 description: 기본 계좌로 설정할지 여부
 *                 example: true
 *     responses:
 *       200:
 *         description: 계좌 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BankAccount'
 *       400:
 *         description: 업데이트할 유효한 필드가 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 계좌를 찾을 수 없음
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
// PUT /api/bank-accounts/:id - 은행 계좌 수정
router.put('/:id', async (req, res) => {
    try {
        const db = getDb();
        const account = await db.get('SELECT * FROM bank_accounts WHERE id = ?', [req.params.id]);

        if (!account) {
            return res.status(404).json({ error: '은행 계좌를 찾을 수 없습니다.' });
        }

        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;

        // 기본 계좌로 설정하는 경우, 기존 기본 계좌 해제
        if (updates.is_default) {
            await db.run('UPDATE bank_accounts SET is_default = 0 WHERE is_default = 1 AND id != ?', [req.params.id]);
            updates.is_default = 1;
        }

        // 허용된 컬럼만 업데이트 (SQL Injection 방지)
        const ALLOWED_COLUMNS = ['bank_name', 'account_number', 'account_holder', 'is_default'];
        const safeKeys = Object.keys(updates).filter(key => ALLOWED_COLUMNS.includes(key));
        if (safeKeys.length === 0) {
            return res.status(400).json({ error: '업데이트할 유효한 필드가 없습니다.' });
        }

        const STRING_FIELDS = ['bank_name', 'account_number', 'account_holder'];
        for (const field of STRING_FIELDS) {
            if (updates[field] !== undefined && String(updates[field]).length > 100) {
                return res.status(400).json({ error: `${field}은(는) 100자를 초과할 수 없습니다.` });
            }
        }

        const setClause = safeKeys.map(key => `${key} = ?`).join(', ');
        const values = safeKeys.map(key => updates[key]);
        values.push(req.params.id);

        await db.run(`UPDATE bank_accounts SET ${setClause} WHERE id = ?`, values);

        const updatedAccount = await db.get('SELECT * FROM bank_accounts WHERE id = ?', [req.params.id]);
        res.json(updatedAccount);
    } catch (error) {
        logger.error('은행 계좌 수정 오류:', error);
        res.status(500).json({ error: '은행 계좌 수정 실패' });
    }
});

/**
 * @swagger
 * /api/bank-accounts/{id}/set-default:
 *   put:
 *     summary: 기본 계좌 설정
 *     description: 지정된 계좌를 기본 계좌로 설정합니다. 기존 기본 계좌는 자동으로 해제됩니다.
 *     tags: [은행 계좌]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 기본 계좌로 설정할 계좌의 ID
 *     responses:
 *       200:
 *         description: 기본 계좌 설정 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BankAccount'
 *       404:
 *         description: 계좌를 찾을 수 없음
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
// PUT /api/bank-accounts/:id/set-default - 기본 계좌 설정
router.put('/:id/set-default', async (req, res) => {
    try {
        const db = getDb();
        const account = await db.get('SELECT * FROM bank_accounts WHERE id = ?', [req.params.id]);

        if (!account) {
            return res.status(404).json({ error: '은행 계좌를 찾을 수 없습니다.' });
        }

        // 기존 기본 계좌 해제
        await db.run('UPDATE bank_accounts SET is_default = 0 WHERE is_default = 1');

        // 선택한 계좌를 기본 계좌로 설정
        await db.run('UPDATE bank_accounts SET is_default = 1 WHERE id = ?', [req.params.id]);

        const updatedAccount = await db.get('SELECT * FROM bank_accounts WHERE id = ?', [req.params.id]);
        res.json(updatedAccount);
    } catch (error) {
        logger.error('기본 계좌 설정 오류:', error);
        res.status(500).json({ error: '기본 계좌 설정 실패' });
    }
});

/**
 * @swagger
 * /api/bank-accounts/{id}:
 *   delete:
 *     summary: 은행 계좌 삭제
 *     description: 지정된 은행 계좌를 삭제합니다.
 *     tags: [은행 계좌]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 삭제할 계좌의 ID
 *     responses:
 *       204:
 *         description: 계좌 삭제 성공 (응답 본문 없음)
 *       404:
 *         description: 계좌를 찾을 수 없음
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
// DELETE /api/bank-accounts/:id - 은행 계좌 삭제
router.delete('/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run('DELETE FROM bank_accounts WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: '은행 계좌를 찾을 수 없습니다.' });
        }

        res.status(204).send();
    } catch (error) {
        logger.error('은행 계좌 삭제 오류:', error);
        res.status(500).json({ error: '은행 계좌 삭제 실패' });
    }
});

module.exports = function(db) {
    _db = db;
    return router;
};
