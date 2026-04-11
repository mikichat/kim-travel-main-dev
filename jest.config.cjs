module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/__tests__/js/**/*.test.js'],
    transform: {
        'js[\\\\/]modules[\\\\/].*\\.js$': '<rootDir>/__tests__/js/esm-transform.cjs',
    },
    transformIgnorePatterns: [],
    verbose: true,
    // 테스트에서 require()하는 파일만 커버리지 측정
    collectCoverageFrom: [
        'js/airline-codes.js',
        'js/airport-database.js',
        'js/auto-backup.js',
        'js/conflict-resolver.js',
        'js/fetch-utils.js',
        'js/flight-sync-manager.js',
        'js/group-sync-manager.js',
        'js/product-matcher.js',
        'js/modules/excelParser.js',
    ],
    coverageThreshold: {
        global: {
            statements: 90,
            branches: 85,
            functions: 90,
            lines: 90,
        },
    },
};
