// backend/database.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const logger = require('./logger');

// 데이터베이스 파일 경로 (환경변수 DATABASE_PATH로 변경 가능)
const DB_FILE = process.env.DATABASE_PATH || __dirname + '/travel_agency.db';

async function initializeDatabase() {
    try {
        const db = await open({
            filename: DB_FILE,
            driver: sqlite3.Database
        });

        logger.info(`데이터베이스 경로: ${DB_FILE}`);
        logger.info('데이터베이스에 성공적으로 연결되었습니다.');

        // SQLite 성능 최적화 (외장하드 — 용량 여유 있게)
        await db.run('PRAGMA journal_mode = WAL');
        await db.run('PRAGMA cache_size = -64000'); // 64MB 캐시
        await db.run('PRAGMA foreign_keys = ON');
        await db.run('PRAGMA wal_autocheckpoint = 2000'); // WAL 2000페이지마다 체크포인트
        await db.run('PRAGMA journal_size_limit = 67108864'); // WAL 최대 64MB
        await db.run('PRAGMA mmap_size = 268435456'); // 메모리 맵 256MB (대용량 읽기 가속)

        // 테이블 생성 (IF NOT EXISTS 사용으로 중복 생성 방지)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                name_kor TEXT NOT NULL,
                name_eng TEXT NOT NULL,
                passport_number TEXT NOT NULL UNIQUE,
                birth_date TEXT NOT NULL,
                passport_expiry TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                address TEXT,
                travel_history TEXT,
                notes TEXT,
                passport_file_name TEXT,
                passport_file_data TEXT, -- Base64 인코딩된 데이터 저장
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                destination TEXT NOT NULL,
                duration INTEGER NOT NULL,
                price INTEGER NOT NULL,
                status TEXT NOT NULL,
                description TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                departure_date TEXT,
                return_date TEXT,
                participants INTEGER,
                total_price INTEGER,
                hotel_name TEXT,
                flight_number TEXT,
                status TEXT,
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                booking_id TEXT,
                customer_name TEXT,
                product_name TEXT,
                departure_date TEXT,
                days_before INTEGER,
                notification_type TEXT,
                message TEXT,
                is_read INTEGER DEFAULT 0,
                priority TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                due_date TEXT,
                priority TEXT,
                description TEXT,
                is_completed INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_name TEXT,
                event_date TEXT,
                location TEXT,
                transport TEXT,
                time TEXT,
                schedule TEXT,
                meals TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS travel_saves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                images TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS flight_saves (
                id TEXT PRIMARY KEY,
                name TEXT,
                pnr TEXT,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS group_rosters (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS bus_reservations (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS saved_notices (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS invoice_recipients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS invoice_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS cost_calculations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE,
                name TEXT NOT NULL,
                destination TEXT,
                departure_date TEXT,
                arrival_date TEXT,
                nights INTEGER,
                days INTEGER,
                adults INTEGER DEFAULT 0,
                children INTEGER DEFAULT 0,
                infants INTEGER DEFAULT 0,
                tc INTEGER DEFAULT 0,
                domestic_vehicle_type TEXT,
                domestic_vehicle_total INTEGER DEFAULT 0,
                flight_data TEXT,
                etc_costs TEXT,
                land_cost_1 TEXT,
                land_cost_2 TEXT,
                margin_amount_1 INTEGER DEFAULT 0,
                margin_amount_2 INTEGER DEFAULT 0,
                notes_1 TEXT,
                notes_2 TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                destination TEXT,
                departure_date TEXT,
                return_date TEXT,
                members TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS sync_logs (
                id TEXT PRIMARY KEY,
                sync_type TEXT NOT NULL,
                group_id TEXT,
                group_name TEXT,
                operation TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT,
                status TEXT NOT NULL,
                details TEXT,
                error_message TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sync_logs_group ON sync_logs(group_id);
            CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

            CREATE TABLE IF NOT EXISTS flight_schedules (
                id TEXT PRIMARY KEY,
                group_id TEXT,
                group_name TEXT,
                airline TEXT NOT NULL,
                flight_number TEXT,
                departure_date TEXT NOT NULL,
                departure_airport TEXT NOT NULL,
                departure_time TEXT NOT NULL,
                arrival_date TEXT NOT NULL,
                arrival_airport TEXT NOT NULL,
                arrival_time TEXT NOT NULL,
                passengers INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS bank_accounts (
                id TEXT PRIMARY KEY,
                bank_name TEXT NOT NULL,
                account_number TEXT NOT NULL,
                account_holder TEXT NOT NULL,
                is_default INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                invoice_number TEXT UNIQUE,
                recipient TEXT NOT NULL,
                invoice_date TEXT NOT NULL,
                description TEXT,
                flight_schedule_id TEXT,
                airfare_unit_price INTEGER DEFAULT 0,
                airfare_quantity INTEGER DEFAULT 0,
                airfare_total INTEGER DEFAULT 0,
                seat_preference_unit_price INTEGER DEFAULT 0,
                seat_preference_quantity INTEGER DEFAULT 0,
                seat_preference_total INTEGER DEFAULT 0,
                total_amount INTEGER NOT NULL,
                bank_account_id TEXT,
                logo_path TEXT,
                seal_path TEXT,
                pdf_file_path TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (flight_schedule_id) REFERENCES flight_schedules(id) ON DELETE SET NULL,
                FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_flight_schedules_group_id ON flight_schedules(group_id);
            CREATE INDEX IF NOT EXISTS idx_flight_schedules_departure ON flight_schedules(departure_date);
            CREATE INDEX IF NOT EXISTS idx_bank_accounts_default ON bank_accounts(is_default);
            CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
            CREATE INDEX IF NOT EXISTS idx_invoices_flight_schedule ON invoices(flight_schedule_id);
            CREATE INDEX IF NOT EXISTS idx_invoices_bank_account ON invoices(bank_account_id);

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                password_hash TEXT,
                name TEXT NOT NULL,
                provider TEXT NOT NULL DEFAULT 'local',
                provider_id TEXT,
                profile_image TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                is_active INTEGER DEFAULT 1,
                last_login_at TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

            CREATE INDEX IF NOT EXISTS idx_customers_name_birth ON customers(name_kor, birth_date);
            CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
            CREATE INDEX IF NOT EXISTS idx_schedules_group_name ON schedules(group_name);
            CREATE INDEX IF NOT EXISTS idx_schedules_event_date ON schedules(event_date);
            CREATE INDEX IF NOT EXISTS idx_products_destination ON products(destination, status);
        `);

        logger.info('모든 테이블이 성공적으로 준비되었습니다.');

        // customers 테이블 마이그레이션: group_name 컬럼 추가
        try {
            const customersTableInfo = await db.all("PRAGMA table_info(customers)");
            const customersColumns = customersTableInfo.map(col => col.name);

            if (!customersColumns.includes('group_name')) {
                logger.info('customers 테이블에 group_name 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE customers ADD COLUMN group_name TEXT');
                logger.info('group_name 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!customersColumns.includes('last_modified')) {
                logger.info('customers 테이블에 last_modified 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE customers ADD COLUMN last_modified TEXT');
                logger.info('last_modified 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!customersColumns.includes('departure_date')) {
                logger.info('customers 테이블에 departure_date 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE customers ADD COLUMN departure_date TEXT');
                logger.info('departure_date 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!customersColumns.includes('travel_region')) {
                logger.info('customers 테이블에 travel_region 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE customers ADD COLUMN travel_region TEXT');
                logger.info('travel_region 컬럼이 성공적으로 추가되었습니다.');

                // 기존 데이터 마이그레이션: 여행이력에서 첫 번째 항목의 여행지역 추출
                logger.info('여행지역 데이터 마이그레이션 시작...');
                const customers = await db.all('SELECT id, travel_history FROM customers WHERE travel_history IS NOT NULL AND travel_history != ""');

                let migratedCount = 0;
                for (const customer of customers) {
                    if (customer.travel_history) {
                        // 여행이력 형식: "여행지역1(날짜1), 여행지역2(날짜2), ..."
                        // 첫 번째 항목의 여행지역 추출
                        const firstItem = customer.travel_history.split(',')[0].trim();
                        const match = firstItem.match(/^([^(]+)/);
                        if (match) {
                            const travelRegion = match[1].trim();
                            await db.run('UPDATE customers SET travel_region = ? WHERE id = ?', [travelRegion, customer.id]);
                            migratedCount++;
                        }
                    }
                }

                if (migratedCount > 0) {
                    logger.info(`✅ 여행지역 마이그레이션 완료: ${migratedCount}명의 고객 데이터 업데이트됨`);
                } else {
                    logger.info('ℹ️ 업데이트할 여행지역 데이터가 없습니다.');
                }
            }

            // TASK-502: 동기화 관련 필드 추가
            if (!customersColumns.includes('sync_source')) {
                logger.info('customers 테이블에 sync_source 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE customers ADD COLUMN sync_source TEXT DEFAULT "manual"');
                logger.info('sync_source 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!customersColumns.includes('sync_group_id')) {
                logger.info('customers 테이블에 sync_group_id 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE customers ADD COLUMN sync_group_id TEXT');
                logger.info('sync_group_id 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!customersColumns.includes('is_active')) {
                logger.info('customers 테이블에 is_active 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE customers ADD COLUMN is_active INTEGER DEFAULT 1');
                logger.info('is_active 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!customersColumns.includes('gender')) {
                logger.info('customers 테이블에 gender 컬럼을 추가하는 중...');
                await db.run("ALTER TABLE customers ADD COLUMN gender TEXT DEFAULT ''");
                logger.info('gender 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!customersColumns.includes('return_date')) {
                logger.info('customers 테이블에 return_date 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE customers ADD COLUMN return_date TEXT');
                logger.info('return_date 컬럼이 성공적으로 추가되었습니다.');
            }

            // 동기화 관련 인덱스 생성
            await db.run('CREATE INDEX IF NOT EXISTS idx_customers_sync_group ON customers(sync_group_id)');
            await db.run('CREATE INDEX IF NOT EXISTS idx_customers_sync_source ON customers(sync_source)');
        } catch (error) {
            logger.error('customers 테이블 마이그레이션 중 오류', { error: error.message });
            // 마이그레이션 실패해도 계속 진행
        }

        // bookings 테이블 마이그레이션: group_name 컬럼 추가
        try {
            const bookingsTableInfo = await db.all("PRAGMA table_info(bookings)");
            const bookingsColumns = bookingsTableInfo.map(col => col.name);

            if (!bookingsColumns.includes('group_name')) {
                logger.info('bookings 테이블에 group_name 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE bookings ADD COLUMN group_name TEXT');
                logger.info('group_name 컬럼이 성공적으로 추가되었습니다.');
            }
        } catch (error) {
            logger.error('bookings 테이블 마이그레이션 중 오류', { error: error.message });
            // 마이그레이션 실패해도 계속 진행
        }

        // 여행이력 데이터 마이그레이션: "단체명 (여행지역)" -> "여행지역"
        try {
            logger.info('여행이력 데이터 마이그레이션 시작...');
            const customers = await db.all('SELECT id, travel_history FROM customers WHERE travel_history IS NOT NULL AND travel_history != ""');

            let updatedCount = 0;
            for (const customer of customers) {
                const oldHistory = customer.travel_history;

                // "단체명 (여행지역)" 패턴을 "여행지역"으로 변환
                // 예: "김숭기-전라고 (태국파타야골프)" -> "태국파타야골프"
                // 쉼표로 구분된 여러 항목 처리
                const items = oldHistory.split(',').map(item => item.trim());
                const newItems = items.map(item => {
                    // "something (destination)" 패턴 찾기
                    const match = item.match(/^.*?\((.+?)\)$/);
                    if (match) {
                        // 괄호 안의 내용만 추출
                        return match[1].trim();
                    }
                    return item; // 패턴이 없으면 그대로 유지
                });

                const newHistory = newItems.join(', ');

                // 변경사항이 있으면 업데이트
                if (oldHistory !== newHistory) {
                    await db.run('UPDATE customers SET travel_history = ? WHERE id = ?', [newHistory, customer.id]);
                    updatedCount++;
                    logger.info(`  ✓ 고객 ID ${customer.id}: "${oldHistory}" -> "${newHistory}"`);
                }
            }

            if (updatedCount > 0) {
                logger.info(`✅ 여행이력 마이그레이션 완료: ${updatedCount}명의 고객 데이터 업데이트됨`);
            } else {
                logger.info('ℹ️ 업데이트할 여행이력 데이터가 없습니다.');
            }
        } catch (error) {
            logger.error('여행이력 마이그레이션 중 오류', { error: error.message });
            // 마이그레이션 실패해도 계속 진행
        }

        // schedules 테이블 마이그레이션: 필요한 모든 컬럼 확인 및 추가
        try {
            const tableInfo = await db.all("PRAGMA table_info(schedules)");
            const existingColumns = tableInfo.map(col => col.name);

            // 필요한 컬럼 목록
            const requiredColumns = [
                { name: 'group_name', type: 'TEXT' },
                { name: 'transport', type: 'TEXT' },
                { name: 'time', type: 'TEXT' },
                { name: 'meals', type: 'TEXT' },
                { name: 'schedule', type: 'TEXT' },
                { name: 'color', type: 'TEXT DEFAULT "#7B61FF"' }
            ];

            // description 컬럼이 있으면 schedule로 이름 변경 (호환성)
            if (existingColumns.includes('description') && !existingColumns.includes('schedule')) {
                logger.info('schedules 테이블의 description 컬럼을 schedule로 변경하는 중...');
                // SQLite는 컬럼 이름 변경을 직접 지원하지 않으므로, 
                // 새 컬럼 추가 후 데이터 복사 후 삭제하는 방식으로 처리
                await db.run('ALTER TABLE schedules ADD COLUMN schedule TEXT');
                await db.run('UPDATE schedules SET schedule = description WHERE schedule IS NULL');
                // existingColumns 배열 업데이트 (중복 추가 방지)
                existingColumns.push('schedule');
                logger.info('schedule 컬럼이 성공적으로 추가되었습니다.');
            }

            // 누락된 컬럼 추가
            for (const col of requiredColumns) {
                if (!existingColumns.includes(col.name)) {
                    logger.info(`schedules 테이블에 ${col.name} 컬럼을 추가하는 중...`);
                    await db.run(`ALTER TABLE schedules ADD COLUMN ${col.name} ${col.type}`);
                    logger.info(`${col.name} 컬럼이 성공적으로 추가되었습니다.`);
                }
            }
        } catch (error) {
            logger.error('schedules 테이블 마이그레이션 중 오류', { error: error.message });
            // 마이그레이션 실패해도 계속 진행
        }

        // TASK-503: groups 테이블 마이그레이션: 동기화 상태 필드 추가
        try {
            const groupsTableInfo = await db.all("PRAGMA table_info(groups)");
            const groupsColumns = groupsTableInfo.map(col => col.name);

            if (!groupsColumns.includes('last_sync_at')) {
                logger.info('groups 테이블에 last_sync_at 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE groups ADD COLUMN last_sync_at TEXT');
                logger.info('last_sync_at 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!groupsColumns.includes('sync_status')) {
                logger.info('groups 테이블에 sync_status 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE groups ADD COLUMN sync_status TEXT DEFAULT "pending"');
                logger.info('sync_status 컬럼이 성공적으로 추가되었습니다.');
            }

            // 동기화 관련 인덱스 생성
            await db.run('CREATE INDEX IF NOT EXISTS idx_groups_sync_status ON groups(sync_status)');
            await db.run('CREATE INDEX IF NOT EXISTS idx_groups_last_sync ON groups(last_sync_at)');

            // 아카이브 관련 컬럼 추가
            if (!groupsColumns.includes('is_archived')) {
                logger.info('groups 테이블에 is_archived 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE groups ADD COLUMN is_archived INTEGER DEFAULT 0');
                logger.info('is_archived 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!groupsColumns.includes('archived_at')) {
                logger.info('groups 테이블에 archived_at 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE groups ADD COLUMN archived_at TEXT');
                logger.info('archived_at 컬럼이 성공적으로 추가되었습니다.');
            }
        } catch (error) {
            logger.error('groups 테이블 마이그레이션 중 오류', { error: error.message });
            // 마이그레이션 실패해도 계속 진행
        }

        // cost_calculations 테이블 마이그레이션: tc(인솔자) 컬럼 추가
        try {
            const costCalcTableInfo = await db.all("PRAGMA table_info(cost_calculations)");
            const costCalcColumns = costCalcTableInfo.map(col => col.name);

            if (!costCalcColumns.includes('tc')) {
                logger.info('cost_calculations 테이블에 tc 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE cost_calculations ADD COLUMN tc INTEGER DEFAULT 0');
                logger.info('tc 컬럼이 성공적으로 추가되었습니다.');
            }
        } catch (error) {
            logger.error('cost_calculations 테이블 마이그레이션 중 오류', { error: error.message });
        }

        // products 테이블 마이그레이션: 호텔/차량/가이드/항공편/수배 컬럼 추가
        try {
            const productsTableInfo = await db.all("PRAGMA table_info(products)");
            const productsColumns = productsTableInfo.map(col => col.name);

            const requiredColumns = [
                // 호텔
                { name: 'hotel_name', type: 'TEXT' },
                { name: 'hotel_checkin', type: 'TEXT' },
                { name: 'hotel_checkout', type: 'TEXT' },
                { name: 'hotel_room_type', type: 'TEXT' },
                { name: 'hotel_rooms', type: 'INTEGER DEFAULT 0' },
                { name: 'hotel_note', type: 'TEXT' },
                // 차량
                { name: 'vehicle_type', type: 'TEXT' },
                { name: 'vehicle_count', type: 'INTEGER DEFAULT 0' },
                { name: 'vehicle_company', type: 'TEXT' },
                { name: 'vehicle_note', type: 'TEXT' },
                // 가이드
                { name: 'guide_name', type: 'TEXT' },
                { name: 'guide_phone', type: 'TEXT' },
                { name: 'guide_language', type: 'TEXT' },
                { name: 'guide_note', type: 'TEXT' },
                // 항공편
                { name: 'flight_id', type: 'TEXT' },
                { name: 'airline', type: 'TEXT' },
                { name: 'outbound_flight', type: 'TEXT' },
                { name: 'return_flight', type: 'TEXT' },
                { name: 'flight_note', type: 'TEXT' },
                // 수배 체크리스트
                { name: 'procurement_flight', type: 'INTEGER DEFAULT 0' },
                { name: 'procurement_hotel', type: 'INTEGER DEFAULT 0' },
                { name: 'procurement_vehicle', type: 'INTEGER DEFAULT 0' },
                { name: 'procurement_guide', type: 'INTEGER DEFAULT 0' },
                { name: 'procurement_visa', type: 'INTEGER DEFAULT 0' },
                { name: 'procurement_insurance', type: 'INTEGER DEFAULT 0' },
                { name: 'procurement_status', type: 'TEXT' },
                { name: 'procurement_note', type: 'TEXT' },
            ];

            let addedCount = 0;
            for (const col of requiredColumns) {
                if (!productsColumns.includes(col.name)) {
                    await db.run(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`);
                    addedCount++;
                }
            }
            if (addedCount > 0) {
                logger.info(`✅ products 테이블 마이그레이션 완료: ${addedCount}개 컬럼 추가됨`);
            }
        } catch (error) {
            logger.error('products 테이블 마이그레이션 중 오류', { error: error.message });
        }

        // invoices 테이블 마이그레이션: Advanced Mode 컬럼 추가
        try {
            const invoicesTableInfo = await db.all("PRAGMA table_info(invoices)");
            const invoicesColumns = invoicesTableInfo.map(col => col.name);

            const requiredColumns = [
                { name: 'calculation_mode', type: "TEXT DEFAULT 'simple'" },
                { name: 'base_price_per_person', type: 'INTEGER' },
                { name: 'total_participants', type: 'INTEGER' },
                { name: 'total_travel_cost', type: 'INTEGER' },
                { name: 'deposit_amount', type: 'INTEGER' },
                { name: 'deposit_description', type: 'TEXT' },
                { name: 'additional_items', type: 'TEXT' },
                { name: 'balance_due', type: 'INTEGER' },
            ];

            let addedCount = 0;
            for (const col of requiredColumns) {
                if (!invoicesColumns.includes(col.name)) {
                    await db.run(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type}`);
                    addedCount++;
                }
            }
            if (addedCount > 0) {
                logger.info(`✅ invoices 테이블 마이그레이션 완료: ${addedCount}개 컬럼 추가됨`);
            }
        } catch (error) {
            logger.error('invoices 테이블 마이그레이션 중 오류', { error: error.message });
        }

        // flight_schedules 테이블 마이그레이션: pnr, source 컬럼 추가 (air-booking 연동)
        try {
            const fsTableInfo = await db.all("PRAGMA table_info(flight_schedules)");
            const fsColumns = fsTableInfo.map(col => col.name);

            if (!fsColumns.includes('pnr')) {
                logger.info('flight_schedules 테이블에 pnr 컬럼을 추가하는 중...');
                await db.run('ALTER TABLE flight_schedules ADD COLUMN pnr TEXT');
                logger.info('pnr 컬럼이 성공적으로 추가되었습니다.');
            }

            if (!fsColumns.includes('source')) {
                logger.info('flight_schedules 테이블에 source 컬럼을 추가하는 중...');
                await db.run("ALTER TABLE flight_schedules ADD COLUMN source TEXT DEFAULT 'portal'");
                logger.info('source 컬럼이 성공적으로 추가되었습니다.');
            }

            await db.run('CREATE INDEX IF NOT EXISTS idx_fs_pnr ON flight_schedules(pnr)');
        } catch (error) {
            logger.error('flight_schedules 테이블 마이그레이션 중 오류', { error: error.message });
        }

        return db;
    } catch (error) {
        logger.error('데이터베이스 초기화 중 오류 발생', { error: error.message });
        process.exit(1); // 오류 발생 시 프로세스 종료
    }
}

module.exports = { initializeDatabase };
