import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

function getDbPath(): string {
  return process.env.DATABASE_PATH || path.join(__dirname, '../../data/air-booking.db');
}

export async function getDb(): Promise<Database> {
  if (!db) {
    const DB_PATH = getDbPath();
    if (DB_PATH !== ':memory:') {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });

    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA foreign_keys = ON');

    // Initialize schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      await db.exec(schema);
    }

    // Migration: passport_hash 컬럼 추가 (기존 DB 호환)
    try {
      await db.run('ALTER TABLE customers ADD COLUMN passport_hash TEXT');
    } catch {
      // 이미 존재하면 무시
    }

    // Migration: role 컬럼 기본값 변경 (staff → air)
    try {
      await db.run("UPDATE users SET role = 'air' WHERE role = 'staff'");
    } catch {
      // 무시
    }

    // Migration: bsp_dates에 type 컬럼 추가 (청구/입금/보고)
    try {
      await db.run("ALTER TABLE bsp_dates ADD COLUMN type TEXT NOT NULL DEFAULT 'payment'");
    } catch {
      // 이미 존재하면 무시
    }
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

export default getDb;
