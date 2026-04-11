// 인증 미들웨어
function requireAuth(req, res, next) {
    // 화이트리스트: 인증 없이 접근 가능한 경로
    const whitelist = [
        '/login.html',
        '/api/auth/',
        '/api/flight-saves',
        '/favicon.ico',
    ];

    // 화이트리스트 경로 체크
    const isWhitelisted = whitelist.some(path => req.path.startsWith(path));
    if (isWhitelisted) {
        return next();
    }

    // CDN/외부 리소스는 브라우저가 직접 요청하므로 여기 도달하지 않음
    // 로그인 페이지에서 필요한 정적 리소스 허용 (CSS, 폰트 등)
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.ico', '.svg', '.woff', '.woff2', '.ttf'];
    const hasStaticExt = staticExtensions.some(ext => req.path.endsWith(ext));

    // 세션에 userId가 있으면 통과
    if (req.session && req.session.userId) {
        return next();
    }

    // 미인증 상태
    // API 요청이면 401 반환
    if (req.path.startsWith('/api/') || req.path.startsWith('/tables/')) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // 정적 리소스는 로그인 페이지에서도 필요하므로 허용하지 않으면 페이지가 안 뜸
    // 하지만 HTML 페이지 요청은 리다이렉트
    if (req.accepts('html') && !hasStaticExt) {
        return res.redirect('/login.html');
    }

    // 그 외 (CSS, JS 등 정적 파일) → 로그인 안 된 상태에서도 허용
    // (로그인 페이지 렌더링에 필요)
    next();
}

module.exports = { requireAuth };
