// jest.setup.js의 글로벌 mock 해제 → 실제 구현 테스트
jest.unmock('../../services/notify');

const mockSendMail = jest.fn().mockResolvedValue({});
const mockVerify = jest.fn();
const mockTransporter = { verify: mockVerify, sendMail: mockSendMail };
const mockCreateTransport = jest.fn().mockReturnValue(mockTransporter);

jest.mock('nodemailer', () => ({
    createTransport: (...args) => mockCreateTransport(...args),
}));

jest.mock('../../logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

const logger = require('../../logger');
const { initEmail, sendLoginNotification } = require('../../services/notify');

function mockReq(overrides = {}) {
    return {
        headers: { 'user-agent': 'TestBrowser/1.0' },
        socket: { remoteAddress: '127.0.0.1' },
        ...overrides,
    };
}

const testUser = { name: '김관리', email: 'admin@test.com' };

beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({});
    mockCreateTransport.mockReturnValue(mockTransporter);
    delete process.env.NOTIFY_EMAIL;
    delete process.env.NOTIFY_EMAIL_PASS;
    delete process.env.NOTIFY_EMAIL_TO;
    delete process.env.KAKAO_ACCESS_TOKEN;
    delete process.env.APP_URL;
    global.fetch = jest.fn();
});

afterEach(() => {
    delete global.fetch;
});

// ==================== initEmail ====================

describe('initEmail', () => {
    test('환경변수 없으면 경고 로그만 출력', () => {
        initEmail();

        expect(mockCreateTransport).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('이메일 설정 없음')
        );
    });

    test('환경변수 있으면 transporter 생성 + verify 호출', () => {
        process.env.NOTIFY_EMAIL = 'test@gmail.com';
        process.env.NOTIFY_EMAIL_PASS = 'password123';

        initEmail();

        expect(mockCreateTransport).toHaveBeenCalledWith({
            service: 'gmail',
            auth: { user: 'test@gmail.com', pass: 'password123' },
        });
        expect(mockVerify).toHaveBeenCalled();
    });

    test('verify 성공 시 info 로그', () => {
        process.env.NOTIFY_EMAIL = 'test@gmail.com';
        process.env.NOTIFY_EMAIL_PASS = 'password123';
        mockVerify.mockImplementation((cb) => cb(null));

        initEmail();

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('이메일 알림 활성화됨'),
            'test@gmail.com'
        );
    });

    test('verify 실패 시 error 로그', () => {
        process.env.NOTIFY_EMAIL = 'test@gmail.com';
        process.env.NOTIFY_EMAIL_PASS = 'password123';
        mockVerify.mockImplementation((cb) => cb(new Error('SMTP 연결 실패')));

        initEmail();

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('이메일 연결 실패'),
            'SMTP 연결 실패'
        );
    });
});

// ==================== sendLoginNotification ====================

