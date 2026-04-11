// 회사 설정 서비스 — air_company_settings 테이블

import { getIntranetDb } from '../db/intranet';

export async function getSettings(): Promise<Record<string, string>> {
  const db = await getIntranetDb();
  const rows = await db.all<{ key: string; value: string }[]>(
    'SELECT key, value FROM air_company_settings'
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const db = await getIntranetDb();
  await db.run(
    `INSERT INTO air_company_settings (id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
    [crypto.randomUUID(), key, value, value]
  );
}
