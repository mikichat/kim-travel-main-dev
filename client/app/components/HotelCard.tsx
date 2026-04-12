import React from 'react';
import { MapPin, Star, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import type { Hotel } from '../mocks/data/hotels';

interface HotelCardProps {
  hotel: Hotel;
  onEdit?: (hotel: Hotel) => void;
  onDelete?: (hotel: Hotel) => void;
  onClick?: (hotel: Hotel) => void;
}

/**
 * Hotel Card Component
 * Displays hotel information in a card format
 */
const HotelCard: React.FC<HotelCardProps> = ({
  hotel,
  onEdit,
  onDelete,
  onClick,
}) => {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(hotel);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(hotel);
  };

  const handleClick = () => {
    onClick?.(hotel);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency === 'KRW' ? 'KRW' : 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Hotel Image */}
      {hotel.images && hotel.images.length > 0 ? (
        <div className="h-48 bg-gray-200 overflow-hidden">
          <img
            src={hotel.images[0]}
            alt={hotel.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src =
                'https://dummyimage.com/400x300?text=Hotel+Image';
            }}
          />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white text-4xl font-bold">
            {hotel.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Hotel Info */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {hotel.name}
            </h3>
            <div className="flex items-center gap-1 text-yellow-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < Math.floor(hotel.rating ?? 0) ? 'currentColor' : 'none'}
                  className={
                    i < Math.floor(hotel.rating ?? 0)
                      ? 'text-yellow-500'
                      : 'text-gray-300'
                  }
                />
              ))}
              <span className="text-sm text-gray-600 ml-1">
                {(hotel.rating ?? 0).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                aria-label="호텔 수정"
              >
                <Edit size={18} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                aria-label="호텔 삭제"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <MapPin size={16} />
          <span className="text-sm">{hotel.location}</span>
        </div>

        {/* Description */}
        <p className="text-gray-700 text-sm mb-3 line-clamp-2">
          {hotel.description}
        </p>

        {/* Amenities */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {hotel.amenities.slice(0, 3).map((amenity, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
              >
                {amenity}
              </span>
            ))}
            {hotel.amenities.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                +{hotel.amenities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="border-t pt-3 mt-3 space-y-1">
          {hotel.contactPhone && (
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Phone size={14} />
              <span>{hotel.contactPhone}</span>
            </div>
          )}
          {hotel.contactEmail && (
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Mail size={14} />
              <span>{hotel.contactEmail}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">1박 기준</span>
            <span className="text-xl font-bold text-blue-600">
              {formatPrice(hotel.pricePerNight ?? 0, hotel.currency || 'KRW')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
