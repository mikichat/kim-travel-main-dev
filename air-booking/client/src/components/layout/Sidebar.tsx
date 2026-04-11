// @TASK P1-T1 - Sidebar 컴포넌트 (240px / 64px 축소, 모바일 오버레이 지원)
import { NavLink } from 'react-router-dom';
import '../../styles/layout.css';

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: '대시보드', path: '/dashboard' },
  { label: '예약장부', path: '/bookings' },
  { label: '달력', path: '/calendar' },
  { label: '단체 상품', path: '/groups' },
  { label: '항공 스케줄', path: '/flight-schedules' },
  { label: 'PNR 변환기', path: '/converter' },
  { label: '원가 계산서', path: '/cost-calculations' },
  { label: '인보이스', path: '/invoices' },
  { label: '견적서/내역서', path: '/estimate-editor' },
  { label: '증명서 관리', path: '/fare-certificates' },
  { label: '정산 관리', path: '/settlements' },
  { label: '고객 관리', path: '/customers' },
  { label: '거래처 관리', path: '/vendors' },
  { label: '설정', path: '/settings' },
];

const INTRANET_ITEMS: { label: string; url: string }[] = [];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const handleNavClick = () => {
    // 모바일에서 메뉴 항목 클릭 시 사이드바 닫기
    if (onMobileClose) onMobileClose();
  };

  return (
    <aside
      className={[
        'sidebar',
        collapsed ? 'sidebar-collapsed' : '',
        mobileOpen ? 'sidebar-mobile-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="사이드바"
    >
      <div className="sidebar-header">
        <span className="sidebar-brand" aria-hidden={collapsed}>
          AirBook
        </span>
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? '사이드바 확장' : '사이드바 축소'}
          type="button"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="주 메뉴">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' active' : ''}`
            }
            onClick={handleNavClick}
          >
            <span className="sidebar-nav-label">{item.label}</span>
          </NavLink>
        ))}

        <div className="sidebar-divider" />
        {!collapsed && <div className="sidebar-section-label">인트라넷</div>}

        {INTRANET_ITEMS.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-nav-item"
            onClick={handleNavClick}
          >
            <span className="sidebar-nav-label">{item.label}</span>
            <span className="sidebar-external-icon">↗</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
