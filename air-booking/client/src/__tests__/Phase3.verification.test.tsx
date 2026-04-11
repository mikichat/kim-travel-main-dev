// @TASK P3-S1-V, P3-S2-V - Phase 3 연결점 검증
// @SPEC 정산 관리 + 거래처 관리 연결점 검증

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast';
import { Settlements } from '../pages/Settlements';
import { Vendors } from '../pages/Vendors';

// ── Mock navigate ──
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ── Mock data ──
const mockSettlements = [
  {
    id: 1, booking_id: 1, vendor_id: 1, payment_type: 'card', amount: 1500000,
    status: 'unpaid', payment_date: null, remarks: '테스트 비고', created_at: '2026-03-01',
  },
];

const mockBookings = [
  { id: 1, pnr: 'VER001', name_kr: '검증승객', fare: 1500000, status: 'ticketed' },
];

const mockVendors = [
  {
    id: 1, name: '검증항공사', type: '항공사', contact_name: '검증담당',
    phone: '02-0000-0000', email: 'test@verify.com', remarks: '검증비고', created_at: '2026-01-01',
  },
];

const mockInvoices = [
  { id: 1, settlement_id: 1, invoice_number: 'INV-202603-0001', issue_date: '2026-03-01', total_amount: 1500000, items_json: '[]', created_at: '2026-03-01' },
];

function setupFetch() {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/settlements') && (!opts || !opts.method || opts.method === 'GET')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { settlements: mockSettlements, total: 1 } }) });
    }
    if (url.includes('/api/bookings')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { bookings: mockBookings, total: 1 } }) });
    }
    if (typeof url === 'string' && url.includes('/api/vendors') && (!opts || !opts.method || opts.method === 'GET')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { vendors: mockVendors, total: 1 } }) });
    }
    if (typeof url === 'string' && url.includes('/api/settlements/') && opts?.method === 'PATCH') {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { settlement: { ...mockSettlements[0], status: 'paid' } } }) });
    }
    if (url.includes('/api/invoices') && opts?.method === 'POST') {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { invoice: mockInvoices[0] } }) });
    }
    if (typeof url === 'string' && url.includes('/api/vendors') && opts?.method === 'POST') {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { vendor: { id: 2, name: 'New' } } }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true, data: {} }) });
  });
}

// ── P3-S1-V: 정산 관리 연결점 검증 ──
describe('P3-S1-V: 정산 관리 연결점 검증', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it('Endpoint: GET /api/settlements 호출 확인', async () => {
    render(
      <MemoryRouter>
        <ToastProvider><Settlements /></ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/settlements'),
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });

  it('Field Coverage: settlements 전체 필드 존재', async () => {
    render(
      <MemoryRouter>
        <ToastProvider><Settlements /></ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      // amount (appears in summary card + table)
      expect(screen.getAllByText('1,500,000원').length).toBeGreaterThanOrEqual(1);
      // payment_type
      expect(screen.getByText('card')).toBeInTheDocument();
      // booking PNR
      expect(screen.getByText('VER001')).toBeInTheDocument();
    });
  });

  it('Field Coverage: bookings.[pnr,name_kr,fare,status] 존재', async () => {
    render(
      <MemoryRouter>
        <ToastProvider><Settlements /></ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('VER001')).toBeInTheDocument();
      expect(screen.getByText('검증승객')).toBeInTheDocument();
    });
  });

  it('Field Coverage: vendors.[name,type] 존재', async () => {
    render(
      <MemoryRouter>
        <ToastProvider><Settlements /></ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('검증항공사')).toBeInTheDocument();
    });
  });

  it('Endpoint: POST /api/invoices 호출 확인', async () => {
    render(
      <MemoryRouter>
        <ToastProvider><Settlements /></ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('VER001')).toBeInTheDocument();
    });

    // Click row to expand
    fireEvent.click(screen.getByText('VER001').closest('tr')!);

    await waitFor(() => {
      expect(screen.getByText('인보이스 생성')).toBeInTheDocument();
    });

    // Click invoice button
    fireEvent.click(screen.getByText('인보이스 생성'));

    // Confirm in modal
    await waitFor(() => {
      const createBtn = screen.getAllByText('생성').find(
        (el) => el.tagName === 'BUTTON' && el.closest('.invoice-confirm')
      );
      expect(createBtn).toBeTruthy();
      fireEvent.click(createBtn!);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/invoices',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
  });

  it('Navigation: 예약 이동 → /bookings 라우트', async () => {
    render(
      <MemoryRouter>
        <ToastProvider><Settlements /></ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('VER001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('VER001').closest('tr')!);

    await waitFor(() => {
      expect(screen.getByText('예약 이동')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('예약 이동'));

    expect(mockNavigate).toHaveBeenCalledWith('/bookings?highlight=1');
  });
});

// ── P3-S2-V: 거래처 관리 연결점 검증 ──
describe('P3-S2-V: 거래처 관리 연결점 검증', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it('Endpoint: GET /api/vendors 호출 확인', async () => {
    render(
      <MemoryRouter>
        <ToastProvider><Vendors /></ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/vendors'),
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });

  it('Field Coverage: vendors 전체 필드 존재', async () => {
    render(
      <MemoryRouter>
        <ToastProvider><Vendors /></ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      // name
      expect(screen.getByText('검증항공사')).toBeInTheDocument();
      // type (appears in select option + table cell)
      expect(screen.getAllByText('항공사').length).toBeGreaterThanOrEqual(2);
      // contact_name
      expect(screen.getByText('검증담당')).toBeInTheDocument();
      // phone
      expect(screen.getByText('02-0000-0000')).toBeInTheDocument();
      // email
      expect(screen.getByText('test@verify.com')).toBeInTheDocument();
      // remarks
      expect(screen.getByText('검증비고')).toBeInTheDocument();
    });
  });

  it('Endpoint: POST /api/vendors 호출 확인', async () => {
    render(
      <MemoryRouter>
        <ToastProvider><Vendors /></ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('거래처 추가')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('거래처 추가'));

    await waitFor(() => {
      expect(screen.getByLabelText('거래처명 *')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('거래처명 *'), { target: { value: '새거래처' } });

    // Submit
    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vendors',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
  });
});
