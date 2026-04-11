import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { bookingsRouter } from './routes/bookings';
import { bspDatesRouter } from './routes/bsp-dates';
import { settlementsRouter } from './routes/settlements';
import { invoicesRouter, bookingInvoiceRouter } from './routes/invoices';
import { vendorsRouter } from './routes/vendors';
import { customersRouter } from './routes/customers';
import { alertSettingsRouter } from './routes/alert-settings';
import { groupsRouter } from './routes/groups';
import { flightSchedulesRouter } from './routes/flight-schedules';
import { costCalculationsRouter } from './routes/cost-calculations';
import { ticketsByBookingRouter } from './routes/tickets';
import { fareCertificatesRouter } from './routes/fare-certificates';
import { estimatesRouter } from './routes/estimates';
import { settingsRouter } from './routes/settings';
import { auditLogsRouter } from './routes/audit-logs';
import { busReservationsRouter } from './routes/bus-reservations';
import { savedNoticesRouter } from './routes/saved-notices';
import { groupRostersRouter } from './routes/group-rosters';
import { travelGuidesRouter } from './routes/travel-guides';
import { startScheduler } from './services/scheduler.service';
import { initNotificationMailer } from './services/notification.service';
import { initWebSocket } from './services/websocket.service';
import { createServer } from 'http';

export function createApp() {
  const app = express();

  // 빈 favicon 응답
  app.get('/favicon.ico', (_req, res) => { res.setHeader('Access-Control-Allow-Origin', '*'); res.status(204).end(); });

  // Security headers (기본값 사용 — 모든 보안 헤더 활성화)
  app.use(helmet());

  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5174',
      'http://192.168.0.15:5174',
      'http://192.168.0.15:5510',
    ],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  // API rate limiting (DoS 방어)
  if (!process.env.JEST_WORKER_ID) {
    // 읽기 API: 60req/min
    app.use('/api/', rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 60,
      message: { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      standardHeaders: true,
      legacyHeaders: false,
    }));
  }

  // Session
  const sessionSecret = process.env.SESSION_SECRET || 'air-booking-dev-secret';
  if (process.env.NODE_ENV === 'production' && sessionSecret === 'air-booking-dev-secret') {
    throw new Error('SESSION_SECRET must be set in production');
  }

  const SQLiteStore = connectSqlite3(session);
  const sessionConfig: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24h
    },
  };

  // 테스트 환경에서는 MemoryStore, 그 외에는 SQLite 세션 스토어
  if (!process.env.JEST_WORKER_ID) {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/air-booking.db');
    sessionConfig.store = new SQLiteStore({
      db: 'sessions.db',
      dir: path.dirname(dbPath),
    }) as session.Store;
  }

  app.use(session(sessionConfig));

  // Health check (DB 상태 포함)
  app.get('/api/health', async (_req, res) => {
    try {
      const { getIntranetDb: getIdb } = await import('./db/intranet');
      const db = await getIdb();
      const check = await db.get<{ integrity_check: string }>('PRAGMA integrity_check');
      const dbOk = check?.integrity_check === 'ok';
      res.json({
        success: true,
        data: {
          status: dbOk ? 'ok' : 'degraded',
          db: dbOk ? 'ok' : check?.integrity_check,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      res.json({ success: true, data: { status: 'ok', db: 'unknown' } });
    }
  });

  // Routes
  app.use('/api/auth', authRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/bsp-dates', bspDatesRouter);
  app.use('/api/settlements', settlementsRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/vendors', vendorsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/alert-settings', alertSettingsRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/flight-schedules', flightSchedulesRouter);
  app.use('/api/cost-calculations', costCalculationsRouter);
  app.use('/api/bookings/:bookingId/tickets', ticketsByBookingRouter);
  app.use('/api/bookings/:bookingId/invoice', bookingInvoiceRouter);
  app.use('/api/fare-certificates', fareCertificatesRouter);
  app.use('/api/estimates', estimatesRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/audit-logs', auditLogsRouter);
  app.use('/api/bus-reservations', busReservationsRouter);
  app.use('/api/saved-notices', savedNoticesRouter);
  app.use('/api/group-rosters', groupRostersRouter);
  app.use('/api/travel-guides', travelGuidesRouter);

  return app;
}

const app = createApp();
const PORT = process.env.PORT || 5510;

if (require.main === module || !process.env.JEST_WORKER_ID) {
  const server = createServer(app);
  initWebSocket(server);
  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Air Booking server running on port ${PORT}`);
    startScheduler();
    initNotificationMailer();
  });
}

export default app;
