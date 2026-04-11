// @TASK P4-V1 - Phase 4 Connection Verification Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast';
import { Customers } from '../pages/Customers';
import { Settings } from '../pages/Settings';

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
    ],
    total: 1,
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

const mockBspDatesResponse = {
  success: true,
  data: {
    bspDates: [
      {
        id: 1,
        payment_date: '2026-03-15',
        description: '3월 BSP',
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  },
};

const mockAlertSettingsResponse = {
  success: true,
  data: {
    settings: [
      { id: 1, alert_type: 'nmtl', hours_before: 24, enabled: true },
      { id: 2, alert_type: 'tl', hours_before: 48, enabled: false },
      { id: 3, alert_type: 'bsp', hours_before: 24, enabled: true },
    ],
  },
};

function setupCustomersFetch() {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/customers')) {
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
        json: () => Promise.resolve({ success: true, data: { customer: { id: 2 } } }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
  });
}

function setupSettingsFetch() {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/bsp-dates')) {
      return Promise.resolve({
        json: () => Promise.resolve(mockBspDatesResponse),
      });
    }
    if (typeof url === 'string' && url.includes('/api/alert-settings')) {
      return Promise.resolve({
        json: () => Promise.resolve(mockAlertSettingsResponse),
      });
    }
    if (opts?.method === 'POST') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { bspDate: { id: 2 } } }),
      });
    }
    if (opts?.method === 'PATCH') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { setting: { id: 1 } } }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
  });
}

function setupLocalStorage() {
  const mockLocalStorage: Record<string, string> = {};
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockLocalStorage[key] ?? null);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
    mockLocalStorage[key] = value;
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
    delete mockLocalStorage[key];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupLocalStorage();
});

// ─────────────────────────────────────────
// P4-S1-V: 고객 관리 연결점 검증 (5 tests)
// ─────────────────────────────────────────
describe('P4-S1-V: Customer Management Connection', () => {
  beforeEach(() => {
    setupCustomersFetch();
  });

  it('should call GET /api/customers on mount', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockCustomersResponse),
    });
    global.fetch = mockFetch;

    render(
      <MemoryRouter initialEntries={['/customers']}>
        <ToastProvider>
          <Customers />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/customers'),
        expect.any(Object)
      );
    });
  });

  it('should call GET /api/customers/:id on expand', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/customers/1')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockCustomerDetailResponse),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve(mockCustomersResponse),
      });
    });
    global.fetch = mockFetch;

    render(
      <MemoryRouter initialEntries={['/customers']}>
        <ToastProvider>
          <Customers />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('김철수'));
    await user.click(screen.getByText('김철수'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/customers/1'),
        expect.any(Object)
      );
    });
  });

  it('should call POST /api/customers on create', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: { customer: { id: 2 } } }),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve(mockCustomersResponse),
      });
    });
    global.fetch = mockFetch;

    render(
      <MemoryRouter initialEntries={['/customers']}>
        <ToastProvider>
          <Customers />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('고객 추가'));
    await user.click(screen.getByText('고객 추가'));

    const nameInput = await screen.findByPlaceholderText('홍길동');
    await user.type(nameInput, '박민지');

    const submitButton = screen.getByRole('button', { name: /저장/ });
    await user.click(submitButton);

    await waitFor(() => {
      const postCalls = mockFetch.mock.calls.filter(
        (call) => call[1] && call[1].method === 'POST'
      );
      expect(postCalls.length).toBeGreaterThan(0);
    });
  });

  it('should render customer columns', async () => {
    setupCustomersFetch();
    render(
      <MemoryRouter initialEntries={['/customers']}>
        <ToastProvider>
          <Customers />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map((h) => h.textContent);
      expect(headerTexts.some((t) => t?.includes('이름'))).toBe(true);
      expect(headerTexts.some((t) => t?.includes('영문명'))).toBe(true);
      expect(headerTexts.some((t) => t?.includes('전화번호'))).toBe(true);
      expect(headerTexts.some((t) => t?.includes('이메일'))).toBe(true);
      expect(headerTexts.some((t) => t?.includes('여권번호'))).toBe(true);
    });
  });

  it('should navigate when booking is clicked', async () => {
    const user = userEvent.setup();
    setupCustomersFetch();

    render(
      <MemoryRouter initialEntries={['/customers']}>
        <ToastProvider>
          <Customers />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('김철수'));
    await user.click(screen.getByText('김철수'));

    await waitFor(() => screen.getByText('ABC123'));
    await user.click(screen.getByText('ABC123'));

    expect(mockNavigate).toHaveBeenCalledWith('/bookings?highlight=10');
  });
});

// ─────────────────────────────────────────
// P4-S2-V: 설정 연결점 검증 (4 tests)
// ─────────────────────────────────────────
describe('P4-S2-V: Settings Connection', () => {
  beforeEach(() => {
    setupSettingsFetch();
  });

  it('should call GET /api/bsp-dates on mount', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/bsp-dates')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockBspDatesResponse),
        });
      }
      if (url.includes('/api/alert-settings')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockAlertSettingsResponse),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
    });
    global.fetch = mockFetch;

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <ToastProvider>
          <Settings />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bsp-dates'),
        expect.any(Object)
      );
    });
  });

  it('should call GET /api/alert-settings on mount', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/bsp-dates')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockBspDatesResponse),
        });
      }
      if (url.includes('/api/alert-settings')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockAlertSettingsResponse),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
    });
    global.fetch = mockFetch;

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <ToastProvider>
          <Settings />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/alert-settings'),
        expect.any(Object)
      );
    });
  });

  it('should call POST /api/bsp-dates on add', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: { bspDate: { id: 2 } } }),
        });
      }
      if (url.includes('/api/bsp-dates')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockBspDatesResponse),
        });
      }
      if (url.includes('/api/alert-settings')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockAlertSettingsResponse),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
    });
    global.fetch = mockFetch;

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <ToastProvider>
          <Settings />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('추가'));
    const dateInput = document.getElementById('bsp-payment-date') as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, '2026-04-15');
    await user.click(screen.getByText('추가'));

    await waitFor(() => {
      const postCalls = mockFetch.mock.calls.filter(
        (call) => call[1] && call[1].method === 'POST'
      );
      expect(postCalls.length).toBeGreaterThan(0);
    });
  });

  it('should call PATCH /api/alert-settings on toggle', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'PATCH') {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: { setting: { id: 1 } } }),
        });
      }
      if (url.includes('/api/bsp-dates')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockBspDatesResponse),
        });
      }
      if (url.includes('/api/alert-settings')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockAlertSettingsResponse),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
    });
    global.fetch = mockFetch;

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <ToastProvider>
          <Settings />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        (call) => call[1] && call[1].method === 'PATCH'
      );
      expect(patchCalls.length).toBeGreaterThan(0);
    });
  });
});
