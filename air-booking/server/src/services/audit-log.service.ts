// 보안 이벤트 감사 로깅

import { getIntranetDb } from '../db/intranet';

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  details: string | null;
  ip: string | null;
  created_at: string;
}

export async function writeAuditLog(params: {
  userId?: string | number | null;
  action: string;
  resource?: string;
  details?: string;
  ip?: string;
}): Promise<void> {
  try {
    const db = await getIntranetDb();
    await db.run(
      `INSERT INTO audit_logs (id, user_id, action, resource, details, ip) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        params.userId != null ? String(params.userId) : null,
        params.action,
        params.resource ?? null,
        params.details ?? null,
        params.ip ?? null,
      ]
    );
  } catch {
    // 감사 로그 실패가 서비스를 중단시키면 안 됨
  }
}

export async function listAuditLogs(params: {
  limit?: number;
  action?: string;
  userId?: string;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.action) { conditions.push('action = ?'); values.push(params.action); }
  if (params.userId) { conditions.push('user_id = ?'); values.push(params.userId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 100, 500);

  const countRow = await db.get<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM audit_logs ${where}`, values);
  const logs = await db.all<AuditLogEntry[]>(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ?`,
    [...values, limit]
  );

  return { logs, total: countRow?.cnt || 0 };
}
