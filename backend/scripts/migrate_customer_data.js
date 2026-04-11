// 기존 고객 데이터의 출발일과 여행이력 필드를 수정하는 마이그레이션 스크립트
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'travel_agency.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 데이터 마이그레이션 시작...');
console.log('📁 DB 경로:', dbPath);

// 날짜 형식 체크 (YYYY-MM-DD 또는 YYYY년MM월DD일)
function isDateFormat(str) {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
    // YYYY년MM월DD일 형식
    if (/^\d{4}년\d{1,2}월\d{1,2}일$/.test(trimmed)) return true;
    return false;
}

// 여행이력 형식 체크 (긴 텍스트, 여러 국가/날짜 포함, 쉼표로 구분)
function isTravelHistoryFormat(str) {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    // 단순 날짜 형식이면 여행이력이 아님
    if (isDateFormat(trimmed)) return false;
    // 여행이력은 보통 쉼표를 포함하거나, 국가명(괄호) 형식
    return trimmed.includes(',') || (trimmed.includes('(') && trimmed.includes(')'));
}

// 한국어 날짜를 ISO 형식으로 변환 (YYYY년MM월DD일 -> YYYY-MM-DD)
function convertKoreanDateToISO(str) {
    if (!str || typeof str !== 'string') return str;
    const match = str.match(/^(\d{4})년(\d{1,2})월(\d{1,2})일$/);
    if (match) {
        const [_, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return str;
}

db.serialize(() => {
    // 모든 고객 데이터 가져오기
    db.all('SELECT id, name_kor, departure_date, travel_history FROM customers', [], (err, rows) => {
        if (err) {
            console.error('❌ 데이터 조회 실패:', err);
            return;
        }

        console.log(`\n📊 총 ${rows.length}명의 고객 데이터 확인 중...\n`);

        let fixCount = 0;
        let skipCount = 0;
        const updates = [];

        rows.forEach((row, index) => {
            const { id, name_kor, departure_date, travel_history } = row;

            // 교환이 필요한 경우 판단
            const shouldSwap = (
                // Case 1: departure_date가 여행이력 형식이고, travel_history가 날짜 형식
                (isTravelHistoryFormat(departure_date) && isDateFormat(travel_history)) ||
                // Case 2: departure_date가 여행이력 형식이고, travel_history가 비어있음
                (isTravelHistoryFormat(departure_date) && !travel_history) ||
                // Case 3: departure_date가 비어있고, travel_history가 날짜 형식
                (!departure_date && isDateFormat(travel_history))
            );

            if (shouldSwap) {
                fixCount++;

                // 날짜 형식 변환
                let newDepartureDate = travel_history || '';
                if (isDateFormat(newDepartureDate)) {
                    newDepartureDate = convertKoreanDateToISO(newDepartureDate);
                }

                console.log(`${fixCount}. [수정 필요] ${name_kor} (ID: ${id})`);
                console.log(`   현재 출발일: "${departure_date || '(없음)'}"`);
                console.log(`   현재 여행이력: "${travel_history || '(없음)'}"`);
                console.log(`   → 수정 후: 출발일="${newDepartureDate}", 여행이력="${departure_date || ''}"`);
                console.log('');

                updates.push({
                    id,
                    newDepartureDate: newDepartureDate,
                    newTravelHistory: departure_date || ''
                });
            } else {
                skipCount++;
            }
        });

        console.log(`\n📈 분석 결과:`);
        console.log(`   ✅ 정상: ${skipCount}명`);
        console.log(`   🔄 수정 필요: ${fixCount}명`);

        if (fixCount === 0) {
            console.log('\n✨ 모든 데이터가 정상입니다. 수정할 내용이 없습니다.');
            db.close();
            return;
        }

        // 사용자 확인
        console.log('\n⚠️  위 데이터를 수정하시겠습니까?');
        console.log('📝 계속하려면 아무 키나 누르세요. (Ctrl+C로 취소)');

        process.stdin.once('data', () => {
            console.log('\n🔄 데이터 업데이트 시작...\n');

            let completed = 0;
            let failed = 0;

            const updatePromises = updates.map(({ id, newDepartureDate, newTravelHistory }) => {
                return new Promise((resolve) => {
                    db.run(
                        'UPDATE customers SET departure_date = ?, travel_history = ? WHERE id = ?',
                        [newDepartureDate, newTravelHistory, id],
                        function(err) {
                            if (err) {
                                console.error(`❌ 업데이트 실패 (ID: ${id}):`, err);
                                failed++;
                            } else {
                                completed++;
                                console.log(`✅ 업데이트 완료 (${completed}/${updates.length}): ID ${id}`);
                            }
                            resolve();
                        }
                    );
                });
            });

            Promise.all(updatePromises).then(() => {
                console.log('\n🎉 마이그레이션 완료!');
                console.log(`   ✅ 성공: ${completed}건`);
                console.log(`   ❌ 실패: ${failed}건`);

                db.close((err) => {
                    if (err) {
                        console.error('❌ DB 종료 실패:', err);
                    } else {
                        console.log('\n✨ 데이터베이스 연결 종료');
                    }
                    process.exit(0);
                });
            });
        });
    });
});

// Ctrl+C 처리
process.on('SIGINT', () => {
    console.log('\n\n🚫 사용자가 취소했습니다.');
    db.close();
    process.exit(0);
});
