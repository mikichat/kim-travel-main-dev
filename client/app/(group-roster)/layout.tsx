'use client';

import GroupRosterLayoutComponent from '@/layouts/GroupRosterLayout';

export default function GroupRosterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GroupRosterLayoutComponent>{children}</GroupRosterLayoutComponent>;
}
