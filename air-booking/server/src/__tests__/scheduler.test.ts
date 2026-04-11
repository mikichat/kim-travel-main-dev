import { getUpcomingDeadlines } from '../services/scheduler.service';
import { getIntranetDb } from '../db/intranet';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';

beforeAll(async () => {
  process.env.DATABASE_PATH = ':memory:';
  await setupIntranetTestDb();
});

afterAll(async () => {
  await teardownIntranetTestDb();
});

describe('scheduler - getUpcomingDeadlines', () => {
  beforeEach(async () => {
    const db = await getIntranetDb();
    await db.run('DELETE FROM air_bookings');
    await db.run('DELETE FROM air_bsp_dates');
  });

  it('should return NMTL deadlines within range', async () => {
    const db = await getIntranetDb();
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.run(
      `INSERT INTO air_bookings (id, user_id, pnr, name_kr, nmtl_date, status) VALUES (?, '1', 'ABC123', '김테스트', ?, 'pending')`,
      [crypto.randomUUID(), tomorrow]
    );
    const items = await getUpcomingDeadlines(24);
    const nmtl = items.filter((i) => i.type === 'NMTL');
    expect(nmtl.length).toBe(1);
    expect(nmtl[0].label).toContain('김테스트');
    expect(nmtl[0].label).toContain('ABC123');
  });

  it('should return TL deadlines within range', async () => {
    const db = await getIntranetDb();
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.run(
      `INSERT INTO air_bookings (id, user_id, pnr, name_kr, tl_date, status) VALUES (?, '1', 'DEF456', '박테스트', ?, 'confirmed')`,
      [crypto.randomUUID(), tomorrow]
    );
    const items = await getUpcomingDeadlines(24);
    const tl = items.filter((i) => i.type === 'TL');
    expect(tl.length).toBe(1);
    expect(tl[0].label).toContain('박테스트');
  });

  it('should return BSP deadlines within range', async () => {
    const db = await getIntranetDb();
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.run(
      `INSERT INTO air_bsp_dates (payment_date, description, is_notified) VALUES (?, 'BSP 3월', 0)`,
      [tomorrow]
    );
    const items = await getUpcomingDeadlines(24);
    const bsp = items.filter((i) => i.type === 'BSP');
    expect(bsp.length).toBe(1);
    expect(bsp[0].label).toBe('BSP 3월');
  });

  it('should exclude cancelled bookings from NMTL/TL', async () => {
    const db = await getIntranetDb();
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.run(
      `INSERT INTO air_bookings (id, user_id, pnr, nmtl_date, status) VALUES (?, '1', 'CAN001', ?, 'cancelled')`,
      [crypto.randomUUID(), tomorrow]
    );
    const items = await getUpcomingDeadlines(24);
    expect(items.filter((i) => i.type === 'NMTL').length).toBe(0);
  });

  it('should exclude ticketed bookings from NMTL/TL', async () => {
    const db = await getIntranetDb();
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.run(
      `INSERT INTO air_bookings (id, user_id, pnr, nmtl_date, status) VALUES (?, '1', 'TKT001', ?, 'ticketed')`,
      [crypto.randomUUID(), tomorrow]
    );
    const items = await getUpcomingDeadlines(24);
    expect(items.filter((i) => i.type === 'NMTL').length).toBe(0);
  });

  it('should exclude already notified BSP dates', async () => {
    const db = await getIntranetDb();
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.run(
      `INSERT INTO air_bsp_dates (payment_date, description, is_notified) VALUES (?, 'BSP already', 1)`,
      [tomorrow]
    );
    const items = await getUpcomingDeadlines(24);
    expect(items.filter((i) => i.type === 'BSP').length).toBe(0);
  });

  it('should not return items outside the time window', async () => {
    const db = await getIntranetDb();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.run(
      `INSERT INTO air_bookings (id, user_id, pnr, nmtl_date, status) VALUES (?, '1', 'FAR001', ?, 'pending')`,
      [crypto.randomUUID(), nextWeek]
    );
    const items = await getUpcomingDeadlines(24);
    expect(items.length).toBe(0);
  });

  it('should return departure deadlines', async () => {
    const db = await getIntranetDb();
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.run(
      `INSERT INTO air_bookings (id, user_id, pnr, name_kr, departure_date, status) VALUES (?, '1', 'DEP001', '이출발', ?, 'confirmed')`,
      [crypto.randomUUID(), tomorrow]
    );
    const items = await getUpcomingDeadlines(24);
    const dep = items.filter((i) => i.type === '출발');
    expect(dep.length).toBe(1);
    expect(dep[0].label).toContain('이출발');
  });
});
