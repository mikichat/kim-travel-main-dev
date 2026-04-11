import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import HotelListPage from '../HotelListPage';
import * as hotelsApi from '../../api/hotels';
import type { Hotel } from '../../mocks/data/hotels';
import type { ApiResponse } from '@tourworld/shared';

// Mock the hotels API
vi.mock('../../api/hotels');

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockHotels: Hotel[] = [
  {
    id: 'hotel-001',
    name: '제주 그랜드 호텔',
    description: '제주 중문 관광단지에 위치한 5성급 리조트 호텔',
    location: '제주도 서귀포시',
    address: '제주특별자치도 서귀포시 중문관광로 72번길 75',
    rating: 4.8,
    pricePerNight: 250000,
    currency: 'KRW',
    amenities: ['무료 Wi-Fi', '수영장', '피트니스'],
    images: ['/images/hotels/jeju-grand-1.jpg'],
    roomTypes: [],
    checkInTime: '15:00',
    checkOutTime: '11:00',
    contactPhone: '+82-64-738-0000',
    contactEmail: 'info@jejugrand.com',
  },
  {
    id: 'hotel-002',
    name: '오사카 힐튼 호텔',
    description: '오사카 중심부에 위치한 글로벌 체인 호텔',
    location: '일본 오사카',
    address: '1-8-8 Umeda, Kita-ku, Osaka, Japan',
    rating: 4.6,
    pricePerNight: 180000,
    currency: 'KRW',
    amenities: ['무료 Wi-Fi', '피트니스'],
    images: ['/images/hotels/osaka-hilton-1.jpg'],
    roomTypes: [],
    checkInTime: '14:00',
    checkOutTime: '12:00',
    contactPhone: '+81-6-6347-7111',
    contactEmail: 'osaka@hilton.com',
  },
];

describe('HotelListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hotel list page with hotels', async () => {
    const mockResponse: ApiResponse<Hotel[]> = {
      success: true,
      data: mockHotels,
      meta: {
        page: 1,
        pageSize: 12,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(hotelsApi.getHotels).mockResolvedValue(mockResponse);

    render(
      <BrowserRouter>
        <HotelListPage />
      </BrowserRouter>
    );

    // Check header
    expect(screen.getByText('호텔 관리')).toBeInTheDocument();
    expect(
      screen.getByText('호텔 정보를 생성하고 관리하세요')
    ).toBeInTheDocument();

    // Wait for hotels to load
    await waitFor(() => {
      expect(screen.getByText('제주 그랜드 호텔')).toBeInTheDocument();
      expect(screen.getByText('오사카 힐튼 호텔')).toBeInTheDocument();
    });

    // Check if API was called with correct params
    expect(hotelsApi.getHotels).toHaveBeenCalledWith({
      page: 1,
      pageSize: 12,
      search: '',
      location: undefined,
      minRating: undefined,
    });
  });

  it('shows loading state while fetching hotels', () => {
    vi.mocked(hotelsApi.getHotels).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(
      <BrowserRouter>
        <HotelListPage />
      </BrowserRouter>
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('shows empty state when no hotels exist', async () => {
    const mockResponse: ApiResponse<Hotel[]> = {
      success: true,
      data: [],
      meta: {
        page: 1,
        pageSize: 12,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(hotelsApi.getHotels).mockResolvedValue(mockResponse);

    render(
      <BrowserRouter>
        <HotelListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('호텔이 없습니다')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    vi.mocked(hotelsApi.getHotels).mockRejectedValue(
      new Error('Failed to fetch hotels')
    );

    render(
      <BrowserRouter>
        <HotelListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch hotels')).toBeInTheDocument();
    });
  });

  it('navigates to create new hotel page when button is clicked', async () => {
    const mockResponse: ApiResponse<Hotel[]> = {
      success: true,
      data: [],
      meta: {
        page: 1,
        pageSize: 12,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(hotelsApi.getHotels).mockResolvedValue(mockResponse);

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <HotelListPage />
      </BrowserRouter>
    );

    const createButton = screen.getByRole('button', { name: /새 호텔 등록/i });
    await user.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/hotels/new');
  });

  it('filters hotels by search query', async () => {
    const mockResponse: ApiResponse<Hotel[]> = {
      success: true,
      data: [mockHotels[0]!],
      meta: {
        page: 1,
        pageSize: 12,
        totalCount: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(hotelsApi.getHotels).mockResolvedValue(mockResponse);

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <HotelListPage />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText('호텔명, 위치 검색...');
    await user.type(searchInput, '제주');

    await waitFor(() => {
      expect(hotelsApi.getHotels).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '제주',
        })
      );
    });
  });

  it('filters hotels by minimum rating', async () => {
    const mockResponse: ApiResponse<Hotel[]> = {
      success: true,
      data: [mockHotels[0]!],
      meta: {
        page: 1,
        pageSize: 12,
        totalCount: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(hotelsApi.getHotels).mockResolvedValue(mockResponse);

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <HotelListPage />
      </BrowserRouter>
    );

    const ratingSelect = screen.getByRole('combobox', { name: /최소 별점/i });
    await user.selectOptions(ratingSelect, '4.5');

    await waitFor(() => {
      expect(hotelsApi.getHotels).toHaveBeenCalledWith(
        expect.objectContaining({
          minRating: 4.5,
        })
      );
    });
  });

  it('deletes a hotel when delete button is clicked and confirmed', async () => {
    const mockResponse: ApiResponse<Hotel[]> = {
      success: true,
      data: mockHotels,
      meta: {
        page: 1,
        pageSize: 12,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(hotelsApi.getHotels).mockResolvedValue(mockResponse);
    vi.mocked(hotelsApi.deleteHotel).mockResolvedValue({ success: true });

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <HotelListPage />
      </BrowserRouter>
    );

    // Wait for hotels to load
    await waitFor(() => {
      expect(screen.getByText('제주 그랜드 호텔')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByLabelText('호텔 삭제');
    await user.click(deleteButtons[0]!);

    // Check if confirm was called
    expect(confirmSpy).toHaveBeenCalled();

    // Wait for delete to complete and refetch
    await waitFor(() => {
      expect(hotelsApi.deleteHotel).toHaveBeenCalledWith('hotel-001');
      expect(hotelsApi.getHotels).toHaveBeenCalledTimes(2); // Initial + refetch
    });

    confirmSpy.mockRestore();
  });

  it('handles pagination correctly', async () => {
    const mockResponse: ApiResponse<Hotel[]> = {
      success: true,
      data: mockHotels,
      meta: {
        page: 1,
        pageSize: 12,
        totalCount: 20,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };

    vi.mocked(hotelsApi.getHotels).mockResolvedValue(mockResponse);

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <HotelListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('페이지 1')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: '다음' });
    expect(nextButton).not.toBeDisabled();

    await user.click(nextButton);

    await waitFor(() => {
      expect(hotelsApi.getHotels).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });
});
