// WebSocket 실시간 알림 서비스

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] 클라이언트 연결 (총 ${clients.size}명)`);

    // 연결 확인 메시지
    ws.send(JSON.stringify({ type: 'connected', message: '알림 서버 연결됨' }));

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] 클라이언트 해제 (총 ${clients.size}명)`);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  console.log('[WS] WebSocket 서버 시작 (path: /ws)');
}

export function broadcastAlert(data: {
  type: string;
  items: { type: string; date: string; label: string }[];
}): void {
  if (!wss || clients.size === 0) return;

  const message = JSON.stringify(data);
  let sent = 0;
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  }
  if (sent > 0) {
    console.log(`[WS] 알림 브로드캐스트: ${data.items.length}건 → ${sent}명`);
  }
}

export function getConnectedCount(): number {
  return clients.size;
}
