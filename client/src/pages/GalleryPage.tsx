import React, { useState } from 'react';
import { Search, Filter, Upload as UploadIcon } from 'lucide-react';
import type { ImageAsset, ImageCategory } from '../mocks/data/images';
import { useImages, useImageCategories } from '../hooks/useImages';
import { bulkDeleteImages } from '../api/images';
import ImageGrid from '../components/ImageGrid';
import ImageUploader from '../components/ImageUploader';
import ImagePreviewModal from '../components/ImagePreviewModal';

const CATEGORY_LABELS: Record<ImageCategory, string> = {
  tour: '투어',
  hotel: '호텔',
  destination: '여행지',
  activity: '액티비티',
  food: '음식',
  transport: '교통',
};

/**
 * Gallery Page
 * Main page for image gallery management
 */
const GalleryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    ImageCategory | 'all'
  >('all');
  const [page, setPage] = useState(1);
  const [showUploader, setShowUploader] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageAsset | null>(null);

  const {
    images,
    isLoading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    refetch,
  } = useImages({
    page,
    pageSize: 20,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: searchQuery || undefined,
  });

  const { categories, isLoading: categoriesLoading } = useImageCategories();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (category: ImageCategory | 'all') => {
    setSelectedCategory(category);
    setPage(1);
  };

  const handleImageClick = (image: ImageAsset) => {
    setPreviewImage(image);
  };

  const handleDeleteImages = async (imageIds: string[]) => {
    try {
      await bulkDeleteImages(imageIds);
      await refetch();
    } catch {
      alert('이미지 삭제에 실패했습니다.');
    }
  };

  const handleUploadComplete = () => {
    setShowUploader(false);
    refetch();
  };

  const handleNavigatePreview = (direction: 'prev' | 'next') => {
    if (!previewImage) return;

    const currentIndex = images.findIndex((img) => img.id === previewImage.id);
    let newIndex = currentIndex;

    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < images.length - 1) {
      newIndex = currentIndex + 1;
    }

    const newImage = images[newIndex];
    if (newIndex !== currentIndex && newImage) {
      setPreviewImage(newImage);
    }
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      setPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">이미지 갤러리</h1>
          <p className="text-gray-600 mt-1">이미지를 업로드하고 관리하세요</p>
        </div>
        <button
          onClick={() => setShowUploader((prev) => !prev)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <UploadIcon size={20} />
          {showUploader ? '업로더 숨기기' : '이미지 업로드'}
        </button>
      </div>

      {/* Uploader Panel */}
      {showUploader && (
        <div className="mb-6">
          <ImageUploader onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Input */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="이미지 설명, 태그 검색..."
                value={searchQuery}
                onChange={handleSearch}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                aria-label="카테고리 필터"
                value={selectedCategory}
                onChange={(e) =>
                  handleCategoryChange(e.target.value as ImageCategory | 'all')
                }
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">전체 카테고리</option>
                {!categoriesLoading &&
                  categories.map(({ category, count }) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]} ({count})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && (
          <div className="mt-3 text-sm text-gray-600">
            {selectedCategory === 'all'
              ? '전체'
              : CATEGORY_LABELS[selectedCategory]}{' '}
            {totalCount}개 이미지
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Image Grid */}
      <ImageGrid
        images={images}
        onImageClick={handleImageClick}
        onDelete={handleDeleteImages}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {!isLoading && !error && images.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={handlePreviousPage}
            disabled={!hasPreviousPage}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          <span className="text-gray-600">페이지 {page}</span>
          <button
            onClick={handleNextPage}
            disabled={!hasNextPage}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {/* Preview Modal */}
      <ImagePreviewModal
        image={previewImage}
        images={images}
        onClose={() => setPreviewImage(null)}
        onDelete={async (id) => {
          await handleDeleteImages([id]);
          setPreviewImage(null);
        }}
        onNavigate={handleNavigatePreview}
      />
    </div>
  );
};

export default GalleryPage;
