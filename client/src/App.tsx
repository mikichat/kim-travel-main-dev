import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ItineraryListPage from './pages/ItineraryListPage';
import ItineraryEditorPage from './pages/ItineraryEditorPage';
import HotelListPage from './pages/HotelListPage';
import HotelFormPage from './pages/HotelFormPage';
import GalleryPage from './pages/GalleryPage';
import ProtectedRoute from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import './App.css';

// NOTE: Registration is disabled for single-user system.
// Admin user is created via seed script on backend.

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with DashboardLayout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/itineraries" element={<ItineraryListPage />} />
          <Route
            path="/itineraries/:id/edit"
            element={<ItineraryEditorPage />}
          />
          <Route path="/hotels" element={<HotelListPage />} />
          <Route path="/hotels/new" element={<HotelFormPage />} />
          <Route path="/hotels/:id/edit" element={<HotelFormPage />} />
          <Route path="/images" element={<GalleryPage />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
