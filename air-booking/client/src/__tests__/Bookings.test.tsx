// @TASK P2-S3-T1 - Bookings Page Tests

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast';
import { Bookings } from '../pages/Bookings';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockBookings = [
  {
    id: 1, pnr: 'ABC123', airline: 'KE', flight_number: 'KE631',
    route_from: 'ICN', route_to: 'LAX', name_kr: '김국진', name_en: 'KIM/GUKJIN',
    passport_number: 'M12345678', seat_number: '12A', fare: 1500000,
    nmtl_date: '2026-03-10', tl_date: '2026-03-12', departure_date: '2026-03-15',
    status: 'pending', remarks: null, created_at: '2026-03-08',
  },
  {
    id: 2, pnr: 'DEF456', airline: 'OZ', flight_number: 'OZ201',
    route_from: 'ICN', route_to: 'NRT', name_kr: '박민지', name_en: 'PARK/MINJI',
    passport_number: null, seat_number: null, fare: 800000,
    nmtl_date: null, tl_date: '2026-03-14', departure_date: '2026-03-20',
    status: 'confirmed', remarks: '비즈니스', created_at: '2026-03-07',
  },
];

function setupFetch() {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/bookings') && (!opts || opts.method === undefined || opts.method === 'GET')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { bookings: mockBookings, total: 2 } }),
      });
    }
    if (opts?.method === 'DELETE') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { message: '삭제' } }),
      });
    }
    if (url.includes('parse-pnr')) {
      return Promise.resolve({
        json: () => Promise.resolve({
          success: true,
          data: { parsed: [{ pnr: 'NEW001', airline: 'KE', flight_number: 'KE001' }] },
        }),
      });
    }
    if (opts?.method === 'POST') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { booking: { id: 3 } } }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
  });
}

function renderBookings() {
  return render(
    <MemoryRouter initialEntries={['/bookings']}>
      <ToastProvider>
        <Bookings />
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupFetch();
});

describe('Bookings Page', () => {
  it('should show loading spinner initially', () => {
    renderBookings();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render booking table with data', async () => {
    renderBookings();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('DEF456')).toBeInTheDocument();
      // 테이블은 name_en || name_kr 순서로 표시
      expect(screen.getByText('KIM/GUKJIN')).toBeInTheDocument();
      expect(screen.getByText('PARK/MINJI')).toBeInTheDocument();
    });
  });

  it('should show total count', async () => {
    renderBookings();

    await waitFor(() => {
      expect(screen.getByText('총 2건')).toBeInTheDocument();
    });
  });

  it('should have search input', async () => {
    renderBookings();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/PNR, 이름으로 검색/)).toBeInTheDocument();
    });
  });

  it('should have PNR registration button', async () => {
    renderBookings();

    await waitFor(() => {
      expect(screen.getByText('PNR 등록')).toBeInTheDocument();
    });
  });

  it('should expand row on click', async () => {
    const user = userEvent.setup();
    renderBookings();

    await waitFor(() => screen.getByText('ABC123'));
    await user.click(screen.getByText('ABC123'));

    await waitFor(() => {
      // BookingDetailCard에서 탑승객 이름 + 액션 버튼 확인
      expect(screen.getByText('탑승객')).toBeInTheDocument();
      expect(screen.getByText('정산 이동')).toBeInTheDocument();
    });
  });

  it('should show PNR modal when button clicked', async () => {
    const user = userEvent.setup();
    renderBookings();

    await waitFor(() => screen.getByText('PNR 등록'));
    await user.click(screen.getByText('PNR 등록'));

    expect(screen.getByText(/GDS PNR 텍스트를 붙여넣기/)).toBeInTheDocument();
  });

  it('should have status filter', async () => {
    renderBookings();

    await waitFor(() => {
      expect(screen.getByLabelText('상태 필터')).toBeInTheDocument();
    });
  });

  it('should have sort options', async () => {
    renderBookings();

    await waitFor(() => {
      expect(screen.getByLabelText('정렬')).toBeInTheDocument();
    });
  });
});
