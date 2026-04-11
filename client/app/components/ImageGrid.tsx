import React, { useState } from 'react';
import { Trash2, Eye, Check } from 'lucide-react';
import type { ImageAsset } from '../mocks/data/images';

interface ImageGridProps {
  images: ImageAsset[];
  onImageClick?: (image: ImageAsset) => void;
  onDelete?: (imageIds: string[]) => void;
  isLoading?: boolean;
}

/**
 * ImageGrid Component
 * Displays images in a responsive grid with selection and delete capabilities
 */
const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  onImageClick,
  onDelete,
  isLoading = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const handleImageClick = (image: ImageAsset) => {
    if (selectionMode) {
      toggleSelection(image.id);
    } else {
      onImageClick?.(image);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!window.confirm(`선택한 ${count}개의 이미지를 삭제하시겠습니까?`)) {
      return;
    }

    onDelete?.(Array.from(selectedIds));
    handleExitSelectionMode();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-lg aspect-square animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            className="w-full h-full"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          이미지가 없습니다
        </h3>
        <p className="text-gray-600">새로운 이미지를 업로드하여 시작하세요</p>
      </div>
    );
  }

  return (
    <div>
      {/* Selection Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {selectionMode ? (
            <span>
              {selectedIds.size}개 선택됨 / 총 {images.length}개
            </span>
          ) : (
            <span>총 {images.length}개 이미지</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {selectedIds.size === images.length ? '전체 해제' : '전체 선택'}
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 size={16} />
                삭제
              </button>
              <button
                onClick={handleExitSelectionMode}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </>
          ) : (
            <button
              onClick={handleEnterSelectionMode}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              선택 모드
            </button>
          )}
        </div>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => {
          const isSelected = selectedIds.has(image.id);

          return (
            <div
              key={image.id}
              className={`
                group relative bg-white rounded-lg shadow overflow-hidden cursor-pointer
                transition-all duration-200
                ${
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : 'hover:shadow-lg'
                }
              `}
              onClick={() => handleImageClick(image)}
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img
                  src={image.thumbnailUrl}
                  alt={image.altText}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Overlay */}
              {!selectionMode && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                  <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              )}

              {/* Selection Checkbox */}
              {selectionMode && (
                <div className="absolute top-2 right-2">
                  <div
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center
                      transition-colors
                      ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300'
                      }
                    `}
                  >
                    {isSelected && <Check size={16} className="text-white" />}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate mb-1">
                  {image.altText}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatFileSize(image.fileSize)}</span>
                  <span>
                    {image.width} × {image.height}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {image.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {image.tags.length > 2 && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      +{image.tags.length - 2}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImageGrid;
