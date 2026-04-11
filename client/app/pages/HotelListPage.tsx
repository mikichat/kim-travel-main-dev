import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import type { Hotel } from '../mocks/data/hotels';
import { useHotels } from '../hooks/useHotels';
import { deleteHotel } from '../api/hotels';
import HotelCard from '../components/HotelCard';

/**
 * Hotel List Page
 * Displays a list of hotels with search and filter capabilities
 */
const HotelListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minRating, setMinRating] = useState<number | undefined>();
  const [page, setPage] = useState(1);

  const {
    hotels,
    isLoading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    refetch,
  } = useHotels({
    page,
    pageSize: 12,
    search: searchQuery,
    location: locationFilter || undefined,
    minRating,
  });

  const handleCreateNew = () => {
    navigate('/hotels/new');
  };

  const handleEdit = (hotel: Hotel) => {
    navigate(`/hotels/${hotel.id}/edit`);
  };

  const handleDelete = async (hotel: Hotel) => {
    if (!window.confirm(`"${hotel.name}" 호텔을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteHotel(hotel.id);
      await refetch();
    } catch {
      alert('호텔 삭제에 실패했습니다.');
    }
  };

  const handleCardClick = (hotel: Hotel) => {
    navigate(`/hotels/${hotel.id}`);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationFilter(e.target.value);
    setPage(1);
  };

  const handleRatingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setMinRating(value ? parseFloat(value) : undefined);
    setPage(1);
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
          <h1 className="text-3xl font-bold text-gray-900">호텔 관리</h1>
          <p className="text-gray-600 mt-1">호텔 정보를 생성하고 관리하세요</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />새 호텔 등록
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="md:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="호텔명, 위치 검색..."
                value={searchQuery}
                onChange={handleSearch}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location Filter */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="위치 필터"
                value={locationFilter}
                onChange={handleLocationChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <select
              aria-label="최소 별점"
              value={minRating || ''}
              onChange={handleRatingChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체 별점</option>
              <option value="4.5">4.5★ 이상</option>
              <option value="4.0">4.0★ 이상</option>
              <option value="3.5">3.5★ 이상</option>
              <option value="3.0">3.0★ 이상</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && (
          <div className="mt-3 text-sm text-gray-600">
            총 {totalCount}개의 호텔
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

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

      {/* Empty State */}
      {!isLoading && !error && hotels.length === 0 && (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            호텔이 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            새로운 호텔을 등록하여 관리를 시작하세요
          </p>
          <button
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <Plus size={20} />첫 호텔 등록하기
          </button>
        </div>
      )}

      {/* Hotels Grid */}
      {!isLoading && !error && hotels.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {hotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                onClick={handleCardClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
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
        </>
      )}
    </div>
  );
};

export default HotelListPage;
