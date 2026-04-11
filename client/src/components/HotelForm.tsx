import React, { useState, FormEvent, ChangeEvent } from 'react';
import { Star } from 'lucide-react';
import type { Hotel } from '../mocks/data/hotels';

interface HotelFormProps {
  hotel?: Hotel;
  onSubmit: (hotel: Partial<Hotel>) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  description: string;
  location: string;
  address: string;
  rating: number;
  pricePerNight: string;
  contactPhone: string;
  contactEmail: string;
  amenities: string;
}

interface FormErrors {
  name?: string;
  location?: string;
  address?: string;
  rating?: string;
  pricePerNight?: string;
  contactEmail?: string;
}

/**
 * Hotel Form Component
 * Form for creating or editing a hotel
 */
const HotelForm: React.FC<HotelFormProps> = ({
  hotel,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: hotel?.name || '',
    description: hotel?.description || '',
    location: hotel?.location || '',
    address: hotel?.address || '',
    rating: hotel?.rating || 0,
    pricePerNight: hotel?.pricePerNight?.toString() || '',
    contactPhone: hotel?.contactPhone || '',
    contactEmail: hotel?.contactEmail || '',
    amenities: hotel?.amenities?.join(', ') || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [hoverRating, setHoverRating] = useState(0);

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '호텔명은 필수입니다';
    }

    if (!formData.location.trim()) {
      newErrors.location = '위치는 필수입니다';
    }

    if (!formData.address.trim()) {
      newErrors.address = '주소는 필수입니다';
    }

    if (formData.rating < 0 || formData.rating > 5) {
      newErrors.rating = '별점은 0-5 사이여야 합니다';
    }

    if (!formData.pricePerNight || parseFloat(formData.pricePerNight) <= 0) {
      newErrors.pricePerNight = '가격은 0보다 커야 합니다';
    }

    if (formData.contactEmail && !validateEmail(formData.contactEmail)) {
      newErrors.contactEmail = '올바른 이메일 형식이 아닙니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleRatingClick = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const hotelData: Partial<Hotel> = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      address: formData.address.trim(),
      rating: formData.rating,
      pricePerNight: parseFloat(formData.pricePerNight),
      currency: 'KRW',
      contactPhone: formData.contactPhone.trim(),
      contactEmail: formData.contactEmail.trim(),
      amenities: formData.amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0),
      images: hotel?.images || [],
      roomTypes: hotel?.roomTypes || [],
      checkInTime: hotel?.checkInTime || '15:00',
      checkOutTime: hotel?.checkOutTime || '11:00',
    };

    if (hotel) {
      hotelData.id = hotel.id;
    }

    await onSubmit(hotelData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {hotel ? '호텔 수정' : '새 호텔 등록'}
      </h2>

      <div className="space-y-4">
        {/* Hotel Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            호텔명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="예: 제주 그랜드 호텔"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            위치 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
              errors.location ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="예: 제주도 서귀포시"
            disabled={isLoading}
          />
          {errors.location && (
            <p className="text-red-500 text-sm mt-1">{errors.location}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            주소 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
              errors.address ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="예: 제주특별자치도 서귀포시 중문관광로 72번길 75"
            disabled={isLoading}
          />
          {errors.address && (
            <p className="text-red-500 text-sm mt-1">{errors.address}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            설명
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="호텔에 대한 설명을 입력하세요"
            disabled={isLoading}
          />
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            별점 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
                disabled={isLoading}
              >
                <Star
                  size={32}
                  fill={
                    star <= (hoverRating || formData.rating)
                      ? '#fbbf24'
                      : 'none'
                  }
                  className={
                    star <= (hoverRating || formData.rating)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }
                />
              </button>
            ))}
            <span className="ml-2 text-gray-600">
              {formData.rating > 0 ? `${formData.rating}.0` : '선택 안함'}
            </span>
          </div>
          {errors.rating && (
            <p className="text-red-500 text-sm mt-1">{errors.rating}</p>
          )}
        </div>

        {/* Price Per Night */}
        <div>
          <label
            htmlFor="pricePerNight"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            1박 가격 (원) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="pricePerNight"
            name="pricePerNight"
            value={formData.pricePerNight}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
              errors.pricePerNight ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="예: 250000"
            disabled={isLoading}
            min="0"
            step="1000"
          />
          {errors.pricePerNight && (
            <p className="text-red-500 text-sm mt-1">{errors.pricePerNight}</p>
          )}
        </div>

        {/* Contact Phone */}
        <div>
          <label
            htmlFor="contactPhone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            연락처
          </label>
          <input
            type="tel"
            id="contactPhone"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="예: +82-64-738-0000"
            disabled={isLoading}
          />
        </div>

        {/* Contact Email */}
        <div>
          <label
            htmlFor="contactEmail"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            이메일
          </label>
          <input
            type="email"
            id="contactEmail"
            name="contactEmail"
            value={formData.contactEmail}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
              errors.contactEmail ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="예: info@hotel.com"
            disabled={isLoading}
          />
          {errors.contactEmail && (
            <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>
          )}
        </div>

        {/* Amenities */}
        <div>
          <label
            htmlFor="amenities"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            편의시설
          </label>
          <input
            type="text"
            id="amenities"
            name="amenities"
            value={formData.amenities}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="쉼표로 구분하여 입력 (예: 무료 Wi-Fi, 수영장, 피트니스)"
            disabled={isLoading}
          />
          <p className="text-gray-500 text-sm mt-1">
            쉼표(,)로 구분하여 여러 편의시설을 입력하세요
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '저장 중...' : hotel ? '수정하기' : '등록하기'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          취소
        </button>
      </div>
    </form>
  );
};

export default HotelForm;
