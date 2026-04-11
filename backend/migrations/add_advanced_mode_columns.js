/**
 * Migration: Add Advanced Mode Columns to Invoices Table
 * Date: 2026-01-02
 * Description: Adds columns to support advanced invoice calculation mode
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 경로
const DB_PATH = path.join(__dirname, '..', 'travel_agency.db');

console.log('='.repeat(60));
console.log('Advanced Mode Migration Script');
console.log('='.repeat(60));
console.log('Database:', DB_PATH);
console.log('Date:', new Date().toISOString());
console.log('');

// 데이터베이스 연결
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to database');
});

// 마이그레이션 실행
function runMigration() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            console.log('\n📋 Starting migration...\n');

            // 1. 현재 스키마 확인
            db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='invoices'", (err, row) => {
                if (err) {
                    console.error('❌ Error checking schema:', err.message);
                    reject(err);
                    return;
                }

                if (!row) {
                    console.error('❌ invoices table does not exist!');
                    reject(new Error('invoices table not found'));
                    return;
                }

                console.log('📊 Current schema:');
                console.log(row.sql);
                console.log('');
            });

            // 2. 컬럼 추가 (이미 존재하면 무시)
            const columns = [
                {
                    name: 'calculation_mode',
                    type: 'TEXT DEFAULT \'simple\'',
                    description: '계산 모드 (simple/advanced)'
                },
                {
                    name: 'base_price_per_person',
                    type: 'INTEGER',
                    description: '1인당 요금'
                },
                {
                    name: 'total_participants',
                    type: 'INTEGER',
                    description: '총 인원'
                },
                {
                    name: 'total_travel_cost',
                    type: 'INTEGER',
                    description: '총 여행경비'
                },
                {
                    name: 'deposit_amount',
                    type: 'INTEGER',
                    description: '계약금 금액'
                },
                {
                    name: 'deposit_description',
                    type: 'TEXT',
                    description: '계약금 설명'
                },
                {
                    name: 'additional_items',
                    type: 'TEXT',
                    description: '추가 비용 항목 (JSON)'
                },
                {
                    name: 'balance_due',
                    type: 'INTEGER',
                    description: '잔금'
                }
            ];

            let completedCount = 0;
            let errorCount = 0;

            columns.forEach((column, index) => {
                const sql = `ALTER TABLE invoices ADD COLUMN ${column.name} ${column.type}`;

                db.run(sql, (err) => {
                    if (err) {
                        if (err.message.includes('duplicate column name')) {
                            console.log(`⚠️  Column '${column.name}' already exists - skipping`);
                        } else {
                            console.error(`❌ Error adding column '${column.name}':`, err.message);
                            errorCount++;
                        }
                    } else {
                        console.log(`✅ Added column: ${column.name} (${column.description})`);
                        completedCount++;
                    }

                    // 모든 컬럼 처리 완료 확인
                    if (index === columns.length - 1) {
                        setTimeout(() => {
                            console.log('\n' + '='.repeat(60));
                            console.log('Migration Summary:');
                            console.log('='.repeat(60));
                            console.log(`✅ Successfully added: ${completedCount} columns`);
                            console.log(`⚠️  Skipped (already exist): ${columns.length - completedCount - errorCount} columns`);
                            console.log(`❌ Errors: ${errorCount} columns`);
                            console.log('');

                            if (errorCount > 0) {
                                reject(new Error('Migration completed with errors'));
                            } else {
                                resolve();
                            }
                        }, 100);
                    }
                });
            });
        });
    });
}

// 스키마 검증
function verifySchema() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Verifying schema...\n');

        db.all("PRAGMA table_info(invoices)", (err, rows) => {
            if (err) {
                console.error('❌ Error verifying schema:', err.message);
                reject(err);
                return;
            }

            console.log('📊 Updated schema (all columns):');
            console.log('─'.repeat(60));
            rows.forEach(row => {
                const marker = row.name.includes('calculation') ||
                              row.name.includes('base_price') ||
                              row.name.includes('participants') ||
                              row.name.includes('travel_cost') ||
                              row.name.includes('deposit') ||
                              row.name.includes('additional') ||
                              row.name.includes('balance') ? '🆕' : '  ';
                console.log(`${marker} ${row.name.padEnd(30)} ${row.type.padEnd(15)} ${row.dflt_value || ''}`);
            });
            console.log('─'.repeat(60));
            console.log('');

            resolve();
        });
    });
}

// 마이그레이션 실행
async function main() {
    try {
        await runMigration();
        await verifySchema();

        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('📝 Next steps:');
        console.log('1. Update API endpoints to handle Advanced Mode data');
        console.log('2. Test saving and loading invoices with Advanced Mode');
        console.log('3. Update frontend to send/receive Advanced Mode data');
        console.log('');

        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
                process.exit(1);
            }
            console.log('✅ Database connection closed');
            process.exit(0);
        });
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        db.close();
        process.exit(1);
    }
}

// 실행
main();
