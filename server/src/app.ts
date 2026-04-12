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

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limiting - prevent brute force and DoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: {
    success: false,
    message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
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

// Error handling middleware
app.use(errorHandler);

export default app;
