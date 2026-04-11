// @TASK P2-S2-T1 - Dashboard Page Tests

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockBookings = [
  {
    id: 1, pnr: 'ABC123', name_kr: '김국진', airline: 'KE', flight_number: 'KE631',
    nmtl_date: new Date().toISOString().slice(0, 10), // today
    tl_date: null, departure_date: '2026-03-20', status: 'pending',
  },
  {
    id: 2, pnr: 'DEF456', name_kr: '박민지', airline: 'OZ', flight_number: 'OZ201',
    nmtl_date: null, tl_date: '2026-03-12',
    departure_date: '2026-03-25', status: 'confirmed',
  },
];

const mockBspDates = [
  { id: 1, payment_date: new Date().toISOString().slice(0, 10), description: 'BSP 입금', is_notified: 0 },
];

function setupFetch(bookings = mockBookings, bspDates = mockBspDates) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/bookings')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { bookings, total: bookings.length } }),
      });
    }
    if (url.includes('/api/bsp-dates')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { bspDates } }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard Page', () => {
  it('should show loading spinner initially', () => {
    setupFetch();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render week strip with 7 days', async () => {
    setupFetch();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(7);
    });
  });

  it('should show section titles', async () => {
    setupFetch();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('이번 주 일정')).toBeInTheDocument();
      expect(screen.getByText(/마감 임박/)).toBeInTheDocument();
      expect(screen.getByText('바로가기')).toBeInTheDocument();
    });
  });

  it('should show urgent items when bookings have today deadlines', async () => {
    setupFetch();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('김국진')).toBeInTheDocument();
    });
  });

  it('should show quick action buttons', async () => {
    setupFetch();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('새 예약')).toBeInTheDocument();
      expect(screen.getByText('달력')).toBeInTheDocument();
      expect(screen.getByText('정산')).toBeInTheDocument();
    });
  });

  it('should navigate on quick action click', async () => {
    setupFetch();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('새 예약'));
    await user.click(screen.getByText('새 예약'));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings');
  });

  it('should show empty state when no data', async () => {
    setupFetch([], []);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('긴급 마감 항목이 없습니다.')).toBeInTheDocument();
    });
  });
});
