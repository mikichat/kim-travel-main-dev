// 내부 포털 — Legacy migration from frontend

'use client';

import { useState, useEffect } from 'react';

interface ServerStatus {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
}

const SERVER_IP = typeof window !== 'undefined' ? (window.location.hostname || '192.168.0.15') : '192.168.0.15';

const INITIAL_SERVERS: ServerStatus[] = [
  { id: 'main', name: 'TourWorld Main', desc: '여행 상품 관리 시스템', url: `http://${SERVER_IP}:5001`, icon: 'blue', routes: [
    { label: '메인 화면', href: `http://${SERVER_IP}:5001`, icon: '🏠' },
    { label: '로그인', href: `http://${SERVER_IP}:5001/login.html`, icon: '🔑' },
  ]},
  { id: 'landing', name: 'TourWorld Landing', desc: '여행 랜딩 페이지', url: `http://${SERVER_IP}:5505`, icon: 'green', routes: [
    { label: '랜딩 페이지', href: `http://${SERVER_IP}:4005`, icon: '🌍' },
    { label: 'API 서버', href: `http://${SERVER_IP}:5505`, icon: '⚡' },
  ]},
  { id: 'air', name: 'Air Booking', desc: '항공 예약 관리 시스템', url: `http://${SERVER_IP}:5510`, icon: 'amber', routes: [
    { label: '예약 관리', href: `http://${SERVER_IP}:5174`, icon: '✈️' },
    { label: '납품/청구서 에디터', href: `http://${SERVER_IP}:5174/delivery-claim-editor.html`, icon: '📄' },
    { label: '견적서 에디터', href: `http://${SERVER_IP}:5174/estimate-editor.html`, icon: '📋' },
    { label: '국내 내역서 에디터', href: `http://${SERVER_IP}:5174/domestic-editor.html`, icon: '🗺️' },
    { label: 'API 상태 확인', href: `http://${SERVER_IP}:5510/api/health`, icon: '💚' },
  ]},
];

const ICON_COLORS: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  green: 'bg-gradient-to-br from-green-500 to-green-600',
  amber: 'bg-gradient-to-br from-amber-500 to-amber-600',
};

export default function PortalPage() {
  const [servers, setServers] = useState<ServerStatus[]>(INITIAL_SERVERS);

  useEffect(() => {
    async function checkStatus() {
      const updated = await Promise.all(
        INITIAL_SERVERS.map(async (server) => {
          try {
            await fetch(server.url + '/favicon.ico', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
            return { ...server, status: 'online' as const };
          } catch {
            return { ...server, status: 'offline' as const };
          }
        })
      );
      setServers(updated);
    }
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#0f1923' }}>
      {/* 헤더 */}
      <div className="px-10 py-8 border-b" style={{ background: 'linear-gradient(135deg, #1a2a3a 0%, #0d1b2a 100%)', borderColor: '#1e3a5f' }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              <span className="text-blue-400">여행세상</span> 내부 포털
            </h1>
            <p className="text-gray-400 text-sm mt-1">Travel World Internal Portal</p>
          </div>
          <div className="px-4 py-2 rounded-full text-sm" style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', color: '#4a9eff' }}>
            {SERVER_IP}
          </div>
        </div>
      </div>

      {/* 메인 */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <div key={server.id} className="rounded-2xl overflow-hidden" style={{ background: '#151f2b', border: '1px solid #1e3a5f' }}>
              <div className="p-6 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${ICON_COLORS[server.icon]} flex items-center justify-center text-white font-bold text-lg`}>
                  {server.id === 'main' ? 'TW' : server.id === 'landing' ? 'LD' : 'AB'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white">{server.name}</div>
                  <div className="text-sm text-gray-400">{server.desc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-green-500 animate-pulse' : server.status === 'checking' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-400">
                    {server.status === 'online' ? 'Online' : server.status === 'checking' ? '확인중...' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {server.id === 'main' && (
                    <span className="px-2 py-1 rounded text-xs" style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', color: '#6a8aaa' }}>Mac <b className="text-blue-400">:5001</b></span>
                  )}
                  {server.id === 'landing' && (
                    <>
                      <span className="px-2 py-1 rounded text-xs" style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', color: '#6a8aaa' }}>클라이언트 <b className="text-blue-400">:4005</b></span>
                      <span className="px-2 py-1 rounded text-xs" style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', color: '#6a8aaa' }}>서버 <b className="text-blue-400">:5505</b></span>
                    </>
                  )}
                  {server.id === 'air' && (
                    <>
                      <span className="px-2 py-1 rounded text-xs" style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', color: '#6a8aaa' }}>클라이언트 <b className="text-blue-400">:5174</b></span>
                      <span className="px-2 py-1 rounded text-xs" style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', color: '#6a8aaa' }}>서버 <b className="text-blue-400">:5510</b></span>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {server.routes.map((route, i) => (
                    <a
                      key={i}
                      href={route.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                      style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', color: '#c0d0e0', textDecoration: 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#1a2a3a'; e.currentTarget.style.borderColor = '#4a9eff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#0d1b2a'; e.currentTarget.style.borderColor = '#1e3a5f'; }}
                    >
                      <span>{route.icon}</span>
                      <span className="flex-1 text-sm font-medium">{route.label}</span>
                      <span className="text-blue-400">→</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 푸터 */}
      <div className="text-center py-8 text-gray-500 text-xs">
        (주)여행세상 내부 포털 · {SERVER_IP}:8080 · 2026
      </div>
    </div>
  );
}
