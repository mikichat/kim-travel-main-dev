import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import HotelForm from '../components/HotelForm';
import { getHotelById, createHotel, updateHotel } from '../api/hotels';
import type { Hotel } from '../mocks/data/hotels';

/**
 * Hotel Form Page
 * Page for creating or editing a hotel
 */
const HotelFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [hotel, setHotel] = useState<Hotel | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!id;

  useEffect(() => {
    if (isEditMode) {
      fetchHotel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchHotel = async () => {
    if (!id) return;

    setIsFetching(true);
    setError(null);

    try {
      const response = await getHotelById(id);
      if (response.success && response.data) {
        setHotel(response.data);
      } else {
        setError('호텔을 찾을 수 없습니다');
      }
    } catch {
      setError('호텔 정보를 불러오는데 실패했습니다');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (hotelData: Partial<Hotel>) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isEditMode && id) {
        await updateHotel(id, hotelData);
      } else {
        await createHotel(hotelData);
      }
      navigate('/hotels');
    } catch {
      setError(
        isEditMode ? '호텔 수정에 실패했습니다' : '호텔 등록에 실패했습니다'
      );
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/hotels');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>목록으로 돌아가기</span>
        </button>
      </div>

      {/* Loading State */}
      {isFetching && (
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

      {/* Form */}
      {!isFetching && (isEditMode ? hotel : true) && (
        <HotelForm
          hotel={hotel}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default HotelFormPage;
