// @TASK P2-R2-T1 - BSP Dates API Tests
// @SPEC TDD RED→GREEN→REFACTOR

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';
import { bspDatesRouter } from '../routes/bsp-dates';

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
  app.use('/api/bsp-dates', bspDatesRouter);
  return app;
}

let app: express.Express;

beforeAll(async () => {
  await closeDb();
  process.env.DATABASE_PATH = ':memory:';
  await setupIntranetTestDb();
  app = createApp();
});

afterAll(async () => {
  await teardownIntranetTestDb();
  await closeDb();
});

describe('BSP Dates API', () => {
  let bspDateId: number;

  describe('POST /api/bsp-dates', () => {
    it('should create a BSP date', async () => {
      const res = await request(app)
        .post('/api/bsp-dates')
        .send({
          payment_date: '2026-03-15',
          description: '3월 BSP 입금일',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bspDate.payment_date).toBe('2026-03-15');
      expect(res.body.data.bspDate.description).toBe('3월 BSP 입금일');
      expect(res.body.data.bspDate.is_notified).toBe(0);
      bspDateId = res.body.data.bspDate.id;
    });

    it('should create without description', async () => {
      const res = await request(app)
        .post('/api/bsp-dates')
        .send({ payment_date: '2026-04-15' });

      expect(res.status).toBe(201);
      expect(res.body.data.bspDate.description).toBeNull();
    });

    it('should reject without payment_date', async () => {
      const res = await request(app)
        .post('/api/bsp-dates')
        .send({ description: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid date format', async () => {
      const res = await request(app)
        .post('/api/bsp-dates')
        .send({ payment_date: '15-03-2026' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/bsp-dates', () => {
    it('should list all BSP dates', async () => {
      const res = await request(app).get('/api/bsp-dates');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bspDates.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by month', async () => {
      const res = await request(app).get('/api/bsp-dates?month=2026-03');

      expect(res.status).toBe(200);
      expect(res.body.data.bspDates.length).toBe(1);
      expect(res.body.data.bspDates[0].payment_date).toBe('2026-03-15');
    });

    it('should return empty for month with no dates', async () => {
      const res = await request(app).get('/api/bsp-dates?month=2025-01');

      expect(res.status).toBe(200);
      expect(res.body.data.bspDates.length).toBe(0);
    });

    it('should order by payment_date ascending', async () => {
      const res = await request(app).get('/api/bsp-dates');

      const dates = res.body.data.bspDates.map((d: { payment_date: string }) => d.payment_date);
      const sorted = [...dates].sort();
      expect(dates).toEqual(sorted);
    });
  });

  describe('DELETE /api/bsp-dates/:id', () => {
    it('should delete a BSP date', async () => {
      const res = await request(app).delete(`/api/bsp-dates/${bspDateId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('삭제');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).delete('/api/bsp-dates/99999');

      expect(res.status).toBe(404);
    });
  });
});
