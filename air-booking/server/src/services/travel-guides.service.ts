// 여행 안내문 서비스 — travel_guides 테이블 CRUD + Gemini 생성

import { getIntranetDb } from '../db/intranet';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── 타입 ──

export interface TravelGuideRow {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  departure_place: string;
  departure_time: string;
  expenses: string;
  flight_info: string;
  guide_data: string; // JSON (Gemini 응답)
  created_at: string;
  updated_at: string;
}

export interface GenerateGuideInput {
  destination: string;
  start_date: string;
  end_date: string;
  departure_place?: string;
  departure_time?: string;
  expenses?: string;
  flight_info?: string;
  airline_code?: string; // 항공사 2코드 (KE, OZ, TW 등)
}

export interface GuideContent {
  weather: string;
  outfit: string[];
  checklist: { category: string; items: string[] }[];
  currency: string;
  timezone: string;
  voltage: string;
}

// ── DB 마이그레이션 ──

export async function ensureTravelGuidesTable(): Promise<void> {
  const db = await getIntranetDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS travel_guides (
      id TEXT PRIMARY KEY,
      destination TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      departure_place TEXT DEFAULT '',
      departure_time TEXT DEFAULT '',
      expenses TEXT DEFAULT '',
      flight_info TEXT DEFAULT '',
      guide_data TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tg_destination ON travel_guides(destination);
    CREATE INDEX IF NOT EXISTS idx_tg_start_date ON travel_guides(start_date);
  `);
}

// ── CRUD ──

export async function listTravelGuides(): Promise<TravelGuideRow[]> {
  await ensureTravelGuidesTable();
  const db = await getIntranetDb();
  return db.all<TravelGuideRow[]>(
    'SELECT * FROM travel_guides ORDER BY updated_at DESC'
  );
}

export async function getTravelGuideById(id: string): Promise<TravelGuideRow | undefined> {
  await ensureTravelGuidesTable();
  const db = await getIntranetDb();
  return db.get<TravelGuideRow>('SELECT * FROM travel_guides WHERE id = ?', [id]);
}

export async function createTravelGuide(data: {
  destination: string;
  start_date: string;
  end_date: string;
  departure_place?: string;
  departure_time?: string;
  expenses?: string;
  flight_info?: string;
  guide_data?: string;
}): Promise<TravelGuideRow> {
  await ensureTravelGuidesTable();
  const db = await getIntranetDb();
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO travel_guides (id, destination, start_date, end_date, departure_place, departure_time, expenses, flight_info, guide_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.destination,
      data.start_date,
      data.end_date,
      data.departure_place || '',
      data.departure_time || '',
      data.expenses || '',
      data.flight_info || '',
      data.guide_data || '{}',
    ]
  );
  const item = await getTravelGuideById(id);
  if (!item) throw new Error('Failed to create travel guide');
  return item;
}

export async function updateTravelGuide(id: string, data: Partial<{
  destination: string;
  start_date: string;
  end_date: string;
  departure_place: string;
  departure_time: string;
  expenses: string;
  flight_info: string;
  guide_data: string;
}>): Promise<TravelGuideRow | undefined> {
  await ensureTravelGuidesTable();
  const db = await getIntranetDb();
  const sets: string[] = [];
  const vals: unknown[] = [];
  const fields = ['destination', 'start_date', 'end_date', 'departure_place', 'departure_time', 'expenses', 'flight_info', 'guide_data'] as const;
  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = ?`);
      vals.push(data[f]);
    }
  }
  if (sets.length === 0) return getTravelGuideById(id);
  sets.push("updated_at = datetime('now')");
  vals.push(id);
  await db.run(`UPDATE travel_guides SET ${sets.join(', ')} WHERE id = ?`, vals);
  return getTravelGuideById(id);
}

export async function deleteTravelGuide(id: string): Promise<boolean> {
  await ensureTravelGuidesTable();
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM travel_guides WHERE id = ?', [id]);
  return (result.changes ?? 0) > 0;
}

// ── Gemini AI 생성 ──

// 같은 여행지의 이전 저장 데이터 조회
async function findPreviousGuide(destination: string): Promise<GuideContent | null> {
  try {
    const db = await getIntranetDb();
    await ensureTravelGuidesTable();
    const row = await db.get<{ guide_data: string }>(
      `SELECT guide_data FROM travel_guides WHERE destination LIKE ? ORDER BY updated_at DESC LIMIT 1`,
      [`%${destination}%`]
    );
    if (!row?.guide_data) return null;
    const parsed = JSON.parse(row.guide_data);
    // 새 형식: { guide: {...} } 또는 이전 형식: { weather, ... }
    const guide = parsed.guide || parsed;
    if (guide.weather || guide.currency) return guide;
    return null;
  } catch {
    return null;
  }
}

