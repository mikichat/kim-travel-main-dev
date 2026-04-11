// @TASK P4-R2-T1 - Alert Settings API Tests
// @SPEC TDD RED→GREEN→REFACTOR

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { getDb, closeDb } from '../db';
import { alertSettingsRouter } from '../routes/alert-settings';
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
  app.use('/api/alert-settings', alertSettingsRouter);
  return app;
}

let app: express.Express;

beforeAll(async () => {
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

describe('Alert Settings API', () => {
  describe('PATCH /api/alert-settings', () => {
    it('should create a new alert setting', async () => {
      const res = await request(app)
        .patch('/api/alert-settings')
        .send({ hours_before: 24, alert_type: 'nmtl', enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.setting.hours_before).toBe(24);
      expect(res.body.data.setting.alert_type).toBe('nmtl');
      expect(res.body.data.setting.enabled).toBe(1);
    });

    it('should update existing setting', async () => {
      const res = await request(app)
        .patch('/api/alert-settings')
        .send({ hours_before: 24, alert_type: 'nmtl', enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.data.setting.enabled).toBe(0);
    });

    it('should create multiple alert types', async () => {
      await request(app)
        .patch('/api/alert-settings')
        .send({ hours_before: 12, alert_type: 'tl', enabled: true });

      await request(app)
        .patch('/api/alert-settings')
        .send({ hours_before: 48, alert_type: 'bsp', enabled: true });

      const res = await request(app).get('/api/alert-settings');
      expect(res.body.data.settings.length).toBe(3);
    });

    it('should reject missing alert_type', async () => {
      const res = await request(app)
        .patch('/api/alert-settings')
        .send({ hours_before: 24, enabled: true });

      expect(res.status).toBe(400);
    });

    it('should reject hours_before out of range', async () => {
      const res = await request(app)
        .patch('/api/alert-settings')
        .send({ hours_before: 0, alert_type: 'test', enabled: true });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/alert-settings', () => {
    it('should list all alert settings for current user', async () => {
      const res = await request(app).get('/api/alert-settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings.length).toBeGreaterThanOrEqual(3);
    });

    it('should include all setting fields', async () => {
      const res = await request(app).get('/api/alert-settings');

      const setting = res.body.data.settings[0];
      expect(setting).toHaveProperty('id');
      expect(setting).toHaveProperty('user_id');
      expect(setting).toHaveProperty('hours_before');
      expect(setting).toHaveProperty('alert_type');
      expect(setting).toHaveProperty('enabled');
    });
  });
});
