'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Hotel, Image } from 'lucide-react';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: '대시보드',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    to: '/itineraries',
    label: '일정표',
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    to: '/hotels',
    label: '호텔',
    icon: <Hotel className="w-5 h-5" />,
  },
  {
    to: '/images',
    label: '이미지',
    icon: <Image className="w-5 h-5" />,
  },
];

export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      className={`w-[240px] bg-gray-50 border-r border-gray-200 h-full ${className}`}
    >
      <ul className="flex flex-col p-4 gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          return (
            <li key={item.to}>
              <Link
                href={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Sidebar;