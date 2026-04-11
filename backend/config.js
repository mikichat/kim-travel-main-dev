/**
 * 서버 설정 파일
 * 환경 변수 또는 기본값 사용
 */

const path = require('path');

module.exports = {
    // 서버 포트 설정
    // 환경 변수 PORT가 설정되어 있으면 사용, 없으면 5000 사용
    // 포트를 변경하려면:
    // 1. .env 파일에 PORT=원하는포트번호 추가
    // 2. 또는 명령줄에서: set PORT=5001 (Windows) 또는 PORT=5001 (Linux/Mac)
    port: process.env.PORT || 5000,
    
    // 데이터베이스 설정
    dbPath: process.env.DB_PATH || path.join(__dirname, 'travel_agency.db'),
    
    // 기타 설정
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
};
