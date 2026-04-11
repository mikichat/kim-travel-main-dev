import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-700">
        404
      </h1>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-4">
        Page Not Found
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex space-x-4">
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </button>
      </div>
    </div>
  );
}
