const Database = require('better-sqlite3');
const db = new Database('travel_bookings.db');

console.log('\n=== 강대우 단체 생년월일 확인 ===\n');

// 강대우 단체의 모든 고객 조회
const customers = db.prepare(`
    SELECT id, name_kor, birth_date, passport_number
    FROM customers
    WHERE group_name = '강대우'
    ORDER BY name_kor
`).all();

if (customers.length === 0) {
    console.log('❌ "강대우" 단체를 찾을 수 없습니다.\n');
    console.log('데이터베이스에 있는 모든 단체명:');
    const groups = db.prepare('SELECT DISTINCT group_name FROM customers ORDER BY group_name').all();
    groups.forEach(g => console.log('  - ' + g.group_name));
} else {
    console.log(`총 ${customers.length}명 발견\n`);

    let errorCount = 0;
    let validCount = 0;

    customers.forEach((customer, index) => {
        const birthDate = customer.birth_date || '';
        let hasError = false;
        let errorMessage = '';

        // 생년월일 형식 확인
        if (!birthDate) {
            hasError = true;
            errorMessage = '생년월일 없음';
        } else if (birthDate.includes('-')) {
            const parts = birthDate.split('-');
            const year = parts[0];

            // 1900년대 오류 확인 (1900-1924년은 비정상적으로 오래됨)
            if (year.startsWith('19') && parseInt(year) < 1925) {
                hasError = true;
                errorMessage = `1900년대 초반 날짜 의심 (${year}년 - 100세 이상)`;
            }
            // 2025년 이후 출생은 미래 날짜 오류
            else if (year.startsWith('20') && parseInt(year) > 2025) {
                hasError = true;
                errorMessage = `미래 날짜 오류 (${year}년)`;
            }
        } else {
            hasError = true;
            errorMessage = '날짜 형식 오류';
        }

        if (hasError) {
            errorCount++;
            console.log(`❌ [${index + 1}] ${customer.name_kor}`);
            console.log(`   생년월일: ${birthDate || '없음'}`);
            console.log(`   여권번호: ${customer.passport_number || '없음'}`);
            console.log(`   문제: ${errorMessage}\n`);
        } else {
            validCount++;
            console.log(`✅ [${index + 1}] ${customer.name_kor} - ${birthDate}`);
        }
    });

    console.log('\n=== 요약 ===');
    console.log(`정상: ${validCount}명`);
    console.log(`오류: ${errorCount}명`);

    if (errorCount > 0) {
        console.log('\n⚠️ 생년월일 오류가 발견되었습니다.');
        console.log('2자리 연도(YY)를 4자리 연도(YYYY)로 변환할 때:');
        console.log('  - 현재 로직: 50~99 → 1900년대, 00~49 → 2000년대');
        console.log('  - 제안 로직: 00~99 → 1900년대, 00 이후 → 2000년대 (단, 시대 구분 필요)');
    }
}

db.close();
