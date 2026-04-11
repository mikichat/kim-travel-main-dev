const express = require('express');
const crypto = require('crypto');
const logger = require('../logger');

// passport_file_data(BLOB) 제외하여 성능 최적화
const CUSTOMER_COLS_NO_BLOB = `id, name_kor, name_eng, passport_number, birth_date, passport_expiry,
    phone, email, address, travel_history, notes, passport_file_name, created_at,
    group_name, last_modified, departure_date, travel_region, gender,
    sync_source, sync_group_id, is_active, return_date`;

// 헬퍼: 중복 고객 검사 (우선순위: 여권번호 > 이름+생년월일 > 전화번호)
async function findExistingCustomer(db, member) {
    // 1순위: 여권번호 (가장 신뢰도 높음)
    if (member.passportNo) {
        const byPassport = await db.get(
            `SELECT ${CUSTOMER_COLS_NO_BLOB} FROM customers WHERE passport_number = ?`,
            [member.passportNo]
        );
        if (byPassport) {
            return { found: true, customer: byPassport, matchType: 'passport' };
        }
    }

    // 2순위: 이름 + 생년월일
    if (member.nameKor && member.birthDate) {
        const byNameBirth = await db.get(
            `SELECT ${CUSTOMER_COLS_NO_BLOB} FROM customers WHERE name_kor = ? AND birth_date = ?`,
            [member.nameKor, member.birthDate]
        );
        if (byNameBirth) {
            return { found: true, customer: byNameBirth, matchType: 'name_birth' };
        }
    }

    // 3순위: 전화번호 (경고만, 자동 매칭 안함)
    if (member.phone) {
        const byPhone = await db.get(
            `SELECT ${CUSTOMER_COLS_NO_BLOB} FROM customers WHERE phone = ?`,
            [member.phone]
        );
        if (byPhone) {
            logger.warn(`전화번호 일치 고객 발견: ${byPhone.name_kor}`);
        }
    }

    return { found: false };
}

