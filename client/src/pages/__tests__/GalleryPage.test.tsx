import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import GalleryPage from '../GalleryPage';
import * as imagesApi from '../../api/images';
import type { ImageAsset } from '../../mocks/data/images';
import type { ApiResponse } from '@tourworld/shared';

// Mock the images API
vi.mock('../../api/images');

const mockImages: ImageAsset[] = [
  {
    id: 'img-001',
    url: '/images/tours/jeju-hallasan.jpg',
    thumbnailUrl: '/images/tours/thumbs/jeju-hallasan.jpg',
    altText: '제주 한라산 정상',
    category: 'tour',
    tags: ['제주도', '한라산', '산', '자연'],
    width: 1920,
    height: 1080,
    fileSize: 524288,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-10'),
  },
  {
    id: 'img-002',
    url: '/images/hotels/jeju-grand-lobby.jpg',
    thumbnailUrl: '/images/hotels/thumbs/jeju-grand-lobby.jpg',
    altText: '제주 그랜드 호텔 로비',
    category: 'hotel',
    tags: ['제주도', '호텔', '로비', '럭셔리'],
    width: 1600,
    height: 1067,
    fileSize: 327680,
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2025-01-08'),
  },
];

const mockCategories = [
  { category: 'tour' as const, count: 3 },
  { category: 'hotel' as const, count: 2 },
  { category: 'destination' as const, count: 2 },
  { category: 'activity' as const, count: 2 },
  { category: 'food' as const, count: 1 },
  { category: 'transport' as const, count: 0 },
];

