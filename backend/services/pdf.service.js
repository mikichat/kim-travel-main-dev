// PDF 서버사이드 생성 — puppeteer-core + 시스템 Chrome

const puppeteer = require('puppeteer-core');
const os = require('os');
const logger = require('../logger');

// 시스템 Chrome 경로 탐색
function findChrome() {
  const platform = os.platform();
  const candidates = platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    : platform === 'win32'
      ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
         'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
      : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];

  for (const p of candidates) {
    try { require('fs').accessSync(p); return p; } catch {}
  }
  return null;
}

let _browser = null;

async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;

  const executablePath = findChrome();
  if (!executablePath) {
    throw new Error('Chrome을 찾을 수 없습니다. Google Chrome을 설치해주세요.');
  }

  _browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  return _browser;
}

/**
 * HTML 문자열을 PDF Buffer로 변환
 * @param {string} html - 렌더링할 HTML
 * @param {object} options - PDF 옵션
 * @returns {Promise<Buffer>} PDF 바이너리
 */
async function htmlToPdf(html, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 });

    // 웹폰트 로딩 대기 (Google Fonts 등)
    await page.evaluate(() => document.fonts?.ready).catch(() => {});

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: options.marginTop || '10mm',
        bottom: options.marginBottom || '10mm',
        left: options.marginLeft || '15mm',
        right: options.marginRight || '15mm',
      },
      ...options,
    });

    return pdfBuffer;
  } finally {
    await page.close();
  }
}

// 프로세스 종료 시 브라우저 정리
process.on('exit', () => { if (_browser) _browser.close().catch(() => {}); });
process.on('SIGINT', () => { if (_browser) _browser.close().catch(() => {}); process.exit(); });

module.exports = { htmlToPdf, getBrowser };
