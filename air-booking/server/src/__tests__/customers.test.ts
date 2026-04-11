// @TASK P4-R1-T1 - Customers API Tests
// @SPEC TDD RED→GREEN→REFACTOR

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { customersRouter } from '../routes/customers';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({ secret: 'test-secret', resave: false, saveUninitialized: false })
  );
  app.use((req, _res, next) => {
    req.session.userId = 1;
    next();
  });
  app.use('/api/customers', customersRouter);
  return app;
}

let app: express.Express;

beforeAll(async () => {
  await closeDb();
  process.env.DATABASE_PATH = ':memory:';
  await setupIntranetTestDb();
  app = createApp();
  const db = await getDb();
  await db.run(
    "INSERT OR IGNORE INTO air_users (email, password_hash, name, role) VALUES ('test@test.com', 'hash', 'Test', 'admin')"
  );
});

afterAll(async () => {
  await teardownIntranetTestDb();
  await closeDb();
});

describe('Customers API', () => {
  let customerId: number;

  describe('POST /api/customers', () => {
    it('should create a customer', async () => {
      const res = await request(app)
        .post('/api/customers')
        .send({
          name_kr: '김국진',
          name_en: 'KIM GUKJIN',
          phone: '010-1234-5678',
          passport_number: 'M12345678',
          passport_expiry: '2030-12-31',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer.name_kr).toBe('김국진');
      expect(res.body.data.customer.passport_number).toBe('M12345678');
      customerId = res.body.data.customer.id;
    });

    it('should create with minimal fields', async () => {
      const res = await request(app)
        .post('/api/customers')
        .send({ name_kr: '이영희' });

      expect(res.status).toBe(201);
      expect(res.body.data.customer.name_en).toBeNull();
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/customers')
        .send({ name_kr: 'Test', email: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid passport_expiry format', async () => {
      const res = await request(app)
        .post('/api/customers')
        .send({ name_kr: 'Test', passport_expiry: '31-12-2030' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/customers', () => {
    it('should list all customers', async () => {
      const res = await request(app).get('/api/customers');

      expect(res.status).toBe(200);
      expect(res.body.data.customers.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    });

    it('should search by name', async () => {
      const res = await request(app).get('/api/customers?search=김국진');

      expect(res.status).toBe(200);
      expect(res.body.data.customers.length).toBe(1);
      expect(res.body.data.customers[0].name_kr).toBe('김국진');
    });

    it('should search by passport number', async () => {
      const res = await request(app).get('/api/customers?search=M12345678');

      expect(res.status).toBe(200);
      expect(res.body.data.customers.length).toBe(1);
    });
  });

  describe('GET /api/customers/:id', () => {
    it('should get customer with booking history', async () => {
      // First create a booking linked to customer
      // 서비스는 name_en/name_kr로 booking history를 조회
      const { getIntranetDb } = require('../db/intranet');
      const idb = await getIntranetDb();
      await idb.run(
        `INSERT INTO air_bookings (id, user_id, pnr, airline, flight_number, route_from, route_to, departure_date, status, name_en, name_kr)
         VALUES (?, '1', 'TEST01', 'KE', 'KE631', 'ICN', 'LAX', '2026-05-01', 'confirmed', 'KIM GUKJIN', '김국진')`,
        [crypto.randomUUID()]
      );

      const res = await request(app).get(`/api/customers/${customerId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customer.id).toBe(customerId);
      expect(res.body.data.bookings.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.bookings[0].pnr).toBe('TEST01');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).get('/api/customers/99999');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/customers/:id', () => {
    it('should update customer', async () => {
      const res = await request(app)
        .patch(`/api/customers/${customerId}`)
        .send({ phone: '010-9999-8888' });

      expect(res.status).toBe(200);
      expect(res.body.data.customer.phone).toBe('010-9999-8888');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .patch('/api/customers/99999')
        .send({ name_kr: 'Test' });

      expect(res.status).toBe(404);
    });
  });
});
