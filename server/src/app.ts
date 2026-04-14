import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { toursRouter } from './routes/tours';
import authRouter from './routes/auth';
import { itinerariesRouter } from './routes/itineraries';
import { itineraryItemsRouter } from './routes/itineraryItems';
import { hotelsRouter } from './routes/hotels';
import { imagesRouter } from './routes/images';
import { categoriesRouter } from './routes/categories';
import { pdfRouter } from './routes/pdf';
import invoicesRouter from './routes/invoices';
import flightSchedulesRouter from './routes/flightSchedules';
import migrationRouter from './routes/migration';
import bookingsRouter from './routes/bookings';
import bspDatesRouter from './routes/bspDates';
import vendorsRouter from './routes/vendors';
import settlementsRouter from './routes/settlements';
import tablesRouter from './routes/tables';

const app = express();

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// 1. Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS - Configurable origins
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Production: check whitelist
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`CORS blocked request from origin: ${origin}`);
    callback(new Error('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// 3. Rate Limiting - API
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 min
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100');

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: {
    success: false,
    message: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
});
app.use('/api/', limiter);

// 4. Strict rate limiting for auth endpoints
const AUTH_RATE_LIMIT = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10');
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: AUTH_RATE_LIMIT,
  message: {
    success: false,
    message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// 5. Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 6. Request ID middleware
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/health', healthRouter);
app.use('/api/tours', toursRouter);
app.use('/api/auth', authRouter);
app.use('/api/itineraries', itinerariesRouter);
app.use('/api/itineraries/:itineraryId/items', itineraryItemsRouter);
app.use('/api/hotels', hotelsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/flight-schedules', flightSchedulesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/bsp-dates', bspDatesRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/settlements', settlementsRouter);
app.use('/tables', tablesRouter);
app.use('/api', migrationRouter);

// ==========================================
// ERROR HANDLING
// ==========================================
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.',
    path: req.path,
  });
});

export default app;
