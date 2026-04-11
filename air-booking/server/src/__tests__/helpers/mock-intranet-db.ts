/**
 * 테스트용 인메모리 인트라넷 DB mock
 *
 * getIntranetDb()를 mock해서 인메모리 DB를 반환하도록 합니다.
 * 이렇게 하면 서비스와 테스트가 같은 DB 인스턴스를 공유합니다.
 */
import sqlite3Driver from 'sqlite3';
import { open, Database } from 'sqlite';

let mockDb: Database | null = null;

export async function createMockIntranetDb(): Promise<Database> {
  if (mockDb) {
    await mockDb.close();
    mockDb = null;
  }

  mockDb = await open({
    filename: ':memory:',
    driver: sqlite3Driver.Database,
  });
  await mockDb.run('PRAGMA foreign_keys = ON');

  await mockDb.exec(`
    CREATE TABLE IF NOT EXISTS air_bookings (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, customer_id TEXT, pnr TEXT NOT NULL,
      airline TEXT, flight_number TEXT, route_from TEXT, route_to TEXT,
      name_kr TEXT, name_en TEXT, passport_number TEXT, seat_number TEXT, fare REAL,
      nmtl_date TEXT, tl_date TEXT, departure_date TEXT, return_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending', remarks TEXT, pax_count INTEGER DEFAULT 1,
      agency TEXT, group_id TEXT, original_pnr_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_booking_passengers (
      id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, name_en TEXT, name_kr TEXT,
      title TEXT, gender TEXT, passport_number TEXT, seat_number TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_booking_segments (
      id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, seg_index INTEGER NOT NULL DEFAULT 0,
      airline TEXT, flight_number TEXT, route_from TEXT, route_to TEXT,
      departure_date TEXT, departure_time TEXT, arrival_time TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_booking_history (
      id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, field_name TEXT,
      old_value TEXT, new_value TEXT, changed_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'air',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_bsp_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, payment_date TEXT NOT NULL,
      description TEXT, type TEXT NOT NULL DEFAULT 'payment',
      is_notified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_alert_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      hours_before INTEGER NOT NULL DEFAULT 24, alert_type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS air_tickets (
      id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, passenger_name TEXT,
      ticket_number TEXT NOT NULL, issue_date TEXT,
      status TEXT DEFAULT 'issued', created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_vendors (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'airline',
      contact_name TEXT, phone TEXT, email TEXT, remarks TEXT,
      bank_name TEXT, account_number TEXT, account_holder TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, name_kor TEXT NOT NULL, name_eng TEXT NOT NULL DEFAULT '',
      passport_number TEXT NOT NULL DEFAULT '', birth_date TEXT NOT NULL DEFAULT '',
      passport_expiry TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
      email TEXT, address TEXT, travel_history TEXT, notes TEXT,
      passport_file_name TEXT, passport_file_data TEXT, group_name TEXT,
      last_modified TEXT, departure_date TEXT, gender TEXT, travel_region TEXT,
      sync_source TEXT DEFAULT 'manual', sync_group_id TEXT,
      is_active INTEGER DEFAULT 1, return_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_settlements (
      id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, vendor_id TEXT,
      payment_type TEXT, amount REAL, status TEXT NOT NULL DEFAULT 'unpaid',
      payment_date TEXT, remarks TEXT, invoice_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS flight_schedules (
      id TEXT PRIMARY KEY, group_id TEXT, group_name TEXT,
      airline TEXT NOT NULL, flight_number TEXT,
      departure_date TEXT NOT NULL, departure_airport TEXT NOT NULL,
      departure_time TEXT NOT NULL, arrival_date TEXT NOT NULL,
      arrival_airport TEXT NOT NULL, arrival_time TEXT NOT NULL,
      passengers INTEGER DEFAULT 0, pnr TEXT, source TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY, invoice_number TEXT UNIQUE,
      recipient TEXT NOT NULL DEFAULT '', invoice_date TEXT NOT NULL DEFAULT '',
      description TEXT, flight_schedule_id TEXT,
      airfare_unit_price INTEGER DEFAULT 0, airfare_quantity INTEGER DEFAULT 0,
      airfare_total INTEGER DEFAULT 0,
      seat_preference_unit_price INTEGER DEFAULT 0, seat_preference_quantity INTEGER DEFAULT 0,
      seat_preference_total INTEGER DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0, bank_account_id TEXT,
      calculation_mode TEXT DEFAULT 'simple',
      base_price_per_person INTEGER, total_participants INTEGER,
      total_travel_cost INTEGER, deposit_amount INTEGER,
      deposit_description TEXT, additional_items TEXT, balance_due INTEGER,
      booking_id TEXT, settlement_id TEXT, flight_info TEXT,
      passenger_info TEXT, ticket_info TEXT,
      bank_name TEXT, account_number TEXT, account_holder TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_estimates (
      id TEXT PRIMARY KEY, doc_number TEXT NOT NULL UNIQUE,
      doc_type TEXT NOT NULL DEFAULT 'estimate',
      recipient TEXT NOT NULL DEFAULT '', subject TEXT NOT NULL DEFAULT '',
      quote_date TEXT NOT NULL DEFAULT '', sections_json TEXT DEFAULT '{}',
      grand_total INTEGER DEFAULT 0, per_person INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS air_company_settings (
      id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bus_reservations (
      id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS saved_notices (
      id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS group_rosters (
      id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return mockDb;
}

export function getMockIntranetDb(): Database | null {
  return mockDb;
}

export async function closeMockIntranetDb(): Promise<void> {
  if (mockDb) {
    await mockDb.close();
    mockDb = null;
  }
}
