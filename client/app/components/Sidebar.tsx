'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  TicketCheck,
  Bus,
  FileCheck,
  CreditCard,
  Bell,
  MapPin,
  NotebookPen,
  PlaneTakeoff,
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

interface MenuSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
}

// TourWorld Main Menu
const dashboardNavItems: NavItem[] = [
  { to: '/dashboard', label: '대시보드', icon: <LayoutDashboard className="w-5 h-5" /> },
  { to: '/itineraries', label: '일정표', icon: <Calendar className="w-5 h-5" /> },
  { to: '/hotels', label: '호텔', icon: <Hotel className="w-5 h-5" /> },
  { to: '/images', label: '이미지', icon: <Image className="w-5 h-5" /> },
];

// Air Booking Menu
const airBookingNavItems: NavItem[] = [
  { to: '/air-dashboard', label: '항공 대시보드', icon: <LayoutDashboard className="w-5 h-5" /> },
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
  { to: '/estimate-editor', label: '견적서 편집', icon: <NotebookPen className="w-5 h-5" /> },
  { to: '/delivery-claim-editor', label: '납품 청구서', icon: <FileCheck className="w-5 h-5" /> },
  { to: '/domestic-estimate-editor', label: '국내 견적서', icon: <FileText className="w-5 h-5" /> },
  { to: '/bus-reservation', label: '버스 예약', icon: <Bus className="w-5 h-5" /> },
  { to: '/reservation-card', label: '예약 카드', icon: <TicketCheck className="w-5 h-5" /> },
  { to: '/saved-flights', label: '저장된航班', icon: <PlaneTakeoff className="w-5 h-5" /> },
  { to: '/travel-guide', label: '여행 가이드', icon: <MapPin className="w-5 h-5" /> },
  { to: '/notices', label: '공지사항', icon: <Bell className="w-5 h-5" /> },
  { to: '/pnr-converter', label: 'PNR 변환', icon: <Clock className="w-5 h-5" /> },
  { to: '/settings', label: '설정', icon: <Settings className="w-5 h-5" /> },
];

// Group Roster Menu
const groupRosterNavItems: NavItem[] = [
  { to: '/groups', label: '그룹 관리', icon: <Users className="w-5 h-5" /> },
  { to: '/members', label: '멤버 관리', icon: <User className="w-5 h-5" /> },
];

// Legacy Menu
const legacyNavItems: NavItem[] = [
  { to: '/group-list', label: '상품/단체 목록', icon: <FileSpreadsheet className="w-5 h-5" /> },
  { to: '/group-form', label: '상품 생성/수정', icon: <FileText className="w-5 h-5" /> },
  { to: '/group-dashboard', label: '단체 상세', icon: <LayoutDashboard className="w-5 h-5" /> },
  { to: '/itinerary', label: '일정 관리', icon: <Calendar className="w-5 h-5" /> },
  { to: '/flight-schedule', label: '항공 스케줄', icon: <Plane className="w-5 h-5" /> },
  { to: '/cost-calculator', label: '원가 계산', icon: <Calculator className="w-5 h-5" /> },
];

// All Menu Sections for Main Layout
const allMenuSections: MenuSection[] = [
  {
    id: 'main',
    title: 'TourWorld',
    icon: <LayoutDashboard className="w-5 h-5" />,
    items: dashboardNavItems,
  },
  {
    id: 'air-booking',
    title: '항공 예약',
    icon: <Plane className="w-5 h-5" />,
    items: airBookingNavItems,
  },
  {
    id: 'group-roster',
    title: '단체 명단',
    icon: <Users className="w-5 h-5" />,
    items: groupRosterNavItems,
  },
  {
    id: 'legacy',
    title: 'Legacy',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    items: legacyNavItems,
  },
];

export function Sidebar({ className = '', section = 'dashboard' }: SidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(['main', 'air-booking', 'group-roster', 'legacy']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Get current section based on pathname
  const getCurrentSection = () => {
    if (pathname.startsWith('/air-booking')) return 'air-booking';
    if (pathname.startsWith('/group-roster')) return 'group-roster';
    if (pathname.startsWith('/legacy')) return 'legacy';
    return 'main';
  };

  const currentSection = getCurrentSection();
  const navItems = allMenuSections.find((s) => s.id === currentSection)?.items || dashboardNavItems;

  return (
    <nav
      role="navigation"
      className={`w-[260px] bg-gray-50 border-r border-gray-200 h-full flex flex-col ${className}`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="font-bold text-xl text-blue-600">TourWorld</h1>
        <p className="text-xs text-gray-500 mt-1">여행사 업무 관리 시스템</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        {allMenuSections.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const isActive = currentSection === section.id;
          const hasActiveItem = section.items.some((item) => pathname === item.to);

          return (
            <div key={section.id} className="mb-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive || hasActiveItem
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  {section.icon}
                  {section.title}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Section Items */}
              {isExpanded && (
                <ul className="mt-1 ml-2 pl-2 border-l border-gray-200 space-y-0.5">
                  {section.items.map((item) => {
                    const isItemActive = pathname === item.to;
                    return (
                      <li key={item.to}>
                        <Link
                          href={item.to}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            isItemActive
                              ? 'bg-blue-500 text-white font-medium'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 text-xs text-gray-400 text-center">
        TourWorld v1.0
      </div>
    </nav>
  );
}

export default Sidebar;