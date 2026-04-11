const { requireAuth } = require('../../middleware/auth');

function mockReq(overrides = {}) {
    return {
        path: '/some-page',
        session: null,
        accepts: jest.fn().mockReturnValue(true),
        ...overrides,
    };
}

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
}

describe('requireAuth middleware', () => {
    let req, res, next;

    beforeEach(() => {
        next = jest.fn();
    });

    describe('whitelisted paths', () => {
        test('should allow /login.html without authentication', () => {
            req = mockReq({ path: '/login.html' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        test('should allow /api/auth/ endpoints without authentication', () => {
            req = mockReq({ path: '/api/auth/register' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should NOT allow /api/auth without trailing slash', () => {
            req = mockReq({ path: '/api/auth' });
            res = mockRes();

            requireAuth(req, res, next);

            // '/api/auth' does not startsWith '/api/auth/' → not whitelisted → 401
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        test('should allow /favicon.ico without authentication', () => {
            req = mockReq({ path: '/favicon.ico' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('authenticated user', () => {
        test('should allow authenticated user to access protected routes', () => {
            req = mockReq({
                path: '/protected-page',
                session: { userId: 123 },
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        test('should allow authenticated user to access API endpoints', () => {
            req = mockReq({
                path: '/api/data',
                session: { userId: 456 },
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });
    });

    describe('unauthenticated API requests', () => {
        test('should return 401 for /api/ request without authentication', () => {
            req = mockReq({ path: '/api/data' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: '로그인이 필요합니다.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should return 401 for /api/users request without authentication', () => {
            req = mockReq({ path: '/api/users/list' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalled();
        });
    });

    describe('unauthenticated /tables/ requests', () => {
        test('should return 401 for /tables/ request without authentication', () => {
            req = mockReq({ path: '/tables/customers' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: '로그인이 필요합니다.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should return 401 for /tables/ with nested path', () => {
            req = mockReq({ path: '/tables/invoices/detail' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalled();
        });
    });

    describe('unauthenticated HTML page requests', () => {
        test('should redirect to /login.html for unauthenticated HTML request', () => {
            req = mockReq({
                path: '/dashboard',
                accepts: jest.fn().mockReturnValue('html'),
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/login.html');
            expect(next).not.toHaveBeenCalled();
        });

        test('should redirect for unauthenticated HTML without extension', () => {
            req = mockReq({
                path: '/customers',
                accepts: jest.fn().mockReturnValue('html'),
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/login.html');
        });
    });

    describe('unauthenticated static resources', () => {
        test('should allow .css files without authentication', () => {
            req = mockReq({ path: '/styles/main.css' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.redirect).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should allow .js files without authentication', () => {
            req = mockReq({ path: '/scripts/app.js' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        test('should allow .png files without authentication', () => {
            req = mockReq({ path: '/images/logo.png' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        test('should allow .jpg files without authentication', () => {
            req = mockReq({ path: '/images/banner.jpg' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        test('should allow .svg files without authentication', () => {
            req = mockReq({ path: '/icons/menu.svg' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        test('should allow .ico files without authentication', () => {
            req = mockReq({ path: '/assets/icon.ico' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        test('should allow .woff font files without authentication', () => {
            req = mockReq({ path: '/fonts/roboto.woff' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        test('should allow .woff2 font files without authentication', () => {
            req = mockReq({ path: '/fonts/roboto.woff2' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        test('should allow .ttf font files without authentication', () => {
            req = mockReq({ path: '/fonts/roboto.ttf' });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });
    });

    describe('edge cases', () => {
        test('should not redirect static file even if accepts HTML', () => {
            req = mockReq({
                path: '/styles/main.css',
                accepts: jest.fn().mockReturnValue('html'),
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.redirect).not.toHaveBeenCalled();
        });

        test('should prioritize static file extension over HTML accept', () => {
            req = mockReq({
                path: '/script.js',
                accepts: jest.fn().mockReturnValue('html'),
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        test('should handle requests without accepts method gracefully', () => {
            req = mockReq({
                path: '/api/data',
                accepts: jest.fn().mockReturnValue(false),
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('should prioritize whitelisted paths over other checks', () => {
            req = mockReq({
                path: '/api/auth/login',
                session: null,
                accepts: jest.fn().mockReturnValue('html'),
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.redirect).not.toHaveBeenCalled();
        });

        test('should handle paths with query strings', () => {
            req = mockReq({
                path: '/api/data?filter=active',
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('should handle paths with multiple slashes', () => {
            req = mockReq({
                path: '/api//data',
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    describe('session edge cases', () => {
        test('should not allow access with empty session object', () => {
            req = mockReq({
                path: '/protected',
                session: {},
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/login.html');
        });

        test('should not allow access with null userId in session', () => {
            req = mockReq({
                path: '/protected',
                session: { userId: null },
            });
            res = mockRes();

            requireAuth(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/login.html');
        });

        test('should allow access with userId = 0 (edge case)', () => {
            // Note: userId = 0 is falsy but could be valid; current implementation treats as unauthenticated
            req = mockReq({
                path: '/protected',
                session: { userId: 0 },
                accepts: jest.fn().mockReturnValue('html'),
            });
            res = mockRes();

            requireAuth(req, res, next);

            // Current implementation will redirect because userId = 0 is falsy
            expect(res.redirect).toHaveBeenCalledWith('/login.html');
        });
    });
});
