// AI 여행 안내문 생성기 — 브로슈어 연동, 일정표, 이미지 복사

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

// html2canvas는 동적으로 import
let html2canvas: typeof import('html2canvas').default | null = null;
if (typeof window !== 'undefined') {
  import('html2canvas').then(m => { html2canvas = m.default; });
}

interface GuideContent {
  weather: string;
  outfit: string[];
  checklist: { category: string; items: string[] }[];
  currency: string;
  timezone: string;
  voltage: string;
}

interface Segment {
  airline: string | null;
  flight_number: string | null;
  route_from: string | null;
  route_to: string | null;
  departure_date: string | null;
  departure_time: string | null;
  arrival_time: string | null;
}

interface SavedFlight {
  id: string;
  pnr: string;
  airline: string;
  flight_number: string;
  route_from: string;
  route_to: string;
  departure_date: string;
  return_date: string;
  name_kr: string;
  pax_count: number;
  agency: string;
  source: string;
  segments?: Segment[];
}

interface SavedGuide {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  departure_place: string;
  departure_time: string;
  expenses: string;
  flight_info: string;
  guide_data: string;
  created_at: string;
  updated_at: string;
}

interface BrochureItem {
  id: string;
  customerName: string;
  destination: string;
  period: string;
  mainImageUrl: string | null;
  metadata: any;
}

interface ItineraryScheduleItem {
  time: string;
  location: string;
  transport: string;
  content: string;
  meal: string;
  image?: string;
}

interface ItineraryDay {
  dayNumber: number;
  date: string;
  weekday: string;
  regions: string;
  schedule: ItineraryScheduleItem[];
  meals: { breakfast: string; lunch: string; dinner: string };
  images?: { url: string }[];
}

interface SectionToggles {
  weather: boolean;
  checklist: boolean;
  currency: boolean;
  luggage: boolean;
}

const LANDING_API = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3505`;

const COLORS = {
  bg: '#FAFAF5',
  text: '#2D2D2D',
  navy: '#1B3A5C',
  gold: '#C8A45E',
  burgundy: '#8B2252',
  card: '#FFFFFF',
  cardShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

const labelStyle = 'block text-xs font-semibold text-gray-500 mb-1';
const inputStyle = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function btnStyle(bg: string, color: string) {
  return {
    padding: '6px 12px',
    background: bg,
    color,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer' as const,
    fontSize: '13px',
    fontWeight: 500,
  };
}

function LandingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: COLORS.card,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '12px',
      boxShadow: COLORS.cardShadow,
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: 700,
        color: COLORS.navy,
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `2px solid ${COLORS.gold}`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', fontSize: '14px', marginBottom: '6px', lineHeight: 1.6,
      ...(highlight ? { background: '#FFF5F5', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${COLORS.burgundy}20` } : {}),
    }}>
      <span style={{ fontWeight: 600, color: highlight ? COLORS.burgundy : COLORS.navy, minWidth: '80px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: COLORS.text, fontWeight: highlight ? 700 : 400 }}>{value}</span>
    </div>
  );
}

