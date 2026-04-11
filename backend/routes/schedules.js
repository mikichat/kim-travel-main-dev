const express = require('express');
const xlsx = require('xlsx');
const logger = require('../logger');

const DEFAULT_SCHEDULE_COLOR = '#7B61FF';

function createScheduleRoutes(db) {
    const router = express.Router();

    // 모든 일정 조회
    router.get('/', async (req, res) => {
        const { group } = req.query;

        try {
            let schedules;
            if (group) {
                schedules = await db.all(
                    'SELECT * FROM schedules WHERE group_name = ? ORDER BY event_date DESC, id DESC',
                    [group]
                );
            } else {
                schedules = await db.all('SELECT * FROM schedules ORDER BY event_date DESC, id DESC');
            }
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ error: `일정 조회 실패: ${error.message}` });
        }
    });

    // 날짜별 일정 조회 (동적 라우트보다 먼저 정의)
    router.get('/date/:date', async (req, res) => {
        const { date } = req.params;
        try {
            const schedules = await db.all(
                'SELECT * FROM schedules WHERE event_date = ? ORDER BY id DESC',
                [date]
            );
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ error: `일정 조회 실패: ${error.message}` });
        }
    });

    // Excel 내보내기 (동적 라우트보다 먼저 정의)
    router.get('/export', async (req, res) => {
        const { group_name } = req.query;

        try {
            let query = 'SELECT group_name, event_date, location, transport, time, schedule, meals FROM schedules ORDER BY event_date ASC, id ASC';
            const params = [];

            if (group_name) {
                query = 'SELECT group_name, event_date, location, transport, time, schedule, meals FROM schedules WHERE group_name = ? ORDER BY event_date ASC, id ASC';
                params.push(group_name);
            }

            const schedules = await db.all(query, params);

            if (schedules.length === 0) {
                return res.status(404).json({ error: '내보낼 데이터가 없습니다.' });
            }

            const worksheet = xlsx.utils.json_to_sheet(schedules, {
                header: ['group_name', 'event_date', 'location', 'transport', 'time', 'schedule', 'meals'],
            });
            xlsx.utils.sheet_add_aoa(worksheet, [['그룹명', '일자', '지역', '교통편', '시간', '일정', '식사']], { origin: 'A1' });

            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Schedules');

            const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
            const filename = group_name ? `${group_name}_schedules.xlsx` : 'all_schedules.xlsx';

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            res.send(buffer);
        } catch (error) {
            logger.error('Excel 내보내기 오류:', error);
            res.status(500).json({ error: `Excel 파일 생성 실패: ${error.message}` });
        }
    });

    // 특정 일정 조회 (동적 라우트는 마지막에 정의)
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
            if (schedule) {
                res.json(schedule);
            } else {
                res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
            }
        } catch (error) {
            res.status(500).json({ error: `일정 조회 실패: ${error.message}` });
        }
    });

    // 새 일정 추가
    router.post('/', async (req, res) => {
        const { group_name, event_date, location, transport, time, schedule, meals, color } = req.body;

        if (!schedule) {
            return res.status(400).json({ error: '일정은 필수입니다.' });
        }

        try {
            const result = await db.run(
                'INSERT INTO schedules (group_name, event_date, location, transport, time, schedule, meals, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    group_name || null,
                    event_date || null,
                    location || null,
                    transport || null,
                    time || null,
                    schedule,
                    meals || null,
                    color || DEFAULT_SCHEDULE_COLOR
                ]
            );

            const newSchedule = await db.get('SELECT * FROM schedules WHERE id = ?', [result.lastID]);
            res.status(201).json(newSchedule);
        } catch (error) {
            res.status(500).json({ error: `일정 추가 실패: ${error.message}` });
        }
    });

    // 일정 수정
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { group_name, event_date, location, transport, time, schedule, meals, color } = req.body;

        if (!schedule) {
            return res.status(400).json({ error: '일정은 필수입니다.' });
        }

        try {
            const result = await db.run(
                'UPDATE schedules SET group_name = ?, event_date = ?, location = ?, transport = ?, time = ?, schedule = ?, meals = ?, color = ? WHERE id = ?',
                [
                    group_name || null,
                    event_date || null,
                    location || null,
                    transport || null,
                    time || null,
                    schedule,
                    meals || null,
                    color || DEFAULT_SCHEDULE_COLOR,
                    id
                ]
            );

            if (result.changes === 0) {
                return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
            }

            const updatedSchedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
            res.json(updatedSchedule);
        } catch (error) {
            res.status(500).json({ error: `일정 수정 실패: ${error.message}` });
        }
    });

    // 일정 삭제
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await db.run('DELETE FROM schedules WHERE id = ?', [id]);
            if (result.changes === 0) {
                return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: `일정 삭제 실패: ${error.message}` });
        }
    });

    return router;
}

module.exports = createScheduleRoutes;
