// @TASK P2-R1-T1 - Bookings API Tests
// @SPEC TDD RED→GREEN→REFACTOR

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { bookingsRouter } from '../routes/bookings';
import { parsePnr } from '../services/pnr-parser.service';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';

// Setup test app
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
  // Inject userId for auth
  app.use((req, _res, next) => {
    req.session.userId = 1;
    next();
  });
  app.use('/api/bookings', bookingsRouter);
  return app;
}

let app: express.Express;

beforeAll(async () => {
  process.env.DATABASE_PATH = ':memory:';
  await setupIntranetTestDb();
  app = createApp();
  const db = await getDb();
  // Create test user
  await db.run(
    "INSERT OR IGNORE INTO air_users (email, password_hash, name, role) VALUES ('test@test.com', 'hash', 'Test', 'admin')"
  );
});

afterAll(async () => {
  await teardownIntranetTestDb();
  await closeDb();
});

describe('PNR Parser', () => {
  it('should parse standard PNR text with passenger and flight', () => {
    const text = `1.KIM/GUKJIN MR
2 KE 631 Y 15MAR ICNLAX HK1 1750 1150
PNR: ABC123`;

    const results = parsePnr(text);
    expect(results.length).toBe(1);
    expect(results[0].airline).toBe('KE');
    expect(results[0].flight_number).toBe('KE631');
    expect(results[0].route_from).toBe('ICN');
    expect(results[0].route_to).toBe('LAX');
    expect(results[0].passengers[0].name_en).toBe('KIM/GUKJIN');
    expect(results[0].pnr).toBe('ABC123');
    expect(results[0].departure_date).toMatch(/^\d{4}-03-15$/);
  });

  it('should parse multiple passengers', () => {
    const text = `1.KIM/GUKJIN MR
2.PARK/MINJI MS
3 OZ 201 Y 20JUN ICNNRT HK2 0900 1130
PNR: XYZ789`;

    const results = parsePnr(text);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].passengers.length).toBe(2);
    expect(results[0].passengers[0].name_en).toBe('KIM/GUKJIN');
    expect(results[0].passengers[1].name_en).toBe('PARK/MINJI');
  });

  it('should return empty array for unparseable text', () => {
    const results = parsePnr('random text without pnr data');
    expect(results).toEqual([]);
  });

  it('should handle standalone PNR code', () => {
    const text = `ABCDEF
1.LEE/JUNHO MR
2 KE 001 Y 10JAN ICNLHR HK1 1000 1400`;

    const results = parsePnr(text);
    expect(results.length).toBe(1);
    expect(results[0].pnr).toBe('ABCDEF');
  });
});

describe('Bookings API', () => {
  let bookingId: number;

  describe('POST /api/bookings', () => {
    it('should create a booking', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          pnr: 'ABC123',
          airline: 'KE',
          flight_number: 'KE631',
          route_from: 'ICN',
          route_to: 'LAX',
          name_kr: '김국진',
          name_en: 'KIM/GUKJIN',
          departure_date: '2026-03-15',
          nmtl_date: '2026-03-10',
          tl_date: '2026-03-12',
          fare: 1500000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.pnr).toBe('ABC123');
      expect(res.body.data.booking.airline).toBe('KE');
      expect(res.body.data.booking.status).toBe('pending');
      bookingId = res.body.data.booking.id;
    });

    it('should reject without pnr', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({ airline: 'KE' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/bookings', () => {
    it('should list bookings', async () => {
      const res = await request(app).get('/api/bookings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookings.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter by status', async () => {
      const res = await request(app).get('/api/bookings?status=pending');

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.every((b: { status: string }) => b.status === 'pending')).toBe(true);
    });

    it('should search by name', async () => {
      const res = await request(app).get('/api/bookings?search=김국진');

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for non-matching search', async () => {
      const res = await request(app).get('/api/bookings?search=없는이름');

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBe(0);
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should get booking by id', async () => {
      const res = await request(app).get(`/api/bookings/${bookingId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.id).toBe(bookingId);
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).get('/api/bookings/99999');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/bookings/:id', () => {
    it('should update booking and record history', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${bookingId}`)
        .send({ status: 'confirmed', fare: 1600000 });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('confirmed');
      expect(res.body.data.booking.fare).toBe(1600000);

      // Verify history was recorded (인트라넷 DB의 air_booking_history)
      const { getIntranetDb } = require('../db/intranet');
      const idb = await getIntranetDb();
      const history = await idb.all(
        'SELECT * FROM air_booking_history WHERE booking_id = ?',
        [bookingId]
      );
      expect(history.length).toBeGreaterThanOrEqual(2); // status + fare
      const statusChange = history.find((h: { field_changed: string }) => h.field_changed === 'status');
      expect(statusChange).toBeDefined();
      expect(statusChange.old_value).toBe('pending');
      expect(statusChange.new_value).toBe('confirmed');
    });

    it('should return 404 for non-existent booking', async () => {
      const res = await request(app)
        .patch('/api/bookings/99999')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/bookings/:id', () => {
    it('should delete a booking', async () => {
      // Create one to delete
      const createRes = await request(app)
        .post('/api/bookings')
        .send({ pnr: 'DEL001', airline: 'OZ' });

      const deleteId = createRes.body.data.booking.id;
      const res = await request(app).delete(`/api/bookings/${deleteId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('삭제');
    });

    it('should return 404 for non-existent booking', async () => {
      const res = await request(app).delete('/api/bookings/99999');
      expect(res.status).toBe(404);
    });

    it('should reject delete for staff role', async () => {
      const db = await getDb();
      await db.run(
        "INSERT OR IGNORE INTO air_users (id, email, password_hash, name, role) VALUES (2, 'staff@test.com', 'hash', 'Staff', 'staff')"
      );
      // Create a separate app with staff userId
      const staffApp = express();
      staffApp.use(express.json());
      staffApp.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
      staffApp.use((req, _res, next) => { req.session.userId = 2; next(); });
      staffApp.use('/api/bookings', bookingsRouter);

      const res = await request(staffApp).delete('/api/bookings/1');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/bookings/parse-pnr', () => {
    it('should parse PNR text and return results', async () => {
      const res = await request(app)
        .post('/api/bookings/parse-pnr')
        .send({
          text: `1.KIM/GUKJIN MR\n2 KE 631 Y 15MAR ICNLAX HK1 1750 1150\nPNR: TEST01`,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.length).toBe(1);
      expect(res.body.data.parsed[0].airline).toBe('KE');
    });

    it('should return 422 for unparseable text', async () => {
      const res = await request(app)
        .post('/api/bookings/parse-pnr')
        .send({ text: 'random garbage text' });

      expect(res.status).toBe(422);
    });

    it('should return 400 for empty text', async () => {
      const res = await request(app)
        .post('/api/bookings/parse-pnr')
        .send({ text: '' });

      expect(res.status).toBe(400);
    });
  });
});
