// ─────────────────────────────────────────────────────────
//  upload.test.js  (Phase 66)
//  upload.js 주요 경로 동작 검증 (커버리지 측정 제외)
//    - POST /api/passport-ocr/scan (OCR 프록시)
//    - POST /api/upload (파일 업로드 + Gemini)
//    - POST /api/parse-product-file (HWP/HWPX 파싱)
// ─────────────────────────────────────────────────────────

// 외부 의존성 mock (require 전에 hoisting됨)
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: { text: () => '[]' }
            })
        })
    }))
}));

jest.mock('hwp.js', () => ({
    parse: jest.fn().mockReturnValue({ sections: [] })
}));

jest.mock('unpdf', () => ({
    extractText: jest.fn().mockResolvedValue({ text: 'extracted pdf text' })
}));

jest.mock('mammoth', () => ({
    extractRawText: jest.fn().mockResolvedValue({ value: 'extracted docx text' })
}));

jest.mock('xlsx', () => ({
    readFile: jest.fn().mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
    }),
    utils: {
        sheet_to_html: jest.fn().mockReturnValue('<table><tr><td>test data</td></tr></table>')
    }
}));

const fs = require('fs');
const supertest = require('supertest');
const express = require('express');
const { createUploadRoutes, uploadDir } = require('../../routes/upload');
const hwpParser = require('hwp.js');

const noopRateLimit = (req, res, next) => next();

function buildApp(getDbInstance) {
    const app = express();
    app.use(express.json());
    const router = createUploadRoutes({
        uploadRateLimit: noopRateLimit,
        getDbInstance: getDbInstance || (() => ({ run: jest.fn().mockResolvedValue({}) }))
    });
    app.use('/api', router);
    return app;
}

beforeAll(() => {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
});

afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
});

// ─────────────────────────────────────────────────────────
// POST /api/passport-ocr/scan — OCR 프록시
// ─────────────────────────────────────────────────────────

describe('POST /api/passport-ocr/scan', () => {
    it('200: OCR 서버 응답을 그대로 반환', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            status: 200,
            json: async () => ({ name: '홍길동', passport_no: 'M12345678' })
        });

        const res = await supertest(buildApp())
            .post('/api/passport-ocr/scan')
            .send({ image: 'base64data' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('홍길동');
        expect(res.body.passport_no).toBe('M12345678');
    });

    it('502: OCR 서버 연결 실패 → 502 반환', async () => {
        jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

        const res = await supertest(buildApp())
            .post('/api/passport-ocr/scan')
            .send({ image: 'base64data' });

        expect(res.status).toBe(502);
        expect(res.body.error).toMatch(/OCR 서버 연결 실패/);
    });
});

// ─────────────────────────────────────────────────────────
// POST /api/upload — 파일 업로드 + Gemini 처리
// ─────────────────────────────────────────────────────────

describe('POST /api/upload', () => {
    it('400: 파일 없음', async () => {
        const res = await supertest(buildApp())
            .post('/api/upload')
            .field('group_name', '테스트단체');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/파일/);
    });

    it('400: group_name 미제공 → 업로드 파일 삭제 후 에러', async () => {
        const res = await supertest(buildApp())
            .post('/api/upload')
            .attach('schedule_file', Buffer.from('dummy content'), {
                filename: 'test.xlsx',
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/그룹명/);
    });

    it('400: group_name 200자 초과 → 업로드 파일 삭제 후 에러', async () => {
        const res = await supertest(buildApp())
            .post('/api/upload')
            .attach('schedule_file', Buffer.from('dummy content'), {
                filename: 'test.xlsx',
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            .field('group_name', 'a'.repeat(201));

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/200자/);
    });

    it('503: GEMINI_API_KEY 미설정 → 업로드 파일 삭제 후 에러', async () => {
        delete process.env.GEMINI_API_KEY;

        const res = await supertest(buildApp())
            .post('/api/upload')
            .attach('schedule_file', Buffer.from('dummy content'), {
                filename: 'test.xlsx',
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            .field('group_name', '테스트단체');

        expect(res.status).toBe(503);
        expect(res.body.error).toMatch(/AI 분석/);
    });

    it('200: 엑셀 업로드 성공 (Gemini mock → 빈 배열 → saved:0)', async () => {
        process.env.GEMINI_API_KEY = 'test-key';
        // getLatestFlashModel 내부 fetch 실패 → 기본 모델(gemini-1.5-flash) 사용
        jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));

        const res = await supertest(buildApp())
            .post('/api/upload')
            .attach('schedule_file', Buffer.from('dummy content'), {
                filename: 'test.xlsx',
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            .field('group_name', '테스트단체');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.saved).toBe(0);
        expect(res.body.total).toBe(0);
        expect(res.body.group_name).toBe('테스트단체');
    });
});

// ─────────────────────────────────────────────────────────
// POST /api/parse-product-file — HWP 파싱
// ─────────────────────────────────────────────────────────

describe('POST /api/parse-product-file', () => {
    it('400: 파일 없음', async () => {
        const res = await supertest(buildApp())
            .post('/api/parse-product-file');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/파일/);
    });

    it('400: 지원하지 않는 파일 형식 (.xlsx)', async () => {
        const res = await supertest(buildApp())
            .post('/api/parse-product-file')
            .attach('product_file', Buffer.from('dummy content'), {
                filename: 'test.xlsx',
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/지원하지 않는 파일 형식/);
    });

    it('400: HWP 파싱 결과 텍스트 없음 (빈 문서)', async () => {
        // 기본 mock → { sections: [] } → extractHwpText returns ''
        const res = await supertest(buildApp())
            .post('/api/parse-product-file')
            .attach('product_file', Buffer.from('hwp binary content'), {
                filename: 'empty.hwp',
                contentType: 'application/x-hwp'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/텍스트를 추출할 수 없/);
    });

    it('200: HWP 파싱 성공 → parsedData 반환', async () => {
        hwpParser.parse.mockReturnValueOnce({
            sections: [{
                content: [{
                    content: [{ value: '태국 방콕 4박5일 여행 상품 견적서 안내 드립니다.' }],
                    controls: []
                }]
            }]
        });

        const res = await supertest(buildApp())
            .post('/api/parse-product-file')
            .attach('product_file', Buffer.from('hwp binary content'), {
                filename: 'product.hwp',
                contentType: 'application/x-hwp'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.data).toHaveProperty('destination');
    });
});
