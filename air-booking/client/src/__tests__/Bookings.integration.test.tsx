// @TASK P2-S3-T2 - 예약장부 통합 테스트
// 4 시나리오: PNR 파싱 등록, 행 확장 상세, 검색 필터링, PNR 파싱 실패

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

function setupFetch(overrides: Record<string, any> = {}) {
  let callCount = 0;

  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    // GET /api/bookings — support search filtering
    if (typeof url === 'string' && url.includes('/api/bookings') && !url.includes('parse-pnr') && (!opts || !opts.method || opts.method === 'GET')) {
      const urlObj = new URL(url, 'http://localhost');
      const search = urlObj.searchParams.get('search');
      let filtered = mockBookings;
      if (search) {
        filtered = mockBookings.filter(
          (b) => b.pnr.includes(search) || b.name_kr?.includes(search) || b.name_en?.includes(search)
        );
      }

      // After PNR parse + create, return updated list on re-fetch
      if (overrides.afterCreate && callCount > 3) {
        filtered = [...mockBookings, {
          id: 3, pnr: 'NEW001', airline: 'KE', flight_number: 'KE001',
          route_from: 'ICN', route_to: 'SFO', name_kr: null, name_en: 'LEE/MINHO',
          passport_number: null, seat_number: null, fare: null,
          nmtl_date: null, tl_date: null, departure_date: null,
          status: 'pending', remarks: null, created_at: '2026-03-09',
        }];
      }

      callCount++;
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { bookings: filtered, total: filtered.length } }),
      });
    }

    // POST /api/bookings/parse-pnr
    if (url.includes('parse-pnr') && opts?.method === 'POST') {
      if (overrides.parseFail) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: false,
            error: 'PNR 텍스트를 파싱할 수 없습니다. 수동 입력을 이용해주세요.',
          }),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({
          success: true,
          data: { parsed: [{ pnr: 'NEW001', airline: 'KE', flight_number: 'KE001', name_en: 'LEE/MINHO', route_from: 'ICN', route_to: 'SFO' }] },
        }),
      });
    }

    // POST /api/bookings (create)
    if (url.includes('/api/bookings') && opts?.method === 'POST') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { booking: { id: 3 } } }),
      });
    }

    // DELETE /api/bookings/:id
    if (opts?.method === 'DELETE') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { message: '삭제됨' } }),
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

describe('P2-S3-T2: Bookings Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 시나리오 1: PNR 파싱 등록 ──
  describe('PNR 파싱 등록', () => {
    it('should parse PNR text and create bookings', async () => {
      setupFetch({ afterCreate: true });
      const user = userEvent.setup();
      renderBookings();

      // 테이블 로드 대기
      await waitFor(() => screen.getByText('ABC123'));

      // PNR 등록 버튼 클릭
      await user.click(screen.getByText('PNR 등록'));

      // PNR 모달 확인
      expect(screen.getByText(/GDS PNR 텍스트를 붙여넣기/)).toBeInTheDocument();

      // PNR 텍스트 입력
      const textarea = screen.getByPlaceholderText(/KIM\/GUKJIN/);
      await user.type(textarea, '1.LEE/MINHO MR\n2 KE 001 Y 20MAR ICNSFO HK1\nPNR: NEW001');

      // 등록 버튼 클릭
      await user.click(screen.getByRole('button', { name: '등록' }));

      // parse-pnr API 호출 확인
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/bookings/parse-pnr',
          expect.objectContaining({ method: 'POST', credentials: 'include' })
        );
      });

      // 파싱 결과로 POST /api/bookings 호출 확인
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/bookings',
          expect.objectContaining({ method: 'POST', credentials: 'include' })
        );
      });
    });
  });

  // ── 시나리오 2: 행 확장 상세 ──
  describe('행 확장 상세', () => {
    it('should show detail panel with action buttons on row click', async () => {
      setupFetch();
      const user = userEvent.setup();
      renderBookings();

      await waitFor(() => screen.getByText('ABC123'));

      // 행 클릭 → 확장
      await user.click(screen.getByText('ABC123'));

      // 상세 필드 확인 (BookingDetailCard + BookingEditFields)
      await waitFor(() => {
        expect(screen.getByText('탑승객')).toBeInTheDocument();
        expect(screen.getByText('운임')).toBeInTheDocument();
      });

      // 액션 버튼 확인
      expect(screen.getByText('정산 이동')).toBeInTheDocument();
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });

    it('should navigate to settlements on action button click', async () => {
      setupFetch();
      const user = userEvent.setup();
      renderBookings();

      await waitFor(() => screen.getByText('ABC123'));
      await user.click(screen.getByText('ABC123'));

      await waitFor(() => screen.getByText('정산 이동'));
      await user.click(screen.getByText('정산 이동'));

      expect(mockNavigate).toHaveBeenCalledWith('/settlements?booking=1');
    });

    it('should call DELETE API on delete button click', async () => {
      setupFetch();
      const user = userEvent.setup();
      renderBookings();

      await waitFor(() => screen.getByText('ABC123'));
      await user.click(screen.getByText('ABC123'));

      await waitFor(() => screen.getByText('삭제'));
      await user.click(screen.getByText('삭제'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/bookings/1',
          expect.objectContaining({ method: 'DELETE', credentials: 'include' })
        );
      });
    });
  });

  // ── 시나리오 3: 검색 필터링 ──
  describe('검색 필터링', () => {
    it('should filter bookings by search term', async () => {
      setupFetch();
      const user = userEvent.setup();
      renderBookings();

      await waitFor(() => screen.getByText('ABC123'));

      // 검색어 입력
      const searchInput = screen.getByPlaceholderText(/PNR, 이름으로 검색/);
      await user.type(searchInput, '김국진');

      // re-fetch with search param
      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const searchCall = calls.find((c: any) =>
          typeof c[0] === 'string' && c[0].includes('search=')
        );
        expect(searchCall).toBeTruthy();
      });
    });
  });

  // ── 시나리오 4: PNR 파싱 실패 ──
  describe('PNR 파싱 실패', () => {
    it('should show warning toast on parse failure', async () => {
      setupFetch({ parseFail: true });
      const user = userEvent.setup();
      renderBookings();

      await waitFor(() => screen.getByText('PNR 등록'));
      await user.click(screen.getByText('PNR 등록'));

      const textarea = screen.getByPlaceholderText(/KIM\/GUKJIN/);
      await user.type(textarea, 'INVALID PNR TEXT');
      await user.click(screen.getByRole('button', { name: '등록' }));

      // Warning toast 표시 확인
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