function buildPrompt(input: GenerateGuideInput, previousGuide?: GuideContent | null): string {
  const start = new Date(input.start_date);
  const end = new Date(input.end_date);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // 이전 저장 데이터가 있으면 예시로 제공
  let referenceSection = '';
  if (previousGuide) {
    referenceSection = `
[참고 예시 - 이전에 작성한 안내문 (이 스타일을 참고하되 날짜에 맞게 업데이트)]
- 환율: "${previousGuide.currency || ''}"
- 시차: "${previousGuide.timezone || ''}"
- 전압: "${previousGuide.voltage || ''}"
`;
  }

  const airlineInfo = input.airline_code
    ? `\n- 항공사: ${input.airline_code} (이 항공사의 정확한 위탁수하물 규정을 검색해서 제공)`
    : '';

  return `당신은 여행 전문 카피라이터입니다. 정확한 사실을 기반으로 글을 쓰며, 불필요한 미사여구를 지양하고 담백하면서도 실용적인 정보를 전달합니다.

반드시 Google 검색을 사용하여 아래 정보를 확인한 후 작성하세요:
1. "${input.destination}" ${start.getMonth() + 1}월 날씨 (평균 기온, 강수량)
2. "${input.destination}" 현지 화폐 대비 한국 원화 환율
3. ${input.airline_code ? `${input.airline_code} 항공사 위탁수하물 규정 (무게, 크기 제한)` : '일반 항공사 위탁수하물 규정'}

[여행지 정보]
- 여행지: ${input.destination}
- 날짜: ${input.start_date} ~ ${input.end_date} (${days}일)${airlineInfo}

[글쓰기 규칙]
1. 담백하고 자연스러운 산문체로 작성
2. AI가 작성한 느낌이 나지 않도록 자연스럽게
3. 마크다운 포맷팅 절대 금지 (**볼드**, *이탤릭* 등 사용 금지)
4. 각 섹션 3~5줄 이내, 핵심만

[금지 형용사]
아름다운, 신비로운, 황홀한, 경이로운, 매혹적인, 환상적인, 장엄한, 화려한, 찬란한, 웅장한, 눈부신, 숨막히는, 압도적인, 놀라운, 감동적인, 꿈같은

[생성 규칙]
1. 날씨: 해당 월 평균 기온과 습도만 제공 (실시간 예보 X)
2. 복장: 날씨에 맞는 기본 복장만 추천
3. 준비물: 필수(여권/비자/예방접종) + 날씨별(선글라스/우산 등)
4. 환율: 현지 화폐 단위 + "대략적 환산" 명시 + 환전 팁
5. 시차: 한국 대비 몇 시간 빠른/느린지만 (GMT 표기 금지)
6. 전압: 전압 + 주파수 + 멀티탭/어댑터 필요 여부
${referenceSection}
[금지 사항]
- 확실하지 않은 정보는 생략
- 장황한 설명 금지
- "최고의", "반드시", "꼭" 같은 과장 금지
- 마크다운 기호(**, *, #, - 등) 사용 금지

[출력 형식 - JSON만 출력, 코드블록 없이]
{
  "weather": "문단 (3~5줄)",
  "outfit": ["항목1", "항목2", ...],
  "checklist": [
    { "category": "필수", "items": ["여권", ...] },
    { "category": "날씨별", "items": ["선글라스", ...] },
    { "category": "전자기기", "items": ["어댑터", ...] },
    { "category": "기타", "items": ["상비약", ...] }
  ],
  "currency": "문단 (2~3줄, 화폐 단위 + 대략 환율 + 환전 팁)",
  "timezone": "시차 정보 (1줄, 한국 대비)",
  "voltage": "전압 정보 (1줄, 전압 + 멀티탭 필요 여부)"
}`;
}

export async function generateGuideWithGemini(input: GenerateGuideInput): Promise<GuideContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. 서버 .env 파일에 GEMINI_API_KEY를 추가해주세요.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Google Search Grounding 활성화 — 환율/날씨/수하물 실시간 검색
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{ googleSearch: {} } as any],
  });

  // 항공사 코드 추출 (출발편에서 앞 2글자)
  if (!input.airline_code && input.flight_info) {
    const match = input.flight_info.match(/^([A-Z]{2})/);
    if (match) input.airline_code = match[1];
  }

  // 같은 여행지의 이전 저장 데이터를 참고 예시로 제공
  const previousGuide = await findPreviousGuide(input.destination);
  const prompt = buildPrompt(input, previousGuide);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // JSON 추출 (코드블록이 포함될 수 있음)
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // 순수 JSON인 경우 앞뒤 공백만 제거
    jsonStr = text.trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as GuideContent;
    // 기본값 보장
    return {
      weather: parsed.weather || '',
      outfit: Array.isArray(parsed.outfit) ? parsed.outfit : [],
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
      currency: parsed.currency || '',
      timezone: parsed.timezone || '',
      voltage: parsed.voltage || '',
    };
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
  }
}
