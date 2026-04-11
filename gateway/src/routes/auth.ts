import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

const router = Router();

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await open({
      filename: path.join(__dirname, '../../data/gateway.db'),
      driver: sqlite3.Database,
    });
    await db.run('PRAGMA journal_mode = WAL');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS gateway_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'staff',
        permissions TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create default admin if not exists
    const admin = await db.get('SELECT id FROM gateway_users WHERE role = ?', ['admin']);
    if (!admin) {
      const hash = await bcrypt.hash('admin1234', 10);
      await db.run(
        'INSERT INTO gateway_users (id, email, password_hash, name, role, permissions) VALUES (?, ?, ?, ?, ?, ?)',
        [
          crypto.randomUUID(),
          'admin@tourworld.com',
          hash,
          '관리자 (김국진)',
          'admin',
          JSON.stringify({ main: ['read', 'write', 'delete'], air: ['read', 'write', 'delete'], landing: ['read', 'write', 'delete'] })
        ]
      );
      console.log('[gateway] Default admin created: admin@tourworld.com / admin1234');
    }
  }
  return db;
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: '이메일과 비밀번호를 입력하세요.' });
    return;
  }

  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM gateway_users WHERE email = ?', [email]);
    if (!user) {
      res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;
    try { req.session.permissions = JSON.parse(user.permissions); } catch { req.session.permissions = {}; }

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: req.session.permissions }
      }
    });
  } catch (err) {
    console.error('[auth] Login failed:', err);
    res.status(500).json({ success: false, error: '로그인 처리 실패' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    return;
  }

  try {
    const db = await getDb();
    const user = await db.get('SELECT id, email, name, role, permissions FROM gateway_users WHERE id = ?', [req.session.userId]);
    if (!user) {
      res.status(401).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
      return;
    }

    let perms = {};
    try { perms = JSON.parse(user.permissions); } catch {}

    res.json({ success: true, data: { user: { ...user, permissions: perms } } });
  } catch (err) {
    res.status(500).json({ success: false, error: '사용자 정보 조회 실패' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ success: false, error: '로그아웃 실패' });
      return;
    }
    res.json({ success: true, data: { message: '로그아웃 성공' } });
  });
});

// Admin: 직원 계정 관리
// GET /api/auth/users
router.get('/users', async (req: Request, res: Response) => {
  if (req.session?.role !== 'admin') {
    res.status(403).json({ success: false, error: '관리자 권한이 필요합니다.' });
    return;
  }

  try {
    const db = await getDb();
    const users = await db.all('SELECT id, email, name, role, permissions, created_at FROM gateway_users ORDER BY created_at');
    res.json({ success: true, data: { users: users.map(u => ({ ...u, permissions: JSON.parse(u.permissions || '{}') })) } });
  } catch (err) {
    res.status(500).json({ success: false, error: '사용자 목록 조회 실패' });
  }
});

// POST /api/auth/users — 직원 추가
router.post('/users', async (req: Request, res: Response) => {
  if (req.session?.role !== 'admin') {
    res.status(403).json({ success: false, error: '관리자 권한이 필요합니다.' });
    return;
  }

  const { email, password, name, role, permissions } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ success: false, error: '이메일, 비밀번호, 이름은 필수입니다.' });
    return;
  }

  try {
    const db = await getDb();
    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await db.run(
      'INSERT INTO gateway_users (id, email, password_hash, name, role, permissions) VALUES (?, ?, ?, ?, ?, ?)',
      [id, email, hash, name, role || 'staff', JSON.stringify(permissions || {})]
    );
    res.status(201).json({ success: true, data: { user: { id, email, name, role: role || 'staff' } } });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(400).json({ success: false, error: '이미 존재하는 이메일입니다.' });
      return;
    }
    res.status(500).json({ success: false, error: '사용자 생성 실패' });
  }
});

export { router as authRouter };
