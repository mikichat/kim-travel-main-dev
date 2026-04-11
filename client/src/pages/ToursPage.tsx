import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import type { Tour } from '../types/shared';

export function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - will be replaced with API call
    const mockTours: Tour[] = [
      {
        id: '1',
        title: 'Paris Adventure',
        description: 'Explore the City of Light with our expert guides.',
        destination: 'Paris, France',
        duration: 7,
        price: 2500,
        currency: 'USD',
        maxParticipants: 20,
        status: 'published',
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-03-22'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Tokyo Experience',
        description: 'Discover the blend of traditional and modern Japan.',
        destination: 'Tokyo, Japan',
        duration: 10,
        price: 3500,
        currency: 'USD',
        maxParticipants: 15,
        status: 'published',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-11'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        title: 'Italian Getaway',
        description: 'Experience the beauty of Rome, Florence, and Venice.',
        destination: 'Italy',
        duration: 12,
        price: 4200,
        currency: 'USD',
        maxParticipants: 18,
        status: 'published',
        startDate: new Date('2024-05-10'),
        endDate: new Date('2024-05-22'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Simulate API call
    setTimeout(() => {
      setTours(mockTours);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tours
        </h1>
        <button className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors">
          Create Tour
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.map((tour) => (
          <TourCard key={tour.id} tour={tour} />
        ))}
      </div>
    </div>
  );
}

interface TourCardProps {
  tour: Tour;
}

function TourCard({ tour }: TourCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600"></div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {tour.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {tour.description}
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <MapPin className="h-4 w-4 mr-2" />
            {tour.destination}
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Clock className="h-4 w-4 mr-2" />
            {tour.duration} days
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Calendar className="h-4 w-4 mr-2" />
            {new Date(tour.startDate).toLocaleDateString()}
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Users className="h-4 w-4 mr-2" />
            Max {tour.maxParticipants} participants
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-xl font-bold text-primary-600">
            ${tour.price.toLocaleString()}
          </span>
          <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
