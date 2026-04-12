// backend/db/freetravel-init.js
// 자유여행 예약내역 테이블 초기화
const logger = require('../logger');

async function initFreeTravelTables(db) {
    logger.info('[freetravel] 테이블 초기화 시작');

    try {
        // bookings 테이블
        await db.exec(`
            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                recipient TEXT,
                sender TEXT DEFAULT '여행세상',
                travel_period TEXT,
                destination TEXT,
                data TEXT NOT NULL,
                sections TEXT,
                created_at TEXT DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT DEFAULT (datetime('now', 'localtime'))
            )
        `);
        logger.info('[freetravel] bookings 테이블 준비 완료');

        // company_defaults 테이블
        await db.exec(`
            CREATE TABLE IF NOT EXISTS company_defaults (
                id INTEGER PRIMARY KEY CHECK (id = 1) DEFAULT 1,
                name TEXT DEFAULT '(유) 여행세상',
                ceo TEXT DEFAULT '대표이사 김국진',
                address TEXT DEFAULT '(560-170) 전주시 완산구 서신동 856-1번지',
                phone TEXT DEFAULT '063) 271-9090',
                fax TEXT DEFAULT '063) 271-9030',
                manager_name TEXT,
                manager_phone TEXT,
                stamp_image TEXT
            )
        `);
        logger.info('[freetravel] company_defaults 테이블 준비 완료');

        // company_defaults 기본 데이터가 없으면 삽입
        const existing = await db.get('SELECT COUNT(*) as cnt FROM company_defaults');
        if (existing.cnt === 0) {
            await db.run(`
                INSERT INTO company_defaults (id, name, ceo, address, phone, fax)
                VALUES (1, '(유) 여행세상', '대표이사 김국진', '(560-170) 전주시 완산구 서신동 856-1번지', '063) 271-9090', '063) 271-9030')
            `);
            logger.info('[freetravel] company_defaults 기본 데이터 삽입 완료');
        }

        logger.info('[freetravel] 테이블 초기화 완료');
    } catch (error) {
        logger.error('[freetravel] 테이블 초기화 실패:', error.message);
        throw error;
    }
}

module.exports = { initFreeTravelTables };
