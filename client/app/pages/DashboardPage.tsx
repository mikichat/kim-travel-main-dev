import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useUser } from '../stores/authStore';
import { logout as logoutApi } from '../api/auth';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore logout API errors
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </header>

        <main className="dashboard-content">
          <div className="welcome-card">
            <h2>Welcome, {user?.name || 'User'}!</h2>
            <p>Email: {user?.email}</p>
            <p>You are now logged in.</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
