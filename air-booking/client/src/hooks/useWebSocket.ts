// WebSocket 실시간 알림 훅

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AlertItem {
  type: string;
  date: string;
  label: string;
  read?: boolean;
  id?: string;
  receivedAt?: string;
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const host = window.location.hostname || 'localhost';
    const wsUrl = `ws://${host}:5510/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('[WS] 연결됨');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'deadline_alert' && data.items) {
            const newAlerts: AlertItem[] = data.items.map((item: any) => ({
              ...item,
              read: false,
              id: `${item.type}-${item.date}-${Date.now()}`,
              receivedAt: new Date().toISOString(),
            }));
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // 5초 후 재연결
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const markAsRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  }, []);

  const unreadCount = alerts.filter(a => !a.read).length;

  return { connected, alerts, unreadCount, markAsRead, markAllAsRead };
}
