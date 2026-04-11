// @TASK P2-S4-T1 - Calendar Page Tests

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Calendar } from '../pages/Calendar';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock FullCalendar (heavy component)
vi.mock('@fullcalendar/react', () => ({
  default: ({ events, dateClick, eventClick }: {
    events: Array<{ id: string; title: string; date: string }>;
    dateClick?: (info: { dateStr: string }) => void;
    eventClick?: (info: { event: { id: string } }) => void;
  }) => (
    <div data-testid="fullcalendar">
      <div data-testid="calendar-events-count">{events?.length || 0} events</div>
      {events?.map((e) => (
        <div
          key={e.id}
          data-testid={`event-${e.id}`}
          onClick={() => eventClick?.({ event: { id: e.id } })}
        >
          {e.title}
        </div>
      ))}
      <button data-testid="date-click" onClick={() => dateClick?.({ dateStr: '2026-03-15' })}>
        Click Date
      </button>
    </div>
  ),
}));

vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));

const mockBookings = [
  {
    id: 1, pnr: 'ABC123', name_kr: '김국진', airline: 'KE', flight_number: 'KE631',
    nmtl_date: '2026-03-10', tl_date: '2026-03-12', departure_date: '2026-03-15', status: 'pending',
  },
];

const mockBspDates = [
  { id: 1, payment_date: '2026-03-15', description: 'BSP 입금', is_notified: 0 },
];

function setupFetch() {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/bookings')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { bookings: mockBookings, total: 1 } }),
      });
    }
    if (url.includes('/api/bsp-dates')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { bspDates: mockBspDates } }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
  });
}

function renderCalendar() {
  return render(
    <MemoryRouter>
      <Calendar />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupFetch();
});

describe('Calendar Page', () => {
  it('should show loading spinner initially', () => {
    renderCalendar();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render FullCalendar after loading', async () => {
    renderCalendar();

    await waitFor(() => {
      expect(screen.getByTestId('fullcalendar')).toBeInTheDocument();
    });
  });

  it('should show filter chips', async () => {
    renderCalendar();

    await waitFor(() => {
      expect(screen.getByText('전체')).toBeInTheDocument();
      expect(screen.getByText('NMTL 마감')).toBeInTheDocument();
      expect(screen.getByText('TL 마감')).toBeInTheDocument();
      expect(screen.getByText('출발일')).toBeInTheDocument();
      expect(screen.getByText('BSP 입금일')).toBeInTheDocument();
    });
  });

  it('should render events from bookings and BSP dates', async () => {
    renderCalendar();

    await waitFor(() => {
      // 1 booking × 3 dates (nmtl, tl, departure) + 1 BSP = 4 events
      expect(screen.getByTestId('calendar-events-count')).toHaveTextContent('4 events');
    });
  });

  it('should filter events when chip clicked', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await waitFor(() => screen.getByText('NMTL 마감'));
    await user.click(screen.getByText('NMTL 마감'));

    await waitFor(() => {
      expect(screen.getByTestId('calendar-events-count')).toHaveTextContent('1 events');
    });
  });

  it('should show sidebar on date click', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await waitFor(() => screen.getByTestId('date-click'));
    await user.click(screen.getByTestId('date-click'));

    await waitFor(() => {
      expect(screen.getByText('2026-03-15')).toBeInTheDocument();
    });
  });

  it('should navigate to bookings on event click', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await waitFor(() => screen.getByTestId('event-nmtl-1'));
    await user.click(screen.getByTestId('event-nmtl-1'));

    expect(mockNavigate).toHaveBeenCalledWith('/bookings?highlight=1');
  });
});