describe('GalleryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders gallery page with images', async () => {
    const mockResponse: ApiResponse<ImageAsset[]> = {
      success: true,
      data: mockImages,
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    const mockCategoriesResponse: ApiResponse<typeof mockCategories> = {
      success: true,
      data: mockCategories,
    };

    vi.mocked(imagesApi.getImages).mockResolvedValue(mockResponse);
    vi.mocked(imagesApi.getImageCategories).mockResolvedValue(
      mockCategoriesResponse
    );

    render(
      <BrowserRouter>
        <GalleryPage />
      </BrowserRouter>
    );

    // Check header
    expect(screen.getByText('이미지 갤러리')).toBeInTheDocument();
    expect(
      screen.getByText('이미지를 업로드하고 관리하세요')
    ).toBeInTheDocument();

    // Wait for images to load
    await waitFor(() => {
      expect(screen.getByText('제주 한라산 정상')).toBeInTheDocument();
      expect(screen.getByText('제주 그랜드 호텔 로비')).toBeInTheDocument();
    });

    // Check if API was called with correct params
    expect(imagesApi.getImages).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      category: undefined,
      search: undefined,
    });
  });

  it('shows loading state while fetching images', () => {
    vi.mocked(imagesApi.getImages).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(imagesApi.getImageCategories).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(
      <BrowserRouter>
        <GalleryPage />
      </BrowserRouter>
    );

    const skeletonItems = container.querySelectorAll('.animate-pulse');
    expect(skeletonItems.length).toBeGreaterThan(0);
  });

  it('shows empty state when no images exist', async () => {
    const mockResponse: ApiResponse<ImageAsset[]> = {
      success: true,
      data: [],
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    const mockCategoriesResponse: ApiResponse<typeof mockCategories> = {
      success: true,
      data: mockCategories,
    };

    vi.mocked(imagesApi.getImages).mockResolvedValue(mockResponse);
    vi.mocked(imagesApi.getImageCategories).mockResolvedValue(
      mockCategoriesResponse
    );

    render(
      <BrowserRouter>
        <GalleryPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('이미지가 없습니다')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    vi.mocked(imagesApi.getImages).mockRejectedValue(
      new Error('Failed to fetch images')
    );
    vi.mocked(imagesApi.getImageCategories).mockResolvedValue({
      success: true,
      data: mockCategories,
    });

    render(
      <BrowserRouter>
        <GalleryPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch images')).toBeInTheDocument();
    });
  });

  it('toggles uploader when button is clicked', async () => {
    const mockResponse: ApiResponse<ImageAsset[]> = {
      success: true,
      data: mockImages,
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(imagesApi.getImages).mockResolvedValue(mockResponse);
    vi.mocked(imagesApi.getImageCategories).mockResolvedValue({
      success: true,
      data: mockCategories,
    });

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <GalleryPage />
      </BrowserRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('제주 한라산 정상')).toBeInTheDocument();
    });

    // Check for upload button - initially should say "이미지 업로드"
    const uploadButton = screen.getByRole('button', { name: /이미지 업로드/i });
    expect(uploadButton).toBeInTheDocument();

    // Click to toggle uploader
    await user.click(uploadButton);

    // After clicking, button text should change
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /업로더 숨기기/i })
      ).toBeInTheDocument();
    });
  });

  it('filters images by search query', async () => {
    const mockResponse: ApiResponse<ImageAsset[]> = {
      success: true,
      data: [mockImages[0]!],
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(imagesApi.getImages).mockResolvedValue(mockResponse);
    vi.mocked(imagesApi.getImageCategories).mockResolvedValue({
      success: true,
      data: mockCategories,
    });

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <GalleryPage />
      </BrowserRouter>
    );

    const searchInput =
      screen.getByPlaceholderText('이미지 설명, 태그 검색...');
    await user.type(searchInput, '한라산');

    await waitFor(() => {
      expect(imagesApi.getImages).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '한라산',
        })
      );
    });
  });

  it('filters images by category', async () => {
    const mockResponse: ApiResponse<ImageAsset[]> = {
      success: true,
      data: [mockImages[1]!],
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(imagesApi.getImages).mockResolvedValue(mockResponse);
    vi.mocked(imagesApi.getImageCategories).mockResolvedValue({
      success: true,
      data: mockCategories,
    });

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <GalleryPage />
      </BrowserRouter>
    );

    // Wait for categories to load
    await waitFor(() => {
      const categorySelect = screen.getByRole('combobox', {
        name: /카테고리 필터/i,
      });
      expect(categorySelect.querySelectorAll('option').length).toBeGreaterThan(
        1
      );
    });

    const categorySelect = screen.getByRole('combobox', {
      name: /카테고리 필터/i,
    });
    await user.selectOptions(categorySelect, 'hotel');

    await waitFor(() => {
      expect(imagesApi.getImages).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'hotel',
        })
      );
    });
  });

  it('handles pagination correctly', async () => {
    const mockResponse: ApiResponse<ImageAsset[]> = {
      success: true,
      data: mockImages,
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 30,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };

    vi.mocked(imagesApi.getImages).mockResolvedValue(mockResponse);
    vi.mocked(imagesApi.getImageCategories).mockResolvedValue({
      success: true,
      data: mockCategories,
    });

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <GalleryPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('페이지 1')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: '다음' });
    expect(nextButton).not.toBeDisabled();

    await user.click(nextButton);

    await waitFor(() => {
      expect(imagesApi.getImages).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  it('deletes images in bulk when selection mode is used', async () => {
    const mockResponse: ApiResponse<ImageAsset[]> = {
      success: true,
      data: mockImages,
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(imagesApi.getImages).mockResolvedValue(mockResponse);
    vi.mocked(imagesApi.getImageCategories).mockResolvedValue({
      success: true,
      data: mockCategories,
    });
    vi.mocked(imagesApi.bulkDeleteImages).mockResolvedValue({
      success: true,
      data: { deleted: ['img-001'], notFound: [] },
    });

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <GalleryPage />
      </BrowserRouter>
    );

    // Wait for images to load
    await waitFor(() => {
      expect(screen.getByText('제주 한라산 정상')).toBeInTheDocument();
    });

    // Enter selection mode
    const selectionModeButton = screen.getByRole('button', {
      name: '선택 모드',
    });
    await user.click(selectionModeButton);

    // Select first image
    const imageCards = screen.getAllByRole('img');
    await user.click(imageCards[0]!.closest('div')!);

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /삭제/i });
    await user.click(deleteButton);

    // Check if confirm was called
    expect(confirmSpy).toHaveBeenCalled();

    // Wait for delete to complete and refetch
    await waitFor(() => {
      expect(imagesApi.bulkDeleteImages).toHaveBeenCalledWith(['img-001']);
      expect(imagesApi.getImages).toHaveBeenCalledTimes(2); // Initial + refetch
    });

    confirmSpy.mockRestore();
  });
});