// 헬퍼: 동기화 이벤트 로깅
async function logSyncEvent(db, syncData) {
    const log = {
        id: crypto.randomUUID(),
        sync_type: syncData.type,
        group_id: syncData.groupId,
        group_name: syncData.groupName,
        operation: syncData.operation,
        entity_type: syncData.entityType,
        entity_id: syncData.entityId,
        status: syncData.status,
        details: JSON.stringify(syncData.details),
        error_message: syncData.error || null,
        created_at: new Date().toISOString()
    };

    await db.run(
        `INSERT INTO sync_logs (id, sync_type, group_id, group_name, operation,
         entity_type, entity_id, status, details, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [log.id, log.sync_type, log.group_id, log.group_name, log.operation,
         log.entity_type, log.entity_id, log.status, log.details, log.error_message, log.created_at]
    );

    return log.id;
}

function createSyncRoutes(db, { batchSyncRateLimit } = {}) {
    const router = express.Router();
    const noop = (req, res, next) => next();
    const syncRateLimit = batchSyncRateLimit || noop;

    // TASK-504: 배치 고객 동기화 API
    router.post('/customers/batch', syncRateLimit, async (req, res) => {
        const { group_id, group_name, departure_date, return_date, destination, members } = req.body;

        try {
            // 데이터 검증
            if (!members || !Array.isArray(members) || members.length === 0) {
                return res.status(400).json({ error: '멤버 목록이 필요합니다.' });
            }

            // 배치 크기 제한 (메모리 보호)
            if (members.length > 500) {
                return res.status(400).json({ error: '한 번에 최대 500명까지 동기화할 수 있습니다.' });
            }

            // 날짜 형식 검증 (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (departure_date && !dateRegex.test(departure_date)) {
                return res.status(400).json({ error: '출발일 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
            }
            if (return_date && !dateRegex.test(return_date)) {
                return res.status(400).json({ error: '귀국일 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
            }

            // 문자열 길이 제한
            if (group_name && group_name.length > 200) {
                return res.status(400).json({ error: '그룹명은 200자를 초과할 수 없습니다.' });
            }

            const results = {
                total: members.length,
                created: 0,
                updated: 0,
                skipped: 0,
                errors: []
            };

            // 각 멤버 동기화 (트랜잭션으로 일괄 처리)
            await db.run('BEGIN TRANSACTION');
            for (let i = 0; i < members.length; i++) {
                const member = members[i];

                try {
                    // 필수 필드 검증
                    const errors = [];
                    if (!member.nameKor && !member.nameEn) {
                        errors.push('한글명 또는 영문명 필수');
                    }
                    if (!member.passportNo) {
                        errors.push('여권번호 필수');
                    }
                    if (!member.birthDate) {
                        errors.push('생년월일 필수');
                    }
                    if (!member.passportExpire) {
                        errors.push('여권만료일 필수');
                    }

                    if (errors.length > 0) {
                        results.errors.push({
                            index: i,
                            member: { nameKor: member.nameKor, nameEn: member.nameEn },
                            errors: errors
                        });
                        results.skipped++;
                        continue;
                    }

                    // 중복 검사
                    const existing = await findExistingCustomer(db, member);

                    if (existing.found) {
                        // 기존 고객 업데이트 (현재 단체 정보가 있으면 항상 덮어씌움)
                        const effectiveRegion = (destination !== undefined && destination !== '') ? destination : existing.customer.travel_region;
                        const effectiveDepDate = (departure_date !== undefined && departure_date !== '') ? departure_date : existing.customer.departure_date;

                        // 여행이력 자동 누적 (동일 여행지+출발일 조합만 중복 방지)
                        let travelHistory = existing.customer.travel_history || '';
                        if (effectiveRegion) {
                            const historyEntry = effectiveDepDate
                                ? `${effectiveRegion}(${effectiveDepDate})`
                                : effectiveRegion;
                            const items = travelHistory ? travelHistory.split(',').map(s => s.trim()) : [];
                            if (!items.some(item => item === historyEntry)) {
                                travelHistory = travelHistory ? `${historyEntry}, ${travelHistory}` : historyEntry;
                            }
                        }

                        const updateData = {
                            name_kor: member.nameKor || existing.customer.name_kor,
                            name_eng: member.nameEn || existing.customer.name_eng,
                            passport_number: member.passportNo,
                            birth_date: member.birthDate,
                            passport_expiry: member.passportExpire,
                            phone: member.phone || existing.customer.phone,
                            gender: member.gender || existing.customer.gender || '',
                            group_name: (group_name !== undefined && group_name !== '') ? group_name : existing.customer.group_name,
                            departure_date: effectiveDepDate,
                            travel_region: effectiveRegion,
                            travel_history: travelHistory,
                            sync_source: 'group_roster',
                            sync_group_id: group_id,
                            last_modified: new Date().toISOString()
                        };

                        await db.run(
                            `UPDATE customers SET
                             name_kor = ?, name_eng = ?, passport_number = ?,
                             birth_date = ?, passport_expiry = ?, phone = ?, gender = ?,
                             group_name = ?, departure_date = ?, travel_region = ?, travel_history = ?,
                             sync_source = ?, sync_group_id = ?, last_modified = ?
                             WHERE id = ?`,
                            [updateData.name_kor, updateData.name_eng, updateData.passport_number,
                             updateData.birth_date, updateData.passport_expiry, updateData.phone, updateData.gender,
                             updateData.group_name, updateData.departure_date, updateData.travel_region, updateData.travel_history,
                             updateData.sync_source, updateData.sync_group_id, updateData.last_modified,
                             existing.customer.id]
                        );

                        results.updated++;
                    } else {
                        // 신규 고객 생성
                        const newCustomer = {
                            id: crypto.randomUUID(),
                            name_kor: member.nameKor || '',
                            name_eng: member.nameEn || '',
                            passport_number: member.passportNo,
                            birth_date: member.birthDate,
                            passport_expiry: member.passportExpire,
                            phone: member.phone || '',
                            gender: member.gender || '',
                            email: '',
                            address: '',
                            travel_history: destination ? (departure_date ? `${destination}(${departure_date})` : destination) : '',
                            notes: '',
                            group_name: group_name || '',
                            departure_date: departure_date || '',
                            travel_region: destination || '',
                            sync_source: 'group_roster',
                            sync_group_id: group_id,
                            is_active: 1,
                            last_modified: new Date().toISOString(),
                            created_at: new Date().toISOString()
                        };

                        await db.run(
                            `INSERT INTO customers (
                                id, name_kor, name_eng, passport_number, birth_date, passport_expiry,
                                phone, gender, email, address, travel_history, notes,
                                group_name, departure_date, travel_region,
                                sync_source, sync_group_id, is_active, last_modified, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [newCustomer.id, newCustomer.name_kor, newCustomer.name_eng,
                             newCustomer.passport_number, newCustomer.birth_date, newCustomer.passport_expiry,
                             newCustomer.phone, newCustomer.gender, newCustomer.email, newCustomer.address,
                             newCustomer.travel_history, newCustomer.notes,
                             newCustomer.group_name, newCustomer.departure_date, newCustomer.travel_region,
                             newCustomer.sync_source, newCustomer.sync_group_id,
                             newCustomer.is_active, newCustomer.last_modified, newCustomer.created_at]
                        );

                        results.created++;
                    }
                } catch (error) {
                    logger.error(`멤버 ${i} 동기화 오류:`, error);
                    results.errors.push({
                        index: i,
                        member: { nameKor: member.nameKor, nameEn: member.nameEn },
                        errors: [error.message]
                    });
                    results.skipped++;
                }
            }
            await db.run('COMMIT');

            // 동기화 로그 기록 (group_id가 groups 테이블에 없으면 FK 위반 → null 처리)
            let validGroupId = null;
            if (group_id) {
                const groupExists = await db.get('SELECT id FROM groups WHERE id = ?', [group_id]);
                if (groupExists) validGroupId = group_id;
            }
            const logId = await logSyncEvent(db, {
                type: 'customer_sync',
                groupId: validGroupId,
                groupName: group_name,
                operation: 'batch_sync',
                entityType: 'customer',
                entityId: null,
                status: results.errors.length === 0 ? 'success' : 'partial',
                details: results,
                error: results.errors.length > 0 ? `${results.errors.length}건의 오류 발생` : null
            });

            // 그룹 동기화 상태 업데이트
            if (validGroupId) {
                await db.run(
                    'UPDATE groups SET last_sync_at = ?, sync_status = ? WHERE id = ?',
                    [new Date().toISOString(), 'synced', validGroupId]
                );
            }

            res.json({
                ...results,
                sync_log_id: logId
            });

        } catch (error) {
            logger.error('배치 동기화 오류:', error);
            res.status(500).json({ error: `배치 동기화 실패: ${error.message}` });
        }
    });

    // TASK-505: 동기화 전 검증 API
    router.post('/validate', async (req, res) => {
        const { members } = req.body;

        try {
            if (!members || !Array.isArray(members)) {
                return res.status(400).json({ error: '멤버 목록이 필요합니다.' });
            }

            const validation = {
                valid: [],
                invalid: [],
                duplicates: []
            };

            for (let i = 0; i < members.length; i++) {
                const member = members[i];
                const errors = [];

                // 필수 필드 검증
                if (!member.nameKor && !member.nameEn) {
                    errors.push('한글명 또는 영문명 필수');
                }
                if (!member.passportNo) {
                    errors.push('여권번호 필수');
                }
                if (!member.birthDate) {
                    errors.push('생년월일 필수');
                }
                if (!member.passportExpire) {
                    errors.push('여권만료일 필수');
                }

                if (errors.length > 0) {
                    validation.invalid.push({ index: i, member, errors });
                } else {
                    // 중복 검사
                    const existing = await findExistingCustomer(db, member);

                    if (existing.found) {
                        validation.duplicates.push({
                            index: i,
                            member,
                            existing_customer: existing.customer,
                            match_type: existing.matchType
                        });
                    } else {
                        validation.valid.push({ index: i, member, action: 'create' });
                    }
                }
            }

            res.json(validation);

        } catch (error) {
            logger.error('검증 오류:', error);
            res.status(500).json({ error: `검증 실패: ${error.message}` });
        }
    });

    // TASK-507: 동기화 이력 조회 API
    router.get('/history', async (req, res) => {
        const { group_id, limit = 50, offset = 0, sync_type } = req.query;

        try {
            let sql = 'SELECT * FROM sync_logs WHERE 1=1';
            const params = [];

            if (group_id) {
                sql += ' AND group_id = ?';
                params.push(group_id);
            }

            if (sync_type) {
                sql += ' AND sync_type = ?';
                params.push(sync_type);
            }

            sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 1000));
            const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
            params.push(safeLimit, safeOffset);

            const logs = await db.all(sql, params);

            // details JSON 파싱
            const parsedLogs = logs.map(log => {
                let details = null;
                try { if (log.details) details = JSON.parse(log.details); } catch (_e) { details = log.details; }
                return { ...log, details };
            });

            res.json(parsedLogs);

        } catch (error) {
            logger.error('동기화 이력 조회 오류:', error);
            res.status(500).json({ error: `동기화 이력 조회 실패: ${error.message}` });
        }
    });

    return router;
}

module.exports = createSyncRoutes;
