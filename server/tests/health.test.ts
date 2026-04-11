import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Health API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('version');
    });

    it('should return valid timestamp format', async () => {
      const response = await request(app).get('/api/health').expect(200);

      const timestamp = response.body.data.timestamp;
      const parsedDate = new Date(timestamp);
      expect(parsedDate.toISOString()).toBe(timestamp);
    });

    it('should return uptime as a positive number', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(typeof response.body.data.uptime).toBe('number');
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready status', async () => {
      const response = await request(app).get('/api/health/ready').expect(200);

      expect(response.body).toHaveProperty('ready', true);
    });
  });

  describe('GET /api/health/live', () => {
    it('should return live status', async () => {
      const response = await request(app).get('/api/health/live').expect(200);

      expect(response.body).toHaveProperty('live', true);
    });
  });
});

describe('Health API Error Handling', () => {
  it('should return 404 for unknown health endpoints', async () => {
    await request(app).get('/api/health/unknown').expect(404);
  });
});
