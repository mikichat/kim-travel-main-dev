const express = require('express');
const crypto = require('crypto');

// 허용된 테이블 화이트리스트 (SQL Injection 방지)
const ALLOWED_TABLES = ['customers', 'products', 'bookings', 'schedules', 'todos', 'notifications', 'groups', 'sync_logs', 'cost_calculations'];
const ALLOWED_SORT_COLUMNS = ['created_at', 'updated_at', 'id', 'name', 'event_date', 'last_modified'];
const ALLOWED_ORDERS = ['asc', 'desc'];

function validateTableName(tableName) {
    return ALLOWED_TABLES.includes(tableName);
}

function validateColumnName(col) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
}

function createTableRoutes(db) {
    const router = express.Router();

    // 1. 전체 데이터 조회 (GET /tables/:tableName)
    router.get('/:tableName', async (req, res) => {
        const { tableName } = req.params;
        if (!validateTableName(tableName)) {
            return res.status(400).json({ error: `허용되지 않은 테이블: ${tableName}` });
        }
        const { limit = 100, sort = 'created_at', order = 'desc', filter } = req.query;
        const safeSort = ALLOWED_SORT_COLUMNS.includes(sort) ? sort : 'created_at';
        const safeOrder = ALLOWED_ORDERS.includes(order.toLowerCase()) ? order : 'desc';
        const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 100, 1000));
        try {
            let whereClause = '';
            const params = [];

            if (filter) {
                const [col, ...valueParts] = filter.split(':');
                const value = valueParts.join(':');
                if (col && value && validateColumnName(col)) {
                    whereClause = ` WHERE ${col} = ?`;
                    params.push(value);
                }
            }

            params.push(safeLimit);
            const items = await db.all(`SELECT * FROM ${tableName}${whereClause} ORDER BY ${safeSort} ${safeOrder} LIMIT ?`, params);
            res.json({ data: items });
        } catch (error) {
            res.status(500).json({ error: `[${tableName}] 데이터 조회 실패: ${error.message}` });
        }
    });

    // 2. 단일 데이터 조회 (GET /tables/:tableName/:id)
    router.get('/:tableName/:id', async (req, res) => {
        const { tableName, id } = req.params;
        if (!validateTableName(tableName)) {
            return res.status(400).json({ error: `허용되지 않은 테이블: ${tableName}` });
        }
        try {
            const item = await db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
            if (item) {
                res.json(item);
            } else {
                res.status(404).json({ error: `[${tableName}] ID ${id}를 찾을 수 없습니다.` });
            }
        } catch (error) {
            res.status(500).json({ error: `[${tableName}] 데이터 조회 실패: ${error.message}` });
        }
    });

    // 3. 데이터 생성 (POST /tables/:tableName)
    router.post('/:tableName', async (req, res) => {
        const { tableName } = req.params;
        if (!validateTableName(tableName)) {
            return res.status(400).json({ error: `허용되지 않은 테이블: ${tableName}` });
        }
        const data = req.body;
        data.id = crypto.randomUUID();
        data.created_at = new Date().toISOString();

        const columns = Object.keys(data).filter(validateColumnName);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => data[col]);

        try {
            await db.run(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`, values);
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: `[${tableName}] 데이터 생성 실패: ${error.message}` });
        }
    });

    // 4. 데이터 전체 수정 (PUT /tables/:tableName/:id)
    router.put('/:tableName/:id', async (req, res) => {
        const { tableName, id } = req.params;
        if (!validateTableName(tableName)) {
            return res.status(400).json({ error: `허용되지 않은 테이블: ${tableName}` });
        }
        const data = req.body;

        delete data.id;
        delete data.created_at;

        const safeColumns = Object.keys(data).filter(validateColumnName);
        if (safeColumns.length === 0) {
            return res.status(400).json({ error: '업데이트할 유효한 필드가 없습니다.' });
        }
        const columns = safeColumns.map(col => `${col} = ?`).join(', ');
        const values = [...safeColumns.map(col => data[col]), id];

        try {
            const result = await db.run(`UPDATE ${tableName} SET ${columns} WHERE id = ?`, values);
            if (result.changes === 0) {
                return res.status(404).json({ error: `[${tableName}] ID ${id}를 찾을 수 없습니다.` });
            }
            res.json({ message: `[${tableName}] ID ${id}가 성공적으로 업데이트되었습니다.` });
        } catch (error) {
            res.status(500).json({ error: `[${tableName}] 데이터 업데이트 실패: ${error.message}` });
        }
    });

    // 5. 데이터 부분 수정 (PATCH /tables/:tableName/:id)
    router.patch('/:tableName/:id', async (req, res) => {
        const { tableName, id } = req.params;
        if (!validateTableName(tableName)) {
            return res.status(400).json({ error: `허용되지 않은 테이블: ${tableName}` });
        }
        const data = req.body;

        const safeColumns = Object.keys(data).filter(validateColumnName);
        if (safeColumns.length === 0) {
            return res.status(400).json({ error: '업데이트할 유효한 필드가 없습니다.' });
        }
        const columns = safeColumns.map(col => `${col} = ?`).join(', ');
        const values = [...safeColumns.map(col => data[col]), id];

        try {
            const result = await db.run(`UPDATE ${tableName} SET ${columns} WHERE id = ?`, values);
            if (result.changes === 0) {
                return res.status(404).json({ error: `[${tableName}] ID ${id}를 찾을 수 없습니다.` });
            }
            res.json({ message: `[${tableName}] ID ${id}가 성공적으로 패치되었습니다.` });
        } catch (error) {
            res.status(500).json({ error: `[${tableName}] 데이터 패치 실패: ${error.message}` });
        }
    });

    // 6. 데이터 삭제 (DELETE /tables/:tableName/:id)
    router.delete('/:tableName/:id', async (req, res) => {
        const { tableName, id } = req.params;
        if (!validateTableName(tableName)) {
            return res.status(400).json({ error: `허용되지 않은 테이블: ${tableName}` });
        }
        try {
            const result = await db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
            if (result.changes === 0) {
                return res.status(404).json({ error: `[${tableName}] ID ${id}를 찾을 수 없습니다.` });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: `[${tableName}] 데이터 삭제 실패: ${error.message}` });
        }
    });

    return router;
}

module.exports = createTableRoutes;
