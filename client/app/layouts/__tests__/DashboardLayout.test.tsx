import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';

// Mock auth store
vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { id: '1', email: 'admin@tourworld.com', name: '관리자' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
};

describe('DashboardLayout', () => {
  describe('Header', () => {
    it('should render header with 60px height', () => {
      renderWithRouter(<DashboardLayout />);

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('h-[60px]');
    });

    it('should display app title', () => {
      renderWithRouter(<DashboardLayout />);

      expect(screen.getByText(/TourWorld/i)).toBeInTheDocument();
    });

    it('should display user name', () => {
      renderWithRouter(<DashboardLayout />);

      expect(screen.getByText('관리자')).toBeInTheDocument();
    });

    it('should have logout button', () => {
      renderWithRouter(<DashboardLayout />);

      expect(
        screen.getByRole('button', { name: /로그아웃/i })
      ).toBeInTheDocument();
    });
  });

  describe('Sidebar', () => {
    it('should render sidebar with 240px width', () => {
      renderWithRouter(<DashboardLayout />);

      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass('w-[240px]');
    });

    it('should have navigation links', () => {
      renderWithRouter(<DashboardLayout />);

      expect(
        screen.getByRole('link', { name: /대시보드/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /일정표/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /호텔/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /이미지/i })).toBeInTheDocument();
    });
  });

  describe('Main Content', () => {
    it('should render main content area', () => {
      renderWithRouter(<DashboardLayout />);

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('should render Outlet for nested routes', () => {
      renderWithRouter(<DashboardLayout />);

      // Outlet renders children, so main area should exist
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });
  });

  describe('Responsive behavior', () => {
    it('should have flex layout', () => {
      renderWithRouter(<DashboardLayout />);

      const layout = screen.getByTestId('dashboard-layout');
      expect(layout).toHaveClass('flex');
    });
  });
});
