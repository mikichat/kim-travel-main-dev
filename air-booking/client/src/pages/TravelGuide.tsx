// TWAIB — AI 여행 안내 랜딩 페이지 (PnrConverter 4번째 탭)
// P0: 입력 + Gemini 생성 + 랜딩 미리보기 + 이미지 복사
// P1: 인라인 편집, 섹션 토글, 저장/불러오기

import { useState, useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { getAirportName, loadAirportData } from '../services/pnr-parser';

// Pretendard 폰트 로드
// Pretendard 폰트 로드 (일정표용)
if (typeof document !== 'undefined' && !document.getElementById('pretendard-font')) {
  const link = document.createElement('link');
  link.id = 'pretendard-font';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
  document.head.appendChild(link);
}

// ── 타입 ──

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
  created_at: string;
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
  image?: string; // /uploads/... 또는 base64
}

interface ItineraryDay {
  dayNumber: number;
  date: string;
  weekday: string;
  regions: string;
  schedule: ItineraryScheduleItem[];
  meals: { breakfast: string; lunch: string; dinner: string };
  images?: { url: string }[]; // 일차 전체 이미지
}

interface SectionToggles {
  weather: boolean;
  checklist: boolean;
  currency: boolean;
  luggage: boolean;
}

const LANDING_API = `http://${window.location.hostname}:3505`;

// 이미지 URL 변환 (/uploads/... → Landing 서버 전체 URL, base64는 그대로)
const resolveImageUrl = (src: string) => {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  return `${LANDING_API}${src.startsWith('/') ? '' : '/'}${src}`;
};

