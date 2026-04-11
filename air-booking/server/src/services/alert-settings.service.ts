// @TASK P4-R2-T1 - Alert Settings Service (CRUD)
// @SPEC 알림 시간 설정 CRUD (24h전/12h전 등)

import { getIntranetDb } from '../db/intranet';

export interface AlertSettingRow {
  id: number;
  user_id: number;
  hours_before: number;
  alert_type: string;
  enabled: number;
}

export async function getAlertSettings(userId: number): Promise<AlertSettingRow[]> {
  const db = await getIntranetDb();
  return db.all<AlertSettingRow[]>(
    'SELECT * FROM air_alert_settings WHERE user_id = ? ORDER BY alert_type, hours_before',
    [userId]
  );
}

export async function upsertAlertSetting(
  userId: number,
  data: { hours_before: number; alert_type: string; enabled: boolean }
): Promise<AlertSettingRow> {
  const db = await getIntranetDb();

  // Check if exists
  const existing = await db.get<AlertSettingRow>(
    'SELECT * FROM air_alert_settings WHERE user_id = ? AND alert_type = ? AND hours_before = ?',
    [userId, data.alert_type, data.hours_before]
  );

  if (existing) {
    await db.run(
      'UPDATE air_alert_settings SET enabled = ? WHERE id = ?',
      [data.enabled ? 1 : 0, existing.id]
    );
    return { ...existing, enabled: data.enabled ? 1 : 0 };
  }

  const result = await db.run(
    'INSERT INTO air_alert_settings (user_id, hours_before, alert_type, enabled) VALUES (?, ?, ?, ?)',
    [userId, data.hours_before, data.alert_type, data.enabled ? 1 : 0]
  );

  return {
    id: result.lastID!,
    user_id: userId,
    hours_before: data.hours_before,
    alert_type: data.alert_type,
    enabled: data.enabled ? 1 : 0,
  };
}
