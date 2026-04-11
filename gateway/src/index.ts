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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nGateway running on http://localhost:${PORT}`);
  console.log('  /api/sales/* → localhost:5000/api/* (MAIN)');
  console.log('  /api/air/*   → localhost:5510/api/* (AIR-BOOKING)');
  console.log('  /api/doc/*   → localhost:5505/api/* (LANDING)');
  console.log('  /api/auth/*  → 통합 인증');
  console.log(`\n  Admin: admin@tourworld.com / admin1234\n`);
});
