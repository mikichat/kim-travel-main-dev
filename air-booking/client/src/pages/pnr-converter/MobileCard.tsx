// MobileCard — 캡처 전용 모바일 예약 카드 (reservation.html 스타일)

import {
  getAirportName,
  getSegmentLabel,
  convertDate,
  convertTime,
  type ParseResult,
} from '../../services/pnr-parser';

export function MobileCard({ result }: { result: ParseResult }) {
  const card: React.CSSProperties = {
    width: 430,
    padding: '24px 16px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    background: '#F8FAFC',
    color: '#0f172a',
    fontSize: 14,
  };
  const section: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 12,
  };
  const flightRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  };
  const airportBig: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: -0.5,
  };
  const timeSm: React.CSSProperties = {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  };
  const flightNo: React.CSSProperties = {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center' as const,
  };
  const arrow: React.CSSProperties = {
    fontSize: 18,
    color: '#cbd5e1',
    margin: '0 8px',
  };

  return (
    <div style={card}>
      {/* PNR */}
      {result.pnr && (
        <div style={section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>예약번호</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#1a56a6', letterSpacing: 2 }}>{result.pnr}</span>
          </div>
        </div>
      )}

      {/* 항공편 */}
      <div style={section}>
        <div style={sectionTitle}>항공편 정보</div>
        {result.flights.map((f, i) => {
          const label = getSegmentLabel(i, result.flights.length);
          return (
            <div key={i} style={flightRow}>
              <div style={{ textAlign: 'center' as const }}>
                <div style={airportBig}>{f.departure}</div>
                <div style={timeSm}>{getAirportName(f.departure)}</div>
                <div style={timeSm}>{convertTime(f.departureTime)}</div>
              </div>
              <div style={{ textAlign: 'center' as const, flex: 1 }}>
                <div style={flightNo}>{f.flightNumber}</div>
                <div style={arrow}>→</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{convertDate(f.date)}</div>
                <div style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  marginTop: 4,
                  background: label === '출발' ? '#dbeafe' : label === '도착' ? '#fce7f3' : '#fef3c7',
                  color: label === '출발' ? '#1d4ed8' : label === '도착' ? '#be185d' : '#92400e',
                }}>{label}</div>
              </div>
              <div style={{ textAlign: 'center' as const }}>
                <div style={airportBig}>{f.arrival}</div>
                <div style={timeSm}>{getAirportName(f.arrival)}</div>
                <div style={timeSm}>{convertTime(f.arrivalTime)}</div>
                {f.arrivalDate && (
                  <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, marginTop: 2 }}>+1일</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 승객 명단 */}
      {result.passengers.length > 0 && (
        <div style={section}>
          <div style={sectionTitle}>승객 명단 ({result.passengers.length}명)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 13 }}>
            {result.passengers.map(p => (
              <div key={p.index} style={{ padding: '3px 0' }}>
                <span style={{ color: '#94a3b8', marginRight: 4 }}>{p.index}.</span>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
                {p.title && <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 4 }}>{p.title}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 브랜딩 */}
      <div style={{ textAlign: 'center' as const, fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
        여행세상 AirBook
      </div>
    </div>
  );
}
