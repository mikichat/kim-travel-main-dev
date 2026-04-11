import { Link } from 'react-router-dom';
import { Calendar, Users, TrendingUp, ArrowRight } from 'lucide-react';

export function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to TourWorld
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Manage your tours, customers, and bookings all in one place.
          Streamline your travel business operations.
        </p>
        <div className="mt-8">
          <Link
            to="/tours"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            View Tours
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<Calendar className="h-8 w-8 text-primary-600" />}
          title="Active Tours"
          value="12"
          description="Currently running"
        />
        <StatCard
          icon={<Users className="h-8 w-8 text-green-600" />}
          title="Total Customers"
          value="1,234"
          description="Registered users"
        />
        <StatCard
          icon={<TrendingUp className="h-8 w-8 text-purple-600" />}
          title="Bookings This Month"
          value="56"
          description="+12% from last month"
        />
      </section>

      {/* Quick Actions */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton to="/tours/new">Create Tour</QuickActionButton>
          <QuickActionButton to="/bookings/new">New Booking</QuickActionButton>
          <QuickActionButton to="/customers">View Customers</QuickActionButton>
          <QuickActionButton to="/reports">Generate Report</QuickActionButton>
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}

function StatCard({ icon, title, value, description }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
        {icon}
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  to: string;
  children: React.ReactNode;
}

function QuickActionButton({ to, children }: QuickActionButtonProps) {
  return (
    <Link
      to={to}
      className="p-4 text-center bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
    >
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {children}
      </span>
    </Link>
  );
}
