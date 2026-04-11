// Header 컴포넌트 + 알림 벨
import { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useToast } from '../common/Toast';
import '../../styles/layout.css';

interface HeaderProps {
  title: string;
  userName: string;
  onLogout: () => void;
  onMenuToggle?: () => void;
}

export function Header({ title, userName, onLogout, onMenuToggle }: HeaderProps) {
  const { alerts, unreadCount, markAsRead, markAllAsRead, connected } = useWebSocket();
  const { toast } = useToast();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(0);

  // 새 알림 수신 시 토스트 표시
  useEffect(() => {
    if (unreadCount > prevUnread.current && prevUnread.current >= 0) {
      const newest = alerts.find(a => !a.read);
      if (newest) {
        toast.warning(`[${newest.type}] ${newest.label}`);
      }
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="header" role="banner">
      <div className="header-left">
        {onMenuToggle && (
          <button className="header-hamburger" onClick={onMenuToggle} type="button" aria-label="메뉴 열기" aria-haspopup="true">
            ☰
          </button>
        )}
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* 알림 벨 */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setBellOpen(!bellOpen)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px',
              position: 'relative', padding: '4px 8px',
              animation: unreadCount > 0 ? 'bellShake 0.5s ease' : 'none',
            }}
            title={connected ? `알림 (${unreadCount}건)` : '알림 서버 연결 중...'}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '0', right: '2px',
                background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 700,
                borderRadius: '50%', width: '18px', height: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* 알림 드롭다운 */}
          {bellOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: '0', width: '320px',
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 1000,
              maxHeight: '400px', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '14px' }}>알림</strong>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
                    모두 읽음
                  </button>
                )}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {alerts.length === 0 ? (
                  <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    알림이 없습니다.
                  </div>
                ) : alerts.slice(0, 20).map(alert => (
                  <div
                    key={alert.id}
                    onClick={() => alert.id && markAsRead(alert.id)}
                    style={{
                      padding: '10px 16px', borderBottom: '1px solid #f1f5f9',
                      background: alert.read ? '#fff' : '#eff6ff', cursor: 'pointer',
                      fontSize: '12px', transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: alert.read ? 400 : 600, color: '#1e293b' }}>
                        [{alert.type}] {alert.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                      {alert.date} · {alert.receivedAt ? new Date(alert.receivedAt).toLocaleTimeString('ko-KR') : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="header-user">{userName}</span>
        <button className="header-logout-btn" onClick={onLogout} type="button" aria-label="로그아웃">
          로그아웃
        </button>
      </div>
    </header>
  );
}
