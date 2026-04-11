import { http, HttpResponse, delay } from 'msw';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Mock admin user for single-user system
const mockAdminUser: User = {
  id: '1',
  email: 'admin@tourworld.com',
  name: '관리자',
  createdAt: new Date().toISOString(),
};

// NOTE: Registration is disabled for single-user system.
// Admin user is created via seed script on backend.

export const authHandlers = [
  // Login endpoint
  http.post('/api/auth/login', async ({ request }) => {
    await delay(100);

    const body = (await request.json()) as { email: string; password: string };

    // Simulate validation errors
    if (!body.email || !body.password) {
      return HttpResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Simulate invalid credentials
    if (body.email === 'invalid@example.com') {
      return HttpResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Successful login
    const response: AuthResponse = {
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        ...mockAdminUser,
        email: body.email,
      },
    };

    return HttpResponse.json(response);
  }),

  // Get current user endpoint
  http.get('/api/auth/me', async ({ request }) => {
    await delay(50);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json(mockAdminUser);
  }),

  // Logout endpoint
  http.post('/api/auth/logout', async () => {
    await delay(50);
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),
];
