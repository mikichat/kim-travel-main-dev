const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

/**
 * In-memory SQLite DB 생성 + 전체 스키마 초기화
 * 각 테스트 파일에서 독립적으로 호출하여 완전 격리된 DB 사용
 */
async function createTestDb() {
    const db = await open({
        filename: ':memory:',
        driver: sqlite3.Database,
    });

    await db.run('PRAGMA foreign_keys = ON');

    // 프로덕션 database.js의 스키마 + migration 컬럼 모두 포함
    await db.exec(`
        CREATE TABLE users (
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

        CREATE TABLE customers (
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
            passport_file_data TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            group_name TEXT,
            last_modified TEXT,
            departure_date TEXT,
            travel_region TEXT,
            sync_source TEXT DEFAULT 'manual',
            sync_group_id TEXT,
            is_active INTEGER DEFAULT 1,
            gender TEXT DEFAULT '',
            return_date TEXT
        );

        CREATE TABLE products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            destination TEXT NOT NULL,
            duration INTEGER NOT NULL,
            price INTEGER NOT NULL,
            status TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE bookings (
            id TEXT PRIMARY KEY,
            customer_id TEXT,
            customer_name TEXT NOT NULL,
            product_id TEXT,
            product_name TEXT NOT NULL,
            departure_date TEXT,
            return_date TEXT,
            participants INTEGER,
            total_price INTEGER,
            hotel_name TEXT,
            flight_number TEXT,
            status TEXT,
            notes TEXT,
            group_name TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE notifications (
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
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE todos (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            due_date TEXT,
            priority TEXT,
            description TEXT,
            is_completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE sync_logs (
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
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            destination TEXT,
            departure_date TEXT,
            return_date TEXT,
            members TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime')),
            last_sync_at TEXT,
            sync_status TEXT DEFAULT 'pending',
            is_archived INTEGER DEFAULT 0,
            archived_at TEXT
        );

        CREATE TABLE flight_schedules (
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

        CREATE TABLE bank_accounts (
            id TEXT PRIMARY KEY,
            bank_name TEXT NOT NULL,
            account_number TEXT NOT NULL,
            account_holder TEXT NOT NULL,
            is_default INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE invoices (
            id TEXT PRIMARY KEY,
            invoice_number TEXT UNIQUE,
            recipient TEXT NOT NULL,
            invoice_date TEXT NOT NULL,
            description TEXT,
            flight_schedule_id TEXT,
            bank_account_id TEXT,
            calculation_mode TEXT DEFAULT 'simple',
            base_price_per_person INTEGER,
            total_participants INTEGER,
            total_travel_cost INTEGER,
            deposit_amount INTEGER,
            deposit_description TEXT,
            additional_items TEXT,
            balance_due INTEGER,
            airfare_unit_price INTEGER DEFAULT 0,
            airfare_quantity INTEGER DEFAULT 0,
            airfare_total INTEGER DEFAULT 0,
            seat_preference_unit_price INTEGER DEFAULT 0,
            seat_preference_quantity INTEGER DEFAULT 0,
            seat_preference_total INTEGER DEFAULT 0,
            total_amount INTEGER NOT NULL,
            logo_path TEXT,
            seal_path TEXT,
            pdf_file_path TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (flight_schedule_id) REFERENCES flight_schedules(id) ON DELETE SET NULL,
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_name TEXT,
            event_date TEXT,
            location TEXT,
            transport TEXT,
            time TEXT,
            schedule TEXT,
            meals TEXT,
            color TEXT DEFAULT '#7B61FF',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE cost_calculations (
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

        CREATE INDEX idx_flight_schedules_group_id ON flight_schedules(group_id);
        CREATE INDEX idx_flight_schedules_departure ON flight_schedules(departure_date);
        CREATE INDEX idx_bank_accounts_default ON bank_accounts(is_default);
        CREATE INDEX idx_invoices_date ON invoices(invoice_date);
        CREATE INDEX idx_invoices_flight_schedule ON invoices(flight_schedule_id);
        CREATE INDEX idx_invoices_bank_account ON invoices(bank_account_id);
        CREATE INDEX idx_users_email ON users(email);
    `);

    return db;
}

/**
 * 테스트 간 데이터 정리 (스키마 유지, 데이터만 삭제)
 */
async function cleanupTestDb(db) {
    // FK 제약 임시 해제 후 전체 삭제
    await db.run('PRAGMA foreign_keys = OFF');
    await db.run('DELETE FROM invoices');
    await db.run('DELETE FROM flight_schedules');
    await db.run('DELETE FROM bank_accounts');
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM groups');
    await db.run('DELETE FROM schedules');
    await db.run('DELETE FROM cost_calculations');
    await db.run('DELETE FROM customers');
    await db.run('DELETE FROM products');
    await db.run('DELETE FROM bookings');
    await db.run('DELETE FROM notifications');
    await db.run('DELETE FROM todos');
    await db.run('DELETE FROM sync_logs');
    await db.run('PRAGMA foreign_keys = ON');
}

module.exports = { createTestDb, cleanupTestDb };
