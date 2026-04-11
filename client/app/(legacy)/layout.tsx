'use client';

import LegacyLayoutComponent from '@/layouts/LegacyLayout';

export default function LegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LegacyLayoutComponent>{children}</LegacyLayoutComponent>;
}
