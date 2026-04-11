// @TASK P5 - TOPAS BSP Calendar 크롤러
// @SPEC TOPAS 로그인 후 BSP 달력 데이터 크롤링 → bsp_dates 저장

import { getIntranetDb } from '../db/intranet';

const TOPAS_BASE = 'https://www.topasweb.com';

interface TopasCalendarEvent {
  date: string;   // "2026-03-05" 형태
  title: string;  // "청구", "입금", "보고" 등
  color: string;  // 색상코드
}

/** TOPAS 색상 → BSP 유형 매핑 */
function mapColorToType(color: string, title: string): 'billing' | 'payment' | 'report' | null {
  const c = color.toLowerCase();
  const t = title.toLowerCase();
  // 제목 기반 매핑 우선
  if (t.includes('청구')) return 'billing';
  if (t.includes('입금')) return 'payment';
  if (t.includes('보고')) return 'report';
  // 색상 기반 폴백 (주황=청구, 파랑=입금, 노랑=보고)
  if (c.includes('ff8c00') || c.includes('orange') || c.includes('f90')) return 'billing';
  if (c.includes('0000ff') || c.includes('blue') || c.includes('00f') || c.includes('1e90ff')) return 'payment';
  if (c.includes('ffd700') || c.includes('yellow') || c.includes('ff0')) return 'report';
  return null;
}

const TYPE_LABELS: Record<string, string> = {
  billing: 'BSP 청구',
  payment: 'BSP 입금',
  report: 'BSP 보고',
};

/** TOPAS 서버 로그인 → 세션 쿠키 획득 */
async function topasLogin(id: string, pwd: string): Promise<string> {
  // 먼저 메인 페이지 접근하여 초기 쿠키 획득
  const mainRes = await fetch(`${TOPAS_BASE}/home/Main.do`, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const initCookies = (mainRes.headers.get('set-cookie') || '')
    .split(',')
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  // 로그인 요청
  const loginRes = await fetch(`${TOPAS_BASE}/home/LoginCmd.do`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': initCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': `${TOPAS_BASE}/home/Main.do`,
    },
    body: `loginId=${encodeURIComponent(id)}&loginPwd=${encodeURIComponent(pwd)}`,
    redirect: 'manual',
  });

  const loginCookies = (loginRes.headers.get('set-cookie') || '')
    .split(',')
    .map(c => c.split(';')[0].trim())
    .filter(Boolean);

  // 기존 쿠키 + 새 쿠키 병합
  const allCookies = [...initCookies.split('; ').filter(Boolean), ...loginCookies]
    .filter((v, i, a) => a.indexOf(v) === i)
    .join('; ');

  if (!allCookies) {
    throw new Error('TOPAS 로그인 실패: 쿠키를 획득할 수 없습니다.');
  }

  return allCookies;
}

/** BSP 달력 데이터 조회 (1개월) */
async function fetchBspMonth(cookie: string, year: number, month: number): Promise<TopasCalendarEvent[]> {
  const res = await fetch(
    `${TOPAS_BASE}/home/MainCalendarHomeList.do?year=${year}&month=${month}`,
    {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${TOPAS_BASE}/home/Main.do`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`TOPAS calendar fetch failed: ${res.status}`);
  }

  const data = await res.json() as TopasCalendarEvent[];
  return Array.isArray(data) ? data : [];
}

export interface BspSyncResult {
  success: boolean;
  inserted: number;
  skipped: number;
  months: number;
  error?: string;
}

/** TOPAS 로그인 → 1년치 BSP 달력 크롤링 → DB 저장 */
export async function syncBspFromTopas(
  topasId: string,
  topasPwd: string,
  year?: number
): Promise<BspSyncResult> {
  const targetYear = year || new Date().getFullYear();

  try {
    // 1. TOPAS 로그인
    const cookie = await topasLogin(topasId, topasPwd);

    // 2. 12개월 순차 조회
    const allEvents: { date: string; type: string; description: string }[] = [];
    let monthsProcessed = 0;

    for (let m = 1; m <= 12; m++) {
      try {
        const events = await fetchBspMonth(cookie, targetYear, m);
        for (const ev of events) {
          const bspType = mapColorToType(ev.color, ev.title);
          if (!bspType) continue;

          const dateStr = ev.date.substring(0, 10);
          allEvents.push({
            date: dateStr,
            type: bspType,
            description: TYPE_LABELS[bspType] || ev.title,
          });
        }
        monthsProcessed++;
      } catch {
        // 개별 월 실패는 건너뜀
      }
    }

    // 3. DB 저장 (기존 해당 연도 데이터 제거 후 삽입)
    const db = await getIntranetDb();
    await db.run(
      "DELETE FROM air_bsp_dates WHERE payment_date LIKE ? AND type != 'payment'",
      [`${targetYear}-%`]
    );
    // payment 유형 중 자동 생성된 것도 제거
    await db.run(
      "DELETE FROM air_bsp_dates WHERE payment_date LIKE ? AND description LIKE 'BSP %'",
      [`${targetYear}-%`]
    );

    let inserted = 0;
    let skipped = 0;

    for (const ev of allEvents) {
      // 중복 체크
      const existing = await db.get(
        'SELECT id FROM air_bsp_dates WHERE payment_date = ? AND type = ?',
        [ev.date, ev.type]
      );
      if (existing) {
        skipped++;
        continue;
      }

      await db.run(
        'INSERT INTO air_bsp_dates (payment_date, description, type) VALUES (?, ?, ?)',
        [ev.date, ev.description, ev.type]
      );
      inserted++;
    }

    return { success: true, inserted, skipped, months: monthsProcessed };
  } catch (err) {
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      months: 0,
      error: err instanceof Error ? err.message : 'TOPAS 연결 실패',
    };
  }
}

/** 브라우저에서 직접 가져온 BSP 데이터를 DB에 저장 (북마클릿 방식) */
export async function importBspEvents(
  events: { date: string; title: string; color: string }[],
  year?: number
): Promise<BspSyncResult> {
  const db = await getIntranetDb();
  const targetYear = year || new Date().getFullYear();

  // 기존 해당 연도 자동 생성 데이터 제거
  await db.run(
    "DELETE FROM air_bsp_dates WHERE payment_date LIKE ? AND description LIKE 'BSP %'",
    [`${targetYear}-%`]
  );

  let inserted = 0;
  let skipped = 0;

  for (const ev of events) {
    const bspType = mapColorToType(ev.color, ev.title);
    if (!bspType) {
      skipped++;
      continue;
    }

    const dateStr = ev.date.substring(0, 10);
    const description = TYPE_LABELS[bspType] || ev.title;

    const existing = await db.get(
      'SELECT id FROM air_bsp_dates WHERE payment_date = ? AND type = ?',
      [dateStr, bspType]
    );
    if (existing) {
      skipped++;
      continue;
    }

    await db.run(
      'INSERT INTO air_bsp_dates (payment_date, description, type) VALUES (?, ?, ?)',
      [dateStr, description, bspType]
    );
    inserted++;
  }

  return { success: true, inserted, skipped, months: 12 };
}
