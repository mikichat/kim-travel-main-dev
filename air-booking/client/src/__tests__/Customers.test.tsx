// @TASK P4-S1-T1 - Customers Page Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast';
import { Customers } from '../pages/Customers';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCustomersResponse = {
  success: true,
  data: {
    customers: [
      {
        id: 1,
        name_kr: '김철수',
        name_en: 'KIM CHULSOO',
        phone: '010-1234-5678',
        email: 'kim@test.com',
        passport_number: 'M12345678',
        passport_expiry: '2030-01-15',
        remarks: 'VIP 고객',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 2,
        name_kr: '이영희',
        name_en: 'LEE YOUNGHEE',
        phone: null,
        email: null,
        passport_number: null,
        passport_expiry: null,
        remarks: null,
        created_at: '2026-01-02T00:00:00Z',
      },
    ],
    total: 2,
  },
};

const mockCustomerDetailResponse = {
  success: true,
  data: {
    customer: mockCustomersResponse.data.customers[0],
    bookings: [
      {
        id: 10,
        pnr: 'ABC123',
        airline: 'KE',
        flight_number: 'KE631',
        route_from: 'ICN',
        route_to: 'LAX',
        departure_date: '2026-03-15',
        status: 'confirmed',
      },
    ],
  },
};

function setupFetch() {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/customers') && (!opts || opts.method === undefined || opts.method === 'GET')) {
      if (url.includes('/api/customers/1')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockCustomerDetailResponse),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve(mockCustomersResponse),
      });
    }
    if (opts?.method === 'POST') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { customer: { id: 3 } } }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
  });
}

function renderCustomers() {
  return render(
    <MemoryRouter initialEntries={['/customers']}>
      <ToastProvider>
        <Customers />
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupFetch();
});

describe('Customers Page', () => {
  it('should render customer list', async () => {
    renderCustomers();

    await waitFor(() => {
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('이영희')).toBeInTheDocument();
      expect(screen.getByText('총 2건')).toBeInTheDocument();
    });
  });

  it('should show search input', async () => {
    renderCustomers();

    await waitFor(() => {
      expect(screen.getByLabelText('고객 검색')).toBeInTheDocument();
    });
  });

  it('should open add modal', async () => {
    const user = userEvent.setup();
    renderCustomers();

    await waitFor(() => screen.getByText('고객 추가'));
    await user.click(screen.getByText('고객 추가'));

    // Modal opens with form fields
    expect(screen.getByLabelText('이름(한글) *')).toBeInTheDocument();
  });

  it('should open edit modal', async () => {
    const user = userEvent.setup();
    renderCustomers();

    await waitFor(() => screen.getByLabelText('김철수 편집'));
    await user.click(screen.getByLabelText('김철수 편집'));

    expect(screen.getByText('고객 수정')).toBeInTheDocument();
  });

  it('should expand customer row to show bookings', async () => {
    const user = userEvent.setup();
    renderCustomers();

    await waitFor(() => screen.getByText('김철수'));
    await user.click(screen.getByText('김철수'));

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });
  });

  it('should show empty message when no customers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: { customers: [], total: 0 },
      }),
    });

    renderCustomers();

    await waitFor(() => {
      expect(screen.getByText('등록된 고객이 없습니다.')).toBeInTheDocument();
    });
  });

  it('should navigate when booking is clicked', async () => {
    const user = userEvent.setup();
    renderCustomers();

    await waitFor(() => screen.getByText('김철수'));
    await user.click(screen.getByText('김철수'));

    await waitFor(() => screen.getByText('ABC123'));
    await user.click(screen.getByText('ABC123'));

    expect(mockNavigate).toHaveBeenCalledWith('/bookings?highlight=10');
  });
});
