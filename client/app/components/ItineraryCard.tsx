import React from 'react';
import type { Tour } from '@tourworld/shared';
import { formatDate } from '../utils/date';

interface ItineraryCardProps {
  tour: Tour;
  onClick?: (tour: Tour) => void;
}

/**
 * Card component to display tour/itinerary summary
 */
export const ItineraryCard: React.FC<ItineraryCardProps> = ({
  tour,
  onClick,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(tour);
    }
  };

  const statusColors: Record<string, string> = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const statusText: Record<string, string> = {
    published: 'Published',
    draft: 'Draft',
    archived: 'Archived',
  };

  const statusIconClass =
    tour.status === 'published'
      ? 'h-2 w-2 rounded-full bg-green-500'
      : 'h-2 w-2 rounded-full bg-yellow-500 border border-yellow-600';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer p-6 border border-gray-200"
    >
      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
        {tour.title}
      </h3>

      {/* Destination */}
      <p className="text-gray-600 mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="line-clamp-1">{tour.destination}</span>
      </p>

      {/* Date Range */}
      <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>
          {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
        </span>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            statusColors[tour.status]
          }`}
        >
          <span className={statusIconClass}></span>
          {statusText[tour.status]}
        </div>

        {/* Duration */}
        <div className="text-sm text-gray-500">
          {tour.duration}박 {tour.duration + 1}일
        </div>
      </div>
    </div>
  );
};

export default ItineraryCard;
