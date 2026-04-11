// @TASK P3-S2-T1 - 거래처 관리 UI Tests
// @SPEC TDD RED→GREEN→REFACTOR

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast';
import { Vendors } from '../pages/Vendors';

const mockVendors = [
  {
    id: 1, name: '대한항공', type: '항공사', contact_name: '김담당',
    phone: '02-1234-5678', email: 'ke@airline.com', remarks: null, created_at: '2026-01-01',
  },
  {
    id: 2, name: '하나투어', type: '여행사', contact_name: '이대리',
    phone: '02-9876-5432', email: 'hana@tour.com', remarks: '주요 거래처', created_at: '2026-02-01',
  },
];

function setupFetch(overrides: Record<string, any> = {}) {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/vendors') && (!opts || !opts.method || opts.method === 'GET')) {
      const urlObj = new URL(url, 'http://localhost');
      const type = urlObj.searchParams.get('type');
      const search = urlObj.searchParams.get('search');

      let filtered = mockVendors;
      if (type) filtered = filtered.filter((v) => v.type === type);
      if (search) filtered = filtered.filter((v) => v.name.includes(search));

      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { vendors: filtered, total: filtered.length } }) });
    }
    if (url.includes('/api/vendors') && opts?.method === 'POST') {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { vendor: { id: 3, ...JSON.parse(opts.body as string) } } }) });
    }
    if (typeof url === 'string' && url.match(/\/api\/vendors\/\d+/) && opts?.method === 'PATCH') {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { vendor: mockVendors[0] } }) });
    }
    if (typeof url === 'string' && url.match(/\/api\/vendors\/\d+/) && opts?.method === 'DELETE') {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { message: '삭제' } }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true, data: {} }) });
  });
}

function renderVendors() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Vendors />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Vendors Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it('should render vendor table with data', async () => {
    renderVendors();

    await waitFor(() => {
      expect(screen.getByText('대한항공')).toBeInTheDocument();
      expect(screen.getByText('하나투어')).toBeInTheDocument();
      // '항공사'/'여행사' text exists in both select options and table cells
      expect(screen.getAllByText('항공사').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('여행사').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should display vendor details in table', async () => {
    renderVendors();

    await waitFor(() => {
      expect(screen.getByText('김담당')).toBeInTheDocument();
      expect(screen.getByText('02-1234-5678')).toBeInTheDocument();
      expect(screen.getByText('ke@airline.com')).toBeInTheDocument();
    });
  });

  it('should have type filter and search input', async () => {
    renderVendors();

    await waitFor(() => {
      expect(screen.getByLabelText('유형 필터')).toBeInTheDocument();
      expect(screen.getByLabelText('거래처 검색')).toBeInTheDocument();
    });
  });

  it('should show total count', async () => {
    renderVendors();

    await waitFor(() => {
      expect(screen.getByText('총 2건')).toBeInTheDocument();
    });
  });

  it('should open create modal', async () => {
    renderVendors();

    await waitFor(() => {
      expect(screen.getByText('거래처 추가')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('거래처 추가'));

    await waitFor(() => {
      expect(screen.getByLabelText('거래처명 *')).toBeInTheDocument();
      expect(screen.getByLabelText('유형')).toBeInTheDocument();
      expect(screen.getByLabelText('담당자')).toBeInTheDocument();
      expect(screen.getByLabelText('연락처')).toBeInTheDocument();
      expect(screen.getByLabelText('이메일')).toBeInTheDocument();
      expect(screen.getByLabelText('비고')).toBeInTheDocument();
    });
  });

  it('should open edit modal', async () => {
    renderVendors();

    await waitFor(() => {
      expect(screen.getByLabelText('대한항공 편집')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('대한항공 편집'));

    await waitFor(() => {
      const nameInput = screen.getByLabelText('거래처명 *') as HTMLInputElement;
      expect(nameInput.value).toBe('대한항공');
    });
  });

  it('should have edit and delete buttons for each vendor', async () => {
    renderVendors();

    await waitFor(() => {
      expect(screen.getByLabelText('대한항공 편집')).toBeInTheDocument();
      expect(screen.getByLabelText('대한항공 삭제')).toBeInTheDocument();
      expect(screen.getByLabelText('하나투어 편집')).toBeInTheDocument();
      expect(screen.getByLabelText('하나투어 삭제')).toBeInTheDocument();
    });
  });

  it('should fetch vendors with credentials', async () => {
    renderVendors();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/vendors'),
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });
});
