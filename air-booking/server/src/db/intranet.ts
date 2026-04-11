// 공용 인트라넷 DB 연결 모듈
// travel_agency.db 하나로 모든 테이블 통합

import sqlite3Driver from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { encrypt } from '../services/crypto.service';

const INTRANET_DB_PATH = process.env.INTRANET_DB_PATH
  || path.join(__dirname, '../../../../backend/travel_agency.db');

let intranetDb: Database | null = null;

export async function getIntranetDb(): Promise<Database> {
  if (!intranetDb) {
    intranetDb = await open({
      filename: INTRANET_DB_PATH,
      driver: sqlite3Driver.Database,
    });
    await intranetDb.run('PRAGMA journal_mode = WAL');
    await intranetDb.run('PRAGMA foreign_keys = ON');
    await intranetDb.run('PRAGMA busy_timeout = 5000');

    // air-booking 전용 테이블 마이그레이션 (없으면 생성)
    await intranetDb.exec(`
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
        group_id TEXT,
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

      CREATE INDEX IF NOT EXISTS idx_air_bsp_dates_payment_date ON air_bsp_dates(payment_date);

      CREATE TABLE IF NOT EXISTS air_booking_segments (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        seg_index INTEGER NOT NULL DEFAULT 0,
        airline TEXT,
        flight_number TEXT,
        route_from TEXT,
        route_to TEXT,
        departure_date TEXT,
        departure_time TEXT,
        arrival_time TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_air_seg_booking ON air_booking_segments(booking_id);

      CREATE TABLE IF NOT EXISTS air_tickets (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        passenger_name TEXT,
        ticket_number TEXT NOT NULL,
        issue_date TEXT,
        status TEXT DEFAULT 'issued' CHECK(status IN ('issued', 'refunded', 'reissued', 'void')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES air_bookings(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_air_tickets_booking ON air_tickets(booking_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_air_tickets_unique ON air_tickets(booking_id, ticket_number);
      CREATE INDEX IF NOT EXISTS idx_air_tickets_number ON air_tickets(ticket_number);
      CREATE INDEX IF NOT EXISTS idx_air_tickets_status ON air_tickets(status);

      CREATE INDEX IF NOT EXISTS idx_air_bookings_status ON air_bookings(status);
      CREATE INDEX IF NOT EXISTS idx_air_bookings_customer_id ON air_bookings(customer_id);
      CREATE INDEX IF NOT EXISTS idx_air_bookings_user_id ON air_bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_air_pax_booking ON air_booking_passengers(booking_id);

      CREATE TABLE IF NOT EXISTS air_fare_certificates (
        id TEXT PRIMARY KEY,
        cert_number TEXT NOT NULL UNIQUE,
        booking_id TEXT NOT NULL,
        recipient TEXT NOT NULL,
        issue_date TEXT NOT NULL,
        traveler_name TEXT DEFAULT '',
        cabin_class TEXT DEFAULT '일반석',
        route_description TEXT DEFAULT '',
        ticket_period_start TEXT,
        ticket_period_end TEXT,
        pax_count INTEGER DEFAULT 1,
        base_fare_per_person REAL DEFAULT 0,
        tax_per_person REAL DEFAULT 0,
        total_fare REAL DEFAULT 0,
        total_tax REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        segments_json TEXT DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','reissued','cancelled')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_fc_booking_id ON air_fare_certificates(booking_id);
      CREATE INDEX IF NOT EXISTS idx_fc_cert_number ON air_fare_certificates(cert_number);
      CREATE INDEX IF NOT EXISTS idx_fc_issue_date ON air_fare_certificates(issue_date);
    `);

    // 견적서 테이블
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS air_quotations (
        id TEXT PRIMARY KEY,
        quotation_number TEXT NOT NULL UNIQUE,
        booking_id TEXT,
        flight_schedule_id TEXT,
        recipient TEXT NOT NULL,
        issue_date TEXT NOT NULL,
        valid_until TEXT,
        traveler_name TEXT DEFAULT '',
        cabin_class TEXT DEFAULT '일반석',
        route_description TEXT DEFAULT '',
        ticket_period_start TEXT,
        ticket_period_end TEXT,
        pax_count INTEGER DEFAULT 1,
        base_fare_per_person REAL DEFAULT 0,
        tax_per_person REAL DEFAULT 0,
        fuel_surcharge_per_person REAL DEFAULT 0,
        ticket_fee_per_person REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        segments_json TEXT DEFAULT '[]',
        remarks TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','cancelled')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_qt_booking_id ON air_quotations(booking_id);
      CREATE INDEX IF NOT EXISTS idx_qt_schedule_id ON air_quotations(flight_schedule_id);
      CREATE INDEX IF NOT EXISTS idx_qt_issue_date ON air_quotations(issue_date);
    `);

    // 세부 견적서/정산서 테이블
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS air_estimates (
        id TEXT PRIMARY KEY,
        doc_number TEXT NOT NULL UNIQUE,
        doc_type TEXT NOT NULL DEFAULT 'estimate' CHECK(doc_type IN ('estimate','settlement','domestic','domestic_settlement','delivery','claim')),
        recipient TEXT NOT NULL DEFAULT '',
        subject TEXT NOT NULL DEFAULT '',
        quote_date TEXT NOT NULL,
        valid_period TEXT DEFAULT '견적일로부터 30일',
        company_name TEXT DEFAULT '',
        ceo_name TEXT DEFAULT '',
        biz_no TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        manager TEXT DEFAULT '',
        email TEXT DEFAULT '',
        group_name TEXT DEFAULT '',
        itinerary TEXT DEFAULT '',
        travel_date TEXT DEFAULT '',
        pax_size INTEGER DEFAULT 1,
        leader TEXT DEFAULT '',
        guide TEXT DEFAULT '',
        conditions TEXT DEFAULT '',
        room_style TEXT DEFAULT '',
        currency TEXT DEFAULT 'JPY',
        exchange_rate REAL DEFAULT 9.8,
        rate_date TEXT DEFAULT '',
        rate_source TEXT DEFAULT '하나은행 고시환율',
        sections_json TEXT DEFAULT '{}',
        flight_included INTEGER DEFAULT 0,
        commission INTEGER DEFAULT 0,
        grand_total INTEGER DEFAULT 0,
        per_person INTEGER DEFAULT 0,
        notices_json TEXT DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','confirmed','cancelled')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_est_doc_number ON air_estimates(doc_number);
      CREATE INDEX IF NOT EXISTS idx_est_doc_type ON air_estimates(doc_type);
      CREATE INDEX IF NOT EXISTS idx_est_recipient ON air_estimates(recipient);
      CREATE INDEX IF NOT EXISTS idx_est_quote_date ON air_estimates(quote_date);
    `);

    // air_estimates doc_type CHECK 확장 마이그레이션 (domestic, domestic_settlement 추가)
    const checkInfo = await intranetDb.get<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='air_estimates'"
    );
    if (checkInfo?.sql && !checkInfo.sql.includes('domestic')) {
      await intranetDb.exec(`
        CREATE TABLE air_estimates_new (
          id TEXT PRIMARY KEY,
          doc_number TEXT NOT NULL UNIQUE,
          doc_type TEXT NOT NULL DEFAULT 'estimate' CHECK(doc_type IN ('estimate','settlement','domestic','domestic_settlement','delivery','claim')),
          recipient TEXT NOT NULL DEFAULT '',
          subject TEXT NOT NULL DEFAULT '',
          quote_date TEXT NOT NULL,
          valid_period TEXT DEFAULT '견적일로부터 30일',
          company_name TEXT DEFAULT '',
          ceo_name TEXT DEFAULT '',
          biz_no TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          address TEXT DEFAULT '',
          manager TEXT DEFAULT '',
          email TEXT DEFAULT '',
          group_name TEXT DEFAULT '',
          itinerary TEXT DEFAULT '',
          travel_date TEXT DEFAULT '',
          pax_size INTEGER DEFAULT 1,
          leader TEXT DEFAULT '',
          guide TEXT DEFAULT '',
          conditions TEXT DEFAULT '',
          room_style TEXT DEFAULT '',
          currency TEXT DEFAULT 'JPY',
          exchange_rate REAL DEFAULT 9.8,
          rate_date TEXT DEFAULT '',
          rate_source TEXT DEFAULT '하나은행 고시환율',
          sections_json TEXT DEFAULT '{}',
          commission INTEGER DEFAULT 0,
          grand_total INTEGER DEFAULT 0,
          per_person INTEGER DEFAULT 0,
          notices_json TEXT DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','confirmed','cancelled')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO air_estimates_new SELECT * FROM air_estimates;
        DROP TABLE air_estimates;
        ALTER TABLE air_estimates_new RENAME TO air_estimates;
        CREATE INDEX IF NOT EXISTS idx_est_doc_number ON air_estimates(doc_number);
        CREATE INDEX IF NOT EXISTS idx_est_doc_type ON air_estimates(doc_type);
        CREATE INDEX IF NOT EXISTS idx_est_recipient ON air_estimates(recipient);
        CREATE INDEX IF NOT EXISTS idx_est_quote_date ON air_estimates(quote_date);
      `);
      console.log('[DB] air_estimates doc_type CHECK 확장 완료 (domestic 추가)');
    }

    // flight_included 컬럼 마이그레이션 (국내 항공 포함 여부)
    const estCols = await intranetDb.all<{ name: string }[]>(
      "PRAGMA table_info(air_estimates)"
    );
    if (estCols.length > 0 && !estCols.find((c: any) => c.name === 'flight_included')) {
      await intranetDb.exec(`ALTER TABLE air_estimates ADD COLUMN flight_included INTEGER DEFAULT 0`);
      console.log('[DB] air_estimates flight_included 컬럼 추가 완료');
    }

    // 납품확인서/대금청구서 컬럼 마이그레이션
    const estCols2 = await intranetDb.all<{ name: string }[]>("PRAGMA table_info(air_estimates)");
    if (estCols2.length > 0 && !estCols2.find((c: any) => c.name === 'contract_number')) {
      const newCols = [
        'contract_number TEXT DEFAULT ""', 'contract_date TEXT DEFAULT ""', 'contract_name TEXT DEFAULT ""',
        'service_period TEXT DEFAULT ""', 'service_location TEXT DEFAULT ""', 'completion_date TEXT DEFAULT ""',
        'student_count INTEGER DEFAULT 0', 'teacher_count INTEGER DEFAULT 0', 'escort_count INTEGER DEFAULT 0',
        'supply_amount INTEGER DEFAULT 0', 'vat_amount INTEGER DEFAULT 0', 'amount_korean TEXT DEFAULT ""',
        'bank_name TEXT DEFAULT ""', 'account_number TEXT DEFAULT ""', 'account_holder TEXT DEFAULT ""',
        'seal_image TEXT DEFAULT ""', 'institution_name TEXT DEFAULT ""', 'department TEXT DEFAULT ""',
        'contact_person TEXT DEFAULT ""',
      ];
      for (const col of newCols) {
        try { await intranetDb.exec(`ALTER TABLE air_estimates ADD COLUMN ${col}`); } catch { /* exists */ }
      }
      console.log('[DB] air_estimates 납품/청구서 컬럼 19개 추가 완료');
    }

    // 과세/부가세 수동 수정 컬럼 추가
    const manualCols = ['manual_taxable INTEGER', 'manual_vat INTEGER'];
    for (const col of manualCols) {
      try { await intranetDb.exec(`ALTER TABLE air_estimates ADD COLUMN ${col}`); } catch { }
    }

    // doc_type CHECK 확장 (delivery, claim 추가)
    const checkInfo2 = await intranetDb.get<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='air_estimates'"
    );
    if (checkInfo2?.sql && !checkInfo2.sql.includes('delivery')) {
      // CHECK 제약조건만 업데이트 필요 — 테이블 재생성
      const currentSql = checkInfo2.sql
        .replace(/CHECK\(doc_type IN \([^)]+\)\)/, "CHECK(doc_type IN ('estimate','settlement','domestic','domestic_settlement','delivery','claim'))");
      const newSql = currentSql.replace('air_estimates', 'air_estimates_tmp');
      await intranetDb.exec(`
        ${newSql};
        INSERT INTO air_estimates_tmp SELECT * FROM air_estimates;
        DROP TABLE air_estimates;
        ALTER TABLE air_estimates_tmp RENAME TO air_estimates;
        CREATE INDEX IF NOT EXISTS idx_est_doc_number ON air_estimates(doc_number);
        CREATE INDEX IF NOT EXISTS idx_est_doc_type ON air_estimates(doc_type);
        CREATE INDEX IF NOT EXISTS idx_est_recipient ON air_estimates(recipient);
        CREATE INDEX IF NOT EXISTS idx_est_quote_date ON air_estimates(quote_date);
      `);
      console.log('[DB] air_estimates doc_type CHECK 확장 완료 (delivery/claim 추가)');
    }

    // air_vendors 테이블 (거래처)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS air_vendors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'airline',
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        remarks TEXT,
        bank_name TEXT,
        account_number TEXT,
        account_holder TEXT,
        address TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // customers 테이블 (고객 정보, 레거시 테이블명)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name_kor TEXT NOT NULL,
        name_eng TEXT NOT NULL DEFAULT '',
        passport_number TEXT NOT NULL DEFAULT '' UNIQUE,
        birth_date TEXT NOT NULL DEFAULT '',
        passport_expiry TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT,
        address TEXT,
        travel_history TEXT,
        notes TEXT,
        passport_file_name TEXT,
        passport_file_data TEXT,
        group_name TEXT,
        last_modified TEXT,
        departure_date TEXT,
        gender TEXT,
        travel_region TEXT,
        sync_source TEXT DEFAULT 'manual',
        sync_group_id TEXT,
        is_active INTEGER DEFAULT 1,
        return_date TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // air_settlements 테이블 (정산)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS air_settlements (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        vendor_id TEXT,
        payment_type TEXT,
        amount REAL,
        status TEXT NOT NULL DEFAULT 'unpaid',
        payment_date TEXT,
        remarks TEXT,
        invoice_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // flight_schedules 테이블 (레거시, 이미 존재하면 건너뜀)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS flight_schedules (
        id TEXT PRIMARY KEY,
        group_id TEXT,
        group_name TEXT,
        airline TEXT NOT NULL,
        flight_number TEXT,
        departure_date TEXT NOT NULL,
        departure_airport TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        arrival_date TEXT NOT NULL,
        arrival_airport TEXT NOT NULL,
        arrival_time TEXT NOT NULL,
        passengers INTEGER DEFAULT 0,
        pnr TEXT,
        source TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // invoices 테이블 (이미 존재하면 건너뜀)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE,
        recipient TEXT NOT NULL DEFAULT '',
        invoice_date TEXT NOT NULL DEFAULT '',
        description TEXT,
        flight_schedule_id TEXT,
        airfare_unit_price INTEGER DEFAULT 0,
        airfare_quantity INTEGER DEFAULT 0,
        airfare_total INTEGER DEFAULT 0,
        seat_preference_unit_price INTEGER DEFAULT 0,
        seat_preference_quantity INTEGER DEFAULT 0,
        seat_preference_total INTEGER DEFAULT 0,
        total_amount INTEGER NOT NULL DEFAULT 0,
        bank_account_id TEXT,
        logo_path TEXT,
        seal_path TEXT,
        pdf_file_path TEXT,
        calculation_mode TEXT DEFAULT 'simple',
        base_price_per_person INTEGER,
        total_participants INTEGER,
        total_travel_cost INTEGER,
        deposit_amount INTEGER,
        deposit_description TEXT,
        additional_items TEXT,
        balance_due INTEGER,
        booking_id TEXT,
        settlement_id TEXT,
        flight_info TEXT,
        passenger_info TEXT,
        ticket_info TEXT,
        bank_name TEXT,
        account_number TEXT,
        account_holder TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // air_booking_history 테이블 (변경 이력)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS air_booking_history (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        field_changed TEXT,
        old_value TEXT,
        new_value TEXT,
        changed_by TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // audit_logs 테이블 (보안 이벤트 로깅)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource TEXT,
        details TEXT,
        ip TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    `);

    // bus_reservations 테이블 (localStorage → DB 전환)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS bus_reservations (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // saved_notices 테이블 (localStorage → DB 전환)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS saved_notices (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // groups 테이블 (단체상품)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        destination TEXT,
        departure_date TEXT,
        return_date TEXT,
        members TEXT NOT NULL DEFAULT '[]',
        is_archived INTEGER NOT NULL DEFAULT 0,
        roster_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // group_rosters 테이블 (localStorage → DB 전환)
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS group_rosters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 회사 설정 테이블
    await intranetDb.exec(`
      CREATE TABLE IF NOT EXISTS air_company_settings (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    // 초기 설정 데이터
    const defaults: [string, string][] = [
      ['company_name', '(유)여행세상'],
      ['ceo_name', '김국진'],
      ['tel', '063-271-9090'],
      ['fax', '063-271-9030'],
      ['email', 'pyo4seyo@naver.com'],
      ['address', '전북 전주시'],
      ['bank_accounts', JSON.stringify([{"bank_name":"하나은행","account_number":"611-016420-721","account_holder":"(유)여행세상","is_default":true}])],
    ];
    for (const [k, v] of defaults) {
      await intranetDb.run(
        `INSERT OR IGNORE INTO air_company_settings (id, key, value) VALUES (?, ?, ?)`,
        [crypto.randomUUID(), k, v]
      );
    }

    // Migration: air_fare_certificates에 flight_schedule_id 추가
    try { await intranetDb.run('ALTER TABLE air_fare_certificates ADD COLUMN flight_schedule_id TEXT'); } catch { /* exists */ }

    // Migration: air_invoices에 booking_id, settlement_id, flight/passenger/ticket_info 추가
    try { await intranetDb.run('ALTER TABLE invoices ADD COLUMN booking_id TEXT'); } catch { /* exists */ }
    try { await intranetDb.run('ALTER TABLE invoices ADD COLUMN settlement_id TEXT'); } catch { /* exists */ }
    try { await intranetDb.run('ALTER TABLE invoices ADD COLUMN flight_info TEXT'); } catch { /* exists */ }
    try { await intranetDb.run('ALTER TABLE invoices ADD COLUMN passenger_info TEXT'); } catch { /* exists */ }
    try { await intranetDb.run('ALTER TABLE invoices ADD COLUMN ticket_info TEXT'); } catch { /* exists */ }
    try { await intranetDb.run('CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id)'); } catch { /* exists */ }

    // Migration: invoices에 계좌 정보 컬럼 추가
    try { await intranetDb.run('ALTER TABLE invoices ADD COLUMN bank_name TEXT'); } catch { /* exists */ }
    try { await intranetDb.run('ALTER TABLE invoices ADD COLUMN account_number TEXT'); } catch { /* exists */ }
    try { await intranetDb.run('ALTER TABLE invoices ADD COLUMN account_holder TEXT'); } catch { /* exists */ }

    // Migration: air_bookings에 agency 컬럼 추가
    try { await intranetDb.run('ALTER TABLE air_bookings ADD COLUMN agency TEXT'); } catch { /* exists */ }

    // Migration: air_bookings에 return_date 컬럼 추가
    try { await intranetDb.run('ALTER TABLE air_bookings ADD COLUMN return_date TEXT'); } catch { /* exists */ }

    // Migration: air_estimates에 sign_date, sign_supplier, attachments_json 추가
    try { await intranetDb.run('ALTER TABLE air_estimates ADD COLUMN sign_date TEXT DEFAULT ""'); } catch { /* exists */ }
    try { await intranetDb.run('ALTER TABLE air_estimates ADD COLUMN sign_supplier TEXT DEFAULT ""'); } catch { /* exists */ }
    try { await intranetDb.run('ALTER TABLE air_estimates ADD COLUMN attachments_json TEXT DEFAULT "[]"'); } catch { /* exists */ }

    // Migration: air_bookings에 original_pnr_text 컬럼 추가 (PNR 원본 보존, 재변환용)
    try { await intranetDb.run('ALTER TABLE air_bookings ADD COLUMN original_pnr_text TEXT'); } catch { /* exists */ }

    // Migration: air_bookings에 group_id 컬럼 추가 (같은 단체 다중 PNR 연결)
    try { await intranetDb.run('ALTER TABLE air_bookings ADD COLUMN group_id TEXT'); } catch { /* exists */ }
    try { await intranetDb.run('CREATE INDEX IF NOT EXISTS idx_air_bookings_group ON air_bookings(group_id)'); } catch { /* exists */ }

    // Migration: air_booking_passengers에 gender 컬럼 추가
    try { await intranetDb.run('ALTER TABLE air_booking_passengers ADD COLUMN gender TEXT'); } catch { /* exists */ }

    // Migration: air_booking_segments에 departure_time, arrival_time 컬럼 추가
    try { await intranetDb.run('ALTER TABLE air_booking_segments ADD COLUMN departure_time TEXT'); } catch { /* exists */ }
    try { await intranetDb.run('ALTER TABLE air_booking_segments ADD COLUMN arrival_time TEXT'); } catch { /* exists */ }

    // Migration: 동일 PNR 왕복 예약 병합 (구간별 분리 → 1건 통합)
    await mergeDuplicatePnrBookings(intranetDb);

    // Migration: segments 없는 왕복 예약에 segments 복원
    await backfillSegments(intranetDb);

    // Migration: encrypt existing passenger passport numbers (plaintext → AES-256-GCM)
    // Encrypted values contain ':' (iv:tag:ciphertext), plaintext does not.
    try {
      const plainPax = await intranetDb.all<{id: string, passport_number: string}[]>(
        `SELECT id, passport_number FROM air_booking_passengers WHERE passport_number IS NOT NULL AND passport_number != '' AND passport_number NOT LIKE '%:%'`
      );
      for (const p of plainPax) {
        const encrypted = encrypt(p.passport_number);
        await intranetDb.run('UPDATE air_booking_passengers SET passport_number = ? WHERE id = ?', [encrypted, p.id]);
      }
      if (plainPax.length > 0) console.log(`[migration] ${plainPax.length}건 탑승객 여권번호 암호화 완료`);
    } catch (err) {
      console.error('[migration] 여권번호 암호화 실패:', err);
    }
  }
  // flight_schedules ↔ air_bookings PNR 자동 매칭 (1회성)
  // flight_schedules에 pnr이 NULL인 레코드 중, air_bookings와 항공편+날짜가 일치하는 것을 매칭
  try {
    const unmatchedCount = await intranetDb.get<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM flight_schedules WHERE pnr IS NULL`
    );
    if (unmatchedCount && unmatchedCount.cnt > 0) {
      const matched = await intranetDb.run(`
        UPDATE flight_schedules SET pnr = (
          SELECT ab.pnr FROM air_bookings ab
          WHERE ab.airline = flight_schedules.airline
            AND ab.departure_date = flight_schedules.departure_date
            AND (ab.route_from = flight_schedules.departure_airport OR ab.route_to = flight_schedules.arrival_airport)
          LIMIT 1
        ), source = 'auto-matched'
        WHERE pnr IS NULL
          AND EXISTS (
            SELECT 1 FROM air_bookings ab
            WHERE ab.airline = flight_schedules.airline
              AND ab.departure_date = flight_schedules.departure_date
              AND (ab.route_from = flight_schedules.departure_airport OR ab.route_to = flight_schedules.arrival_airport)
          )
      `);
      if (matched.changes && matched.changes > 0) {
        console.log(`[migration] flight_schedules ${matched.changes}건 PNR 자동 매칭 완료`);
      }
    }
  } catch (err) {
    console.warn('[migration] PNR 자동 매칭 실패 (무시):', err);
  }

  return intranetDb;
}

export async function closeIntranetDb(): Promise<void> {
  if (intranetDb) {
    await intranetDb.close();
    intranetDb = null;
  }
}

/** 동일 PNR 예약을 하나로 병합 */
async function mergeDuplicatePnrBookings(db: Database): Promise<void> {
  try {
    // 같은 PNR이 2건 이상인 그룹 찾기
    const dupes = await db.all<{ pnr: string; cnt: number }[]>(
      `SELECT pnr, COUNT(*) as cnt FROM air_bookings GROUP BY pnr HAVING cnt > 1`
    );
    if (!dupes || dupes.length === 0) return;

    for (const { pnr } of dupes) {
      const rows = await db.all<{
        id: string; airline: string | null; flight_number: string | null;
        route_from: string | null; route_to: string | null;
        departure_date: string | null; remarks: string | null;
        nmtl_date: string | null; tl_date: string | null;
        pax_count: number; agency: string | null;
      }[]>(
        `SELECT id, airline, flight_number, route_from, route_to, departure_date, remarks, nmtl_date, tl_date, pax_count, agency
         FROM air_bookings WHERE pnr = ? ORDER BY departure_date ASC, created_at ASC`, [pnr]
      );
      if (!rows || rows.length < 2) continue;

      const keepId = rows[0].id;
      const deleteIds = rows.slice(1).map(r => r.id);

      // 편명 합치기 (중복 제거)
      const flightNumbers = rows.map(r => r.flight_number).filter(Boolean);
      const mergedFlight = [...new Set(flightNumbers)].join(' / ');

      // 구간: 첫 출발 → 마지막 도착
      const firstFrom = rows[0].route_from;
      const lastTo = rows[rows.length - 1].route_to;

      // 비고: 구간 상세
      const segDetail = rows.map((r, i) =>
        `${i + 1}) ${r.flight_number || ''} ${r.route_from || ''}→${r.route_to || ''} ${r.departure_date || ''}`
      ).join(' | ');
      const existingRemarks = rows[0].remarks || '';
      const mergedRemarks = existingRemarks
        ? `${segDetail} | ${existingRemarks}`
        : segDetail;

      // NMTL/TL: 가장 빠른 날짜
      const nmtls = rows.map(r => r.nmtl_date).filter(Boolean).sort();
      const tls = rows.map(r => r.tl_date).filter(Boolean).sort();

      // agency: 첫 번째 non-null
      const agency = rows.find(r => r.agency)?.agency || null;

      // 대표 행 업데이트
      await db.run(
        `UPDATE air_bookings SET flight_number = ?, route_from = ?, route_to = ?,
         remarks = ?, nmtl_date = ?, tl_date = ?, agency = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [mergedFlight, firstFrom, lastTo, mergedRemarks,
         nmtls[0] || null, tls[0] || null, agency, keepId]
      );

      // 삭제 대상의 passengers를 대표 행으로 이관
      for (const delId of deleteIds) {
        await db.run(
          `UPDATE air_booking_passengers SET booking_id = ? WHERE booking_id = ?`,
          [keepId, delId]
        );
        await db.run(`DELETE FROM air_booking_history WHERE booking_id = ?`, [delId]);
        await db.run(`DELETE FROM air_bookings WHERE id = ?`, [delId]);
      }
    }
  } catch {
    // 마이그레이션 실패해도 서버 기동에 영향 없음
  }
}

