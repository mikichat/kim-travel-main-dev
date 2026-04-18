'use client';

import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function AirBookingLayout({ children }: DashboardLayoutProps) {
  return (
    <div data-testid="air-booking-layout" className="flex h-screen bg-gray-100">
      <Sidebar className="flex-shrink-0" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main role="main" className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AirBookingLayout;
