// @TASK E2E - Comprehensive end-to-end integration test
// Tests complete user workflows using supertest with in-memory SQLite

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { getDb, closeDb } from '../db';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';
import { authRouter } from '../routes/auth';
import { bookingsRouter } from '../routes/bookings';
import { bspDatesRouter } from '../routes/bsp-dates';
import { settlementsRouter } from '../routes/settlements';
import { invoicesRouter } from '../routes/invoices';
import { vendorsRouter } from '../routes/vendors';
import { customersRouter } from '../routes/customers';
import { alertSettingsRouter } from '../routes/alert-settings';
import { clearLockouts } from '../services/auth.service';

function createFullApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'e2e-test-secret', resave: false, saveUninitialized: false }));
  app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
  app.use('/api/auth', authRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/bsp-dates', bspDatesRouter);
  app.use('/api/settlements', settlementsRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/vendors', vendorsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/alert-settings', alertSettingsRouter);
  return app;
}

let app: express.Express;
let agent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  await closeDb();
  process.env.DATABASE_PATH = ':memory:';
  await setupIntranetTestDb();
  app = createFullApp();

  // auth service가 인트라넷 DB의 air_users를 사용하므로 거기에 사용자 생성
  const { getIntranetDb } = require('../db/intranet');
  const idb = await getIntranetDb();
  const hash = await bcrypt.hash('E2ePass1234!', 10);
  await idb.run(
    'INSERT OR IGNORE INTO air_users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    ['e2e@test.com', hash, 'E2E테스트', 'admin']
  );
  clearLockouts();
});

afterAll(async () => {
  await teardownIntranetTestDb();
  await closeDb();
});

