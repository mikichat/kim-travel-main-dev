import { getIntranetDb } from '../db/intranet';
import { createGroupFromRoster } from './groups.service';

export interface GroupRosterRow {
  id: string;
  name: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export async function getAllGroupRosters(): Promise<GroupRosterRow[]> {
  const db = await getIntranetDb();
  return db.all<GroupRosterRow[]>(
    'SELECT * FROM group_rosters ORDER BY updated_at DESC'
  );
}

export async function getGroupRosterById(id: string): Promise<GroupRosterRow | undefined> {
  const db = await getIntranetDb();
  return db.get<GroupRosterRow>('SELECT * FROM group_rosters WHERE id = ?', [id]);
}

export async function createGroupRoster(name: string, data: string): Promise<GroupRosterRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO group_rosters (id, name, data, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
    [id, name, data]
  );
  const item = await getGroupRosterById(id);
  if (!item) throw new Error('Failed to retrieve created group roster');

  // 단체상품 자동 생성
  try {
    await createGroupFromRoster(id, name, data);
  } catch (err) {
    console.error('[group-rosters] 단체상품 자동 생성 실패:', err);
  }

  return item;
}

export async function updateGroupRoster(id: string, name: string, data: string): Promise<GroupRosterRow | undefined> {
  const db = await getIntranetDb();
  await db.run(
    `UPDATE group_rosters SET name = ?, data = ?, updated_at = datetime('now') WHERE id = ?`,
    [name, data, id]
  );

  // 단체상품 동기화
  try {
    await createGroupFromRoster(id, name, data);
  } catch (err) {
    console.error('[group-rosters] 단체상품 동기화 실패:', err);
  }

  return getGroupRosterById(id);
}

export async function deleteGroupRoster(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM group_rosters WHERE id = ?', [id]);
  return (result.changes ?? 0) > 0;
}
