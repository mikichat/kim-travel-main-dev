// @TASK P3-S1-T1 - 정산 관리 UI Tests
// @SPEC TDD RED→GREEN→REFACTOR

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast';
import { Settlements } from '../pages/Settlements';

const mockSettlements = [
  {
    id: 1, booking_id: 1, vendor_id: 1, payment_type: 'card', amount: 1500000,
    status: 'unpaid', payment_date: null, remarks: null, created_at: '2026-03-01',
  },
  {
    id: 2, booking_id: 2, vendor_id: null, payment_type: 'cash', amount: 800000,
    status: 'paid', payment_date: '2026-03-05', remarks: '현금 입금', created_at: '2026-03-02',
  },
];

const mockBookings = [
  { id: 1, pnr: 'ABC123', name_kr: '김국진', fare: 1500000, status: 'ticketed' },
  { id: 2, pnr: 'DEF456', name_kr: '이영희', fare: 800000, status: 'confirmed' },
];

const mockVendors = [
  { id: 1, name: '대한항공', type: '항공사' },
];

function setupFetch() {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/settlements') && (!opts || !opts.method || opts.method === 'GET')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { settlements: mockSettlements, total: 2 } }) });
    }
    if (url.includes('/api/bookings')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { bookings: mockBookings, total: 2 } }) });
    }
    if (url.includes('/api/vendors') && (!opts || !opts.method || opts.method === 'GET')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { vendors: mockVendors, total: 1 } }) });
    }
    if (typeof url === 'string' && url.includes('/api/settlements/') && opts?.method === 'PATCH') {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { settlement: { ...mockSettlements[0], status: 'paid' } } }) });
    }
    if (url.includes('/api/invoices') && opts?.method === 'POST') {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { invoice: { invoice_number: 'INV-202603-0001' } } }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true, data: {} }) });
  });
}

function renderSettlements() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Settlements />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Settlements Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it('should render summary cards with amounts', async () => {
    renderSettlements();

    await waitFor(() => {
      expect(screen.getByText('미수금')).toBeInTheDocument();
      expect(screen.getByText('입금 완료')).toBeInTheDocument();
      // Amount appears in both summary card and table, use getAllByText
      expect(screen.getAllByText('1,500,000원').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('800,000원').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render settlement table with booking and vendor info', async () => {
    renderSettlements();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('김국진')).toBeInTheDocument();
      expect(screen.getByText('대한항공')).toBeInTheDocument();
    });
  });

  it('should have status filter', async () => {
    renderSettlements();

    await waitFor(() => {
      const filter = screen.getByLabelText('상태 필터');
      expect(filter).toBeInTheDocument();
    });
  });

  it('should show actions when row is clicked', async () => {
    renderSettlements();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    // Click the first settlement row
    const row = screen.getByText('ABC123').closest('tr');
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText('결제 처리')).toBeInTheDocument();
      expect(screen.getByText('인보이스 생성')).toBeInTheDocument();
      expect(screen.getByText('예약 이동')).toBeInTheDocument();
    });
  });

  it('should open payment modal', async () => {
    renderSettlements();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ABC123').closest('tr')!);

    await waitFor(() => {
      expect(screen.getByText('결제 처리')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('결제 처리'));

    await waitFor(() => {
      // '입금완료' exists in both select option (filter) and payment modal select
      expect(screen.getByLabelText('결제 상태')).toBeInTheDocument();
      expect(screen.getByLabelText('결제일')).toBeInTheDocument();
      expect(screen.getByLabelText('금액')).toBeInTheDocument();
    });
  });

  it('should open invoice modal', async () => {
    renderSettlements();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ABC123').closest('tr')!);

    await waitFor(() => {
      expect(screen.getByText('인보이스 생성')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('인보이스 생성'));

    await waitFor(() => {
      // Modal should show amount and PNR - use getAllByText since amount appears in table too
      expect(screen.getAllByText(/1,500,000/).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should fetch settlements with credentials', async () => {
    renderSettlements();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/settlements'),
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });
});
