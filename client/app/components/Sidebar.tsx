'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Hotel,
  Image,
  Plane,
  Users,
  FileText,
  Calculator,
  Settings,
  Ticket,
  Clock,
  User,
  FileSpreadsheet,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  section?: 'dashboard' | 'air-booking' | 'group-roster' | 'legacy';
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const dashboardNavItems: NavItem[] = [
  { to: '/dashboard', label: '대시보드', icon: <LayoutDashboard className="w-5 h-5" /> },
  { to: '/itineraries', label: '일정표', icon: <Calendar className="w-5 h-5" /> },
  { to: '/hotels', label: '호텔', icon: <Hotel className="w-5 h-5" /> },
  { to: '/images', label: '이미지', icon: <Image className="w-5 h-5" /> },
];

const airBookingNavItems: NavItem[] = [
  { to: '/dashboard', label: '대시보드', icon: <LayoutDashboard className="w-5 h-5" /> },
  { to: '/bookings', label: '예약장부', icon: <FileText className="w-5 h-5" /> },
  { to: '/calendar', label: '달력', icon: <Calendar className="w-5 h-5" /> },
  { to: '/groups', label: '단체 상품', icon: <Users className="w-5 h-5" /> },
  { to: '/flight-schedules', label: '항공 스케줄', icon: <Plane className="w-5 h-5" /> },
  { to: '/customers', label: '고객 관리', icon: <User className="w-5 h-5" /> },
  { to: '/invoices', label: '인보이스', icon: <FileText className="w-5 h-5" /> },
  { to: '/settlements', label: '정산', icon: <Calculator className="w-5 h-5" /> },
  { to: '/vendors', label: '거래처', icon: <Users className="w-5 h-5" /> },
  { to: '/cost-calculations', label: '원가 계산서', icon: <Calculator className="w-5 h-5" /> },
  { to: '/fare-certificates', label: '증명서', icon: <Ticket className="w-5 h-5" /> },
  { to: '/estimate-editor', label: '견적서 편집', icon: <FileText className="w-5 h-5" /> },
  { to: '/pnr-converter', label: 'PNR 변환', icon: <Clock className="w-5 h-5" /> },
  { to: '/settings', label: '설정', icon: <Settings className="w-5 h-5" /> },
];

const groupRosterNavItems: NavItem[] = [
  { to: '/groups', label: '그룹 관리', icon: <Users className="w-5 h-5" /> },
  { to: '/members', label: '멤버 관리', icon: <User className="w-5 h-5" /> },
];

const legacyNavItems: NavItem[] = [
  { to: '/group-list', label: '상품/단체 목록', icon: <FileSpreadsheet className="w-5 h-5" /> },
  { to: '/group-form', label: '상품 생성/수정', icon: <FileText className="w-5 h-5" /> },
  { to: '/group-dashboard', label: '단체 상세', icon: <LayoutDashboard className="w-5 h-5" /> },
  { to: '/itinerary', label: '일정 관리', icon: <Calendar className="w-5 h-5" /> },
  { to: '/flight-schedule', label: '항공 스케줄', icon: <Plane className="w-5 h-5" /> },
  { to: '/cost-calculator', label: '원가 계산', icon: <Calculator className="w-5 h-5" /> },
];

const getNavItems = (section: string): NavItem[] => {
  switch (section) {
    case 'air-booking':
      return airBookingNavItems;
    case 'group-roster':
      return groupRosterNavItems;
    case 'legacy':
      return legacyNavItems;
    default:
      return dashboardNavItems;
  }
};

export function Sidebar({ className = '', section = 'dashboard' }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(section);

  return (
    <nav
      role="navigation"
      className={`w-[240px] bg-gray-50 border-r border-gray-200 h-full ${className}`}
    >
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">
          {section === 'air-booking' && '항공 예약'}
          {section === 'group-roster' && '단체 명단'}
          {section === 'legacy' && 'Legacy'}
          {section === 'dashboard' && 'TourWorld'}
        </h2>
      </div>
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