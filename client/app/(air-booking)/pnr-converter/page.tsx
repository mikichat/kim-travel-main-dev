// PNR 변환기 — Legacy migration from air-booking
// 4탭 통합 (변환기 | 저장된 항공편 | 버스예약 | 안내문)

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const CONVERTER_TABS = [
  { id: 'converter', label: '변환기', icon: '⚡' },
  { id: 'saved', label: '저장된 항공편', icon: '💾' },
  { id: 'bus', label: '버스예약', icon: '🚌' },
  { id: 'notices', label: '안내문', icon: 'ℹ️' },
] as const;

type ConverterTabId = typeof CONVERTER_TABS[number]['id'];

interface FlightSegment {
  departure: string;
  departureTime: string;
  arrival: string;
  arrivalTime: string;
  arrivalDate?: string;
  date: string;
  flightNumber: string;
}

interface Passenger {
  index: number;
  name: string;
  title: string;
}

interface ParseResult {
  pnr?: string;
  flights: FlightSegment[];
  passengers: Passenger[];
  bookingType: 'group' | 'individual';
}

const AIRPORT_DATA: Record<string, string> = {};

function loadAirportDataSync() {
  // Minimal airport data for common Korean routes
  const data: Record<string, string> = {
    'ICN': '인천', 'GMP': '김포', 'CJU': '제주', 'PUS': '부산',
    'TAE': '대구', 'KWJ': '광주', 'RSJ': '사우산', 'USN': '울산',
    'HND': '도쿄(하네다)', 'NRT': '도쿄(나리타)', 'KIX': '오사카(간사)',
    'FUK': '후쿠오카', 'OKA': '오키나와', 'NGO': '나고야',
    'PEK': '베이징', 'PVG': '상하이', 'CAN': '광저우',
    'HKG': '홍콩', 'TPE': '타이베이', 'MNL': '마닐라',
    'SIN': '싱가포르', 'BKK': '방콕', 'KUL': '쿠알라룸푸르',
    'SGN': '호치민', 'HAN': '하노이', 'DAD': '다낭',
    'SYD': '시드니', 'MEL': '멜버른', 'AKL': '오클랜드',
    'LAX': '로스앤젤레스', 'SFO': '샌프란시스코', 'SEA': '시애틀',
    'JFK': '뉴욕', 'ORD': '시카고', 'YYZ': '토론토',
    'LHR': '런던', 'CDG': '파리', 'FRA': '프랑크푸르트',
    'AMS': '암스테르담', 'MOW': '모스크바', 'DXB': '두바이',
  };
  Object.assign(AIRPORT_DATA, data);
}

function getAirportName(code: string): string {
  return AIRPORT_DATA[code] || code;
}

function getSegmentLabel(index: number, total: number): string {
  if (total === 1) return '편도';
  if (index === 0) return '출발';
  if (index === total - 1) return '도착';
  return `${index + 1}구간`;
}

function convertDate(dateStr: string): string {
  if (!dateStr) return '';
  const months: Record<string, string> = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12',
  };
  const match = dateStr.match(/(\d{1,2})([A-Z]{3})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2].toUpperCase()] || '01';
    return `${month}/${day}`;
  }
  return dateStr;
}

