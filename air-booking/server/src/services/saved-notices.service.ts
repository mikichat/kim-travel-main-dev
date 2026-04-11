import { getIntranetDb } from '../db/intranet';

export interface SavedNoticeRow {
  id: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export async function getAllSavedNotices(): Promise<SavedNoticeRow[]> {
  const db = await getIntranetDb();
  return db.all<SavedNoticeRow[]>(
    'SELECT * FROM saved_notices ORDER BY updated_at DESC'
  );
}

export async function getSavedNoticeById(id: string): Promise<SavedNoticeRow | undefined> {
  const db = await getIntranetDb();
  return db.get<SavedNoticeRow>('SELECT * FROM saved_notices WHERE id = ?', [id]);
}

export async function createSavedNotice(data: string): Promise<SavedNoticeRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO saved_notices (id, data, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`,
    [id, data]
  );
  const item = await getSavedNoticeById(id);
  if (!item) throw new Error('Failed to retrieve created saved notice');
  return item;
}

export async function updateSavedNotice(id: string, data: string): Promise<SavedNoticeRow | undefined> {
  const db = await getIntranetDb();
  await db.run(
    `UPDATE saved_notices SET data = ?, updated_at = datetime('now') WHERE id = ?`,
    [data, id]
  );
  return getSavedNoticeById(id);
}

export async function deleteSavedNotice(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM saved_notices WHERE id = ?', [id]);
  return (result.changes ?? 0) > 0;
}
