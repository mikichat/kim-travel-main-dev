import { Outlet, Link } from 'react-router-dom';
import { Home, Map, Calendar, Users, Settings } from 'lucide-react';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Map className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                TourWorld
              </span>
            </Link>
            <nav className="hidden md:flex space-x-8">
              <NavLink to="/" icon={<Home className="h-4 w-4" />}>
                Home
              </NavLink>
              <NavLink to="/tours" icon={<Calendar className="h-4 w-4" />}>
                Tours
              </NavLink>
              <NavLink to="/customers" icon={<Users className="h-4 w-4" />}>
                Customers
              </NavLink>
              <NavLink to="/settings" icon={<Settings className="h-4 w-4" />}>
                Settings
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} TourWorld. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function NavLink({ to, icon, children }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