describe('sendLoginNotification', () => {
    test('transporter 초기화 후 이메일 발송 성공', async () => {
        process.env.NOTIFY_EMAIL = 'sender@gmail.com';
        process.env.NOTIFY_EMAIL_PASS = 'pass';
        mockVerify.mockImplementation((cb) => cb(null));

        initEmail();
        await sendLoginNotification(testUser, mockReq());

        expect(mockSendMail).toHaveBeenCalledTimes(1);
        const mailOpts = mockSendMail.mock.calls[0][0];
        expect(mailOpts.subject).toContain('김관리');
        expect(mailOpts.html).toContain('admin@test.com');
        expect(mailOpts.to).toBe('sender@gmail.com');
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('이메일 발송 완료')
        );
    });

    test('NOTIFY_EMAIL_TO가 있으면 해당 주소로 발송', async () => {
        process.env.NOTIFY_EMAIL = 'sender@gmail.com';
        process.env.NOTIFY_EMAIL_PASS = 'pass';
        process.env.NOTIFY_EMAIL_TO = 'recipient@gmail.com';
        mockVerify.mockImplementation((cb) => cb(null));

        initEmail();
        await sendLoginNotification(testUser, mockReq());

        const mailOpts = mockSendMail.mock.calls[0][0];
        expect(mailOpts.to).toBe('recipient@gmail.com');
    });

    test('transporter 없으면 이메일 건너뜀', async () => {
        // initEmail() 호출하지 않음 → emailTransporter = null
        // 단, 이전 테스트에서 initEmail()으로 설정됐을 수 있으므로
        // verify 실패로 transporter를 null로 리셋
        process.env.NOTIFY_EMAIL = 'x@x.com';
        process.env.NOTIFY_EMAIL_PASS = 'x';
        mockVerify.mockImplementation((cb) => cb(new Error('fail')));
        initEmail(); // emailTransporter = null (verify 실패)
        jest.clearAllMocks();
        global.fetch = jest.fn();

        await sendLoginNotification(testUser, mockReq());

        expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('이메일 발송 실패 시 error 로그', async () => {
        process.env.NOTIFY_EMAIL = 'sender@gmail.com';
        process.env.NOTIFY_EMAIL_PASS = 'pass';
        mockVerify.mockImplementation((cb) => cb(null));
        initEmail();
        mockSendMail.mockRejectedValueOnce(new Error('전송 실패'));

        await sendLoginNotification(testUser, mockReq());

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('이메일 발송 실패'),
            '전송 실패'
        );
    });

    test('ip와 ua 모두 fallback → unknown (L35-36 || 분기 커버)', async () => {
        // emailTransporter = null 상태로 (verify 실패)
        process.env.NOTIFY_EMAIL = 'x@x.com';
        process.env.NOTIFY_EMAIL_PASS = 'x';
        mockVerify.mockImplementation((cb) => cb(new Error('skip')));
        initEmail();
        jest.clearAllMocks();
        global.fetch = jest.fn();

        // x-forwarded-for 없음, remoteAddress=null → ip = 'unknown' (|| 'unknown' 분기)
        // user-agent 없음 → ua = 'unknown' (|| 'unknown' 분기)
        await sendLoginNotification(testUser, {
            headers: {},
            socket: { remoteAddress: null },
        });

        // 이메일/카카오 발송 안 됨 (transporter=null, KAKAO 없음)
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('x-forwarded-for 헤더 우선 사용', async () => {
        process.env.NOTIFY_EMAIL = 'sender@gmail.com';
        process.env.NOTIFY_EMAIL_PASS = 'pass';
        mockVerify.mockImplementation((cb) => cb(null));

        initEmail();
        await sendLoginNotification(testUser, mockReq({
            headers: {
                'x-forwarded-for': '203.0.113.42',
                'user-agent': 'Chrome',
            },
        }));

        const mailOpts = mockSendMail.mock.calls[0][0];
        expect(mailOpts.html).toContain('203.0.113.42');
    });
});

// ==================== sendKakaoNotification (via sendLoginNotification) ====================

describe('카카오톡 알림', () => {
    beforeEach(() => {
        // 카카오 테스트에서는 이메일 부분 비활성화
        // verify 실패 → emailTransporter = null
        process.env.NOTIFY_EMAIL = 'x@x.com';
        process.env.NOTIFY_EMAIL_PASS = 'x';
        mockVerify.mockImplementation((cb) => cb(new Error('skip')));
        initEmail();
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    test('KAKAO_ACCESS_TOKEN 없으면 fetch 호출 안 함', async () => {
        await sendLoginNotification(testUser, mockReq());

        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('KAKAO_ACCESS_TOKEN 있으면 카카오 API 호출', async () => {
        process.env.KAKAO_ACCESS_TOKEN = 'test-token-123';
        global.fetch.mockResolvedValueOnce({ ok: true });

        await sendLoginNotification(testUser, mockReq());

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toContain('kakao.com');
        expect(opts.headers.Authorization).toBe('Bearer test-token-123');
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('카카오톡 발송 완료')
        );
    });

    test('카카오 API 실패 시 error 로그', async () => {
        process.env.KAKAO_ACCESS_TOKEN = 'test-token';
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: jest.fn().mockResolvedValue({ code: -401 }),
        });

        await sendLoginNotification(testUser, mockReq());

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('카카오톡 발송 실패'),
            { code: -401 }
        );
    });

    test('카카오 fetch 예외 시 error 로그', async () => {
        process.env.KAKAO_ACCESS_TOKEN = 'test-token';
        global.fetch.mockRejectedValueOnce(new Error('네트워크 오류'));

        await sendLoginNotification(testUser, mockReq());

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('카카오톡 발송 오류'),
            '네트워크 오류'
        );
    });

    test('APP_URL 환경변수 반영', async () => {
        process.env.KAKAO_ACCESS_TOKEN = 'test-token';
        process.env.APP_URL = 'https://my-app.com';
        global.fetch.mockResolvedValueOnce({ ok: true });

        await sendLoginNotification(testUser, mockReq());

        const body = global.fetch.mock.calls[0][1].body;
        const templateObj = JSON.parse(body.get('template_object'));
        expect(templateObj.link.web_url).toBe('https://my-app.com');
    });
});
