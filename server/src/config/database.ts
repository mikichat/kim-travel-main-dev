// Simple SQLite3 database connection using better-sqlite3
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'tourworld.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    destination TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'DRAFT',
    metadata TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS itinerary_items (
    id TEXT PRIMARY KEY,
    itinerary_id TEXT NOT NULL,
    hotel_id TEXT,
    day_number INTEGER,
    start_time TEXT,
    end_time TEXT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    coordinates TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS hotels (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    address TEXT,
    country TEXT,
    city TEXT,
    star_rating INTEGER,
    phone TEXT,
    url TEXT,
    location_remarks TEXT,
    coordinates TEXT,
    amenities TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    category_id TEXT,
    hotel_id TEXT,
    filename TEXT NOT NULL,
    storage_path TEXT,
    cloud_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS image_categories (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS image_item_images (
    itinerary_item_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (itinerary_item_id, image_id),
    FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    customer_id TEXT,
    pnr TEXT,
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
    status TEXT DEFAULT 'pending',
    remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bsp_dates (
    id TEXT PRIMARY KEY,
    payment_date TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'payment',
    is_notified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    bank_account TEXT,
    bank_name TEXT,
    remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    name TEXT,
    amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    recipient TEXT,
    invoice_date TEXT,
    description TEXT,
    total_amount REAL DEFAULT 0,
    calculation_mode TEXT,
    base_price_per_person REAL,
    total_participants INTEGER,
    total_travel_cost REAL,
    deposit_amount REAL,
    deposit_description TEXT,
    additional_items TEXT,
    balance_due REAL,
    logo_path TEXT,
    seal_path TEXT,
    pdf_file_path TEXT,
    flight_schedule_id TEXT,
    bank_account_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS flight_schedules (
    id TEXT PRIMARY KEY,
    group_id TEXT,
    group_name TEXT,
    airline TEXT,
    flight_number TEXT,
    departure_date TEXT,
    departure_airport TEXT,
    departure_time TEXT,
    arrival_date TEXT,
    arrival_airport TEXT,
    arrival_time TEXT,
    passengers INTEGER DEFAULT 0,
    pnr TEXT,
    source TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    destination TEXT,
    departure_date TEXT,
    return_date TEXT,
    members TEXT,
    roster_id TEXT,
    last_sync_at TEXT,
    sync_status TEXT,
    is_archived INTEGER DEFAULT 0,
    archived_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS group_rosters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cost_calculations (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    destination TEXT,
    departure_date TEXT,
    arrival_date TEXT,
    nights INTEGER,
    days INTEGER,
    adults INTEGER DEFAULT 0,
    children INTEGER DEFAULT 0,
    infants INTEGER DEFAULT 0,
    tc REAL DEFAULT 0,
    domestic_vehicle_type TEXT,
    domestic_vehicle_total REAL,
    flight_data TEXT,
    etc_costs TEXT,
    land_cost_1 TEXT,
    land_cost_2 TEXT,
    margin_amount_1 REAL,
    margin_amount_2 REAL,
    notes_1 TEXT,
    notes_2 TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    group_name TEXT NOT NULL,
    event_date TEXT NOT NULL,
    location TEXT,
    transport TEXT,
    time TEXT,
    schedule TEXT,
    meals TEXT,
    color TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    destination TEXT,
    duration INTEGER,
    price REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    hotel_name TEXT,
    hotel_checkin TEXT,
    hotel_checkout TEXT,
    hotel_room_type TEXT,
    hotel_rooms INTEGER,
    hotel_note TEXT,
    vehicle_type TEXT,
    vehicle_count INTEGER,
    vehicle_company TEXT,
    vehicle_note TEXT,
    guide_name TEXT,
    guide_phone TEXT,
    guide_language TEXT,
    guide_note TEXT,
    flight_id TEXT,
    outbound_flight TEXT,
    return_flight TEXT,
    flight_note TEXT,
    procurement_flight TEXT,
    procurement_hotel TEXT,
    procurement_vehicle TEXT,
    procurement_guide TEXT,
    procurement_visa TEXT,
    procurement_insurance TEXT,
    procurement_status TEXT,
    procurement_note TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name_kor TEXT,
    name_eng TEXT,
    passport_number TEXT UNIQUE NOT NULL,
    birth_date TEXT,
    passport_expiry TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    travel_history TEXT,
    notes TEXT,
    passport_file_name TEXT,
    passport_file_data TEXT,
    group_name TEXT,
    last_modified TEXT,
    departure_date TEXT,
    travel_region TEXT,
    sync_source TEXT,
    sync_group_id TEXT,
    is_active INTEGER DEFAULT 1,
    gender TEXT,
    return_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    due_date TEXT,
    priority TEXT,
    description TEXT,
    is_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Export database instance
module.exports = db;
