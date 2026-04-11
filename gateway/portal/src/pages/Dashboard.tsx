import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

interface SystemCard {
  key: string;       // permission key
  title: string;
  subtitle: string;
  description: string;
  url: string;
  icon: string;
  color: string;
}

const SYSTEMS: SystemCard[] = [
  {
    key: 'main',
    title: '여행상품 관리',
    subtitle: 'MAIN',
    description: '패키지 여행 상품 등록, 예약 조회 및 고객 관리',
    url: 'http://localhost:5000',
    icon: '🗺️',
    color: '#2563EB',
  },
  {
    key: 'air',
    title: '항공 예약 관리',
    subtitle: 'AIR',
    description: '항공권 발권, 스케줄 조회 및 예약 현황 관리',
    url: 'http://localhost:5173',
    icon: '✈️',
    color: '#0891B2',
  },
  {
    key: 'landing',
    title: '브로슈어 관리',
    subtitle: 'LANDING',
    description: '온라인 브로슈어 편집 및 랜딩 페이지 콘텐츠 관리',
    url: 'http://localhost:4005',
    icon: '📄',
    color: '#7C3AED',
  },
];

export default function Dashboard() {
  const { user, logout } = useAuth();

  function hasAccess(key: string): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perms = user.permissions[key] || [];
    return perms.length > 0;
  }

  const accessible = SYSTEMS.filter(s => hasAccess(s.key));
  const locked = SYSTEMS.filter(s => !hasAccess(s.key));

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="header-icon">✈</span>
            <span className="header-title">여행세상</span>
          </div>
          <div className="header-right">
            {user?.role === 'admin' && (
              <Link to="/admin" className="btn-ghost">
                사용자 관리
              </Link>
            )}
            <span className={`badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-staff'}`}>
              {user?.role === 'admin' ? '관리자' : '직원'}
            </span>
            <span className="header-name">{user?.name}</span>
            <button onClick={logout} className="btn-outline">로그아웃</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="main">
        <div className="welcome">
          <h2 className="welcome-heading">
            안녕하세요, <strong>{user?.name}</strong>님
          </h2>
          <p className="welcome-sub">접근 가능한 시스템을 선택하세요.</p>
        </div>

        {accessible.length > 0 && (
          <section className="section">
            <div className="cards">
              {accessible.map(sys => (
                <div key={sys.key} className="card">
                  <div className="card-header">
                    <span className="card-icon" style={{ background: sys.color + '18' }}>
                      {sys.icon}
                    </span>
                    <span className="card-badge" style={{ color: sys.color, background: sys.color + '14' }}>
                      {sys.subtitle}
                    </span>
                  </div>
                  <h3 className="card-title">{sys.title}</h3>
                  <p className="card-desc">{sys.description}</p>
                  <a
                    href={sys.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ background: sys.color }}
                  >
                    열기
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {locked.length > 0 && (
          <section className="section">
            <h3 className="section-label">접근 권한 없음</h3>
            <div className="cards cards-locked">
              {locked.map(sys => (
                <div key={sys.key} className="card card-locked">
                  <div className="card-header">
                    <span className="card-icon card-icon-locked">{sys.icon}</span>
                    <span className="card-badge card-badge-locked">{sys.subtitle}</span>
                  </div>
                  <h3 className="card-title card-title-locked">{sys.title}</h3>
                  <p className="card-desc">{sys.description}</p>
                  <button className="btn-disabled" disabled>권한 없음</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {accessible.length === 0 && locked.length === SYSTEMS.length && (
          <div className="empty-state">
            <p>접근 가능한 시스템이 없습니다. 관리자에게 권한을 요청하세요.</p>
          </div>
        )}
      </main>
    </div>
  );
}
