// @TASK P1-R1-T1 - Auth API 테스트
// @SPEC Auth API: login, logout, me + requireAuth middleware

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { getDb, closeDb } from '../db';
import { getIntranetDb } from '../db/intranet';
import { setupIntranetTestDb, teardownIntranetTestDb } from './helpers/setup-intranet-db';
import { authRouter } from '../routes/auth';
import { requireAuth } from '../middleware/auth';
import { clearLockouts } from '../services/auth.service';

let app: express.Express;

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
  app.use('/api/auth', authRouter);

  // Protected test route
  app.get('/api/protected', requireAuth, (_req, res) => {
    res.json({ success: true, data: { message: 'ok' } });
  });

  return app;
}

beforeAll(async () => {
  // Close any existing DB connection first, then use in-memory
  await closeDb();
  process.env.DATABASE_PATH = ':memory:';
  await setupIntranetTestDb();
  app = createApp();

  // Seed a test user in intranet DB (auth service uses air_users)
  const idb = await getIntranetDb();
  const hash = await bcrypt.hash('Test1234!', 10);
  await idb.run(
    `INSERT OR IGNORE INTO air_users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
    ['admin@test.com', hash, 'Admin', 'admin']
  );
});

afterAll(async () => {
  await teardownIntranetTestDb();
  await closeDb();
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Test1234!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      id: expect.any(Number),
      email: 'admin@test.com',
      name: 'Admin',
      role: 'admin',
    });
    // password_hash should not be returned
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Test1234!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should lock account after 3 failed attempts', async () => {
    // Reset lockouts from any prior run
    clearLockouts();
    // Create a user for lockout test
    const idb = await getIntranetDb();
    const hash = await bcrypt.hash('Lock1234!', 10);
    await idb.run(
      `INSERT OR IGNORE INTO air_users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      ['locktest@test.com', hash, 'LockUser', 'staff']
    );

    // 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'locktest@test.com', password: 'wrong' });
    }

    // 4th attempt with correct password should be locked
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'locktest@test.com', password: 'Lock1234!' });

    expect(res.status).toBe(423);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/잠금|locked/i);
  });
});

describe('GET /api/auth/me', () => {
  it('should return 401 if not logged in', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return user info when logged in', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Test1234!' });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('admin@test.com');
    expect(res.body.data.user.password_hash).toBeUndefined();
  });
});

describe('POST /api/auth/logout', () => {
  it('should logout successfully', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Test1234!' });

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // After logout, /me should return 401
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });
});

describe('requireAuth middleware', () => {
  it('should block unauthenticated requests', async () => {
    const res = await request(app).get('/api/protected');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should allow authenticated requests', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Test1234!' });

    const res = await agent.get('/api/protected');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
