# WebSocket 실시간 알림 사양

## 목표
기존 node-cron 스케줄러(이메일 전용)에 WebSocket 알림 추가.
브라우저에서 마감일(NMTL/TL/BSP/출발) 임박 시 실시간 토스트 + 알림 벨.

## 아키텍처
```
[스케줄러 cron] → 마감일 감지 → ws.send(알림)
                                    ↓
[브라우저] ← WebSocket 연결 ← Express 서버
         → 토스트 표시 + 벨 아이콘 배지
```

## Backend
- Express 서버에 ws(WebSocket) 라이브러리 추가
- HTTP 서버에 WebSocket 업그레이드 연결
- 스케줄러에서 마감일 감지 시 연결된 모든 클라이언트에 broadcast
- 메시지 형식: `{ type: 'deadline_alert', items: [...] }`

## Frontend
- Header에 알림 벨 아이콘 추가 (읽지 않은 알림 카운트 배지)
- WebSocket 연결 훅 (useWebSocket)
- 알림 수신 시 토스트 자동 표시
- 알림 목록 드롭다운 (벨 클릭 시)

## API
- ws://192.168.0.15:5510 (Express 서버와 같은 포트)
- 기존 API는 변경 없음