export default function TravelGuidePage() {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departurePlace, setDeparturePlace] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [gatheringTime, setGatheringTime] = useState('');
  const [airportMeeter, setAirportMeeter] = useState('');
  const [showAirportMeeter, setShowAirportMeeter] = useState(false);
  const [expenses, setExpenses] = useState('');
  const [flightInfo, setFlightInfo] = useState('');
  const [flightInfoReturn, setFlightInfoReturn] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [guideName, setGuideName] = useState('');
  const [guideContact, setGuideContact] = useState('');
  const [importantNotes, setImportantNotes] = useState('');

  const [guide, setGuide] = useState<GuideContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const [toggles, setToggles] = useState<SectionToggles>({
    weather: true,
    checklist: true,
    currency: true,
    luggage: true,
  });

  const [editableGuide, setEditableGuide] = useState<GuideContent | null>(null);

  const [brochureModalOpen, setBrochureModalOpen] = useState(false);
  const [brochures, setBrochures] = useState<BrochureItem[]>([]);
  const [brochuresLoading, setBrochuresLoading] = useState(false);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);
  const [editableItinerary, setEditableItinerary] = useState<ItineraryDay[]>([]);

  const scheduleRef = useRef<HTMLDivElement>(null);
  const [scheduleImageLoading, setScheduleImageLoading] = useState(false);

  const [flightModalOpen, setFlightModalOpen] = useState(false);
  const [flights, setFlights] = useState<SavedFlight[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(false);

  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const [savedList, setSavedList] = useState<SavedGuide[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (guide) setEditableGuide(JSON.parse(JSON.stringify(guide)));
  }, [guide]);

  const displayGuide = editableGuide || guide;
  const displayItinerary = editableItinerary.length > 0 ? editableItinerary : itineraryDays;

  const handleLoadFlights = useCallback(async () => {
    setFlightModalOpen(true);
    setFlightsLoading(true);
    try {
      const res = await fetch('/api/bookings?sort=created_at&order=desc&limit=100', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setFlights(data.data.bookings || []);
    } catch { showToast('저장된 항공편 조회 실패', 'error'); }
    finally { setFlightsLoading(false); }
  }, []);

  const handleSelectFlight = async (flight: SavedFlight) => {
    const segs = flight.segments || [];
    const firstSeg = segs[0];
    const lastSeg = segs.length > 1 ? segs[segs.length - 1] : null;

    const depFrom = firstSeg?.route_from || flight.route_from || '';
    const depTo = firstSeg?.route_to || flight.route_to || '';
    const depFn = (firstSeg?.flight_number || flight.flight_number || '').replace(/\s+/g, '');
    const depTime = firstSeg?.departure_time || '';
    const arrTime = firstSeg?.arrival_time || '';

    setDestination(depTo);
    setStartDate(flight.departure_date || firstSeg?.departure_date || '');
    if (flight.return_date) setEndDate(flight.return_date);

    if (depTime && arrTime) {
      setFlightInfo(`${depFn} ${depFrom}${depTime} ~ ${depTo}${arrTime}`);
    } else {
      setFlightInfo(`${depFn} ${depFrom} → ${depTo}`);
    }

    if (lastSeg) {
      const retDepTime = lastSeg.departure_time || '';
      const retArrTime = lastSeg.arrival_time || '';
      const retFn = (lastSeg.flight_number || '').replace(/\s+/g, '');
      const retFrom = lastSeg.route_from || '';
      const retTo = lastSeg.route_to || '';
      if (retDepTime && retArrTime) {
        setFlightInfoReturn(`${retFn} ${retFrom}${retDepTime} ~ ${retTo}${retArrTime}`);
      } else {
        setFlightInfoReturn(`${retFn} ${retFrom} → ${retTo}`);
      }
      if (!flight.return_date && lastSeg.departure_date) setEndDate(lastSeg.departure_date);
    }

    setFlightModalOpen(false);
    showToast(`${flight.agency || flight.name_kr || ''} 항공편이 입력되었습니다.`);
  };

  const handleGenerate = async () => {
    if (!destination || !startDate || !endDate) {
      showToast('여행지, 시작일, 종료일을 입력해주세요.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/travel-guides/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ destination, start_date: startDate, end_date: endDate, departure_place: departurePlace, departure_time: departureTime, expenses, flight_info: flightInfo }),
      });
      const data = await res.json();
      if (data.success) {
        setGuide(data.data.guide);
        showToast('안내문이 생성되었습니다.');
      } else {
        showToast(data.error || '생성 실패', 'error');
      }
    } catch { showToast('서버 연결 실패', 'error'); }
    finally { setLoading(false); }
  };

  const resolveImageUrl = (src: string) => {
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('http')) return src;
    return `${LANDING_API}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const convertImagesToBase64 = async (container: HTMLElement) => {
    const imgs = container.querySelectorAll('img');
    for (const img of Array.from(imgs)) {
      if (img.src.startsWith('data:')) continue;
      try {
        const res = await fetch(img.src, { mode: 'cors' });
        const blob = await res.blob();
        const base64 = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        img.src = base64;
      } catch { /* ignore */ }
    }
  };

  const handleImageCopy = async () => {
    if (!previewRef.current || !html2canvas) { showToast('이미지 생성 준비 중...', 'warning'); return; }
    setImageLoading(true);
    try {
      await document.fonts.ready;
      await convertImagesToBase64(previewRef.current);
      await new Promise(r => setTimeout(r, 300));
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: COLORS.bg,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 448,
        windowWidth: 448,
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('blob failed');

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('이미지가 클립보드에 복사되었습니다.');
      } catch {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `travel-guide-${destination}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('이미지가 다운로드되었습니다.');
      }
    } catch { showToast('이미지 생성에 실패했습니다.', 'error'); }
    finally { setImageLoading(false); }
  };

  const handleToggle = (key: keyof SectionToggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEditField = (field: keyof GuideContent, value: any) => {
    if (!editableGuide) return;
    setEditableGuide({ ...editableGuide, [field]: value });
  };

  const handleSave = async () => {
    if (!displayGuide && displayItinerary.length === 0) {
      showToast('안내문 또는 일정표를 먼저 생성해주세요.', 'warning');
      return;
    }
    try {
      const saveData = {
        guide: displayGuide,
        itinerary: displayItinerary.length > 0 ? displayItinerary : undefined,
        heroImageUrl: heroImageUrl || undefined,
        flightInfoReturn: flightInfoReturn || undefined,
        gatheringTime: gatheringTime || undefined,
        airportMeeter: showAirportMeeter ? airportMeeter : undefined,
      };
      const res = await fetch('/api/travel-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          destination, start_date: startDate, end_date: endDate,
          departure_place: departurePlace, departure_time: departureTime,
          expenses, flight_info: flightInfo,
          guide_data: JSON.stringify(saveData),
        }),
      });
      const data = await res.json();
      if (data.success) showToast('안내문이 저장되었습니다.');
      else showToast(data.error || '저장 실패', 'error');
    } catch { showToast('저장 실패', 'error'); }
  };

  const handleLoadSaved = async () => {
    setSavedModalOpen(true);
    setSavedLoading(true);
    try {
      const res = await fetch('/api/travel-guides', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSavedList(data.data.items || []);
    } catch { showToast('저장된 안내문 조회 실패', 'error'); }
    finally { setSavedLoading(false); }
  };

  const handleSelectSaved = (item: SavedGuide) => {
    setDestination(item.destination);
    setStartDate(item.start_date);
    setEndDate(item.end_date);
    setDeparturePlace(item.departure_place);
    setDepartureTime(item.departure_time);
    setExpenses(item.expenses);
    setFlightInfo(item.flight_info);
    try {
      const parsed = JSON.parse(item.guide_data);
      if (parsed && parsed.guide) {
        setGuide(parsed.guide);
        if (parsed.itinerary) {
          setItineraryDays(parsed.itinerary);
          setEditableItinerary(JSON.parse(JSON.stringify(parsed.itinerary)));
        }
        if (parsed.heroImageUrl) setHeroImageUrl(parsed.heroImageUrl);
        if (parsed.flightInfoReturn) setFlightInfoReturn(parsed.flightInfoReturn);
        if (parsed.gatheringTime) setGatheringTime(parsed.gatheringTime);
        if (parsed.airportMeeter) {
          setAirportMeeter(parsed.airportMeeter);
          setShowAirportMeeter(true);
        }
      } else {
        setGuide(parsed);
      }
    } catch { setGuide(null); }
    setSavedModalOpen(false);
    showToast('안내문을 불러왔습니다.');
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      const res = await fetch(`/api/travel-guides/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        showToast('삭제되었습니다.');
        setSavedList(prev => prev.filter(i => i.id !== id));
      }
    } catch { showToast('삭제 실패', 'error'); }
  };

  const handleLoadBrochures = async () => {
    setBrochureModalOpen(true);
    setBrochuresLoading(true);
    try {
      const res = await fetch(`${LANDING_API}/api/brochures`, { mode: 'cors' });
      const data = await res.json();
      if (Array.isArray(data)) {
        const light = data.map((b: any) => ({
          id: b.id,
          customerName: b.customerName,
          destination: b.destination,
          period: b.period,
          mainImageUrl: b.mainImageUrl,
          metadata: { itineraryDays: b.metadata?.itineraryDays ? { length: b.metadata.itineraryDays.length } : null },
        }));
        setBrochures(light);
      }
    } catch { showToast('Landing 서버 연결 실패. 서버가 실행 중인지 확인하세요.', 'error'); }
    finally { setBrochuresLoading(false); }
  };

  const handleSelectBrochure = async (brochure: BrochureItem) => {
    setBrochureModalOpen(false);
    showToast('브로슈어 로딩 중...');
    let meta: any = {};
    try {
      const res = await fetch(`${LANDING_API}/api/brochures/${brochure.id}`, { mode: 'cors' });
      const detail = await res.json();
      const rawMeta = detail.metadata;
      meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : (rawMeta || {});
    } catch { showToast('브로슈어 상세 로드 실패', 'error'); return; }

    setDestination(brochure.destination || '');
    const periodStr = brochure.period || '';
    const m = periodStr.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+~\D*(\d{1,2})?\D*(\d{1,2})?/);
    if (m) {
      const year = m[1];
      const sm = m[2].padStart(2, '0');
      const sd = m[3].padStart(2, '0');
      const em = m[4] ? m[4].padStart(2, '0') : sm;
      const ed = m[5] ? m[5].padStart(2, '0') : sd;
      setStartDate(`${year}-${sm}-${sd}`);
      setEndDate(`${year}-${em}-${ed}`);
    }

    const days: ItineraryDay[] = meta.itineraryDays || [];
    setItineraryDays(days);
    setEditableItinerary(JSON.parse(JSON.stringify(days)));

    if (days.length > 0) {
      const firstDay = days[0];
      const firstItem = firstDay.schedule?.[0];
      if (firstItem) {
        setDeparturePlace(firstItem.location || '');
        setGatheringTime(firstItem.time || '');
      }
      setFlightInfo('');
      setFlightInfoReturn('');
    }

    if (meta.mainImage) setHeroImageUrl(meta.mainImage);
    if (meta.quotation) {
      const q = meta.quotation;
      setExpenses(q.price || q.totalPrice || '');
    }

    showToast(`"${brochure.customerName} | ${brochure.destination}" 브로슈어가 로드되었습니다.`);
  };

  const handleScheduleImageCopy = async () => {
    if (!scheduleRef.current || !html2canvas) { showToast('이미지 생성 준비 중...', 'warning'); return; }
    setScheduleImageLoading(true);
    try {
      await document.fonts.ready;
      await convertImagesToBase64(scheduleRef.current);
      await new Promise(r => setTimeout(r, 300));
      const canvas = await html2canvas(scheduleRef.current, {
        backgroundColor: COLORS.bg,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 448,
        windowWidth: 448,
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('blob failed');
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('일정표 이미지가 클립보드에 복사되었습니다.');
      } catch {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `schedule-${destination || 'itinerary'}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('일정표 이미지가 저장되었습니다.');
      }
    } catch { showToast('일정표 이미지 생성 실패', 'error'); }
    finally { setScheduleImageLoading(false); }
  };

  const handleItineraryEdit = (dayIdx: number, schedIdx: number, field: 'content' | 'time' | 'transport' | 'location', value: string) => {
    setEditableItinerary(prev => {
      const next = [...prev];
      const day = { ...next[dayIdx], schedule: [...next[dayIdx].schedule] };
      day.schedule[schedIdx] = { ...day.schedule[schedIdx], [field]: value };
      next[dayIdx] = day;
      return next;
    });
  };

  const handleItineraryMealsEdit = (dayIdx: number, value: string) => {
    setEditableItinerary(prev => {
      const next = [...prev];
      const parts = value.split('/').map(s => s.trim());
      const meals = { breakfast: '', lunch: '', dinner: '' };
      for (const p of parts) {
        if (p.startsWith('조:')) meals.breakfast = p.slice(2);
        else if (p.startsWith('중:')) meals.lunch = p.slice(2);
        else if (p.startsWith('석:')) meals.dinner = p.slice(2);
      }
      next[dayIdx] = { ...next[dayIdx], meals };
      return next;
    });
  };

  const formatMeals = (meals: ItineraryDay['meals']) => {
    if (!meals) return '';
    const parts: string[] = [];
    if (meals.breakfast) parts.push(`조:${meals.breakfast}`);
    if (meals.lunch) parts.push(`중:${meals.lunch}`);
    if (meals.dinner) parts.push(`석:${meals.dinner}`);
    return parts.join(' / ');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${weekdays[d.getDay()]})`;
  };

  const getDays = () => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' :
          toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* 입력 영역 */}
      <div className="bg-white rounded-xl p-5 mb-4 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">여행 안내문 생성</h3>
          <div className="flex gap-2">
            <button onClick={handleLoadBrochures} style={btnStyle('#1B3A5C', '#fff')}>브로슈어 불러오기</button>
            <button onClick={handleLoadSaved} style={btnStyle('#f1f5f9', '#475569')}>저장된 안내문</button>
            <button onClick={handleLoadFlights} style={btnStyle('#eff6ff', '#2563eb')}>항공편</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className={labelStyle}>여행지 *</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="예: 일본 오사카, 베트남 다낭" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>시작일 *</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>종료일 *</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>출발편</label>
            <input value={flightInfo} onChange={e => setFlightInfo(e.target.value)} placeholder="예: KE115 인천(ICN)09:25 ~ 연길(YNJ)10:50" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>귀국편</label>
            <input value={flightInfoReturn} onChange={e => setFlightInfoReturn(e.target.value)} placeholder="예: KE116 연길(YNJ)11:50 ~ 인천(ICN)14:30" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>집합 장소</label>
            <input value={departurePlace} onChange={e => setDeparturePlace(e.target.value)} placeholder="예: 함열스포츠센터, 인천공항 3층" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>집합 시간</label>
            <input value={gatheringTime} onChange={e => setGatheringTime(e.target.value)} placeholder="예: 02:00" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>경비</label>
            <input value={expenses} onChange={e => setExpenses(e.target.value)} placeholder="예: 1인 150만원" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>공항 미팅자</label>
            <input value={airportMeeter} onChange={e => setAirportMeeter(e.target.value)} placeholder="예: 김국진 (010-1234-5678)" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>현지 가이드 이름</label>
            <input value={guideName} onChange={e => setGuideName(e.target.value)} placeholder="예: 홍길동" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>현지 가이드 연락처</label>
            <input value={guideContact} onChange={e => setGuideContact(e.target.value)} placeholder="예: +86-138-1234-5678" className={inputStyle} />
          </div>
          <div className="md:col-span-2">
            <label className={labelStyle}>중요사항</label>
            <textarea
              value={importantNotes}
              onChange={e => setImportantNotes(e.target.value)}
              placeholder="여러 줄 입력 가능"
              className={inputStyle}
              style={{ minHeight: '60px', resize: 'vertical' }}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelStyle}>헤드 배경 이미지</label>
            <div className="flex gap-2">
              <button onClick={() => heroFileRef.current?.click()} style={btnStyle('#eff6ff', '#2563eb')}>이미지 선택</button>
              {heroImageUrl && (
                <button onClick={() => { setHeroImageUrl(''); if (heroFileRef.current) heroFileRef.current.value = ''; }} style={btnStyle('#fee2e2', '#dc2626')}>삭제</button>
              )}
            </div>
            <input ref={heroFileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setHeroImageUrl(reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
            {heroImageUrl && <img src={heroImageUrl} alt="미리보기" className="mt-2 rounded-lg h-16 object-cover w-full" />}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={handleGenerate} style={{ ...btnStyle('#1B3A5C', '#fff'), padding: '10px 24px', fontSize: '14px', fontWeight: 600 }}>
            AI 안내문 생성
          </button>
          {displayGuide && (
            <>
              <button onClick={handleImageCopy} disabled={imageLoading} style={{ ...btnStyle('#C8A45E', '#fff'), padding: '10px 20px', fontSize: '14px', fontWeight: 600 }}>
                {imageLoading ? '생성 중...' : '이미지 복사'}
              </button>
              <button onClick={handleSave} style={{ ...btnStyle('#10b981', '#fff'), padding: '10px 20px', fontSize: '14px', fontWeight: 600 }}>
                저장
              </button>
            </>
          )}
        </div>
      </div>

      {/* 섹션 토글 */}
      {displayGuide && (
        <div className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-200 flex flex-wrap gap-4 items-center">
          <span className="text-sm text-gray-500 font-semibold">섹션 표시:</span>
          {([
            ['weather', '날씨/복장'],
            ['checklist', '준비물'],
            ['currency', '환율/시차'],
            ['luggage', '수하물/경비'],
          ] as [keyof SectionToggles, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={toggles[key]} onChange={() => handleToggle(key)} style={{ accentColor: COLORS.navy }} />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* 미리보기 */}
      {displayGuide && (
        <div
          ref={previewRef}
          style={{
            maxWidth: '448px',
            margin: '0 auto',
            background: COLORS.bg,
            fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
            color: COLORS.text,
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* 히어로 */}
          <div style={{
            position: 'relative',
            background: heroImageUrl
              ? `linear-gradient(rgba(27,58,92,0.7), rgba(27,58,92,0.8)), url(${heroImageUrl}) center/cover no-repeat`
              : `linear-gradient(135deg, ${COLORS.navy} 0%, #2a5580 100%)`,
            padding: '40px 28px 32px',
            textAlign: 'center',
            color: '#fff',
          }}>
            <div style={{ fontSize: '13px', color: COLORS.gold, letterSpacing: '3px', marginBottom: '8px', fontWeight: 500 }}>TRAVEL GUIDE</div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.3 }}>{destination}</h1>
            <div style={{ fontSize: '14px', opacity: 0.85 }}>
              {formatDate(startDate)} ~ {formatDate(endDate)}
              {getDays() > 0 && ` (${getDays()}일)`}
            </div>
          </div>

          {/* 안내 사항 */}
          <div style={{ padding: '20px 20px 0' }}>
            <LandingCard title="안내 사항">
              <InfoRow label="여행 기간" value={`${formatDate(startDate)} ~ ${formatDate(endDate)}`} />
              {flightInfo && <InfoRow label="출발편" value={flightInfo} />}
              {flightInfoReturn && <InfoRow label="귀국편" value={flightInfoReturn} />}
              {departurePlace && <InfoRow label="집합 장소" value={departurePlace} highlight />}
              {gatheringTime && <InfoRow label="집합 시간" value={gatheringTime} highlight />}
              {expenses && <InfoRow label="경비" value={expenses} />}
            </LandingCard>

            {(showAirportMeeter && airportMeeter) || guideName ? (
              <div style={{ background: '#FFF8E1', border: `2px solid ${COLORS.gold}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.navy, marginBottom: '10px' }}>연락처 안내</div>
                {showAirportMeeter && airportMeeter && (
                  <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.burgundy, marginBottom: '6px' }}>공항 미팅 : {airportMeeter}</div>
                )}
                {guideName && (
                  <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.burgundy }}>
                    현지 가이드 : {guideName}{guideContact ? ` (${guideContact})` : ''}
                  </div>
                )}
              </div>
            ) : null}

            {importantNotes && (
              <div style={{ background: '#FFF5F5', border: `2px solid ${COLORS.burgundy}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.burgundy, marginBottom: '8px' }}>중요사항</div>
                {importantNotes.split('\n').filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ fontSize: '14px', lineHeight: 1.8, color: COLORS.text }}>{line}</div>
                ))}
              </div>
            )}

            {toggles.weather && (
              <LandingCard title="날씨 / 복장">
                <p style={{ fontSize: '14px', lineHeight: 1.8, marginBottom: '12px' }}>{displayGuide.weather}</p>
                {displayGuide.outfit.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {displayGuide.outfit.map((item, i) => (
                      <span key={i} style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', color: COLORS.navy }}>{item}</span>
                    ))}
                  </div>
                )}
              </LandingCard>
            )}

            {toggles.checklist && displayGuide.checklist.length > 0 && (
              <LandingCard title="준비물 체크리스트">
                {displayGuide.checklist.map((cat, ci) => (
                  <div key={ci} className="mb-3">
                    <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.burgundy, marginBottom: '6px' }}>{cat.category}</div>
                    <div className="flex flex-wrap gap-2">
                      {cat.items.map((item, ii) => (
                        <span key={ii} style={{ background: '#fff7ed', padding: '3px 10px', borderRadius: '4px', fontSize: '13px', color: '#92400e', border: '1px solid #fed7aa' }}>{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </LandingCard>
            )}

            {toggles.currency && (
              <LandingCard title="환율 / 시차">
                <p style={{ fontSize: '14px', lineHeight: 1.8, marginBottom: '8px' }}>{displayGuide.currency}</p>
                {displayGuide.timezone && <p style={{ fontSize: '14px', color: '#475569', marginBottom: '4px' }}>{displayGuide.timezone}</p>}
                {displayGuide.voltage && <p style={{ fontSize: '14px', color: '#475569' }}>{displayGuide.voltage}</p>}
              </LandingCard>
            )}

            {toggles.luggage && (
              <LandingCard title="수하물 / 경비">
                <p style={{ fontSize: '14px', lineHeight: 1.8 }}>
                  위탁 수하물: 항공사 규정에 따라 1인 23kg 기준<br />
                  기내 수하물: 7~10kg 이내, 3면 합 115cm 이하
                  {expenses && <strong style={{ color: COLORS.navy, display: 'block', marginTop: '4px' }}>경비: {expenses}</strong>}
                </p>
              </LandingCard>
            )}
          </div>

          {/* 푸터 */}
          <div style={{ background: COLORS.navy, padding: '20px 28px', textAlign: 'center', marginTop: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.gold, marginBottom: '4px' }}>여행세상</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>즐거운 여행 되세요!</div>
          </div>
        </div>
      )}

      {/* 모바일 일정표 */}
      {displayItinerary.length > 0 && (
        <div className="bg-white rounded-xl p-5 mt-4 border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-semibold text-gray-800">
              모바일 일정표 ({displayItinerary.length}일)
              <span className="text-xs text-gray-400 font-normal ml-2">텍스트 클릭하여 수정</span>
            </h3>
            <button onClick={handleScheduleImageCopy} disabled={scheduleImageLoading} style={{ ...btnStyle('#C8A45E', '#fff'), fontWeight: 600 }}>
              {scheduleImageLoading ? '생성 중...' : '일정표 이미지 복사'}
            </button>
          </div>

          <div
            ref={scheduleRef}
            style={{
              maxWidth: '448px',
              margin: '0 auto',
              background: COLORS.bg,
              fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* 헤더 */}
            <div style={{
              background: heroImageUrl
                ? `linear-gradient(rgba(27,58,92,0.7), rgba(27,58,92,0.8)), url(${heroImageUrl}) center/cover no-repeat`
                : `linear-gradient(135deg, ${COLORS.navy} 0%, #2a5580 100%)`,
              padding: '28px 24px 20px',
              textAlign: 'center',
              color: '#fff',
            }}>
              <div style={{ fontSize: '13px', color: COLORS.gold, letterSpacing: '3px', marginBottom: '6px', fontWeight: 500 }}>ITINERARY</div>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{destination || '여행'}</div>
              {startDate && endDate && <div style={{ fontSize: '14px', opacity: 0.85, marginTop: '6px' }}>{formatDate(startDate)} ~ {formatDate(endDate)}</div>}
            </div>

            {/* 날짜별 일정 */}
            <div style={{ padding: '16px' }}>
              {displayItinerary.map((day) => {
                const mealsText = formatMeals(day.meals);
                return (
                  <div key={day.dayNumber} style={{ marginBottom: '16px' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div style={{
                        background: COLORS.navy, color: '#fff', borderRadius: '50%',
                        width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 700, flexShrink: 0,
                      }}>
                        D{day.dayNumber}
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.navy }}>
                          {day.date && day.date}{day.weekday && `(${day.weekday})`}
                          {day.regions && <span style={{ fontWeight: 500, color: '#64748b', fontSize: '14px', marginLeft: '8px' }}>{day.regions.trim()}</span>}
                        </div>
                      </div>
                    </div>

                    {(day.schedule || []).map((item, ii) => (
                      <div key={ii} style={{
                        background: '#fff', borderRadius: '8px', padding: '10px 14px', marginBottom: '6px',
                        borderLeft: `3px solid ${COLORS.gold}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        fontSize: '14px',
                      }}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {item.time && <span style={{ fontSize: '14px', color: COLORS.navy, fontWeight: 700 }}>{item.time}</span>}
                          {item.transport && <span style={{ fontSize: '13px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569', fontWeight: 500 }}>{item.transport}</span>}
                          {item.location && <span style={{ fontSize: '13px', color: '#94a3b8' }}>{item.location}</span>}
                        </div>
                        <div style={{ fontSize: '14px', lineHeight: 1.7, color: COLORS.text }}>{item.content}</div>
                        {item.image && (
                          <img src={resolveImageUrl(item.image)} alt="일정 이미지" className="mt-2 rounded-lg w-full" crossOrigin="anonymous" />
                        )}
                      </div>
                    ))}

                    {mealsText && (
                      <div style={{ fontSize: '13px', color: '#64748b', padding: '6px 14px' }}>{mealsText}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 푸터 */}
            <div style={{ background: COLORS.navy, padding: '16px', textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.gold }}>여행세상</div>
              <div style={{ fontSize: '12px', opacity: 0.6 }}>TRAVEL WORLD Co., Ltd.</div>
            </div>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {!displayGuide && !loading && (
        <div className="py-16 text-center text-gray-400">
          <div className="text-4xl mb-3">TRAVEL GUIDE</div>
          <div className="text-sm">여행지와 날짜를 입력하고 "AI 안내문 생성"을 클릭하세요.</div>
        </div>
      )}

      {/* 브로슈어 모달 */}
      <Modal open={brochureModalOpen} title="브로슈어 불러오기" size="lg" onClose={() => setBrochureModalOpen(false)}>
        {brochuresLoading ? (
          <div className="py-10 text-center text-gray-400">로딩 중...</div>
        ) : brochures.length === 0 ? (
          <div className="py-10 text-center text-gray-400">브로슈어가 없습니다. Landing에서 먼저 생성하세요.</div>
        ) : (
          <div className="flex flex-col gap-2 max-h-96 overflow-auto">
            {brochures.map(b => (
              <div
                key={b.id}
                onClick={() => handleSelectBrochure(b)}
                className="border border-gray-200 rounded-lg p-3 flex justify-between items-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                <div>
                  <strong style={{ color: COLORS.navy }}>{b.customerName}</strong>
                  <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '13px' }}>{b.destination}</span>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{b.period}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {b.metadata?.itineraryDays?.length || 0}일 일정
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 항공편 모달 */}
      <Modal open={flightModalOpen} title="저장된 항공편 불러오기" size="lg" onClose={() => setFlightModalOpen(false)}>
        {flightsLoading ? (
          <div className="py-10 text-center text-gray-400">로딩 중...</div>
        ) : flights.length === 0 ? (
          <div className="py-10 text-center text-gray-400">저장된 항공편이 없습니다.</div>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-500">출발일</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">편명</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">구간</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">단체/이름</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">인원</th>
                  <th className="text-left py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {flights.map(f => (
                  <tr key={f.id} className="border-b border-gray-100">
                    <td className="py-2 px-2">{f.departure_date}</td>
                    <td className="py-2 px-2 font-mono">{(f.flight_number || '').replace(/\s+/g, '')}</td>
                    <td className="py-2 px-2">{f.route_from} → {f.route_to}</td>
                    <td className="py-2 px-2">{f.agency || f.name_kr || '-'}</td>
                    <td className="py-2 px-2">{f.pax_count || '-'}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => handleSelectFlight(f)} style={btnStyle('#3b82f6', '#fff')}>선택</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* 저장된 안내문 모달 */}
      <Modal open={savedModalOpen} title="저장된 안내문" size="lg" onClose={() => setSavedModalOpen(false)}>
        {savedLoading ? (
          <div className="py-10 text-center text-gray-400">로딩 중...</div>
        ) : savedList.length === 0 ? (
          <div className="py-10 text-center text-gray-400">저장된 안내문이 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-2 max-h-96 overflow-auto">
            {savedList.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <strong>{item.destination}</strong>
                  <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '8px' }}>{item.start_date} ~ {item.end_date}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>
                    {new Date(item.updated_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSelectSaved(item)} style={btnStyle('#3b82f6', '#fff')}>불러오기</button>
                  <button onClick={() => handleDeleteSaved(item.id)} style={btnStyle('#fef2f2', '#dc2626')}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}