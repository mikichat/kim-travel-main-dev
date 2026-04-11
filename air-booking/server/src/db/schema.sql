-- Air Booking Database Schema
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'air',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name_kor TEXT DEFAULT '',
  name_eng TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT,
  passport_number TEXT DEFAULT '',
  passport_expiry TEXT DEFAULT '',
  birth_date TEXT DEFAULT '',
  gender TEXT,
  notes TEXT,
  group_name TEXT,
  travel_region TEXT,
  is_active INTEGER DEFAULT 1,
  last_modified TEXT DEFAULT (datetime('now','localtime')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  customer_id INTEGER REFERENCES customers(id),
  pnr TEXT NOT NULL,
  airline TEXT,
  flight_number TEXT,
  route_from TEXT,
  route_to TEXT,
  name_kr TEXT,
  name_en TEXT,
  passport_number TEXT,
  seat_number TEXT,
  fare REAL,
  nmtl_date TEXT,
  tl_date TEXT,
  departure_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','ticketed','cancelled')),
  remarks TEXT,
  pax_count INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_passengers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name_en TEXT,
  name_kr TEXT,
  title TEXT,
  passport_number TEXT,
  seat_number TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bp_booking ON booking_passengers(booking_id);

CREATE TABLE IF NOT EXISTS booking_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INTEGER REFERENCES users(id),
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  vendor_id INTEGER REFERENCES vendors(id),
  payment_type TEXT,
  amount REAL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid','paid','partial')),
  payment_date TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  recipient TEXT NOT NULL DEFAULT '',
  invoice_date TEXT,
  description TEXT,
  total_amount REAL DEFAULT 0,
  airfare_unit_price REAL DEFAULT 0,
  airfare_quantity INTEGER DEFAULT 0,
  airfare_total REAL DEFAULT 0,
  calculation_mode TEXT,
  base_price_per_person REAL,
  total_participants INTEGER,
  total_travel_cost REAL,
  deposit_amount REAL,
  balance_due REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bsp_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_date TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'payment',
  is_notified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alert_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  hours_before INTEGER NOT NULL DEFAULT 24,
  alert_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);

-- 통합 DB용 air_ 테이블 (테스트 환경에서도 생성)
CREATE TABLE IF NOT EXISTS air_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'air',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS air_bsp_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_date TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'payment',
  is_notified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS air_alert_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  hours_before INTEGER NOT NULL DEFAULT 24,
  alert_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS air_bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_id TEXT,
  pnr TEXT NOT NULL,
  airline TEXT,
  flight_number TEXT,
  route_from TEXT,
  route_to TEXT,
  name_kr TEXT,
  name_en TEXT,
  passport_number TEXT,
  seat_number TEXT,
  fare REAL,
  nmtl_date TEXT,
  tl_date TEXT,
  departure_date TEXT,
  return_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  remarks TEXT,
  pax_count INTEGER DEFAULT 1,
  agency TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS air_booking_passengers (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  name_en TEXT,
  name_kr TEXT,
  title TEXT,
  gender TEXT,
  passport_number TEXT,
  seat_number TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS air_booking_segments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  seg_index INTEGER NOT NULL DEFAULT 0,
  airline TEXT,
  flight_number TEXT,
  route_from TEXT,
  route_to TEXT,
  departure_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_air_seg_booking ON air_booking_segments(booking_id);

CREATE TABLE IF NOT EXISTS air_booking_history (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS air_vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS air_settlements (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  vendor_id TEXT,
  payment_type TEXT,
  amount REAL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  payment_date TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_pnr ON bookings(pnr);
CREATE INDEX IF NOT EXISTS idx_bookings_nmtl_date ON bookings(nmtl_date);
CREATE INDEX IF NOT EXISTS idx_bookings_tl_date ON bookings(tl_date);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_date ON bookings(departure_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_bsp_dates_payment_date ON bsp_dates(payment_date);
