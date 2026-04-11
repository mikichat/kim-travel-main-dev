const nodemailer = require('nodemailer');
const logger = require('../logger');

// Gmail SMTP 트랜스포터
let emailTransporter = null;

function initEmail() {
    const user = process.env.NOTIFY_EMAIL;
    const pass = process.env.NOTIFY_EMAIL_PASS;

    if (!user || !pass) {
        logger.warn('[알림] 이메일 설정 없음 (NOTIFY_EMAIL / NOTIFY_EMAIL_PASS)');
        return;
    }

    emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    // 연결 확인
    emailTransporter.verify((err) => {
        if (err) {
            logger.error('[알림] 이메일 연결 실패:', err.message);
            emailTransporter = null;
        } else {
            logger.info('[알림] 이메일 알림 활성화됨 →', user);
        }
    });
}

// 로그인 알림 발송
async function sendLoginNotification(user, req) {
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';

    const subject = `[여행세상] 로그인 알림 - ${user.name}`;
    const html = `
        <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                <h2 style="margin: 0;">여행세상 로그인 알림</h2>
            </div>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 8px 0; color: #6b7280;">사용자</td><td style="padding: 8px 0; font-weight: 600;">${user.name} (${user.email})</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">시각</td><td style="padding: 8px 0;">${now}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">IP</td><td style="padding: 8px 0;">${ip}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">브라우저</td><td style="padding: 8px 0; font-size: 12px; word-break: break-all;">${ua}</td></tr>
                </table>
                <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">본인이 아닌 경우 즉시 비밀번호를 변경하세요.</p>
            </div>
        </div>
    `;

    // 이메일 발송
    if (emailTransporter) {
        try {
            await emailTransporter.sendMail({
                from: `"여행세상" <${process.env.NOTIFY_EMAIL}>`,
                to: process.env.NOTIFY_EMAIL_TO || process.env.NOTIFY_EMAIL,
                subject,
                html
            });
            logger.info(`[알림] 이메일 발송 완료 → ${user.name}`);
        } catch (err) {
            logger.error('[알림] 이메일 발송 실패:', err.message);
        }
    }

    // 카카오톡 발송 (설정된 경우)
    await sendKakaoNotification(user, now, ip);
}

// 카카오톡 나에게 보내기
async function sendKakaoNotification(user, time, ip) {
    const accessToken = process.env.KAKAO_ACCESS_TOKEN;
    if (!accessToken) return;

    try {
        const text = `[여행세상 로그인 알림]\n사용자: ${user.name} (${user.email})\n시각: ${time}\nIP: ${ip}`;

        const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                template_object: JSON.stringify({
                    object_type: 'text',
                    text,
                    link: { web_url: process.env.APP_URL || 'http://localhost:5000', mobile_web_url: process.env.APP_URL || 'http://localhost:5000' }
                })
            })
        });

        if (res.ok) {
            logger.info(`[알림] 카카오톡 발송 완료 → ${user.name}`);
        } else {
            const data = await res.json();
            logger.error('[알림] 카카오톡 발송 실패:', data);
        }
    } catch (err) {
        logger.error('[알림] 카카오톡 발송 오류:', err.message);
    }
}

module.exports = { initEmail, sendLoginNotification };
