// P5-T7 — Bus Reservations API Tests

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { busReservationsRouter } from '../routes/bus-reservations';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  app.use((req, _res, next) => { req.session.userId = 1; next(); });
  app.use('/api/bus-reservations', busReservationsRouter);
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

describe('Bus Reservations API', () => {
  let itemId: string;

  it('should create a bus reservation', async () => {
    const res = await request(app)
      .post('/api/bus-reservations')
      .send({ data: { company: '한진관광', date: '2026-04-10', route: '전주→서울', passengers: 40, price: 800000 } });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.item).toBeDefined();
    itemId = res.body.data.item.id;
  });

  it('should reject without data field', async () => {
    const res = await request(app).post('/api/bus-reservations').send({});
    expect(res.status).toBe(400);
  });

  it('should list all bus reservations', async () => {
    const res = await request(app).get('/api/bus-reservations');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it('should get by id', async () => {
    const res = await request(app).get(`/api/bus-reservations/${itemId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.item.id).toBe(itemId);
    const parsed = JSON.parse(res.body.data.item.data);
    expect(parsed.company).toBe('한진관광');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app).get('/api/bus-reservations/nonexistent');
    expect(res.status).toBe(404);
  });

  it('should update a bus reservation', async () => {
    const res = await request(app)
      .patch(`/api/bus-reservations/${itemId}`)
      .send({ data: { company: '금호관광', date: '2026-04-11', route: '전주→부산', passengers: 45, price: 900000 } });

    expect(res.status).toBe(200);
    const parsed = JSON.parse(res.body.data.item.data);
    expect(parsed.company).toBe('금호관광');
  });

  it('should delete a bus reservation', async () => {
    const res = await request(app).delete(`/api/bus-reservations/${itemId}`);
    expect(res.status).toBe(200);
  });

  it('should return 404 after deletion', async () => {
    const res = await request(app).get(`/api/bus-reservations/${itemId}`);
    expect(res.status).toBe(404);
  });
});
