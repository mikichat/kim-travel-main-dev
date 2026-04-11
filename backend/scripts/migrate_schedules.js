// 데이터베이스 마이그레이션 스크립트: schedules 테이블 구조 변경
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./travel_agency.db');

console.log('=== Schedules 테이블 마이그레이션 시작 ===\n');

// 트랜잭션 시작
db.serialize(() => {
    // 1. 기존 데이터 백업
    console.log('1. 기존 데이터 백업 중...');
    db.all('SELECT * FROM schedules', [], (err, rows) => {
        if (err) {
            console.error('백업 실패:', err);
            return;
        }
        console.log(`   총 ${rows.length}개의 데이터를 백업했습니다.\n`);

        // 2. 임시 테이블로 데이터 이동
        console.log('2. 임시 테이블 생성 중...');
        db.run(`
            CREATE TABLE IF NOT EXISTS schedules_backup (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_name TEXT,
                event_date TEXT,
                location TEXT,
                description TEXT,
                created_at TEXT
            )
        `, (err) => {
            if (err) {
                console.error('임시 테이블 생성 실패:', err);
                return;
            }

            db.run('INSERT INTO schedules_backup SELECT * FROM schedules', (err) => {
                if (err) {
                    console.error('데이터 백업 실패:', err);
                    return;
                }
                console.log('   임시 테이블에 데이터 백업 완료\n');

                // 3. 기존 테이블 삭제
                console.log('3. 기존 테이블 삭제 중...');
                db.run('DROP TABLE schedules', (err) => {
                    if (err) {
                        console.error('테이블 삭제 실패:', err);
                        return;
                    }
                    console.log('   기존 테이블 삭제 완료\n');

                    // 4. 새로운 스키마로 테이블 재생성
                    console.log('4. 새로운 스키마로 테이블 생성 중...');
                    db.run(`
                        CREATE TABLE schedules (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            event_date TEXT,
                            location TEXT,
                            transport TEXT,
                            time TEXT,
                            schedule TEXT,
                            meals TEXT,
                            created_at TEXT DEFAULT (datetime('now','localtime'))
                        )
                    `, (err) => {
                        if (err) {
                            console.error('새 테이블 생성 실패:', err);
                            return;
                        }
                        console.log('   새 테이블 생성 완료\n');

                        // 5. 데이터 마이그레이션 (description 파싱)
                        console.log('5. 데이터 마이그레이션 중...');

                        const stmt = db.prepare(`
                            INSERT INTO schedules (event_date, location, transport, time, schedule, meals, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `);

                        let migrated = 0;
                        rows.forEach((row) => {
                            // description에서 정보 추출
                            const transport = extractInfo(row.description, '교통편');
                            const time = extractInfo(row.description, '시간');
                            const meals = extractInfo(row.description, '식사');
                            const schedule = getMainSchedule(row.description, row.event_name);

                            stmt.run(
                                row.event_date,
                                row.location,
                                transport,
                                time,
                                schedule,
                                meals,
                                row.created_at,
                                (err) => {
                                    if (err) {
                                        console.error('   데이터 삽입 실패:', err);
                                    } else {
                                        migrated++;
                                        if (migrated === rows.length) {
                                            console.log(`   총 ${migrated}개의 데이터 마이그레이션 완료\n`);
                                            finalize();
                                        }
                                    }
                                }
                            );
                        });

                        function finalize() {
                            stmt.finalize(() => {
                                // 6. 검증
                                console.log('6. 마이그레이션 검증 중...');
                                db.get('SELECT COUNT(*) as count FROM schedules', (err, result) => {
                                    if (err) {
                                        console.error('검증 실패:', err);
                                        return;
                                    }
                                    console.log(`   새 테이블: ${result.count}개`);
                                    console.log(`   원본 데이터: ${rows.length}개`);

                                    if (result.count === rows.length) {
                                        console.log('   ✅ 검증 성공!\n');
                                        console.log('=== 마이그레이션 완료 ===');
                                        console.log('백업 테이블(schedules_backup)은 유지됩니다.');
                                        console.log('문제가 없으면 나중에 삭제하세요: DROP TABLE schedules_backup;\n');
                                    } else {
                                        console.log('   ⚠️ 데이터 개수 불일치!');
                                    }

                                    db.close();
                                });
                            });
                        }
                    });
                });
            });
        });
    });
});

// 헬퍼 함수: description에서 특정 정보 추출
function extractInfo(description, key) {
    if (!description) return null;
    const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
    const match = description.match(regex);
    return match ? match[1].trim() : null;
}

// 헬퍼 함수: 메인 일정 추출
function getMainSchedule(description, eventName) {
    if (!description) return eventName;

    // event_name과 description을 합쳐서 schedule로
    let schedule = eventName || '';

    // 일정: 다음에 오는 내용 추출
    if (description.includes('일정:')) {
        const afterSchedule = description.split('일정:')[1];
        if (afterSchedule) {
            const mainContent = afterSchedule
                .split('\n')
                .filter(line => {
                    const trimmed = line.trim();
                    return trimmed && !trimmed.match(/^(시간|식사|교통편|HOTEL):/i);
                })
                .map(line => line.trim())
                .join('\n');

            if (mainContent) {
                schedule = schedule ? `${schedule}\n${mainContent}` : mainContent;
            }
        }
    } else {
        // 일정: 라벨이 없으면 전체 description에서 추출
        const lines = description.split('\n');
        const mainLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.match(/^(시간|식사|교통편|HOTEL):/i);
        });

        if (mainLines.length > 0) {
            const content = mainLines.join('\n');
            schedule = schedule ? `${schedule}\n${content}` : content;
        }
    }

    return schedule || eventName || null;
}
