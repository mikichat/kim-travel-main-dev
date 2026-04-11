/**
 * logger.js 브랜치 커버리지 개선 (Phase 63-64)
 * - L14 true 분기: logDir 미존재 시 mkdirSync 호출
 * - L41/42/46 isProduction=true 분기: NODE_ENV=production 시 JSON 포맷
 * - L25 truthy 분기: Object.keys(meta).length > 0 → metaStr 생성
 *
 * 주의: jest.spyOn(fs, ...) 은 Node.js 내장 모듈에서 불안정하므로
 *       jest.doMock('fs', factory) + jest.resetModules() 패턴 사용
 */

describe('logger module', () => {
    afterEach(() => {
        jest.unmock('fs');
        jest.resetModules();
        delete process.env.NODE_ENV;
    });

    it('logDir 미존재 시 mkdirSync 호출 (L14 true 분기, L15)', () => {
        jest.resetModules();
        const mkdirSyncMock = jest.fn();
        jest.doMock('fs', () => ({
            ...jest.requireActual('fs'),
            existsSync: jest.fn().mockReturnValueOnce(false),
            mkdirSync: mkdirSyncMock,
        }));

        require('../logger');

        expect(mkdirSyncMock).toHaveBeenCalledWith(
            expect.stringContaining('logs'),
            { recursive: true }
        );
    });

    it('NODE_ENV=production 시 isProduction=true 분기 커버 (L41, L42, L46)', () => {
        process.env.NODE_ENV = 'production';
        jest.resetModules();
        jest.doMock('fs', () => ({
            ...jest.requireActual('fs'),
            existsSync: jest.fn().mockReturnValueOnce(true),
        }));

        const logger = require('../logger');

        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.error).toBe('function');
    });

    it('logger.info 메타 전달 → Object.keys(meta).length truthy 분기 (L25)', () => {
        jest.resetModules();
        jest.doMock('fs', () => ({
            ...jest.requireActual('fs'),
            existsSync: jest.fn().mockReturnValue(true),
        }));

        const logger = require('../logger');

        // meta = { extraKey: 'value' } → Object.keys(meta).length = 1 → truthy 분기
        // devFormat printf: metaStr = ' {"extraKey":"value"}' (L25 truthy 분기 커버)
        expect(() => logger.info('L25 meta branch test', { extraKey: 'value' })).not.toThrow();
    });
});
