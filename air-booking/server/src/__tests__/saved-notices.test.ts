// P5-T7 — Saved Notices API Tests

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { savedNoticesRouter } from '../routes/saved-notices';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  app.use((req, _res, next) => { req.session.userId = 1; next(); });
  app.use('/api/saved-notices', savedNoticesRouter);
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

describe('Saved Notices API', () => {
  let itemId: string;

  it('should create a notice', async () => {
    const res = await request(app)
      .post('/api/saved-notices')
      .send({ data: { title: '영국 여행 안내', content: '출발 전 준비사항...', type: 'travel' } });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    itemId = res.body.data.item.id;
  });

  it('should reject without data', async () => {
    const res = await request(app).post('/api/saved-notices').send({});
    expect(res.status).toBe(400);
  });

  it('should list all notices', async () => {
    const res = await request(app).get('/api/saved-notices');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it('should get by id', async () => {
    const res = await request(app).get(`/api/saved-notices/${itemId}`);
    expect(res.status).toBe(200);
    const parsed = JSON.parse(res.body.data.item.data);
    expect(parsed.title).toBe('영국 여행 안내');
  });

  it('should update a notice', async () => {
    const res = await request(app)
      .patch(`/api/saved-notices/${itemId}`)
      .send({ data: { title: '일본 여행 안내', content: '비자 불필요', type: 'travel' } });

    expect(res.status).toBe(200);
    const parsed = JSON.parse(res.body.data.item.data);
    expect(parsed.title).toBe('일본 여행 안내');
  });

  it('should delete a notice', async () => {
    const res = await request(app).delete(`/api/saved-notices/${itemId}`);
    expect(res.status).toBe(200);
  });

  it('should return 404 after deletion', async () => {
    const res = await request(app).get(`/api/saved-notices/${itemId}`);
    expect(res.status).toBe(404);
  });
});
