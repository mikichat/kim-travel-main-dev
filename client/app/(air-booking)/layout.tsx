'use client';

import AirBookingLayoutComponent from '@/layouts/AirBookingLayout';

export default function AirBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AirBookingLayoutComponent>{children}</AirBookingLayoutComponent>;
}
