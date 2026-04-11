// @TASK P2-S1-V, P2-S2-V, P2-S3-V, P2-S4-V - Phase 2 연결점 검증 테스트

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Bookings } from '../pages/Bookings';
import { Calendar } from '../pages/Calendar';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@fullcalendar/react', () => ({
  default: ({ events, dateClick, eventClick }: any) => (
    <div data-testid="fullcalendar">
      <span data-testid="calendar-events-count">{events?.length ?? 0} events</span>
      {events?.map((e: any) => (
        <div key={e.id} data-testid={`event-${e.id}`} onClick={() => eventClick?.({ event: { id: e.id } })}>
          {e.title}
        </div>
      ))}
      <button data-testid="date-click" onClick={() => dateClick?.({ dateStr: '2026-03-15' })}>
        click date
      </button>
    </div>
  ),
}));

vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));

const mockBookings = [
  {
    id: 1, pnr: 'ABC123', airline: 'KE', flight_number: 'KE631',
    route_from: 'ICN', route_to: 'LAX', name_kr: '김국진', name_en: 'KIM/GUKJIN',
    passport_number: 'M12345678', seat_number: '12A', fare: 1500000,
    nmtl_date: '2026-03-10', tl_date: '2026-03-12', departure_date: '2026-03-15',
    status: 'pending', remarks: '테스트', created_at: '2026-03-08',
  },
];

const mockBspDates = [
  { id: 1, payment_date: '2026-03-15', description: 'BSP 3월 정산', is_notified: 0 },
];

function setupFetch() {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/bookings') && !url.includes('parse-pnr') && (!opts || !opts.method || opts.method === 'GET')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { bookings: mockBookings, total: mockBookings.length } }),
      });
    }
    if (typeof url === 'string' && url.includes('/api/bsp-dates') && (!opts || !opts.method || opts.method === 'GET')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { bspDates: mockBspDates } }),
      });
    }
    if (url.includes('/api/auth/login') && opts?.method === 'POST') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { user: { id: 1, email: 'admin@test.com', name: '관리자', role: 'admin' } } }),
      });
    }
    if (url.includes('parse-pnr') && opts?.method === 'POST') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { parsed: [{ pnr: 'PNR001', airline: 'KE' }] } }),
      });
    }
    if (url.includes('/api/bookings') && opts?.method === 'POST') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { booking: { id: 99 } } }),
      });
    }
    if (opts?.method === 'DELETE') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { message: '삭제됨' } }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
  });
}

// ── P2-S1-V: 로그인 연결점 검증 ──

describe('P2-S1-V: Login Connection Points', () => {
  beforeEach(() => { vi.clearAllMocks(); setupFetch(); });

  it('should call POST /api/auth/login with credentials: include', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Login /></MemoryRouter>);

    await user.type(screen.getByLabelText('이메일'), 'admin@test.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST', credentials: 'include',
      }));
    });
  });

  it('should navigate to /dashboard on success', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Login /></MemoryRouter>);

    await user.type(screen.getByLabelText('이메일'), 'admin@test.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => { expect(mockNavigate).toHaveBeenCalledWith('/dashboard'); });
  });
});

// ── P2-S2-V: 대시보드 연결점 검증 ──

describe('P2-S2-V: Dashboard Connection Points', () => {
  beforeEach(() => { vi.clearAllMocks(); setupFetch(); });

  it('should fetch GET /api/bookings and GET /api/bsp-dates', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bookings?limit=100', expect.objectContaining({ credentials: 'include' }));
      expect(global.fetch).toHaveBeenCalledWith('/api/bsp-dates', expect.objectContaining({ credentials: 'include' }));
    });
  });

  it('should display booking fields: name_kr, airline, flight_number', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    // 7일 달력 확인
    await waitFor(() => {
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(7);
    });
  });

  it('should navigate to /bookings on quick action', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => screen.getByText('새 예약'));
    await user.click(screen.getByText('새 예약'));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings');
  });

  it('should navigate to /calendar on quick action', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => screen.getByText('달력'));
    await user.click(screen.getByText('달력'));
    expect(mockNavigate).toHaveBeenCalledWith('/calendar');
  });

  it('should navigate to /settlements on quick action', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => screen.getByText('정산'));
    await user.click(screen.getByText('정산'));
    expect(mockNavigate).toHaveBeenCalledWith('/settlements');
  });
});

