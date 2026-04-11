import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app';
import { initializeAdminUser } from './services/authService';

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Initialize admin user on server startup
  await initializeAdminUser();

  const server = app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(
      `[Server] Environment: ${process.env.NODE_ENV || 'development'}`
    );
    console.log(`[Server] Auth API: http://localhost:${PORT}/api/auth`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
  });
}

startServer();
