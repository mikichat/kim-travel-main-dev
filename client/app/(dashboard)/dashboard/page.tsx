'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [user] = useState({ name: 'User', email: '' });

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout API errors
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="bg-white rounded-xl shadow p-6 mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </header>

        <main className="bg-white rounded-xl shadow p-6">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-2">Welcome, {user.name}!</h2>
            <p className="opacity-90">Email: {user.email}</p>
            <p className="mt-4 text-sm opacity-80">You are now logged in.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
