// Branch coverage tests — targets uncovered catch blocks, 404s, validation paths
// Covers: routes/*.ts error branches, services edge cases

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';
import { bookingsRouter } from '../routes/bookings';
import { customersRouter } from '../routes/customers';
import { vendorsRouter } from '../routes/vendors';
import { settlementsRouter } from '../routes/settlements';
import { invoicesRouter } from '../routes/invoices';
import { bspDatesRouter } from '../routes/bsp-dates';
import { alertSettingsRouter } from '../routes/alert-settings';
import { authRouter } from '../routes/auth';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  app.use((req, _res, next) => { req.session.userId = 1; next(); });
  app.use('/api/auth', authRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/vendors', vendorsRouter);
  app.use('/api/settlements', settlementsRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/bsp-dates', bspDatesRouter);
  app.use('/api/alert-settings', alertSettingsRouter);
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
    "INSERT INTO air_users (email, password_hash, name, role) VALUES ('branch@test.com', 'hash', 'Branch', 'admin')"
  );
});

afterAll(async () => {
  await teardownIntranetTestDb();
  await closeDb();
});

describe('Bookings branch coverage', () => {
  it('GET /api/bookings/:id should return 404 for non-existent', async () => {
    const res = await request(app).get('/api/bookings/99999');
    expect(res.status).toBe(404);
  });

  it('PATCH /api/bookings/:id should return 400 for invalid status', async () => {
    const res = await request(app).patch('/api/bookings/1').send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/bookings/:id should return 404 for non-existent', async () => {
    const res = await request(app).patch('/api/bookings/99999').send({ status: 'confirmed' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/bookings/:id should return 404 for non-existent', async () => {
    const res = await request(app).delete('/api/bookings/99999');
    expect(res.status).toBe(404);
  });

  it('POST /api/bookings/parse-pnr should return 400 without text', async () => {
    const res = await request(app).post('/api/bookings/parse-pnr').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/bookings/parse-pnr should return 422 for unparseable text', async () => {
    const res = await request(app).post('/api/bookings/parse-pnr').send({ text: 'random gibberish text' });
    expect(res.status).toBe(422);
  });

  it('GET /api/bookings with sort/order params', async () => {
    const res = await request(app).get('/api/bookings?sort=pnr&order=asc&page=1&limit=10');
    expect(res.status).toBe(200);
  });
});

describe('Customers branch coverage', () => {
  it('GET /api/customers/:id should return 404 for non-existent', async () => {
    const res = await request(app).get('/api/customers/99999');
    expect(res.status).toBe(404);
  });

  it('POST /api/customers should return 400 for invalid email', async () => {
    const res = await request(app).post('/api/customers').send({ name_kr: 'Test', email: 'bad-email' });
    expect(res.status).toBe(400);
  });

  it('POST /api/customers should return 400 for invalid passport_expiry', async () => {
    const res = await request(app).post('/api/customers').send({ name_kr: 'Test', passport_expiry: '31-12-2030' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/customers/:id should return 400 for invalid email', async () => {
    const res = await request(app).patch('/api/customers/1').send({ email: 'bad-email' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/customers/:id should return 404 for non-existent', async () => {
    const res = await request(app).patch('/api/customers/99999').send({ name_kr: 'Updated' });
    expect(res.status).toBe(404);
  });

  it('GET /api/customers with search param', async () => {
    const res = await request(app).get('/api/customers?search=nonexistent');
    expect(res.status).toBe(200);
    expect(res.body.data.customers.length).toBe(0);
  });
});

describe('Vendors branch coverage', () => {
  it('GET /api/vendors/:id should return 404 for non-existent', async () => {
    const res = await request(app).get('/api/vendors/99999');
    expect(res.status).toBe(404);
  });

  it('PATCH /api/vendors/:id should return 400 for invalid email', async () => {
    const res = await request(app).patch('/api/vendors/1').send({ email: 'bad-email' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/vendors/:id should return 404 for non-existent', async () => {
    const res = await request(app).patch('/api/vendors/99999').send({ name: 'Updated' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/vendors/:id should return 404 for non-existent', async () => {
    const res = await request(app).delete('/api/vendors/99999');
    expect(res.status).toBe(404);
  });
});

describe('Settlements branch coverage', () => {
  it('GET /api/settlements/:id should return 404 for non-existent', async () => {
    const res = await request(app).get('/api/settlements/99999');
    expect(res.status).toBe(404);
  });

  it('PATCH /api/settlements/:id should return 400 for invalid status', async () => {
    const res = await request(app).patch('/api/settlements/1').send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/settlements/:id should return 404 for non-existent', async () => {
    const res = await request(app).patch('/api/settlements/99999').send({ status: 'paid' });
    expect(res.status).toBe(404);
  });

  it('GET /api/settlements with booking_id filter', async () => {
    const res = await request(app).get('/api/settlements?booking_id=99999');
    expect(res.status).toBe(200);
    expect(res.body.data.settlements.length).toBe(0);
  });
});

describe('Invoices branch coverage', () => {
  it('POST /api/invoices should return 400 without settlement_id', async () => {
    const res = await request(app).post('/api/invoices').send({ total_amount: 100 });
    expect(res.status).toBe(400);
  });

  it('GET /api/invoices/:id/pdf should return 404 for non-existent', async () => {
    const res = await request(app).get('/api/invoices/99999/pdf');
    expect(res.status).toBe(404);
  });

  it('GET /api/invoices with settlement_id filter', async () => {
    const res = await request(app).get('/api/invoices?settlement_id=99999');
    expect(res.status).toBe(200);
  });
});

describe('BSP dates branch coverage', () => {
  it('POST /api/bsp-dates should return 400 for invalid date format', async () => {
    const res = await request(app).post('/api/bsp-dates').send({ payment_date: '20260101' });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/bsp-dates/:id should return 404 for non-existent', async () => {
    const res = await request(app).delete('/api/bsp-dates/99999');
    expect(res.status).toBe(404);
  });

  it('GET /api/bsp-dates with upcoming filter', async () => {
    const res = await request(app).get('/api/bsp-dates?upcoming=true');
    expect(res.status).toBe(200);
  });
});

describe('Alert settings branch coverage', () => {
  it('PATCH /api/alert-settings should return 400 for missing alert_type', async () => {
    const res = await request(app).patch('/api/alert-settings').send({ hours_before: 12, enabled: true });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/alert-settings should return 400 for hours_before = 0', async () => {
    const res = await request(app).patch('/api/alert-settings').send({
      alert_type: 'nmtl', hours_before: 0, enabled: true,
    });
    expect(res.status).toBe(400);
  });
});

describe('Auth branch coverage', () => {
  it('POST /api/auth/login should return 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login should return 400 for invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-email', password: 'test' });
    expect(res.status).toBe(400);
  });

  it('GET /api/auth/me should return 404 for non-existent user', async () => {
    // Create a separate app where session userId is set to non-existent user
    const app2 = express();
    app2.use(express.json());
    app2.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
    app2.use((req, _res, next) => { req.session.userId = 99999; next(); });
    app2.use('/api/auth', authRouter);

    const res = await request(app2).get('/api/auth/me');
    expect(res.status).toBe(404);
  });

  it('POST /api/auth/logout should succeed', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});
