// 단체상품 서비스 — travel_agency.db의 groups 테이블 직접 조회

import { getIntranetDb } from '../db/intranet';

export interface GroupMember {
  no: number;
  nameKr: string;
  nameEn: string;
  gender: string;
  passportNo: string;
  birthDate: string;
  passportExpire: string;
  phone: string;
}

export interface GroupRow {
  id: string;
  name: string;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  member_count: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface GroupDetail extends GroupRow {
  members: GroupMember[];
}

export interface GroupListParams {
  search?: string;
  status?: 'active' | 'archived' | '';
  page?: number;
  limit?: number;
}

export async function listGroups(params: GroupListParams): Promise<{ groups: GroupRow[]; total: number }> {
  const db = await getIntranetDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.status === 'active') {
    conditions.push('is_archived = 0');
  } else if (params.status === 'archived') {
    conditions.push('is_archived = 1');
  }

  if (params.search) {
    conditions.push('(name LIKE ? OR destination LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(params.limit || 50, 100);
  const offset = ((params.page || 1) - 1) * limit;

  const countRow = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM groups ${where}`, values
  );

  const rows = await db.all<(GroupRow & { members: string })[]>(
    `SELECT id, name, destination, departure_date, return_date, members, is_archived, created_at, updated_at
     FROM groups ${where}
     ORDER BY departure_date DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const groups: GroupRow[] = rows.map(r => {
    let memberCount = 0;
    try {
      const parsed = JSON.parse(r.members || '[]');
      memberCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch { /* ignore */ }

    return {
      id: r.id,
      name: r.name,
      destination: r.destination,
      departure_date: r.departure_date,
      return_date: r.return_date,
      member_count: memberCount,
      is_archived: r.is_archived,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  return { groups, total: countRow?.cnt || 0 };
}

export async function createGroup(data: {
  name: string;
  destination?: string;
  departure_date?: string;
  return_date?: string;
  members?: GroupMember[];
  roster_id?: string;
}): Promise<GroupDetail> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();
  const members = data.members || [];

  await db.run(
    `INSERT INTO groups (id, name, destination, departure_date, return_date, members, roster_id, is_archived)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [id, data.name, data.destination || null, data.departure_date || null, data.return_date || null, JSON.stringify(members), data.roster_id || null]
  );

  const group = await getGroupById(id);
  if (!group) throw new Error('그룹 생성 후 조회 실패');
  return group;
}

export async function updateGroup(id: string, data: Partial<{
  name: string;
  destination: string;
  departure_date: string;
  return_date: string;
  members: GroupMember[];
  is_archived: number;
}>): Promise<GroupDetail | null> {
  const db = await getIntranetDb();
  const existing = await getGroupById(id);
  if (!existing) return null;

  const sets: string[] = [];
  const vals: unknown[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
  if (data.destination !== undefined) { sets.push('destination = ?'); vals.push(data.destination); }
  if (data.departure_date !== undefined) { sets.push('departure_date = ?'); vals.push(data.departure_date); }
  if (data.return_date !== undefined) { sets.push('return_date = ?'); vals.push(data.return_date); }
  if (data.members !== undefined) { sets.push('members = ?'); vals.push(JSON.stringify(data.members)); }
  if (data.is_archived !== undefined) { sets.push('is_archived = ?'); vals.push(data.is_archived); }

  if (sets.length === 0) return existing;

  sets.push("updated_at = datetime('now')");
  vals.push(id);

  await db.run(`UPDATE groups SET ${sets.join(', ')} WHERE id = ?`, vals);
  return getGroupById(id);
}

export async function deleteGroup(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM groups WHERE id = ?', [id]);
  return (result.changes ?? 0) > 0;
}

/** 단체명단(roster)에서 단체상품 자동 생성 */
export async function createGroupFromRoster(rosterId: string, rosterName: string, rosterData: string): Promise<GroupDetail> {
  let parsed: any = {};
  try { parsed = JSON.parse(rosterData); } catch { /* ignore */ }

  // 명단에서 멤버 추출
  const members: GroupMember[] = [];
  const rawMembers = parsed.members || parsed.passengers || parsed.pax || [];
  if (Array.isArray(rawMembers)) {
    rawMembers.forEach((m: any, i: number) => {
      members.push({
        no: i + 1,
        nameKr: m.nameKr || m.name_kr || m.korName || m.name || '',
        nameEn: m.nameEn || m.name_en || m.engName || '',
        gender: m.gender || m.sex || '',
        passportNo: m.passportNo || m.passport_no || m.passport || '',
        birthDate: m.birthDate || m.birth_date || m.birth || '',
        passportExpire: m.passportExpire || m.passport_expire || '',
        phone: m.phone || m.tel || '',
      });
    });
  }

  // 기존에 같은 roster_id로 생성된 그룹이 있는지 확인
  const db = await getIntranetDb();
  const existing = await db.get<{ id: string }>('SELECT id FROM groups WHERE roster_id = ?', [rosterId]);
  if (existing) {
    // 기존 그룹 업데이트
    return (await updateGroup(existing.id, {
      name: rosterName,
      members,
      destination: parsed.destination || parsed.route || null,
      departure_date: parsed.departure_date || parsed.departureDate || null,
      return_date: parsed.return_date || parsed.returnDate || null,
    }))!;
  }

  return createGroup({
    name: rosterName,
    destination: parsed.destination || parsed.route || null,
    departure_date: parsed.departure_date || parsed.departureDate || null,
    return_date: parsed.return_date || parsed.returnDate || null,
    members,
    roster_id: rosterId,
  });
}

export async function getGroupById(id: string): Promise<GroupDetail | null> {
  const db = await getIntranetDb();
  const row = await db.get<GroupRow & { members: string }>(
    `SELECT id, name, destination, departure_date, return_date, members, is_archived, created_at, updated_at
     FROM groups WHERE id = ?`, [id]
  );

  if (!row) return null;

  let members: GroupMember[] = [];
  try {
    members = JSON.parse(row.members || '[]');
  } catch { /* ignore */ }

  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    departure_date: row.departure_date,
    return_date: row.return_date,
    member_count: members.length,
    is_archived: row.is_archived,
    created_at: row.created_at,
    updated_at: row.updated_at,
    members,
  };
}
