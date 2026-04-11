/**
 * 구조화된 로깅 모듈 (winston)
 * - 콘솔: 컬러 + 타임스탬프
 * - 파일: logs/error.log (error 이상), logs/combined.log (전체)
 * - 프로덕션: JSON 포맷 / 개발: 읽기 쉬운 포맷
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// logs 디렉토리 생성
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';

// 개발용 포맷: 타임스탬프 + 레벨 + 메시지
const devFormat = format.combine(
    format.timestamp({ format: 'HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        if (stack) {
            return `${timestamp} [${level}] ${message}\n${stack}`;
        }
        return `${timestamp} [${level}] ${message}${metaStr}`;
    })
);

// 프로덕션 포맷: JSON
const prodFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
);

const logger = createLogger({
    level: isProduction ? 'info' : 'debug',
    format: isProduction ? prodFormat : devFormat,
    transports: [
        // 콘솔 출력
        new transports.Console({
            format: isProduction ? prodFormat : format.combine(
                format.colorize(),
                devFormat
            ),
        }),
        // 에러 로그 파일
        new transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 3,
        }),
        // 전체 로그 파일
        new transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }),
    ],
});

module.exports = logger;