// ── 스타일 상수 ──
const COLORS = {
  bg: '#FAFAF5',
  text: '#2D2D2D',
  navy: '#1B3A5C',
  gold: '#C8A45E',
  burgundy: '#8B2252',
  card: '#FFFFFF',
  cardShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

// ── Component ──

export function TravelGuide() {
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  // 입력 상태
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departurePlace, setDeparturePlace] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [gatheringTime, setGatheringTime] = useState(''); // 집합시간
  const [airportMeeter, setAirportMeeter] = useState(''); // 공항미팅자
  const [showAirportMeeter, setShowAirportMeeter] = useState(false); // 미팅자 표시 토글
  const [expenses, setExpenses] = useState('');
  const [flightInfo, setFlightInfo] = useState('');
  const [flightInfoReturn, setFlightInfoReturn] = useState(''); // 귀국편
  const [heroImageUrl, setHeroImageUrl] = useState(''); // 히어로 배경 이미지 (base64 또는 URL)
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [guideName, setGuideName] = useState(''); // 현지 가이드 이름
  const [guideContact, setGuideContact] = useState(''); // 현지 가이드 연락처
  const [importantNotes, setImportantNotes] = useState(''); // 중요사항

  // AI 결과
  const [guide, setGuide] = useState<GuideContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // P1: 섹션 토글
  const [toggles, setToggles] = useState<SectionToggles>({
    weather: true,
    checklist: true,
    currency: true,
    luggage: true,
  });

  // P1: 인라인 편집
  const [editableGuide, setEditableGuide] = useState<GuideContent | null>(null);

  // 브로슈어 연동
  const [brochureModalOpen, setBrochureModalOpen] = useState(false);
  const [brochures, setBrochures] = useState<BrochureItem[]>([]);
  const [brochuresLoading, setBrochuresLoading] = useState(false);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]); // 원본 (읽기 전용)
  const [editableItinerary, setEditableItinerary] = useState<ItineraryDay[]>([]); // 편집용 복사본

  // P1-T4: 모바일 일정표
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [scheduleImageLoading, setScheduleImageLoading] = useState(false);

  // 모달
  const [flightModalOpen, setFlightModalOpen] = useState(false);
  const [flights, setFlights] = useState<SavedFlight[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(false);

  // P1: 저장/불러오기
  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const [savedList, setSavedList] = useState<SavedGuide[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // guide가 변경되면 editableGuide도 동기화
  useEffect(() => {
    if (guide) setEditableGuide(JSON.parse(JSON.stringify(guide)));
  }, [guide]);

  // 실제 렌더링에 사용할 가이드 데이터
  const displayGuide = editableGuide || guide;

  // ── 저장된 항공편 불러오기 ──
  const handleLoadFlights = useCallback(async () => {
    setFlightModalOpen(true);
    setFlightsLoading(true);
    try {
      const res = await fetch('/api/bookings?sort=created_at&order=desc&limit=100', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setFlights(data.data.bookings || []);
    } catch {
      toast.error('저장된 항공편 조회 실패');
    } finally {
      setFlightsLoading(false);
    }
  }, [toast]);

  const handleSelectFlight = async (flight: SavedFlight) => {
    await loadAirportData();
    const segs = flight.segments || [];

    // segments가 있으면 첫 구간=출발편, 마지막 구간=귀국편
    const firstSeg = segs[0];
    const lastSeg = segs.length > 1 ? segs[segs.length - 1] : null;

    // 출발편 정보 (segment 우선, 없으면 booking 본체)
    const depFrom = firstSeg?.route_from || flight.route_from || '';
    const depTo = firstSeg?.route_to || flight.route_to || '';
    const depFn = (firstSeg?.flight_number || flight.flight_number || '').replace(/\s+/g, '');
    const depTime = firstSeg?.departure_time || '';
    const arrTime = firstSeg?.arrival_time || '';
    const depName = getAirportName(depFrom) || depFrom;
    const arrName = getAirportName(depTo) || depTo;

    // 여행지 = 도착지 한글명
    setDestination(arrName);
    setStartDate(flight.departure_date || firstSeg?.departure_date || '');
    if (flight.return_date) setEndDate(flight.return_date);

    // 출발편: KE115 인천(ICN)09:25 ~ 연길(YNJ)10:50
    const depTimeStr = depTime ? depTime : '';
    const arrTimeStr = arrTime ? arrTime : '';
    if (depTimeStr && arrTimeStr) {
      setFlightInfo(`${depFn} ${depName}(${depFrom})${depTimeStr} ~ ${arrName}(${depTo})${arrTimeStr}`);
    } else {
      setFlightInfo(`${depFn} ${depName}(${depFrom}) → ${arrName}(${depTo})`);
    }

    // 귀국편 (마지막 segment)
    if (lastSeg) {
      const retFrom = lastSeg.route_from || '';
      const retTo = lastSeg.route_to || '';
      const retFn = (lastSeg.flight_number || '').replace(/\s+/g, '');
      const retDepName = getAirportName(retFrom) || retFrom;
      const retArrName = getAirportName(retTo) || retTo;
      const retDepTime = lastSeg.departure_time || '';
      const retArrTime = lastSeg.arrival_time || '';
      if (retDepTime && retArrTime) {
        setFlightInfoReturn(`${retFn} ${retDepName}(${retFrom})${retDepTime} ~ ${retArrName}(${retTo})${retArrTime}`);
      } else {
        setFlightInfoReturn(`${retFn} ${retDepName}(${retFrom}) → ${retArrName}(${retTo})`);
      }
      if (!flight.return_date && lastSeg.departure_date) setEndDate(lastSeg.departure_date);
    }

    setFlightModalOpen(false);
    toast.success(`${flight.agency || flight.name_kr || ''} 항공편이 입력되었습니다.`);
  };

  // ── AI 생성 ──
  const handleGenerate = async () => {
    if (!destination || !startDate || !endDate) {
      toast.error('여행지, 시작일, 종료일을 입력해주세요.');
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
        toast.success('안내문이 생성되었습니다.');
      } else {
        toast.error(data.error || '생성 실패');
      }
    } catch {
      toast.error('서버 연결 실패');
    } finally {
      setLoading(false);
    }
  };

  // ── 이미지 캡처 & 복사 ──
  const handleImageCopy = async () => {
    if (!previewRef.current) return;
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
        toast.success('이미지가 클립보드에 복사되었습니다.\n카톡에서 Ctrl+V로 붙여넣으세요.');
      } catch {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `travel-guide-${destination}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('이미지가 다운로드되었습니다.');
      }
    } catch {
      toast.error('이미지 생성에 실패했습니다.');
    } finally {
      setImageLoading(false);
    }
  };

  // ── P1: 섹션 토글 ──
  const handleToggle = (key: keyof SectionToggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── P1: 인라인 편집 핸들러 ──
  const handleEditField = (field: keyof GuideContent, value: any) => {
    if (!editableGuide) return;
    setEditableGuide({ ...editableGuide, [field]: value });
  };

  // ── P1: 저장 ──
  const handleSave = async () => {
    if ((!displayGuide && displayItinerary.length === 0) || !destination) {
      toast.error('안내문 또는 일정표를 먼저 생성해주세요.');
      return;
    }
    try {
      // 안내문 + 수정된 일정표를 함께 저장 (Landing 원본은 건드리지 않음)
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
      if (data.success) toast.success('안내문이 저장되었습니다.');
      else toast.error(data.error || '저장 실패');
    } catch {
      toast.error('저장 실패');
    }
  };

  // ── P1: 불러오기 ──
  const handleLoadSaved = async () => {
    setSavedModalOpen(true);
    setSavedLoading(true);
    try {
      const res = await fetch('/api/travel-guides', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSavedList(data.data.items || []);
    } catch {
      toast.error('저장된 안내문 조회 실패');
    } finally {
      setSavedLoading(false);
    }
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
      // 새 형식: { guide, itinerary, heroImageUrl, ... }
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
        // 이전 형식: guide 데이터만 저장된 경우
        setGuide(parsed);
      }
    } catch {
      setGuide(null);
    }
    setSavedModalOpen(false);
    toast.success('안내문을 불러왔습니다.');
  };

  // ── 브로슈어 불러오기 ──
  const handleLoadBrochures = async () => {
    setBrochureModalOpen(true);
    setBrochuresLoading(true);
    try {
      // 목록만 가볍게 가져오기 (metadata 제외 — 45MB+ base64 이미지 때문)
      const res = await fetch(`${LANDING_API}/api/brochures`, { mode: 'cors' });
      const data = await res.json();
      if (Array.isArray(data)) {
        // metadata에서 itineraryDays 개수만 추출, 나머지 제거
        const light = data.map((b: any) => ({
          id: b.id,
          customerName: b.customerName,
          destination: b.destination,
          period: b.period,
          mainImageUrl: b.mainImageUrl,
          metadata: {
            itineraryDays: b.metadata?.itineraryDays ? { length: b.metadata.itineraryDays.length } : null,
          },
        }));
        setBrochures(light);
      }
    } catch {
      toast.error('Landing 서버 연결 실패. 서버가 실행 중인지 확인하세요.');
    } finally {
      setBrochuresLoading(false);
    }
  };

  const handleSelectBrochure = async (brochure: BrochureItem) => {
    // 선택 시 상세 데이터 로드
    setBrochureModalOpen(false);
    toast.success('브로슈어 로딩 중...');
    let meta: any = {};
    try {
      const res = await fetch(`${LANDING_API}/api/brochures/${brochure.id}`, { mode: 'cors' });
      const detail = await res.json();
      const rawMeta = detail.metadata;
      meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : (rawMeta || {});
    } catch {
      toast.error('브로슈어 상세 로드 실패');
      return;
    }

    // 여행지
    setDestination(brochure.destination || '');

    // 기간 파싱: "2026년 04월 07일 ~ 04월 11일" → YYYY-MM-DD
    const periodStr = brochure.period || '';
    const m = periodStr.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+~\D*(\d{1,2})?\D*(\d{1,2})/);
    if (m) {
      const year = m[1];
      const sm = m[2].padStart(2, '0');
      const sd = m[3].padStart(2, '0');
      const em = m[4] ? m[4].padStart(2, '0') : sm;
      const ed = m[5].padStart(2, '0');
      setStartDate(`${year}-${sm}-${sd}`);
      setEndDate(`${year}-${em}-${ed}`);
    }

    // itineraryDays
    const days: ItineraryDay[] = meta.itineraryDays || [];
    setItineraryDays(days);
    setEditableItinerary(JSON.parse(JSON.stringify(days))); // 깊은 복사 — 원본 보호

    // 집합 정보: 첫째 날 첫 일정
    if (days.length > 0) {
      const firstDay = days[0];
      const firstItem = firstDay.schedule?.[0];
      if (firstItem) {
        // 집합 장소: "집결지"가 있으면 content에서 힌트, 아니면 location
        const place = firstItem.location || '';
        setDeparturePlace(place);
        setGatheringTime(firstItem.time || '');
      }

      // 출발편/귀국편은 비워두고 수동 입력 유도 (브로슈어 데이터에 편명이 정확하지 않을 수 있음)
      setFlightInfo('');
      setFlightInfoReturn('');
    }

    // 히어로 이미지
    if (meta.mainImage) {
      setHeroImageUrl(meta.mainImage);
    }

    // 경비
    if (meta.quotation) {
      const q = meta.quotation;
      setExpenses(q.price || q.totalPrice || '');
    }

    setBrochureModalOpen(false);
    toast.success(`"${brochure.customerName} | ${brochure.destination}" 브로슈어가 로드되었습니다.`);
  };

  // 크로스 오리진 이미지를 base64로 변환 (html2canvas 캡처용)
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
      } catch { /* 변환 실패 시 무시 */ }
    }
  };

  const handleScheduleImageCopy = async () => {
    if (!scheduleRef.current) return;
    setScheduleImageLoading(true);
    try {
      await document.fonts.ready;
      // 크로스 오리진 이미지를 base64로 변환
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
        toast.success('일정표 이미지가 클립보드에 복사되었습니다.');
      } catch {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `schedule-${destination || 'itinerary'}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('일정표 이미지가 저장되었습니다.');
      }
    } catch {
      toast.error('일정표 이미지 생성 실패');
    } finally {
      setScheduleImageLoading(false);
    }
  };

  // 일정표 인라인 편집 (원본 미변경, editableItinerary만 수정)
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
      // "조:호텔식 / 중:현지식 / 석:기내식" 파싱
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

  // 렌더링에 사용할 일정 데이터 (편집본 우선)
  const displayItinerary = editableItinerary.length > 0 ? editableItinerary : itineraryDays;

  // 식사 텍스트 포맷
  const formatMeals = (meals: ItineraryDay['meals']) => {
    if (!meals) return '';
    const parts: string[] = [];
    if (meals.breakfast) parts.push(`조:${meals.breakfast}`);
    if (meals.lunch) parts.push(`중:${meals.lunch}`);
    if (meals.dinner) parts.push(`석:${meals.dinner}`);
    return parts.join(' / ');
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      const res = await fetch(`/api/travel-guides/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        toast.success('삭제되었습니다.');
        setSavedList(prev => prev.filter(i => i.id !== id));
      }
    } catch {
      toast.error('삭제 실패');
    }
  };

  // ── 날짜 포맷 ──
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

  // ── 렌더링 ──
  return (
    <div style={{ padding: '0 4px' }}>
      {/* ━━━ 입력 영역 ━━━ */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>여행 안내문 생성</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleLoadBrochures} style={{ ...btnStyle('#1B3A5C', '#fff'), fontWeight: 600 }}>브로슈어 불러오기</button>
            <button onClick={handleLoadSaved} style={btnStyle('#f1f5f9', '#475569')}>저장된 안내문</button>
            <button onClick={handleLoadFlights} style={btnStyle('#eff6ff', '#2563eb')}>항공편</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>여행지 *</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="예: 일본 오사카, 베트남 다낭" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>시작일 *</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>종료일 *</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>출발편</label>
            <input value={flightInfo} onChange={e => setFlightInfo(e.target.value)} placeholder="예: KE115 인천(ICN)09:25 ~ 연길(YNJ)10:50" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>귀국편</label>
            <input value={flightInfoReturn} onChange={e => setFlightInfoReturn(e.target.value)} placeholder="예: KE116 연길(YNJ)11:50 ~ 인천(ICN)14:30" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>집합 장소</label>
            <input value={departurePlace} onChange={e => setDeparturePlace(e.target.value)} placeholder="예: 함열스포츠센터, 인천공항 3층" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>집합 시간</label>
            <input value={gatheringTime} onChange={e => setGatheringTime(e.target.value)} placeholder="예: 02:00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>경비</label>
            <input value={expenses} onChange={e => setExpenses(e.target.value)} placeholder="예: 1인 150만원" style={inputStyle} />
          </div>
          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
              공항 미팅자
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                <input type="checkbox" checked={showAirportMeeter} onChange={e => setShowAirportMeeter(e.target.checked)} />
                안내문에 표시
              </label>
            </label>
            <input value={airportMeeter} onChange={e => setAirportMeeter(e.target.value)} placeholder="예: 김국진 (010-1234-5678)" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>현지 가이드 이름</label>
            <input value={guideName} onChange={e => setGuideName(e.target.value)} placeholder="예: 홍길동" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>현지 가이드 연락처</label>
            <input value={guideContact} onChange={e => setGuideContact(e.target.value)} placeholder="예: +86-138-1234-5678" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>중요사항</label>
            <textarea
              value={importantNotes}
              onChange={e => setImportantNotes(e.target.value)}
              placeholder="여러 줄 입력 가능. 예:&#10;여권 만료일 6개월 이상 확인&#10;현지 SIM카드 구매 추천"
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>헤드 배경 이미지</label>
            <input
              ref={heroFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setHeroImageUrl(reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => heroFileRef.current?.click()} style={{ ...btnStyle('#eff6ff', '#2563eb'), padding: '8px 16px' }}>
                이미지 선택
              </button>
              {heroImageUrl && (
                <button onClick={() => { setHeroImageUrl(''); if (heroFileRef.current) heroFileRef.current.value = ''; }} style={btnStyle('#fee2e2', '#dc2626')}>
                  삭제
                </button>
              )}
              {!heroImageUrl && <span style={{ fontSize: '12px', color: '#94a3b8', alignSelf: 'center' }}>JPG, PNG 등 이미지 파일</span>}
            </div>
            {heroImageUrl && (
              <div style={{ marginTop: '6px', borderRadius: '8px', overflow: 'hidden', height: '60px' }}>
                <img src={heroImageUrl} alt="미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button onClick={handleGenerate} disabled={loading} style={{
            ...btnStyle('#1B3A5C', '#fff'),
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'AI 생성 중...' : 'AI 안내문 생성'}
          </button>
          {displayGuide && (
            <>
              <button onClick={handleImageCopy} disabled={imageLoading} style={{
                ...btnStyle('#C8A45E', '#fff'),
                padding: '10px 20px', fontSize: '14px', fontWeight: 600,
                opacity: imageLoading ? 0.6 : 1,
              }}>
                {imageLoading ? '생성 중...' : '이미지 복사'}
              </button>
              <button onClick={handleSave} style={{
                ...btnStyle('#10b981', '#fff'),
                padding: '10px 20px', fontSize: '14px', fontWeight: 600,
              }}>
                저장
              </button>
            </>
          )}
        </div>
      </div>

      {/* ━━━ P1: 섹션 토글 ━━━ */}
      {displayGuide && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '12px 20px', marginBottom: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>섹션 표시:</span>
          {([
            ['weather', '날씨/복장'],
            ['checklist', '준비물'],
            ['currency', '환율/시차'],
            ['luggage', '수하물/경비'],
          ] as [keyof SectionToggles, string][]).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={toggles[key]} onChange={() => handleToggle(key)} style={{ accentColor: COLORS.navy }} />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* ━━━ 미리보기 (랜딩 페이지 디자인) ━━━ */}
      {displayGuide && (
        <div
          ref={previewRef}
          style={{
            maxWidth: '448px',
            margin: '0 auto',
            background: COLORS.bg,
            fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
            color: COLORS.text,
            padding: '0',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* 히어로 섹션 */}
          <div style={{
            position: 'relative',
            background: heroImageUrl
              ? `linear-gradient(rgba(27,58,92,0.7), rgba(27,58,92,0.8)), url(${heroImageUrl}) center/cover no-repeat`
              : `linear-gradient(135deg, ${COLORS.navy} 0%, #2a5580 100%)`,
            padding: '40px 28px 32px',
            textAlign: 'center',
            color: '#fff',
          }}>
            <div style={{ fontSize: '13px', color: COLORS.gold, letterSpacing: '3px', marginBottom: '8px', fontWeight: 500 }}>
              TRAVEL GUIDE
            </div>
            <EditableText
              value={destination}
              onChange={val => setDestination(val)}
              style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.3 }}
              tag="h1"
            />
            <div style={{ fontSize: '14px', opacity: 0.85 }}>
              {formatDate(startDate)} ~ {formatDate(endDate)}
              {getDays() > 0 && ` (${getDays()}일)`}
            </div>
          </div>

          {/* 안내 사항 카드 */}
          <div style={{ padding: '20px 20px 0' }}>
            <LandingCard title="안내 사항">
              <InfoRow label="여행 기간" value={`${formatDate(startDate)} ~ ${formatDate(endDate)}`} />
              {flightInfo && <InfoRow label="출발편" value={flightInfo} />}
              {flightInfoReturn && <InfoRow label="귀국편" value={flightInfoReturn} />}
              {departurePlace && <InfoRow label="집합 장소" value={departurePlace} highlight />}
              {gatheringTime && <InfoRow label="집합 시간" value={gatheringTime} highlight />}
              {expenses && <InfoRow label="경비" value={expenses} />}
            </LandingCard>

            {/* 공항 미팅자 + 가이드 (강조 카드) */}
            {(showAirportMeeter && airportMeeter) || guideName ? (
              <div style={{
                background: '#FFF8E1', border: `2px solid ${COLORS.gold}`, borderRadius: '12px',
                padding: '16px', marginBottom: '16px',
              }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.navy, marginBottom: '10px' }}>연락처 안내</div>
                {showAirportMeeter && airportMeeter && (
                  <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.burgundy, marginBottom: '6px' }}>
                    공항 미팅 : {airportMeeter}
                  </div>
                )}
                {guideName && (
                  <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.burgundy }}>
                    현지 가이드 : {guideName}{guideContact ? ` (${guideContact})` : ''}
                  </div>
                )}
              </div>
            ) : null}

            {/* 중요사항 */}
            {importantNotes && (
              <div style={{
                background: '#FFF5F5', border: `2px solid ${COLORS.burgundy}`, borderRadius: '12px',
                padding: '16px', marginBottom: '16px',
              }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.burgundy, marginBottom: '8px' }}>중요사항</div>
                {importantNotes.split('\n').filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ fontSize: '14px', lineHeight: 1.8, color: COLORS.text }}>
                    {line}
                  </div>
                ))}
              </div>
            )}

            {/* 날씨/복장 */}
            {toggles.weather && (
              <LandingCard title="날씨 / 복장">
                <EditableText
                  value={displayGuide.weather}
                  onChange={val => handleEditField('weather', val)}
                  style={{ fontSize: '14px', lineHeight: 1.8, marginBottom: '12px' }}
                />
                {displayGuide.outfit.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {displayGuide.outfit.map((item, i) => (
                      <span key={i} style={{
                        background: '#f1f5f9',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        color: COLORS.navy,
                      }}>{item}</span>
                    ))}
                  </div>
                )}
              </LandingCard>
            )}

            {/* 준비물 */}
            {toggles.checklist && displayGuide.checklist.length > 0 && (
              <LandingCard title="준비물 체크리스트">
                {displayGuide.checklist.map((cat, ci) => (
                  <div key={ci} style={{ marginBottom: ci < displayGuide.checklist.length - 1 ? '12px' : 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.burgundy, marginBottom: '6px' }}>
                      {cat.category}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {cat.items.map((item, ii) => (
                        <span key={ii} style={{
                          background: '#fff7ed',
                          padding: '3px 10px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: '#92400e',
                          border: '1px solid #fed7aa',
                        }}>{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </LandingCard>
            )}

            {/* 환율/시차 */}
            {toggles.currency && (
              <LandingCard title="환율 / 시차">
                <EditableText
                  value={displayGuide.currency}
                  onChange={val => handleEditField('currency', val)}
                  style={{ fontSize: '14px', lineHeight: 1.8, marginBottom: '8px' }}
                />
                {displayGuide.timezone && (
                  <EditableText
                    value={displayGuide.timezone}
                    onChange={val => handleEditField('timezone', val)}
                    style={{ fontSize: '14px', color: '#475569', marginBottom: '4px' }}
                  />
                )}
                {displayGuide.voltage && (
                  <EditableText
                    value={displayGuide.voltage}
                    onChange={val => handleEditField('voltage', val)}
                    style={{ fontSize: '14px', color: '#475569' }}
                  />
                )}
              </LandingCard>
            )}

            {/* 수하물/경비 */}
            {toggles.luggage && (
              <LandingCard title="수하물 / 경비">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  style={{ fontSize: '14px', lineHeight: 1.8, outline: 'none', cursor: 'text' }}
                  dangerouslySetInnerHTML={{ __html: `위탁 수하물: 항공사 규정에 따라 1인 23kg 기준 (정확한 무게는 항공사 확인)<br>기내 수하물: 7~10kg 이내, 3면 합 115cm 이하${expenses ? `<br><strong style="color:${COLORS.navy}">경비: ${expenses}</strong>` : ''}` }}
                />
              </LandingCard>
            )}
          </div>

          {/* 푸터 */}
          <div style={{
            background: COLORS.navy,
            padding: '20px 28px',
            textAlign: 'center',
            marginTop: '8px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.gold, marginBottom: '4px' }}>
              여행세상
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              즐거운 여행 되세요!
            </div>
          </div>
        </div>
      )}

      {/* ━━━ 모바일 일정표 (브로슈어 기반) ━━━ */}
      {displayItinerary.length > 0 && (
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginTop: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>모바일 일정표 ({displayItinerary.length}일)
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400, marginLeft: '8px' }}>텍스트 클릭하여 수정</span>
          </h3>
          <button onClick={handleScheduleImageCopy} disabled={scheduleImageLoading} style={{
            ...btnStyle('#C8A45E', '#fff'), fontWeight: 600,
          }}>
            {scheduleImageLoading ? '생성 중...' : '일정표 이미지 복사'}
          </button>
        </div>

        {/* 일정표 렌더링 — Pretendard 강제 적용 */}
        <style>{`
          .twaib-schedule *, .twaib-schedule *::before, .twaib-schedule *::after {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          }
          .twaib-schedule font { font-family: 'Pretendard', sans-serif !important; }
          .twaib-schedule b, .twaib-schedule strong { font-weight: 700; }
        `}</style>
        <div
          ref={scheduleRef}
          className="twaib-schedule"
          style={{
            maxWidth: '448px',
            margin: '0 auto',
            background: COLORS.bg,
            fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
            color: COLORS.text,
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* 일정표 헤더 */}
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
            {startDate && endDate && (
              <div style={{ fontSize: '14px', opacity: 0.85, marginTop: '6px' }}>{formatDate(startDate)} ~ {formatDate(endDate)}</div>
            )}
          </div>

          {/* 날짜별 일정 카드 */}
          <div style={{ padding: '16px' }}>
            {displayItinerary.map((day, dayIdx) => {
              const mealsText = formatMeals(day.meals);
              return (
                <div key={day.dayNumber} style={{ marginBottom: '16px' }}>
                  {/* 날짜 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                      background: COLORS.navy, color: '#fff', borderRadius: '50%',
                      width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700, flexShrink: 0,
                    }}>
                      D{day.dayNumber}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.navy }}>
                        {day.date && `${day.date}`}{day.weekday && `(${day.weekday})`}
                        {day.regions && <span style={{ fontWeight: 500, color: '#64748b', fontSize: '14px', marginLeft: '8px' }}>{day.regions.trim()}</span>}
                      </div>
                    </div>
                  </div>

                  {/* 일정 항목들 (인라인 편집 가능) */}
                  {(day.schedule || []).map((item, ii) => (
                    <div key={ii} style={{
                      background: '#fff', borderRadius: '8px', padding: '10px 14px', marginBottom: '6px',
                      borderLeft: `3px solid ${COLORS.gold}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      fontSize: '14px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: item.content ? '4px' : 0 }}>
                          {item.time && <span style={{ fontSize: '14px', color: COLORS.navy, fontWeight: 700 }}>{item.time}</span>}
                          {item.transport && <span style={{ fontSize: '13px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569', fontWeight: 500 }}>{item.transport}</span>}
                          {item.location && <span style={{ fontSize: '13px', color: '#94a3b8' }}>{item.location}</span>}
                        </div>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          style={{ fontSize: '14px', lineHeight: 1.7, color: COLORS.text, outline: 'none', minHeight: '20px', cursor: 'text' }}
                          dangerouslySetInnerHTML={{ __html: item.content || '' }}
                          onBlur={e => handleItineraryEdit(dayIdx, ii, 'content', e.currentTarget.innerHTML)}
                        />
                        {item.image && (
                          <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                            <img
                              src={resolveImageUrl(item.image)}
                              alt="일정 이미지"
                              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                              crossOrigin="anonymous"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 식사 정보 (편집 가능) */}
                  {mealsText && (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      style={{ fontSize: '13px', color: '#64748b', padding: '6px 14px', marginTop: '2px', outline: 'none', cursor: 'text' }}
                      onBlur={e => handleItineraryMealsEdit(dayIdx, e.currentTarget.textContent || '')}
                    >
                      {mealsText}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* 일정표 푸터 */}
          <div style={{ background: COLORS.navy, padding: '16px', textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.gold }}>여행세상</div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>TRAVEL WORLD Co., Ltd.</div>
          </div>
        </div>
      </div>
      )}

      {/* 빈 상태 */}
      {!displayGuide && !loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>TRAVEL GUIDE</div>
          <div style={{ fontSize: '14px' }}>여행지와 날짜를 입력하고 "AI 안내문 생성"을 클릭하세요.</div>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>AI가 안내문을 작성 중입니다...</div>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>약 10~20초 소요됩니다.</div>
        </div>
      )}

      {/* ━━━ 브로슈어 선택 모달 ━━━ */}
      <Modal open={brochureModalOpen} title="브로슈어 불러오기" size="lg" onClose={() => setBrochureModalOpen(false)}>
        {brochuresLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : brochures.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>브로슈어가 없습니다. Landing에서 먼저 생성하세요.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflow: 'auto' }}>
            {brochures.map(b => (
              <div key={b.id} style={{
                border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px',
                background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = COLORS.navy; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'; }}
              onClick={() => handleSelectBrochure(b)}
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

      {/* ━━━ 저장된 항공편 선택 모달 ━━━ */}
      <Modal open={flightModalOpen} title="저장된 항공편 불러오기" size="lg" onClose={() => setFlightModalOpen(false)}>
        {flightsLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : flights.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>저장된 항공편이 없습니다.</div>
        ) : (
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={thStyle}>출발일</th>
                  <th style={thStyle}>편명</th>
                  <th style={thStyle}>구간</th>
                  <th style={thStyle}>단체/이름</th>
                  <th style={thStyle}>인원</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {flights.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{f.departure_date}</td>
                    <td style={tdStyle}>{(f.flight_number || '').replace(/\s+/g, '')}</td>
                    <td style={tdStyle}>{f.route_from} → {f.route_to}</td>
                    <td style={tdStyle}>{f.agency || f.name_kr || '-'}</td>
                    <td style={tdStyle}>{f.pax_count || '-'}</td>
                    <td style={tdStyle}>
                      <button onClick={() => handleSelectFlight(f)} style={btnStyle('#3b82f6', '#fff')}>선택</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ━━━ P1: 저장된 안내문 모달 ━━━ */}
      <Modal open={savedModalOpen} title="저장된 안내문" size="lg" onClose={() => setSavedModalOpen(false)}>
        {savedLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : savedList.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>저장된 안내문이 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflow: 'auto' }}>
            {savedList.map(item => (
              <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.destination}</strong>
                  <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '8px' }}>
                    {item.start_date} ~ {item.end_date}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>
                    {new Date(item.updated_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
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

// ── 서브 컴포넌트 ──

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

// P1: 인라인 편집 가능 텍스트
function EditableText({
  value,
  onChange,
  style,
  tag = 'div',
}: {
  value: string;
  onChange: (val: string) => void;
  style?: React.CSSProperties;
  tag?: 'h1' | 'div' | 'p';
}) {
  const ref = useRef<HTMLElement>(null);
  const initializedRef = useRef(false);
  const Tag = tag as any;

  // 초기값 설정 (한 번만) 또는 외부에서 value가 완전히 바뀌었을 때
  useEffect(() => {
    if (ref.current && (!initializedRef.current || ref.current.innerText === '')) {
      ref.current.innerText = value;
      initializedRef.current = true;
    }
  }, [value]);

  const handleBlur = () => {
    if (ref.current) {
      const newVal = ref.current.innerText;
      if (newVal !== value) onChange(newVal);
    }
  };

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      style={{
        ...style,
        margin: tag === 'h1' ? 0 : undefined,
        outline: 'none',
        cursor: 'text',
        borderRadius: '4px',
        transition: 'background 0.15s',
      }}
      onFocus={(e: React.FocusEvent) => {
        (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
      }}
      onMouseOut={(e: React.MouseEvent) => {
        if (document.activeElement !== e.target) {
          (e.target as HTMLElement).style.background = 'transparent';
        }
      }}
    />
  );
}

// ── 스타일 헬퍼 ──

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#64748b',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: '6px 12px',
    background: bg,
    color: color,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  };
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 6px',
  fontWeight: 600,
  color: '#64748b',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 6px',
  color: '#1e293b',
};
