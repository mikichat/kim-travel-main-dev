'use client';

import TourworldLayoutComponent from '@/layouts/TourworldLayout';

export default function DashboardLayoutRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TourworldLayoutComponent>{children}</TourworldLayoutComponent>;
}