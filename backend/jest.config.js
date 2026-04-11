module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    setupFiles: ['<rootDir>/__tests__/setup/jest.setup.js'],
    maxWorkers: 1,
    testTimeout: 15000,
    verbose: true,
    // uuid v13+ is ESM-only → CJS mock으로 대체
    moduleNameMapper: {
        '^uuid$': '<rootDir>/__tests__/setup/uuid-mock.js',
    },
    // 커버리지 측정 대상 명시: Gemini AI + multer 의존성이 있는 upload.js 제외
    collectCoverageFrom: [
        'logger.js',
        'middleware/**/*.js',
        'routes/**/*.js',
        '!routes/upload.js',
        'services/**/*.js',
    ],
    coverageThreshold: {
        global: {
            statements: 90,
            branches: 85,
            functions: 95,
            lines: 90,
        },
    },
};
