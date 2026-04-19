import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authRouter } from './routes/auth';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Session secret from environment
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('[gateway] FATAL: SESSION_SECRET environment variable is required');
  process.exit(1);
}

// Session
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(cors({ origin: true, credentials: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

// Auth routes (must be before proxy to catch /api/auth/*)
app.use('/api/auth', express.json(), authRouter);

// Next-Gen Monorepo proxy
// /* → localhost:3001/api/*
app.use('/', (req, res, next) => {
  console.log('Proxy received:', req.method, req.path);
  const proxy = createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: (path: string) => {
      console.log('pathRewrite before:', path);
      const result = path;
      console.log('pathRewrite after:', result);
      return result;
    },
    on: {
      proxyReq: (proxyReq, req: any) => {
        if (req.headers.authorization) {
          proxyReq.setHeader('Authorization', req.headers.authorization);
        }
      }
    }
  });
  proxy(req, res, next);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nGateway running on http://localhost:${PORT}`);
  console.log('  /api/auth/*   → Gateway 내장 인증');
  console.log('  /api/*        → localhost:3001/api/*');
  console.log(`\n  Gateway ready on http://localhost:${PORT}`);
});