import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

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

// Error handling middleware
app.use(errorHandler);

export default app;