function convertTime(timeStr: string): string {
  if (!timeStr) return '';
  const match = timeStr.match(/(\d{2})(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  return timeStr;
}

function convertDateISO(dateStr: string): string {
  if (!dateStr) return '';
  const months: Record<string, string> = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12',
  };
  const match = dateStr.match(/(\d{1,2})([A-Z]{3})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2].toUpperCase()] || '01';
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

function parsePnrLine(line: string): FlightSegment | null {
  // Format: 1 OZ 369T 14NOV 5 ICNCAN HK6 0820 1130
  const regex = /^\d+\s+([A-Z]{2})\s+(\d+[A-Z]?)\s+(\d{1,2}[A-Z]{3})\s+\d+\s+([A-Z]{6})\s+[A-Z0-9]+\s+(\d{4})\s+(\d{4})/i;
  const match = line.match(regex);
  if (!match) return null;

  return {
    departure: match[4].substring(0, 3),
    arrival: match[4].substring(3, 6),
    date: match[3],
    flightNumber: `${match[1]} ${match[2]}`,
    departureTime: match[5],
    arrivalTime: match[6],
  };
}

function parsePassengerLine(line: string): Passenger | null {
  // Format: 1.KIM/YONGKUMR or 1.KIM/YONGKUMRMR
  const regex = /^\d+\.([A-Z]+)\/([A-Z]+)([A-Z]+)?$/i;
  const match = line.match(regex);
  if (!match) return null;

  return {
    index: parseInt(line),
    name: `${match[2]}/${match[1]}`,
    title: match[3] || '',
  };
}

function parseMultiplePnrInputs(input: string): ParseResult[] {
  loadAirportDataSync();
  const lines = input.trim().split('\n');
  const results: ParseResult[] = [];
  let currentResult: ParseResult | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if it's a passenger line
    if (/^\d+\.[A-Z]+\//i.test(trimmed)) {
      const passenger = parsePassengerLine(trimmed);
      if (passenger && currentResult) {
        currentResult.passengers.push(passenger);
        continue;
      }
    }

    // Check if it's a flight line
    const flight = parsePnrLine(trimmed);
    if (flight) {
      if (!currentResult) {
        currentResult = { flights: [], passengers: [], bookingType: 'individual' };
      }
      currentResult.flights.push(flight);
      currentResult.bookingType = flight.flightNumber.startsWith('OZ') || flight.flightNumber.startsWith('KE') ? 'group' : 'individual';
      continue;
    }

    // New PNR block
    if (/^\d+\s+[A-Z]{2}\s+\d/.test(trimmed) === false && /^\d+\.[A-Z]+\//.test(trimmed) === false) {
      if (currentResult && currentResult.flights.length > 0) {
        results.push(currentResult);
      }
      currentResult = { flights: [], passengers: [], bookingType: 'individual' };
    }
  }

  if (currentResult && currentResult.flights.length > 0) {
    results.push(currentResult);
  }

  return results;
}

