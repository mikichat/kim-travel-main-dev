// @TASK P3-R1-T1 - Settlements API Tests
// @SPEC TDD RED→GREEN→REFACTOR

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { settlementsRouter } from '../routes/settlements';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use((req, _res, next) => {
    req.session.userId = 1;
    next();
  });
  app.use('/api/settlements', settlementsRouter);
  return app;
}

let app: express.Express;
let bookingId: string;

beforeAll(async () => {
  await closeDb();
  process.env.DATABASE_PATH = ':memory:';
  await setupIntranetTestDb();
  app = createApp();
  const db = await getDb();
  await db.run(
    "INSERT OR IGNORE INTO air_users (email, password_hash, name, role) VALUES ('test@test.com', 'hash', 'Test', 'admin')"
  );
  // Create a booking in intranet DB for FK reference
  const { getIntranetDb } = require('../db/intranet');
  const idb = await getIntranetDb();
  const bid = crypto.randomUUID();
  await idb.run(
    "INSERT INTO air_bookings (id, user_id, pnr, status) VALUES (?, '1', 'ABC123', 'confirmed')",
    [bid]
  );
  bookingId = bid as any;
});

afterAll(async () => {
  await teardownIntranetTestDb();
  await closeDb();
});

describe('Settlements API', () => {
  let settlementId: number;

  describe('POST /api/settlements', () => {
    it('should create a settlement', async () => {
      const res = await request(app)
        .post('/api/settlements')
        .send({
          booking_id: bookingId,
          payment_type: 'card',
          amount: 1500000,
          remarks: '카드 결제',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settlement.booking_id).toBe(bookingId);
      expect(res.body.data.settlement.amount).toBe(1500000);
      expect(res.body.data.settlement.status).toBe('unpaid');
      settlementId = res.body.data.settlement.id;
    });

    it('should reject without booking_id', async () => {
      const res = await request(app)
        .post('/api/settlements')
        .send({ amount: 100000 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate payment_date format', async () => {
      const res = await request(app)
        .post('/api/settlements')
        .send({
          booking_id: bookingId,
          payment_date: '15-03-2026',
        });

      expect(res.status).toBe(400);
    });

    it('should accept valid payment_date', async () => {
      const res = await request(app)
        .post('/api/settlements')
        .send({
          booking_id: bookingId,
          payment_date: '2026-03-15',
          amount: 500000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.settlement.payment_date).toBe('2026-03-15');
    });
  });

  describe('GET /api/settlements', () => {
    it('should list all settlements', async () => {
      const res = await request(app).get('/api/settlements');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settlements.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const res = await request(app).get('/api/settlements?status=unpaid');

      expect(res.status).toBe(200);
      res.body.data.settlements.forEach((s: { status: string }) => {
        expect(s.status).toBe('unpaid');
      });
    });

    it('should filter by booking_id', async () => {
      const res = await request(app).get(`/api/settlements?booking_id=${bookingId}`);

      expect(res.status).toBe(200);
      res.body.data.settlements.forEach((s: { booking_id: number }) => {
        expect(s.booking_id).toBe(bookingId);
      });
    });
  });

  describe('GET /api/settlements/:id', () => {
    it('should get settlement by id', async () => {
      const res = await request(app).get(`/api/settlements/${settlementId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.settlement.id).toBe(settlementId);
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).get('/api/settlements/99999');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/settlements/:id', () => {
    it('should update settlement status to paid', async () => {
      const res = await request(app)
        .patch(`/api/settlements/${settlementId}`)
        .send({ status: 'paid', payment_date: '2026-03-10' });

      expect(res.status).toBe(200);
      expect(res.body.data.settlement.status).toBe('paid');
      expect(res.body.data.settlement.payment_date).toBe('2026-03-10');
    });

    it('should update amount', async () => {
      const res = await request(app)
        .patch(`/api/settlements/${settlementId}`)
        .send({ amount: 2000000 });

      expect(res.status).toBe(200);
      expect(res.body.data.settlement.amount).toBe(2000000);
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .patch('/api/settlements/99999')
        .send({ status: 'paid' });

      expect(res.status).toBe(404);
    });

    it('should reject invalid status', async () => {
      const res = await request(app)
        .patch(`/api/settlements/${settlementId}`)
        .send({ status: 'invalid' });

      expect(res.status).toBe(400);
    });
  });
});
