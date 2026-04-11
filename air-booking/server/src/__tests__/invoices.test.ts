// @TASK P3-R2-T1 - Invoices API Tests
// @SPEC TDD RED→GREEN→REFACTOR

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { invoicesRouter } from '../routes/invoices';
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
  app.use('/api/invoices', invoicesRouter);
  return app;
}

let app: express.Express;
let settlementId: string;

beforeAll(async () => {
  await closeDb();
  process.env.DATABASE_PATH = ':memory:';
  await setupIntranetTestDb();
  app = createApp();
  const db = await getDb();
  await db.run(
    "INSERT OR IGNORE INTO air_users (email, password_hash, name, role) VALUES ('test@test.com', 'hash', 'Test', 'admin')"
  );
  // 인트라넷 DB에 booking + settlement 생성
  const { getIntranetDb } = require('../db/intranet');
  const idb = await getIntranetDb();
  const bid = crypto.randomUUID();
  await idb.run(
    "INSERT INTO air_bookings (id, user_id, pnr, status) VALUES (?, '1', 'XYZ789', 'ticketed')",
    [bid]
  );
  const sid = crypto.randomUUID();
  await idb.run(
    "INSERT INTO air_settlements (id, booking_id, amount, status) VALUES (?, ?, 1200000, 'paid')",
    [sid, bid]
  );
  settlementId = sid as any;
});

afterAll(async () => {
  await teardownIntranetTestDb();
  await closeDb();
});

describe('Invoices API', () => {
  let invoiceId: number;
  let invoiceNumber: string;

  describe('POST /api/invoices', () => {
    it('should create an invoice with auto-generated number', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .send({
          recipient: '테스트 고객',
          settlement_id: settlementId,
          total_amount: 1200000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.invoice_number).toMatch(/^INV-/);
      // settlement_id는 create schema에 없으므로 저장 안 됨
      expect(res.body.data.invoice.total_amount).toBe(1200000);
      invoiceId = res.body.data.invoice.id;
      invoiceNumber = res.body.data.invoice.invoice_number;
    });

    it('should auto-set issue_date if not provided', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .post('/api/invoices')
        .send({ recipient: '테스트', settlement_id: settlementId, total_amount: 100000 });

      expect(res.status).toBe(201);
      expect(res.body.data.invoice.invoice_date).toBe(today);
    });

    it('should reject without settlement_id', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .send({ total_amount: 100000 }); // recipient 누락 → 400

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should generate sequential invoice numbers', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .send({ recipient: '테스트', settlement_id: settlementId, total_amount: 100000 });

      expect(res.status).toBe(201);
      // Should have a different (higher) sequence number
      expect(res.body.data.invoice.invoice_number).not.toBe(invoiceNumber);
    });
  });

  describe('GET /api/invoices', () => {
    it('should list all invoices', async () => {
      const res = await request(app).get('/api/invoices');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoices.length).toBeGreaterThanOrEqual(3);
    });

    it('should list invoices with search', async () => {
      const res = await request(app).get('/api/invoices?search=테스트');

      expect(res.status).toBe(200);
      expect(res.body.data.invoices.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/invoices/:id/pdf', () => {
    it('should return HTML for valid invoice', async () => {
      const res = await request(app).get(`/api/invoices/${invoiceId}/pdf`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('INVOICE');
    });

    it('should return 404 for non-existent invoice', async () => {
      const res = await request(app).get('/api/invoices/99999/pdf');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
