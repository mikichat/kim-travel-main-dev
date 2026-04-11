// P5-T7 — Group Rosters API Tests

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { groupRostersRouter } from '../routes/group-rosters';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  app.use((req, _res, next) => { req.session.userId = 1; next(); });
  app.use('/api/group-rosters', groupRostersRouter);
  return app;
}

let app: express.Express;

beforeAll(async () => {
  await closeDb();
  process.env.DATABASE_PATH = ':memory:';
  await setupIntranetTestDb();
  app = createApp();
  const db = await getDb();
  await db.run("INSERT OR IGNORE INTO air_users (email, password_hash, name, role) VALUES ('test@test.com', 'hash', 'Test', 'admin')");
});

afterAll(async () => {
  await teardownIntranetTestDb();
  await closeDb();
});

describe('Group Rosters API', () => {
  let itemId: string;

  it('should create a group roster', async () => {
    const res = await request(app)
      .post('/api/group-rosters')
      .send({ name: '전북대부설고 영국팀', data: { members: [{ name: '김철수', phone: '010-1234' }, { name: '이영희', phone: '010-5678' }] } });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.item.name).toBe('전북대부설고 영국팀');
    itemId = res.body.data.item.id;
  });

  it('should create with default name', async () => {
    const res = await request(app)
      .post('/api/group-rosters')
      .send({ data: { members: [] } });

    expect(res.status).toBe(201);
    expect(res.body.data.item.name).toBe('무제');
  });

  it('should reject without data', async () => {
    const res = await request(app).post('/api/group-rosters').send({});
    expect(res.status).toBe(400);
  });

  it('should list all rosters', async () => {
    const res = await request(app).get('/api/group-rosters');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  it('should get by id', async () => {
    const res = await request(app).get(`/api/group-rosters/${itemId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.item.name).toBe('전북대부설고 영국팀');
    const parsed = JSON.parse(res.body.data.item.data);
    expect(parsed.members.length).toBe(2);
  });

  it('should update a roster', async () => {
    const res = await request(app)
      .patch(`/api/group-rosters/${itemId}`)
      .send({ name: '전북대부설고 일본팀', data: { members: [{ name: '박민수', phone: '010-9999' }] } });

    expect(res.status).toBe(200);
    expect(res.body.data.item.name).toBe('전북대부설고 일본팀');
  });

  it('should delete a roster', async () => {
    const res = await request(app).delete(`/api/group-rosters/${itemId}`);
    expect(res.status).toBe(200);
  });

  it('should return 404 after deletion', async () => {
    const res = await request(app).get(`/api/group-rosters/${itemId}`);
    expect(res.status).toBe(404);
  });
});
