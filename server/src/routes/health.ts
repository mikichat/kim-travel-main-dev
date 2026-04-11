import { Router } from 'express';
import type { ApiResponse } from '../types/shared';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
}

router.get('/', (_req, res) => {
  const response: ApiResponse<HealthStatus> = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    },
  };

  res.json(response);
});

router.get('/ready', (_req, res) => {
  // TODO: Add database connection check
  res.json({ ready: true });
});

router.get('/live', (_req, res) => {
  res.json({ live: true });
});

export { router as healthRouter };
