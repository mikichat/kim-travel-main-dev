import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authRouter } from './routes/auth';

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

// Next-Gen Monorepo proxy
// /api/nextgen/* → localhost:3001/api/* (nextgen prefix 제거)
app.use('/api', (req, res, next) => {
  const proxy = createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: (path: string) => path.replace(/\/nextgen/, ''),
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
  console.log('  /api/nextgen/* → localhost:3001/api/* (nextgen prefix 제거)');
  console.log(`\n  Admin: admin@tourworld.com / admin1234\n`);
});