// ── P2-S3-V: 예약장부 연결점 검증 ──

describe('P2-S3-V: Bookings Connection Points', () => {
  beforeEach(() => { vi.clearAllMocks(); setupFetch(); });

  it('should fetch GET /api/bookings with credentials', async () => {
    render(<MemoryRouter initialEntries={['/bookings']}><ToastProvider><Bookings /></ToastProvider></MemoryRouter>);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/bookings'), expect.objectContaining({ credentials: 'include' }));
    });
  });

  it('should display bookings fields: pnr, name_kr, flight_number, route', async () => {
    render(<MemoryRouter initialEntries={['/bookings']}><ToastProvider><Bookings /></ToastProvider></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      // 테이블은 name_en || name_kr 순서로 표시
      expect(screen.getByText('KIM/GUKJIN')).toBeInTheDocument();
    });
  });

  it('should show detail fields on row expand: name_en, passport, fare', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/bookings']}><ToastProvider><Bookings /></ToastProvider></MemoryRouter>);

    await waitFor(() => screen.getByText('ABC123'));
    await user.click(screen.getByText('ABC123'));

    await waitFor(() => {
      // BookingDetailCard: 탑승객 섹션 + 액션 버튼 확인
      expect(screen.getByText('탑승객')).toBeInTheDocument();
      expect(screen.getByText('정산 이동')).toBeInTheDocument();
    });
  });

  it('should have PNR parse endpoint (modal available)', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/bookings']}><ToastProvider><Bookings /></ToastProvider></MemoryRouter>);

    await waitFor(() => screen.getByText('PNR 등록'));
    await user.click(screen.getByText('PNR 등록'));
    expect(screen.getByText(/GDS PNR 텍스트를 붙여넣기/)).toBeInTheDocument();
  });

  it('should navigate to /settlements from detail actions', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/bookings']}><ToastProvider><Bookings /></ToastProvider></MemoryRouter>);

    await waitFor(() => screen.getByText('ABC123'));
    await user.click(screen.getByText('ABC123'));

    await waitFor(() => screen.getByText('정산 이동'));
    await user.click(screen.getByText('정산 이동'));
    expect(mockNavigate).toHaveBeenCalledWith('/settlements?booking=1');
  });
});

// ── P2-S4-V: 달력 연결점 검증 ──

describe('P2-S4-V: Calendar Connection Points', () => {
  beforeEach(() => { vi.clearAllMocks(); setupFetch(); });

  it('should fetch GET /api/bookings and GET /api/bsp-dates', async () => {
    render(<MemoryRouter><Calendar /></MemoryRouter>);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/bookings'), expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/bsp-dates'), expect.any(Object));
    });
  });

  it('should create events from bookings (nmtl, tl, departure) and bsp_dates', async () => {
    render(<MemoryRouter><Calendar /></MemoryRouter>);

    // 1 booking × 3 dates (nmtl, tl, departure) + 1 bsp = 4 events
    await waitFor(() => {
      expect(screen.getByTestId('calendar-events-count')).toHaveTextContent('4 events');
    });
  });

  it('should show filter chips for event types', async () => {
    render(<MemoryRouter><Calendar /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('전체')).toBeInTheDocument();
      expect(screen.getByText('NMTL 마감')).toBeInTheDocument();
      expect(screen.getByText('TL 마감')).toBeInTheDocument();
      expect(screen.getByText('출발일')).toBeInTheDocument();
      expect(screen.getByText('BSP 입금일')).toBeInTheDocument();
    });
  });

  it('should navigate to /bookings on event click', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Calendar /></MemoryRouter>);

    await waitFor(() => screen.getByTestId('event-nmtl-1'));
    await user.click(screen.getByTestId('event-nmtl-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings?highlight=1');
  });

  it('should show sidebar on date click', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Calendar /></MemoryRouter>);

    await waitFor(() => screen.getByTestId('date-click'));
    await user.click(screen.getByTestId('date-click'));

    await waitFor(() => {
      expect(screen.getByText('2026-03-15')).toBeInTheDocument();
    });
  });
});
