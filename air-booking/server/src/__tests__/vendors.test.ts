// @TASK P3-R3-T1 - Vendors API Tests
// @SPEC TDD RED→GREEN→REFACTOR

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { vendorsRouter } from '../routes/vendors';
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
  app.use('/api/vendors', vendorsRouter);
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

describe('Vendors API', () => {
  let vendorId: number;

  describe('POST /api/vendors', () => {
    it('should create a vendor', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .send({
          name: '대한항공',
          type: '항공사',
          contact_name: '이담당',
          phone: '02-1234-5678',
          email: 'contact@koreanair.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vendor.name).toBe('대한항공');
      expect(res.body.data.vendor.type).toBe('항공사');
      vendorId = res.body.data.vendor.id;
    });

    it('should create with minimal fields', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .send({ name: '하나투어', type: '여행사' });

      expect(res.status).toBe(201);
      expect(res.body.data.vendor.contact_name).toBeNull();
    });

    it('should reject without name', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .send({ type: '항공사' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .send({ name: '잘못이메일', email: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should accept empty email string', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .send({ name: '빈이메일거래처', email: '' });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/vendors', () => {
    it('should list all vendors', async () => {
      const res = await request(app).get('/api/vendors');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vendors.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter by type', async () => {
      const res = await request(app).get('/api/vendors?type=항공사');

      expect(res.status).toBe(200);
      expect(res.body.data.vendors.length).toBe(1);
      expect(res.body.data.vendors[0].name).toBe('대한항공');
    });

    it('should search by name', async () => {
      const res = await request(app).get('/api/vendors?search=하나');

      expect(res.status).toBe(200);
      expect(res.body.data.vendors.length).toBe(1);
      expect(res.body.data.vendors[0].name).toBe('하나투어');
    });

    it('should order by name ascending', async () => {
      const res = await request(app).get('/api/vendors?order=asc');

      expect(res.status).toBe(200);
      const names = res.body.data.vendors.map((v: any) => v.name);
      const sorted = [...names].sort((a: string, b: string) => a.localeCompare(b, 'ko'));
      expect(names).toEqual(sorted);
    });
  });

  describe('GET /api/vendors/:id', () => {
    it('should get vendor by id', async () => {
      const res = await request(app).get(`/api/vendors/${vendorId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.vendor.name).toBe('대한항공');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).get('/api/vendors/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/vendors/:id', () => {
    it('should update vendor name', async () => {
      const res = await request(app)
        .patch(`/api/vendors/${vendorId}`)
        .send({ name: '아시아나항공' });

      expect(res.status).toBe(200);
      expect(res.body.data.vendor.name).toBe('아시아나항공');
    });

    it('should update vendor type', async () => {
      const res = await request(app)
        .patch(`/api/vendors/${vendorId}`)
        .send({ type: '기타' });

      expect(res.status).toBe(200);
      expect(res.body.data.vendor.type).toBe('기타');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .patch('/api/vendors/nonexistent')
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/vendors/:id', () => {
    it('should delete a vendor', async () => {
      const res = await request(app).delete(`/api/vendors/${vendorId}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).delete('/api/vendors/nonexistent');

      expect(res.status).toBe(404);
    });

    it('should verify deletion', async () => {
      const res = await request(app).get(`/api/vendors/${vendorId}`);
      expect(res.status).toBe(404);
    });
  });
});
