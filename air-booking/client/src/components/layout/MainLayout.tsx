// @TASK P1-T1 - MainLayout 컴포넌트 (Sidebar + Header + main content 조합, 모바일 반응형)
// @TASK P2-T2 - 글로벌 키보드 단축키 + 단축키 도움말 모달
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KeyboardShortcutsHelp } from '../common/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import '../../styles/layout.css';

interface MainLayoutProps {
  title: string;
  userName: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export function MainLayout({ title, userName, onLogout, children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);
  const handleMenuToggle = useCallback(() => setMobileOpen((o) => !o), []);

  // 글로벌 단축키: Alt+1~7 네비게이션, ? 도움말
  useKeyboardShortcuts({
    'alt+1': () => navigate('/dashboard'),
    'alt+2': () => navigate('/bookings'),
    'alt+3': () => navigate('/calendar'),
    'alt+4': () => navigate('/settlements'),
    'alt+5': () => navigate('/customers'),
    'alt+6': () => navigate('/vendors'),
    'alt+7': () => navigate('/settings'),
    '?': () => setShortcutsHelpOpen((v) => !v),
  });

  return (
    <div className="app-shell">
      {/* 모바일 백드롭 */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={handleMobileClose}
          aria-hidden="true"
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      <div className="main-content-wrapper">
        <Header
          title={title}
          userName={userName}
          onLogout={onLogout}
          onMenuToggle={handleMenuToggle}
        />
        <main className="main-content" role="main">
          {children}
        </main>
      </div>

      <KeyboardShortcutsHelp
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />
    </div>
  );
}