/** segments 없는 왕복 예약에 remarks 파싱으로 segments 복원 */
async function backfillSegments(db: Database): Promise<void> {
  try {
    // segments 테이블에 데이터가 없고, flight_number에 '/' 가 있는 예약
    const bookings = await db.all<{
      id: string; remarks: string | null; flight_number: string | null;
      route_from: string | null; route_to: string | null;
      departure_date: string | null; return_date: string | null; airline: string | null;
    }[]>(
      `SELECT b.id, b.remarks, b.flight_number, b.route_from, b.route_to, b.departure_date, b.return_date, b.airline
       FROM air_bookings b
       WHERE b.flight_number LIKE '%/%'
         AND NOT EXISTS (SELECT 1 FROM air_booking_segments s WHERE s.booking_id = b.id)`
    );
    if (!bookings || bookings.length === 0) return;

    for (const b of bookings) {
      const segments: { airline: string; flight: string; from: string; to: string; date: string }[] = [];

      // remarks에서 파싱: "1) OZ369 ICN→CAN 2026-03-26 | 2) OZ370 CAN→ICN 2026-03-30"
      if (b.remarks) {
        const segRegex = /(\d+)\)\s*(\S+)\s+([A-Z]{3})→([A-Z]{3})\s+(\d{4}-\d{2}-\d{2})/g;
        let m;
        while ((m = segRegex.exec(b.remarks)) !== null) {
          const flight = m[2];
          const airlineCode = flight.replace(/\d+$/, '');
          segments.push({
            airline: airlineCode || b.airline || '',
            flight, from: m[3], to: m[4], date: m[5],
          });
        }
      }

      // remarks에서 파싱 실패 시 flight_number split으로 기본 복원
      if (segments.length === 0) {
        const flights = (b.flight_number || '').split(/\s*\/\s*/).filter(Boolean);
        if (flights.length >= 2) {
          // 2구간 왕복 추정: from→to, to→from
          segments.push({
            airline: b.airline || '', flight: flights[0],
            from: b.route_from || '', to: b.route_to || '',
            date: b.departure_date || '',
          });
          segments.push({
            airline: b.airline || '', flight: flights[1],
            from: b.route_to || '', to: b.route_from || '',
            date: b.return_date || b.departure_date || '',
          });
        }
      }

      // segments 저장 + return_date 업데이트
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segId = `seg-${b.id}-${i}`;
        await db.run(
          `INSERT OR IGNORE INTO air_booking_segments (id, booking_id, seg_index, airline, flight_number, route_from, route_to, departure_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [segId, b.id, i, seg.airline, seg.flight, seg.from, seg.to, seg.date]
        );
      }

      // return_date 없으면 마지막 구간 날짜로 설정
      if (!b.return_date && segments.length > 1) {
        const lastDate = segments[segments.length - 1].date;
        if (lastDate) {
          await db.run('UPDATE air_bookings SET return_date = ? WHERE id = ?', [lastDate, b.id]);
        }
      }

      // remarks에서 자동생성된 구간 정보 제거 (연락처만 남김)
      if (b.remarks) {
        const cleaned = b.remarks
          .replace(/\d+\)\s*\S+\s+[A-Z]{3}→[A-Z]{3}\s+\d{4}-\d{2}-\d{2}\s*\|?\s*/g, '')
          .replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '').trim();
        if (cleaned !== b.remarks) {
          await db.run('UPDATE air_bookings SET remarks = ? WHERE id = ?', [cleaned || null, b.id]);
        }
      }
    }
  } catch {
    // 마이그레이션 실패해도 서버 기동에 영향 없음
  }
}

/** 테스트 전용: 인메모리 DB 인스턴스 주입 */
export function _setIntranetDbForTest(db: Database): void {
  intranetDb = db;
}
