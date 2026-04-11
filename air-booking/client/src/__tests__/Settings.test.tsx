// @TASK P4-S2-T1 - Settings Page Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast';
import { Settings } from '../pages/Settings';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

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

function setupFetch() {
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

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <ToastProvider>
        <Settings />
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupFetch();
  setupLocalStorage();
});

describe('Settings Page', () => {
  it('should render BSP section', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('2026-03-15')).toBeInTheDocument();
      expect(screen.getByText('3월 BSP')).toBeInTheDocument();
    });
  });

  it('should render alert settings', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText(/NMTL \(No More/)).toBeInTheDocument();
      expect(screen.getByText(/TL \(Ticketing/)).toBeInTheDocument();
      expect(screen.getByText('BSP 정산일')).toBeInTheDocument();
    });
  });

  it('should render password form', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('현재 비밀번호')).toBeInTheDocument();
      expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument();
      // '비밀번호 변경' appears as section title and button
      expect(screen.getAllByText('비밀번호 변경').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should render font size buttons', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('작게')).toBeInTheDocument();
      expect(screen.getByText('보통')).toBeInTheDocument();
      expect(screen.getByText('크게')).toBeInTheDocument();
    });
  });

  it('should render dark mode toggle', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText(/다크 모드/)).toBeInTheDocument();
    });
  });

  it('should have BSP add form', async () => {
    renderSettings();

    await waitFor(() => {
      expect(document.getElementById('bsp-payment-date')).toBeInTheDocument();
      expect(screen.getByText('추가')).toBeInTheDocument();
    });
  });

  it('should show empty message when no BSP dates', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/bsp-dates')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: { bspDates: [] },
          }),
        });
      }
      if (url.includes('/api/alert-settings')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockAlertSettingsResponse),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('등록된 BSP 정산일이 없습니다.')).toBeInTheDocument();
    });
  });

  it('should show password validation errors', async () => {
    const user = userEvent.setup();
    renderSettings();

    // Wait for page to render, then find the submit button specifically
    await waitFor(() => screen.getByRole('button', { name: '비밀번호 변경' }));
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => {
      expect(screen.getByText(/현재 비밀번호를 입력/)).toBeInTheDocument();
    });
  });
});
