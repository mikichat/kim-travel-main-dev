// PNR 변환기 — 4탭 통합 (변환기 | 저장된 항공편 | 버스예약 | 안내문)

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '../components/common/Toast';
import {
  loadAirportData,
  parseMultiplePnrInputs,
  getAirportName,
  getSegmentLabel,
  convertDate,
  convertDateISO,
  convertTime,
  type ParseResult,
} from '../services/pnr-parser';
import { MobileCard } from './pnr-converter/MobileCard';
import { SavedFlights } from './SavedFlights';
import { BusReservation } from './BusReservation';
import { TravelGuide } from './TravelGuide';
import { PnrDuplicateWarning } from '../components/shared/PnrDuplicateWarning';
import '../styles/pnr-converter.css';

// ─── 탭 정의 ───────────────────────────────────────────
const CONVERTER_TABS = [
  { id: 'converter', label: '변환기', icon: '⚡' },
  { id: 'saved', label: '저장된 항공편', icon: '💾' },
  { id: 'bus', label: '버스예약', icon: '🚌' },
  { id: 'notices', label: '안내문', icon: 'ℹ️' },
] as const;

type ConverterTabId = typeof CONVERTER_TABS[number]['id'];

// ─── Component ───────────────────────────────────────────

export function PnrConverter() {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mobileCardRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [allResults, setAllResults] = useState<ParseResult[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [converterTab, setConverterTab] = useState<ConverterTabId>('converter');
  const [duplicateWarning, setDuplicateWarning] = useState<{
    pnr: string;
    existingBooking?: { pnr: string; airline: string; flight_number: string; departure_date: string; source: string };
  } | null>(null);

  const handleConvert = async () => {
    const input = textareaRef.current?.value.trim();
    if (!input) {
      toast.error('PNR 텍스트를 입력해주세요.');
      return;
    }

    await loadAirportData();
    const results = parseMultiplePnrInputs(input);
    if (results.length === 0) {
      toast.error('항공편 정보를 파싱할 수 없습니다. 형식을 확인해주세요.');
      return;
    }
    setAllResults(results);
    setActiveTab(0);
    setResult(results[0]);
    const totalPax = results.reduce((s, r) => s + r.passengers.length, 0);
    const totalSegs = results[0].flights.length; // 공통 스케줄
    if (results.length > 1) {
      toast.success(`${results.length}개 PNR 파싱 완료 (${totalSegs}구간, 총 ${totalPax}명)`);
    } else {
      toast.success(`${totalSegs}개 구간, ${results[0].passengers.length}명 파싱 완료`);
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

    // PNR 중복 체크
    if (result.pnr) {
      try {
        const chkRes = await fetch(`/api/bookings/check-pnr/${encodeURIComponent(result.pnr)}`, { credentials: 'include' });
        const chkData = await chkRes.json();
        if (chkData.exists && chkData.booking) {
          setDuplicateWarning({
            pnr: result.pnr,
            existingBooking: {
              pnr: chkData.booking.pnr,
              airline: chkData.booking.airline || '',
              flight_number: chkData.booking.flight_number || '',
              departure_date: chkData.booking.departure_date || '',
              source: chkData.booking.source || 'air-booking',
            },
          });
          return; // 경고 표시 후 사용자 선택 대기
        }
      } catch { /* 체크 실패해도 저장 진행 */ }
    }

    await doSaveToDb();
  };

  const doSaveToDb = async () => {
    if (!result || result.flights.length === 0) return;
    setDuplicateWarning(null);
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
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) saved++;
      }
      toast.success(`${saved}개 항공 스케줄이 저장되었습니다.`);
    } catch {
      toast.error('스케줄 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // PNG Blob → 클립보드 복사
  const copyImageToClipboard = async (blob: Blob): Promise<boolean> => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    } catch {
      return false;
    }
  };

  // Blob 파일로 다운로드 (폴백)
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 결과 영역 이미지 복사 (단체/거래처용)
  const handleImageCopy = async () => {
    if (!resultsRef.current || !result) return;
    setImageLoading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('blob failed');

      const copied = await copyImageToClipboard(blob);
      if (copied) {
        toast.success('이미지가 클립보드에 복사되었습니다.\n카톡에서 Ctrl+V로 붙여넣으세요.');
      } else {
        const dateStr = new Date().toISOString().split('T')[0];
        downloadBlob(blob, `flight-schedule-${dateStr}.png`);
        toast.success('이미지가 저장되었습니다.');
      }
    } catch {
      toast.error('이미지 생성에 실패했습니다.');
    } finally {
      setImageLoading(false);
    }
  };

  // 모바일 카드 이미지 복사 (개인 고객 전송용)
  const handleMobileImageCopy = async () => {
    if (!mobileCardRef.current || !result) return;
    setImageLoading(true);

    // 모바일 카드 렌더링을 위해 잠시 보이게 함
    const card = mobileCardRef.current;
    card.style.display = 'block';

    try {
      // 폰트 로드 대기
      await document.fonts.ready;
      // 렌더링 완료 대기
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(card, {
        backgroundColor: '#F8FAFC',
        scale: 2,
        logging: false,
        useCORS: true,
        width: 430,
        windowWidth: 430,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('blob failed');

      const copied = await copyImageToClipboard(blob);
      if (copied) {
        toast.success('모바일 이미지가 클립보드에 복사되었습니다.\n카톡에서 Ctrl+V로 붙여넣으세요.');
      } else {
        const dateStr = new Date().toISOString().split('T')[0];
        downloadBlob(blob, `reservation-mobile-${dateStr}.png`);
        toast.success('모바일 이미지가 저장되었습니다.');
      }
    } catch {
      toast.error('모바일 이미지 생성에 실패했습니다.');
    } finally {
      card.style.display = 'none';
      setImageLoading(false);
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
      toast.success('클립보드에 복사되었습니다.');
    });
  };

  return (
    <div className="pnr-page">
      {/* 4탭 탭바 */}
      <div className="converter-tabs-bar" style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
        {CONVERTER_TABS.map(tab => (
          <button
            key={tab.id}
            className={`converter-tab-btn ${converterTab === tab.id ? 'active' : ''}`}
            onClick={() => setConverterTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: converterTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: '-2px',
              background: converterTab === tab.id ? '#eff6ff' : 'transparent',
              color: converterTab === tab.id ? '#2563eb' : '#64748b',
              fontWeight: converterTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 변환기 탭 */}
      {converterTab === 'converter' && <>
      <div className="pnr-input-section">
        <textarea
          ref={textareaRef}
          placeholder={`PNR 텍스트를 붙여넣기 하세요...\n\n예시:\n1 OZ 369T 14NOV 5 ICNCAN HK6 0820 1130\n2 OZ 370T 18NOV 2 CANICN HK6 1230 1640\n1.KIM/YONGKUMR\n2.LEE/HEERYANGMS`}
          aria-label="PNR 입력"
        />
        <div className="pnr-actions">
          <button className="pnr-convert-btn" onClick={handleConvert}>변환</button>
          <button className="pnr-clear-btn" onClick={handleClear}>초기화</button>
          {result && (
            <span className={`pnr-badge ${result.bookingType === 'group' ? 'pnr-badge-group' : 'pnr-badge-individual'}`}>
              {result.bookingType === 'group' ? '단체' : '개인'}
            </span>
          )}
        </div>
      </div>

      {!result ? (
        <div className="pnr-empty-hint">
          PNR 텍스트를 붙여넣고 "변환" 버튼을 클릭하세요.
          <code>{`1 OZ 369T 14NOV 5 ICNCAN HK6 0820 1130\n2 OZ 370T 18NOV 2 CANICN HK6 1230 1640\n1.KIM/YONGKUMR  2.LEE/HEERYANGMS`}</code>
        </div>
      ) : (
        <>
          <div className="pnr-results" ref={resultsRef}>
            {/* 다중 PNR 탭 */}
            {allResults.length > 1 && (
              <div className="pnr-result-card">
                <div className="pnr-multi-summary">
                  <strong>{allResults.length}개 PNR</strong> · 공통 스케줄 {allResults[0].flights.length}구간 · 총 {allResults.reduce((s, r) => s + r.passengers.length, 0)}명
                </div>
                <div className="pnr-tabs">
                  {allResults.map((r, i) => (
                    <button
                      key={i}
                      className={`pnr-tab ${activeTab === i ? 'active' : ''}`}
                      onClick={() => { setActiveTab(i); setResult(r); }}
                    >
                      {r.pnr || `PNR ${i + 1}`}
                      <span className="pnr-tab-pax">{r.passengers.length}명</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PNR 정보 */}
            {result.pnr && (
              <div className="pnr-result-card">
                <div className="pnr-info-row">
                  <span>예약번호: <strong>{result.pnr}</strong></span>
                  <span>구간: <strong>{result.flights.length}개</strong></span>
                  <span>승객: <strong>{result.passengers.length}명</strong></span>
                </div>
              </div>
            )}

            {/* 항공편 테이블 */}
            <div className="pnr-result-card">
              <h3>항공편 정보</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="pnr-flights-table">
                  <thead>
                    <tr>
                      <th>구간</th>
                      <th>날짜</th>
                      <th>출발</th>
                      <th>출발시간</th>
                      <th>도착</th>
                      <th>도착시간</th>
                      <th>편명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.flights.map((f, i) => {
                      const label = getSegmentLabel(i, result.flights.length);
                      const labelClass = label === '출발' ? 'pnr-segment-departure'
                        : label === '도착' ? 'pnr-segment-arrival' : 'pnr-segment-layover';
                      return (
                        <tr key={i}>
                          <td>
                            <span className={`pnr-segment-label ${labelClass}`}>{label}</span>
                          </td>
                          <td>{convertDate(f.date)}</td>
                          <td>
                            <span className="pnr-airport-code">{f.departure}</span>{' '}
                            {getAirportName(f.departure) !== f.departure && getAirportName(f.departure)}
                          </td>
                          <td>{convertTime(f.departureTime)}</td>
                          <td>
                            <span className="pnr-airport-code">{f.arrival}</span>{' '}
                            {getAirportName(f.arrival) !== f.arrival && getAirportName(f.arrival)}
                          </td>
                          <td>
                            {convertTime(f.arrivalTime)}
                            {f.arrivalDate && (
                              <div className="pnr-arrival-date-warn">
                                +1 ({convertDate(f.arrivalDate)})
                              </div>
                            )}
                          </td>
                          <td>{f.flightNumber}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 승객 명단 */}
            {result.passengers.length > 0 && (
              <div className="pnr-result-card">
                <h3>승객 명단 ({result.passengers.length}명)</h3>
                <div className="pnr-passengers-grid">
                  {result.passengers.map(p => (
                    <div key={p.index} className="pnr-passenger-item">
                      <span className="pnr-passenger-idx">{p.index}.</span>
                      <span className="pnr-passenger-name">{p.name}</span>
                      {p.title && <span className="pnr-passenger-title">{p.title}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PNR 중복 경고 */}
          {duplicateWarning && (
            <PnrDuplicateWarning
              pnr={duplicateWarning.pnr}
              existingBooking={duplicateWarning.existingBooking}
              onUpdate={() => { setDuplicateWarning(null); doSaveToDb(); }}
              onCreateNew={() => { setDuplicateWarning(null); doSaveToDb(); }}
              onViewExisting={() => { setDuplicateWarning(null); }}
              onCancel={() => setDuplicateWarning(null)}
            />
          )}

          {/* 저장 / 복사 / 이미지 */}
          <div className="pnr-save-section">
            <button className="pnr-copy-btn" onClick={handleCopyText}>텍스트 복사</button>
            <button className="pnr-image-btn" onClick={handleImageCopy} disabled={imageLoading}>
              {imageLoading ? '생성중...' : '이미지 복사'}
            </button>
            <button className="pnr-mobile-btn" onClick={handleMobileImageCopy} disabled={imageLoading}>
              {imageLoading ? '생성중...' : '모바일 전송'}
            </button>
            <button className="pnr-save-btn" onClick={handleSaveToDb} disabled={saving}>
              {saving ? '저장 중...' : '스케줄 저장'}
            </button>
          </div>

          {/* 모바일 카드 (숨김 — 캡처 전용) */}
          <div ref={mobileCardRef} style={{ display: 'none', position: 'fixed', left: '-9999px', top: 0 }}>
            <MobileCard result={result} />
          </div>
        </>
      )}
      </>}

      {/* 저장된 항공편 탭 */}
      {converterTab === 'saved' && (
        <SavedFlights onLoadToConverter={(pnrText) => {
          setConverterTab('converter');
          setTimeout(() => {
            if (textareaRef.current) textareaRef.current.value = pnrText;
          }, 100);
        }} />
      )}

      {/* 버스예약 탭 */}
      {converterTab === 'bus' && <BusReservation />}

      {/* 안내문 탭 */}
      {converterTab === 'notices' && <TravelGuide />}
    </div>
  );
}