describe('E2E Integration Tests', () => {
  // ═══════════════════════════════════════
  // Flow 1: Authentication
  // ═══════════════════════════════════════
  describe('Flow 1: Authentication', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'e2e@test.com', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should login successfully', async () => {
      clearLockouts();
      agent = request.agent(app);
      const res = await agent.post('/api/auth/login').send({
        email: 'e2e@test.com',
        password: 'E2ePass1234!',
      });
      console.log('DEBUG: login status =', res.status, 'body =', JSON.stringify(res.body));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('e2e@test.com');
    });

    it('should maintain session', async () => {
      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('e2e@test.com');
    });
  });

  // ═══════════════════════════════════════
  // Flow 2: Booking Lifecycle
  // ═══════════════════════════════════════
  describe('Flow 2: Booking Lifecycle', () => {
    let bookingId: number;

    it('should create a booking', async () => {
      const res = await agent.post('/api/bookings').send({
        pnr: 'ABC123',
        airline: 'KE',
        flight_number: 'KE631',
        name_kr: '김여행',
        departure_date: '2026-04-15',
        status: 'pending',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      bookingId = res.body.data.booking.id;
    });

    it('should list bookings', async () => {
      const res = await agent.get('/api/bookings');
      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBeGreaterThan(0);
    });

    it('should update booking status', async () => {
      const res = await agent.patch(`/api/bookings/${bookingId}`).send({ status: 'confirmed' });
      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('confirmed');
    });

    it('should filter by status', async () => {
      const res = await agent.get('/api/bookings?status=confirmed');
      expect(res.status).toBe(200);
      res.body.data.bookings.forEach((b: any) => expect(b.status).toBe('confirmed'));
    });

    it('should delete a booking', async () => {
      const res = await agent.delete(`/api/bookings/${bookingId}`);
      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════
  // Flow 3: Customer + Booking Association
  // ═══════════════════════════════════════
  describe('Flow 3: Customer + Booking', () => {
    let customerId: number;

    it('should create a customer', async () => {
      const res = await agent.post('/api/customers').send({
        name_kr: '박고객',
        passport_number: 'M99887766',
        phone: '010-9999-8888',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.customer.name_kr).toBe('박고객');
      customerId = res.body.data.customer.id;
    });

    it('should create booking linked to customer', async () => {
      const res = await agent.post('/api/bookings').send({
        pnr: 'CUS001',
        airline: 'OZ',
        customer_id: customerId,
        name_kr: '박고객',
        departure_date: '2026-05-20',
        status: 'pending',
      });
      expect(res.status).toBe(201);
    });

    it('should get customer with booking history', async () => {
      const res = await agent.get(`/api/customers/${customerId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.customer.name_kr).toBe('박고객');
      expect(res.body.data.bookings.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════
  // Flow 4: Settlement + Invoice
  // ═══════════════════════════════════════
  describe('Flow 4: Settlement + Invoice', () => {
    let vendorId: number;
    let bookingId: number;
    let settlementId: number;

    it('should create vendor', async () => {
      const res = await agent.post('/api/vendors').send({
        name: '대한항공',
        type: '항공사',
      });
      expect(res.status).toBe(201);
      vendorId = res.body.data.vendor.id;
    });

    it('should create booking for settlement', async () => {
      const res = await agent.post('/api/bookings').send({
        pnr: 'SET001',
        airline: 'KE',
        name_kr: '정산테스트',
        departure_date: '2026-06-10',
        status: 'pending',
      });
      expect(res.status).toBe(201);
      bookingId = res.body.data.booking.id;
    });

    it('should create settlement', async () => {
      const res = await agent.post('/api/settlements').send({
        booking_id: bookingId,
        vendor_id: vendorId,
        payment_type: '카드',
        amount: 1500000,
        status: 'unpaid',
        payment_date: '2026-04-15',
      });
      expect(res.status).toBe(201);
      settlementId = res.body.data.settlement.id;
    });

    it('should update settlement to paid', async () => {
      const res = await agent.patch(`/api/settlements/${settlementId}`).send({
        status: 'paid',
        payment_date: '2026-04-10',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.settlement.status).toBe('paid');
    });

    it('should create invoice', async () => {
      const res = await agent.post('/api/invoices').send({
        recipient: '테스트 고객',
        settlement_id: settlementId,
        invoice_date: '2026-04-10',
        total_amount: 1500000,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.invoice).toBeDefined();
    });

    it('should list invoices', async () => {
      const res = await agent.get('/api/invoices');
      expect(res.status).toBe(200);
      expect(res.body.data.invoices.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════
  // Flow 5: BSP + Alert Settings
  // ═══════════════════════════════════════
  describe('Flow 5: BSP + Alert Settings', () => {
    it('should create BSP date', async () => {
      const res = await agent.post('/api/bsp-dates').send({
        payment_date: '2026-04-20',
        description: 'BSP 마감',
      });
      expect(res.status).toBe(201);
    });

    it('should list BSP dates', async () => {
      const res = await agent.get('/api/bsp-dates');
      expect(res.status).toBe(200);
      expect(res.body.data.bspDates.length).toBeGreaterThan(0);
    });

    it('should upsert alert setting', async () => {
      const res = await agent.patch('/api/alert-settings').send({
        alert_type: 'nmtl',
        hours_before: 12,
        enabled: true,
      });
      expect(res.status).toBe(200);
      expect(res.body.data.setting.hours_before).toBe(12);
    });

    it('should get alert settings', async () => {
      const res = await agent.get('/api/alert-settings');
      expect(res.status).toBe(200);
      const nmtl = res.body.data.settings.find((s: any) => s.alert_type === 'nmtl');
      expect(nmtl).toBeDefined();
      expect(nmtl.hours_before).toBe(12);
    });
  });

  // ═══════════════════════════════════════
  // Flow 6: Unauthenticated Access
  // ═══════════════════════════════════════
  describe('Flow 6: Unauthenticated', () => {
    it('should allow health check', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated bookings', async () => {
      const res = await request(app).get('/api/bookings');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated customers', async () => {
      const res = await request(app).get('/api/customers');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated vendors', async () => {
      const res = await request(app).get('/api/vendors');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated settlements', async () => {
      const res = await request(app).get('/api/settlements');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated alert-settings', async () => {
      const res = await request(app).get('/api/alert-settings');
      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════
  // Flow 7: Validation Errors
  // ═══════════════════════════════════════
  describe('Flow 7: Validation', () => {
    it('should reject booking without pnr', async () => {
      const res = await agent.post('/api/bookings').send({ airline: 'KE' });
      expect(res.status).toBe(400);
    });

    it('should reject vendor without name', async () => {
      const res = await agent.post('/api/vendors').send({ type: '항공사' });
      expect(res.status).toBe(400);
    });

    it('should reject settlement without booking_id', async () => {
      const res = await agent.post('/api/settlements').send({ amount: 100 });
      expect(res.status).toBe(400);
    });

    it('should reject alert with hours > 72', async () => {
      const res = await agent.patch('/api/alert-settings').send({
        alert_type: 'nmtl',
        hours_before: 100,
        enabled: true,
      });
      expect(res.status).toBe(400);
    });
  });
});
