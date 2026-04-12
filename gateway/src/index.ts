import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authRouter } from './routes/auth';
import { requireAuth, requirePermission } from './middleware/auth';

const app = express();
const PORT = 8080;

// Session
app.use(session({
  secret: 'tourworld-gateway-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(cors({ origin: true, credentials: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

// Auth routes
app.use('/api/auth', express.json(), authRouter);

// Proxy helper — Express가 마운트 경로를 제거하므로 /api를 앞에 붙여줌
function proxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => '/api' + path,
  });
}

// Proxy routes
// /api/sales/bookings → Express strips /api/sales → /bookings → pathRewrite → /api/bookings
app.use('/api/sales', requireAuth, requirePermission('main'), proxy('http://localhost:5000'));
app.use('/api/air', requireAuth, requirePermission('air'), proxy('http://localhost:5510'));
app.use('/api/doc', requireAuth, requirePermission('landing'), proxy('http://localhost:5505'));

// Next-Gen Monorepo proxy
// /api/nextgen/* → localhost:3000 (server/ - Express + Prisma)
// Note: Next-Gen uses JWT auth, not session - so we skip session auth
app.use('/api/nextgen', express.json(), (req, res, next) => {
  const target = 'http://localhost:3000';
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(/^\/api\/nextgen/, ''),
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward Authorization header if present
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
  console.log('  /api/sales/*  → localhost:5000/api/* (MAIN - Current Stable)');
  console.log('  /api/air/*    → localhost:5510/api/* (AIR-BOOKING)');
  console.log('  /api/doc/*    → localhost:5505/api/* (LANDING)');
  console.log('  /api/nextgen/* → localhost:3001/api/* (NEXT-GEN MONOREPO)');
  console.log('  /api/auth/*   → 통합 인증');
  console.log(`\n  Admin: admin@tourworld.com / admin1234\n`);
});
