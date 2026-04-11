// 데이터베이스 마이그레이션 스크립트: 인보이스 관련 테이블 생성
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_FILE = path.join(__dirname, 'travel_agency.db');
const db = new sqlite3.Database(DB_FILE);

console.log('=== 인보이스 관련 테이블 마이그레이션 시작 ===\n');

db.serialize(() => {
    // 1. flight_schedules 테이블 생성
    console.log('1. flight_schedules 테이블 생성 중...');
    db.run(`
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
        )
    `, (err) => {
        if (err) {
            console.error('flight_schedules 테이블 생성 실패:', err);
            return;
        }
        console.log('   flight_schedules 테이블 생성 완료\n');

        // 인덱스 생성
        db.run('CREATE INDEX IF NOT EXISTS idx_flight_schedules_group_id ON flight_schedules(group_id)', (err) => {
            if (err) console.error('인덱스 생성 실패:', err);
        });
        db.run('CREATE INDEX IF NOT EXISTS idx_flight_schedules_departure ON flight_schedules(departure_date)', (err) => {
            if (err) console.error('인덱스 생성 실패:', err);
        });

        // 2. bank_accounts 테이블 생성
        console.log('2. bank_accounts 테이블 생성 중...');
        db.run(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id TEXT PRIMARY KEY,
                bank_name TEXT NOT NULL,
                account_number TEXT NOT NULL,
                account_holder TEXT NOT NULL,
                is_default INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            )
        `, (err) => {
            if (err) {
                console.error('bank_accounts 테이블 생성 실패:', err);
                return;
            }
            console.log('   bank_accounts 테이블 생성 완료\n');

            // 인덱스 생성
            db.run('CREATE INDEX IF NOT EXISTS idx_bank_accounts_default ON bank_accounts(is_default)', (err) => {
                if (err) console.error('인덱스 생성 실패:', err);
            });

            // 3. invoices 테이블 생성
            console.log('3. invoices 테이블 생성 중...');
            db.run(`
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
                )
            `, (err) => {
                if (err) {
                    console.error('invoices 테이블 생성 실패:', err);
                    return;
                }
                console.log('   invoices 테이블 생성 완료\n');

                // 인덱스 생성
                db.run('CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date)', (err) => {
                    if (err) console.error('인덱스 생성 실패:', err);
                });
                db.run('CREATE INDEX IF NOT EXISTS idx_invoices_flight_schedule ON invoices(flight_schedule_id)', (err) => {
                    if (err) console.error('인덱스 생성 실패:', err);
                });
                db.run('CREATE INDEX IF NOT EXISTS idx_invoices_bank_account ON invoices(bank_account_id)', (err) => {
                    if (err) console.error('인덱스 생성 실패:', err);
                });

                // 4. 기본 은행 계좌 데이터 추가 (선택적)
                console.log('4. 기본 데이터 확인 중...');
                db.get('SELECT COUNT(*) as count FROM bank_accounts', [], (err, row) => {
                    if (err) {
                        console.error('데이터 확인 실패:', err);
                        db.close();
                        return;
                    }

                    if (row.count === 0) {
                        console.log('   기본 은행 계좌 데이터 추가 중...');
                        const { v4: uuidv4 } = require('uuid');
                        const defaultBankAccount = {
                            id: uuidv4(),
                            bank_name: '하나은행',
                            account_number: '611-016420-721',
                            account_holder: '(유)여행세상',
                            is_default: 1
                        };

                        db.run(`
                            INSERT INTO bank_accounts (id, bank_name, account_number, account_holder, is_default)
                            VALUES (?, ?, ?, ?, ?)
                        `, [
                            defaultBankAccount.id,
                            defaultBankAccount.bank_name,
                            defaultBankAccount.account_number,
                            defaultBankAccount.account_holder,
                            defaultBankAccount.is_default
                        ], (err) => {
                            if (err) {
                                console.error('기본 데이터 추가 실패:', err);
                            } else {
                                console.log('   기본 은행 계좌 데이터 추가 완료\n');
                            }
                            db.close();
                            console.log('=== 마이그레이션 완료 ===');
                        });
                    } else {
                        console.log('   기존 데이터 확인 완료\n');
                        db.close();
                        console.log('=== 마이그레이션 완료 ===');
                    }
                });
            });
        });
    });
});
