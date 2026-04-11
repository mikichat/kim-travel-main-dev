import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';
import type { ImageAsset } from '../mocks/data/images';

interface ImagePreviewModalProps {
  image: ImageAsset | null;
  images?: ImageAsset[];
  onClose: () => void;
  onDelete?: (imageId: string) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

/**
 * ImagePreviewModal Component
 * Full-screen image preview with navigation and details
 */
const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  image,
  images = [],
  onClose,
  onDelete,
  onNavigate,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!image) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onNavigate?.('prev');
          break;
        case 'ArrowRight':
          onNavigate?.('next');
          break;
        case 'i':
        case 'I':
          setShowDetails((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, onClose, onNavigate]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (image) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [image]);

  if (!image) return null;

  const currentIndex = images.findIndex((img) => img.id === image.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `${image.altText}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = () => {
    if (window.confirm(`"${image.altText}" 이미지를 삭제하시겠습니까?`)) {
      onDelete?.(image.id);
      onClose();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
        aria-label="닫기"
      >
        <X size={32} />
      </button>

      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          {hasPrevious && (
            <button
              onClick={() => onNavigate?.('prev')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="이전 이미지"
            >
              <ChevronLeft size={48} />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => onNavigate?.('next')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="다음 이미지"
            >
              <ChevronRight size={48} />
            </button>
          )}
        </>
      )}

      {/* Action Buttons */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        <button
          onClick={handleDownload}
          className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors flex items-center gap-2"
          aria-label="다운로드"
        >
          <Download size={20} />
          <span className="text-sm">다운로드</span>
        </button>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="px-3 py-2 bg-red-600 bg-opacity-80 hover:bg-opacity-100 text-white rounded-lg transition-colors flex items-center gap-2"
            aria-label="삭제"
          >
            <Trash2 size={20} />
            <span className="text-sm">삭제</span>
          </button>
        )}
        <button
          onClick={() => setShowDetails((prev) => !prev)}
          className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors text-sm"
        >
          {showDetails ? '정보 숨기기' : '정보 보기'} (I)
        </button>
      </div>

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Main Content */}
      <div className="flex items-center justify-center w-full h-full p-16">
        <div className="flex items-center justify-center gap-8 max-w-full max-h-full">
          {/* Image */}
          <div className="flex-1 flex items-center justify-center">
            <img
              src={image.url}
              alt={image.altText}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Details Panel */}
          {showDetails && (
            <div
              className="w-80 bg-white rounded-lg shadow-xl p-6 max-h-full overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                이미지 정보
              </h3>

              <div className="space-y-4">
                {/* Alt Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <p className="text-gray-900">{image.altText}</p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리
                  </label>
                  <p className="text-gray-900 capitalize">{image.category}</p>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    태그
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    크기
                  </label>
                  <p className="text-gray-900">
                    {image.width} × {image.height}px
                  </p>
                </div>

                {/* File Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    파일 크기
                  </label>
                  <p className="text-gray-900">
                    {formatFileSize(image.fileSize)}
                  </p>
                </div>

                {/* MIME Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    파일 형식
                  </label>
                  <p className="text-gray-900">{image.mimeType}</p>
                </div>

                {/* Upload Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    업로드 날짜
                  </label>
                  <p className="text-gray-900">
                    {formatDate(image.uploadedAt)}
                  </p>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <p className="text-gray-900 text-xs break-all">{image.url}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="absolute bottom-4 right-4 text-white text-xs bg-black bg-opacity-50 px-3 py-2 rounded-lg">
        <div>ESC: 닫기</div>
        <div>← →: 이전/다음</div>
        <div>I: 정보</div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