export default function PnrConverterPage() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [allResults, setAllResults] = useState<ParseResult[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [converterTab, setConverterTab] = useState<ConverterTabId>('converter');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadAirportDataSync();
  }, []);

  const handleConvert = async () => {
    const input = textareaRef.current?.value.trim();
    if (!input) {
      showToast('PNR 텍스트를 입력해주세요.', 'error');
      return;
    }

    const results = parseMultiplePnrInputs(input);
    if (results.length === 0) {
      showToast('항공편 정보를 파싱할 수 없습니다. 형식을 확인해주세요.', 'error');
      return;
    }
    setAllResults(results);
    setActiveTab(0);
    setResult(results[0]);
    const totalPax = results.reduce((s, r) => s + r.passengers.length, 0);
    const totalSegs = results[0].flights.length;
    if (results.length > 1) {
      showToast(`${results.length}개 PNR 파싱 완료 (${totalSegs}구간, 총 ${totalPax}명)`);
    } else {
      showToast(`${totalSegs}개 구간, ${results[0].passengers.length}명 파싱 완료`);
    }
  };

  const handleClear = () => {
    if (textareaRef.current) textareaRef.current.value = '';
    setResult(null);
    setAllResults([]);
    setActiveTab(0);
  };

  const handleSaveToDb = async () => {
    if (!result || result.flights.length === 0) return;
    setSaving(true);
    try {
      let saved = 0;
      for (const seg of result.flights) {
        const dateISO = convertDateISO(seg.date);
        const arrDateISO = seg.arrivalDate ? convertDateISO(seg.arrivalDate) : dateISO;
        const body = {
          group_name: '',
          airline: seg.flightNumber.split(' ')[0] || '',
          flight_number: seg.flightNumber.replace(/\s+/g, '') || undefined,
          departure_date: dateISO,
          departure_airport: seg.departure,
          departure_time: convertTime(seg.departureTime),
          arrival_date: arrDateISO,
          arrival_airport: seg.arrival,
          arrival_time: convertTime(seg.arrivalTime),
          passengers: result.passengers.length || 0,
        };
        if (!body.airline || !body.departure_date || !body.departure_airport) continue;
        const res = await fetch('/api/flight-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) saved++;
      }
      showToast(`${saved}개 항공 스케줄이 저장되었습니다.`);
    } catch {
      showToast('스케줄 저장에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyText = () => {
    if (!result) return;
    const lines: string[] = [];

    if (result.pnr) lines.push(`예약번호: ${result.pnr}`);
    lines.push('');

    result.flights.forEach((f, i) => {
      const label = getSegmentLabel(i, result.flights.length);
      const date = convertDate(f.date);
      const dep = getAirportName(f.departure);
      const arr = getAirportName(f.arrival);
      lines.push(`${label} : ${date} - ${dep}: ${convertTime(f.departureTime)} - ${arr}: ${convertTime(f.arrivalTime)} - ${f.flightNumber}`);
      if (f.arrivalDate) {
        lines.push(`  [도착일: ${convertDate(f.arrivalDate)}]`);
      }
    });

    if (result.passengers.length > 0) {
      lines.push('');
      lines.push('승객 명단:');
      result.passengers.forEach(p => {
        lines.push(`${p.index}. ${p.name} ${p.title}`);
      });
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      showToast('클립보드에 복사되었습니다.');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* 4탭 탭바 */}
        <div className="flex gap-0 border-b-2 border-gray-200 mb-4 bg-white rounded-t-lg">
          {CONVERTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setConverterTab(tab.id)}
              className={`px-5 py-2.5 border-b-2 text-sm cursor-pointer transition-all ${
                converterTab === tab.id
                  ? 'border-blue-500 bg-blue-50 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 변환기 탭 */}
        {converterTab === 'converter' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <textarea
                ref={textareaRef}
                placeholder={`PNR 텍스트를 붙여넣기 하세요...\n\n예시:\n1 OZ 369T 14NOV 5 ICNCAN HK6 0820 1130\n2 OZ 370T 18NOV 2 CANICN HK6 1230 1640\n1.KIM/YONGKUMR\n2.LEE/HEERYANGMS`}
                className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={handleConvert} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">변환</button>
                <button onClick={handleClear} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">초기화</button>
                {result && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium self-center ${
                    result.bookingType === 'group' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {result.bookingType === 'group' ? '단체' : '개인'}
                  </span>
                )}
              </div>
            </div>

            {!result ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">⚡</div>
                <p>PNR 텍스트를 붙여넣고 &quot;변환&quot; 버튼을 클릭하세요.</p>
                <code className="block mt-4 p-3 bg-gray-100 rounded text-xs text-left">
                  1 OZ 369T 14NOV 5 ICNCAN HK6 0820 1130<br/>
                  2 OZ 370T 18NOV 2 CANICN HK6 1230 1640<br/>
                  1.KIM/YONGKUMR  2.LEE/HEERYANGMS
                </code>
              </div>
            ) : (
              <div>
                {/* 다중 PNR 탭 */}
                {allResults.length > 1 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="mb-2 text-sm font-medium">
                      <strong>{allResults.length}개 PNR</strong> · 공통 스케줄 {allResults[0].flights.length}구간 · 총 {allResults.reduce((s, r) => s + r.passengers.length, 0)}명
                    </div>
                    <div className="flex gap-2">
                      {allResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => { setActiveTab(i); setResult(r); }}
                          className={`px-3 py-1 rounded text-xs ${activeTab === i ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'}`}
                        >
                          {r.pnr || `PNR ${i + 1}`} ({r.passengers.length}명)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* PNR 정보 */}
                {result.pnr && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <span>예약번호: <strong>{result.pnr}</strong></span>
                    <span className="ml-4">구간: <strong>{result.flights.length}개</strong></span>
                    <span className="ml-4">승객: <strong>{result.passengers.length}명</strong></span>
                  </div>
                )}

                {/* 항공편 테이블 */}
                <div className="mb-4 overflow-x-auto">
                  <h3 className="text-sm font-semibold mb-2">항공편 정보</h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left border">구간</th>
                        <th className="p-2 text-left border">날짜</th>
                        <th className="p-2 text-left border">출발</th>
                        <th className="p-2 text-left border">시간</th>
                        <th className="p-2 text-left border">도착</th>
                        <th className="p-2 text-left border">시간</th>
                        <th className="p-2 text-left border">편명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.flights.map((f, i) => {
                        const label = getSegmentLabel(i, result.flights.length);
                        const labelClass = label === '출발' ? 'bg-green-100 text-green-700'
                          : label === '도착' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
                        return (
                          <tr key={i}>
                            <td className="p-2 border"><span className={`px-2 py-0.5 rounded text-xs font-medium ${labelClass}`}>{label}</span></td>
                            <td className="p-2 border">{convertDate(f.date)}</td>
                            <td className="p-2 border">
                              <span className="font-mono font-semibold">{f.departure}</span>{' '}
                              {getAirportName(f.departure)}
                            </td>
                            <td className="p-2 border">{convertTime(f.departureTime)}</td>
                            <td className="p-2 border">
                              <span className="font-mono font-semibold">{f.arrival}</span>{' '}
                              {getAirportName(f.arrival)}
                            </td>
                            <td className="p-2 border">
                              {convertTime(f.arrivalTime)}
                              {f.arrivalDate && (
                                <div className="text-xs text-orange-600">+1 ({convertDate(f.arrivalDate)})</div>
                              )}
                            </td>
                            <td className="p-2 border font-mono">{f.flightNumber}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 승객 명단 */}
                {result.passengers.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2">승객 명단 ({result.passengers.length}명)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {result.passengers.map(p => (
                        <div key={p.index} className="p-2 bg-gray-50 rounded flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-500">{p.index}.</span>
                          <span className="font-medium">{p.name}</span>
                          {p.title && <span className="text-gray-400 text-xs">{p.title}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 저장 / 복사 */}
                <div className="flex gap-2 pt-4 border-t">
                  <button onClick={handleCopyText} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">📋 텍스트 복사</button>
                  <button onClick={handleSaveToDb} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    {saving ? '저장 중...' : '💾 스케줄 저장'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 저장된 항공편 탭 */}
        {converterTab === 'saved' && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
            <div className="text-4xl mb-4">💾</div>
            <p>저장된 항공편 기능은 준비 중입니다.</p>
          </div>
        )}

        {/* 버스예약 탭 */}
        {converterTab === 'bus' && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
            <div className="text-4xl mb-4">🚌</div>
            <p>버스 예약 기능은 준비 중입니다.</p>
          </div>
        )}

        {/* 안내문 탭 */}
        {converterTab === 'notices' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">여행 안내문</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">✈️ 여객 안내</h4>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>도착 공항에서 입국 심사 시 여권을 제시하세요.</li>
                  <li>수하물 규정: 좌ekt별 23kg 2개 또는 32kg 1개</li>
                  <li>液体(100ml 이상)은 수하물로 전달하세요.</li>
                </ul>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">🛂 입국 심사</h4>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>입국 심사대에서 도착 항공기에서 받은 입국 卡을 작성하세요.</li>
                  <li>체류 기간은 여권 上的入境심사年月日부터 자동 계산됩니다.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
