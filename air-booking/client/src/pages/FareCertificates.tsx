// 항공운임증명서 관리 — fare_certificates 테이블

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import html2pdf from 'html2pdf.js';
import { airportToCity } from '../utils/airport-codes';
import '../styles/fare-certificates.css';

// ─── 타입 ───────────────────────────────────────────────────────

interface BookingListItem {
  id: string;
  pnr: string;
  passenger_name: string;
  passenger_name_en?: string;
  route_from?: string;
  route_to?: string;
  departure_date?: string;
  fare: number;
  pax_count: number;
  cabin_class?: string;
}

interface Segment {
  flight_number?: string;
  route_from?: string;
  route_to?: string;
  departure_date?: string;
  departure_time?: string;
  arrival_date?: string;
  cabin_class?: string;
}

interface BookingDetail {
  id: string;
  pnr: string;
  passenger_name: string;
  passenger_name_en?: string;
  route_from?: string;
  route_to?: string;
  departure_date?: string;
  fare: number;
  pax_count: number;
  cabin_class?: string;
  segments?: Segment[];
}

interface CertListItem {
  id: string;
  certificate_number: string;
  recipient: string;
  pnr?: string;
  issue_date: string;
  status: 'issued' | 'reissued' | 'cancelled';
}

interface FareForm {
  certificate_number: string;
  issue_date: string;
  recipient: string;
  traveler_name: string;
  pax_count: string;
  cabin_class: string;
  route: string;
  airfare_per_pax: string;
  tax_per_pax: string;
  fuel_surcharge_per_pax: string;
  ticket_fee_per_pax: string;
  valid_until: string;
  remarks: string;
  booking_id: string;
  pnr: string;
}

const EMPTY_FORM: FareForm = {
  certificate_number: '',
  issue_date: new Date().toISOString().slice(0, 10),
  recipient: '',
  traveler_name: '',
  pax_count: '1',
  cabin_class: '일반석(Y)',
  route: '',
  airfare_per_pax: '0',
  tax_per_pax: '0',
  fuel_surcharge_per_pax: '0',
  ticket_fee_per_pax: '0',
  valid_until: '',
  remarks: '',
  booking_id: '',
  pnr: '',
};

type DocMode = 'certificate' | 'quotation';

// ─── 헬퍼 ───────────────────────────────────────────────────────

function formatNum(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR');
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  return d.slice(0, 10);
}

function statusLabel(s: string): string {
  if (s === 'issued') return '발행';
  if (s === 'reissued') return '재발행';
  if (s === 'cancelled') return '취소';
  return s;
}

function formatPnrDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[0].slice(2)}년 ${parts[1]}/${parts[2]}일`;
}

function buildSegmentLine(seg: Segment): string {
  const fn = seg.flight_number || '';
  const date = formatPnrDate(seg.departure_date || '');
  const time = seg.departure_time ? seg.departure_time.slice(0, 5) : '';
  const fromCode = (seg.route_from || '').toUpperCase();
  const toCode = (seg.route_to || '').toUpperCase();
  const fromCity = airportToCity(fromCode);
  const toCity = airportToCity(toCode);
  const arrDate = seg.arrival_date ? formatPnrDate(seg.arrival_date) : '';
  const cabin = seg.cabin_class ? ` [${seg.cabin_class}]` : '';
  return `${fn}  ${date}${time ? ' ' + time : ''}  ${fromCity}(${fromCode}) - ${toCity}(${toCode})${arrDate ? ' ' + arrDate + '착' : ''}${cabin}`;
}

// ─── 컴포넌트 ────────────────────────────────────────────────────

export function FareCertificates() {
  const { toast } = useToast();

  // 문서 모드: 운임증명서 또는 항공견적서
  const [docMode, setDocMode] = useState<DocMode>('certificate');

  // 소스 탭: 예약장부 또는 항공스케줄
  const [sourceTab, setSourceTab] = useState<'booking' | 'schedule'>('booking');

  // 예약 검색 상태
  const [bookingSearch, setBookingSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<Segment[]>([]);

  // 항공스케줄 검색 상태
  interface ScheduleSegment {
    id: string;
    airline: string;
    flight_number: string;
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    departure_time: string;
    arrival_date?: string;
    arrival_time?: string;
  }
  interface GroupedSchedule {
    group_name: string;
    schedule_ids: string[];
    airline: string;
    flight_numbers: string;
    route: string;
    departure_date: string;
    return_date: string;
    passengers: number;
    segments: ScheduleSegment[];
  }
  const [schedules, setSchedules] = useState<GroupedSchedule[]>([]);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  // 폼 상태
  const [form, setForm] = useState<FareForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // 증명서 이력 상태
  const [certs, setCerts] = useState<CertListItem[]>([]);
  const [certTotal, setCertTotal] = useState(0);
  const [certPage, setCertPage] = useState(1);
  const [certLoading, setCertLoading] = useState(true);

  // 견적서 이력 상태
  interface QuotationListItem {
    id: string;
    quotation_number: string;
    recipient: string;
    issue_date: string;
    valid_until: string | null;
    pax_count: number;
    total_amount: number;
    status: string;
  }
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [qtTotal, setQtTotal] = useState(0);
  const [qtPage, setQtPage] = useState(1);
  const [qtLoading, setQtLoading] = useState(false);

  // 확인 모달
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const LIMIT = 10;

  /** HTML을 받아서 html2pdf로 PDF 파일 다운로드 */
  const downloadPdfFromHtml = async (htmlContent: string, filename: string) => {
    // 1. 서버 HTML 파싱
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 2. 웹폰트 링크를 현재 문서에 추가
    const addedLinks: HTMLLinkElement[] = [];
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
      const href = l.getAttribute('href') || '';
      if (href && !document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
        addedLinks.push(link);
      }
    });

    // 3. 렌더링용 컨테이너 생성
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.background = '#fff';

    // 4. style 태그 복사
    doc.querySelectorAll('style').forEach(s => {
      const style = document.createElement('style');
      style.textContent = s.textContent;
      container.appendChild(style);
    });

    // 5. .no-print 제거하고 body 내용 복사
    doc.querySelectorAll('.no-print').forEach(el => el.remove());
    const bodyContent = doc.querySelector('.page');
    if (bodyContent) {
      container.appendChild(bodyContent.cloneNode(true));
    } else {
      container.innerHTML += doc.body.innerHTML;
    }

    document.body.appendChild(container);

    // 6. 폰트 로딩 + 렌더링 대기
    await new Promise(r => setTimeout(r, 1000));

    // 7. PDF 생성
    const target = container.querySelector('.page') as HTMLElement || container;
    try {
      await (html2pdf as any)().set({
        margin: [0, 0, 0, 0],
        filename,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(target).save();
    } finally {
      document.body.removeChild(container);
      // 추가한 폰트 링크 정리
      addedLinks.forEach(link => link.remove());
    }
  };

  // ─── 예약 검색 ─────────────────────────────────────────────────

  const fetchBookings = useCallback(async (page = 1) => {
    setBookingLoading(true);
    try {
      const params = new URLSearchParams();
      if (bookingSearch) params.set('search', bookingSearch);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const res = await fetch(`/api/bookings?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const list: BookingListItem[] = (data.data.bookings || data.data).map((b: BookingListItem) => b);
        setBookings(list);
        setBookingTotal(data.data.total ?? list.length);
        setBookingPage(page);
      }
    } catch {
      toast.error('예약 목록을 불러올 수 없습니다.');
    } finally {
      setBookingLoading(false);
    }
  }, [bookingSearch, dateFrom, dateTo]);

  const handleBookingSearch = () => {
    fetchBookings(1);
  };

  const handleBookingReset = () => {
    setBookingSearch('');
    setDateFrom('');
    setDateTo('');
    setSelectedBookingId(null);
    setSelectedSegments([]);
    setForm(EMPTY_FORM);
    setBookings([]);
    setBookingTotal(0);
  };

  // ─── 예약 행 클릭 → 폼 자동 채움 ───────────────────────────────

  const handleSelectBooking = async (booking: BookingListItem) => {
    setSelectedBookingId(booking.id);

    // 기본 정보로 즉시 폼 채움
    const pax = booking.pax_count || 1;
    const farePerPax = pax > 0 ? Math.round(booking.fare / pax) : booking.fare;
    const fromCode = (booking.route_from || '').toUpperCase();
    const toCode = (booking.route_to || '').toUpperCase();
    const route = fromCode && toCode
      ? `${airportToCity(fromCode)}(${fromCode})-${airportToCity(toCode)}(${toCode})-${airportToCity(fromCode)}(${fromCode})`
      : '';

    setForm(prev => ({
      ...prev,
      booking_id: booking.id,
      pnr: booking.pnr || '',
      traveler_name: booking.passenger_name || booking.passenger_name_en || '',
      pax_count: String(pax),
      cabin_class: booking.cabin_class || '일반석(Y)',
      route,
      airfare_per_pax: String(farePerPax),
      tax_per_pax: '0',
      certificate_number: '',
    }));

    // 상세 조회로 segments 가져오기
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const detail: BookingDetail = data.data.booking || data.data;
        const segs: Segment[] = detail.segments || [];
        setSelectedSegments(segs);

        // segments에서 route 재구성 (도시명 형식)
        if (segs.length > 0) {
          const cities: string[] = [];
          segs.forEach((s, i) => {
            const fc = (s.route_from || '').toUpperCase();
            if (i === 0) cities.push(`${airportToCity(fc)}(${fc})`);
            const tc = (s.route_to || '').toUpperCase();
            cities.push(`${airportToCity(tc)}(${tc})`);
          });
          setForm(prev => ({ ...prev, route: cities.join('-') }));
        }

        // 상세에서 더 정확한 운임 재계산
        const paxCount = detail.pax_count || 1;
        const perPax = paxCount > 0 ? Math.round(detail.fare / paxCount) : detail.fare;
        setForm(prev => ({
          ...prev,
          pax_count: String(paxCount),
          cabin_class: detail.cabin_class || '일반석(Y)',
          airfare_per_pax: String(perPax),
        }));
      }
    } catch {
      // 상세 실패해도 기본 정보로 진행
    }
  };

  // ─── 항공스케줄 검색 ────────────────────────────────────────────
  const fetchSchedules = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const params = new URLSearchParams();
      if (scheduleSearch) params.set('search', scheduleSearch);
      if (dateFrom) params.set('departure_from', dateFrom);
      if (dateTo) params.set('departure_to', dateTo);
      params.set('limit', '50');

      const res = await fetch(`/api/flight-schedules/grouped?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data?.schedules || []);
      }
    } catch {
      toast.error('항공스케줄을 불러올 수 없습니다.');
    } finally {
      setScheduleLoading(false);
    }
  }, [scheduleSearch, dateFrom, dateTo]);

  const handleSelectSchedule = (s: GroupedSchedule) => {
    setSelectedScheduleId(s.schedule_ids[0]);
    setSelectedBookingId(null);

    // segments에서 도시명 포함 route 생성
    const segs = s.segments || [];
    let route = s.route;
    if (segs.length > 0) {
      const cities: string[] = [];
      segs.forEach((seg, i) => {
        const fc = (seg.departure_airport || '').toUpperCase();
        if (i === 0) cities.push(`${airportToCity(fc)}(${fc})`);
        const tc = (seg.arrival_airport || '').toUpperCase();
        cities.push(`${airportToCity(tc)}(${tc})`);
      });
      route = cities.join('-');
    }

    // segments를 Segment 타입으로 변환해서 저장
    const certSegments: Segment[] = segs.map(seg => ({
      flight_number: seg.flight_number,
      route_from: seg.departure_airport,
      route_to: seg.arrival_airport,
      departure_date: seg.departure_date,
      departure_time: seg.departure_time,
      arrival_date: seg.arrival_date,
    }));
    setSelectedSegments(certSegments);

    setForm(prev => ({
      ...prev,
      booking_id: '',
      pnr: s.group_name || '',
      pax_count: String(s.passengers || 1),
      cabin_class: '일반석(Y)',
      route,
      airfare_per_pax: '0',
      tax_per_pax: '0',
      certificate_number: '',
    }));
  };

  const handleClearSelection = () => {
    setSelectedBookingId(null);
    setSelectedScheduleId(null);
    setSelectedSegments([]);
    setForm(EMPTY_FORM);
  };

  // ─── 증명서 이력 ───────────────────────────────────────────────

  const fetchCerts = useCallback(async (page = 1) => {
    setCertLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      const res = await fetch(`/api/fare-certificates?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const list: CertListItem[] = data.data.certificates || data.data;
        setCerts(list);
        setCertTotal(data.data.total ?? list.length);
        setCertPage(page);
      }
    } catch {
      toast.error('증명서 목록을 불러올 수 없습니다.');
    } finally {
      setCertLoading(false);
    }
  }, []);

  const fetchQuotations = useCallback(async (page = 1) => {
    setQtLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      const res = await fetch(`/api/fare-certificates/quotations?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setQuotations(data.data.quotations || []);
        setQtTotal(data.data.total ?? 0);
        setQtPage(page);
      }
    } catch { /* ignore */ }
    finally { setQtLoading(false); }
  }, []);

  useEffect(() => {
    fetchCerts(1);
    fetchQuotations(1);
  }, [fetchCerts, fetchQuotations]);

  // ─── 폼 필드 업데이트 ──────────────────────────────────────────

  const updateForm = (field: keyof FareForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ─── 운임 계산 ─────────────────────────────────────────────────

  const paxCount = Number(form.pax_count) || 1;
  const airfarePerPax = Number(form.airfare_per_pax) || 0;
  const taxPerPax = Number(form.tax_per_pax) || 0;
  const fuelPerPax = Number(form.fuel_surcharge_per_pax) || 0;
  const feePerPax = Number(form.ticket_fee_per_pax) || 0;
  const airfareTotal = airfarePerPax * paxCount;
  const taxTotal = taxPerPax * paxCount;
  const fuelTotal = fuelPerPax * paxCount;
  const feeTotal = feePerPax * paxCount;
  const grandTotal = docMode === 'quotation'
    ? (airfarePerPax + taxPerPax + fuelPerPax + feePerPax) * paxCount
    : airfareTotal + taxTotal;

  // ─── 미리보기 ──────────────────────────────────────────────────

  const handlePreview = async () => {
    if (!form.recipient) { toast.error('수신처를 입력해주세요.'); return; }
    try {
      const endpoint = docMode === 'quotation' ? '/api/fare-certificates/quotation' : '/api/fare-certificates/preview';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildPayload()),
      });
      if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
        const html = await res.text();
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
      } else {
        // 미리보기 API 없으면 저장 후 PDF로 대체
        toast.error('미리보기를 지원하지 않습니다. PDF 다운로드를 이용해주세요.');
      }
    } catch {
      toast.error('미리보기 요청에 실패했습니다.');
    }
  };

  // ─── PDF 저장 & 다운로드 ───────────────────────────────────────

  const buildPayload = () => {
    const routeDesc = form.route || (selectedSegments.length > 0
      ? selectedSegments.map(s => `${airportToCity(s.route_from || '')}(${(s.route_from || '').toUpperCase()})`).join('-') + `-${airportToCity(selectedSegments[selectedSegments.length - 1].route_to || '')}(${(selectedSegments[selectedSegments.length - 1].route_to || '').toUpperCase()})`
      : '');
    const startDate = selectedSegments.length > 0 ? selectedSegments[0].departure_date : undefined;
    // 귀국편: arrival_date가 있으면 사용, 없으면 마지막 구간 departure_date
    const lastSeg = selectedSegments.length > 1 ? selectedSegments[selectedSegments.length - 1] : null;
    const endDate = lastSeg?.arrival_date || lastSeg?.departure_date || startDate;
    return {
      booking_id: form.booking_id || undefined,
      flight_schedule_id: selectedScheduleId || undefined,
      recipient: form.recipient,
      issue_date: form.issue_date,
      traveler_name: form.traveler_name || (paxCount > 1 ? '별지참조' : ''),
      cabin_class: form.cabin_class,
      route_description: routeDesc,
      ticket_period_start: startDate || null,
      ticket_period_end: endDate || null,
      pax_count: paxCount,
      base_fare_per_person: airfarePerPax,
      tax_per_person: taxPerPax,
      total_fare: airfareTotal,
      total_tax: taxTotal,
      total_amount: grandTotal,
      segments_json: JSON.stringify(selectedSegments),
      // 견적서 전용
      fuel_surcharge_per_person: fuelPerPax,
      ticket_fee_per_person: feePerPax,
      valid_until: form.valid_until || null,
      remarks: form.remarks || '',
    };
  };

  // ─── 저장 (DB에만 저장) ──────────────────────────────────────
  const handleSave = async () => {
    if (!form.booking_id && !selectedScheduleId) { toast.error('예약 또는 항공스케줄을 선택해주세요.'); return; }
    if (!form.recipient) { toast.error('수신처를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/fare-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (data.success) {
        const cert = data.data.certificate;
        toast.success(`증명서 ${cert?.cert_number || ''} 저장 완료`);
        setForm(prev => ({ ...prev, certificate_number: cert?.cert_number || '' }));
        fetchCerts(1);
      } else {
        toast.error(data.error || '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // ─── 저장 + PDF 다운로드 ─────────────────────────────────────
  const handleSaveAndPdf = async () => {
    if (!form.booking_id && !selectedScheduleId) { toast.error('예약 또는 항공스케줄을 선택해주세요.'); return; }
    if (!form.recipient) { toast.error('수신처를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/fare-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (data.success) {
        const cert = data.data.certificate;
        const id = cert?.id;
        toast.success(`증명서 ${cert?.cert_number || ''} 저장 완료`);
        setForm(prev => ({ ...prev, certificate_number: cert?.cert_number || '' }));
        fetchCerts(1);
        if (id) {
          const pdfRes = await fetch(`/api/fare-certificates/${id}/pdf`, { credentials: 'include' });
          if (pdfRes.ok) {
            const html = await pdfRes.text();
            await downloadPdfFromHtml(html, `운임증명서_${cert?.cert_number || id}.pdf`);
          }
        }
      } else {
        toast.error(data.error || '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!form.recipient) { toast.error('수신처를 입력해주세요.'); return; }
    try {
      const endpoint = docMode === 'quotation' ? '/api/fare-certificates/quotation' : '/api/fare-certificates/preview';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildPayload()),
      });
      if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
        const html = await res.text();
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(html);
          w.document.close();
          // onload 대신 setTimeout으로 인쇄 대화상자 호출
          setTimeout(() => { w.print(); }, 500);
        }
      } else {
        toast.error('인쇄용 HTML을 가져올 수 없습니다.');
      }
    } catch {
      toast.error('인쇄 요청에 실패했습니다.');
    }
  };

  // ─── 견적서 저장 ──────────────────────────────────────────────

  const handleSaveQuotation = async () => {
    if (!form.recipient) { toast.error('수신처를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/fare-certificates/quotation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`견적서 ${data.data.quotation.quotation_number} 저장 완료`);
        fetchQuotations(1);
      } else {
        toast.error(data.error || '견적서 저장 실패');
      }
    } catch {
      toast.error('견적서 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuotationAndPdf = async () => {
    if (!form.recipient) { toast.error('수신처를 입력해주세요.'); return; }
    setSaving(true);
    try {
      // 1. 저장
      const saveRes = await fetch('/api/fare-certificates/quotation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildPayload()),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) { toast.error(saveData.error || '저장 실패'); return; }

      const qtId = saveData.data.quotation.id;
      toast.success(`견적서 ${saveData.data.quotation.quotation_number} 저장 완료`);
      fetchQuotations(1);

      // 2. PDF 파일 다운로드
      const pdfRes = await fetch(`/api/fare-certificates/quotation/${qtId}/pdf`, { credentials: 'include' });
      if (pdfRes.ok) {
        const html = await pdfRes.text();
        const qtNum = saveData.data.quotation.quotation_number || 'quotation';
        await downloadPdfFromHtml(html, `항공견적서_${qtNum}.pdf`);
      }
    } catch {
      toast.error('견적서 저장+PDF 실패');
    } finally {
      setSaving(false);
    }
  };

  // ─── 재발행 ────────────────────────────────────────────────────

  // ─── 견적서 불러오기 (수정용) ──────────────────────────────────

  const handleLoadQuotation = async (qtId: string) => {
    try {
      const res = await fetch(`/api/fare-certificates/quotation/detail/${qtId}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.success) { toast.error('견적서 불러오기 실패'); return; }

      const qt = data.data.quotation;
      const segs = JSON.parse(qt.segments_json || '[]');

      setForm({
        ...EMPTY_FORM,
        issue_date: qt.issue_date || EMPTY_FORM.issue_date,
        recipient: qt.recipient || '',
        traveler_name: qt.traveler_name || '',
        pax_count: String(qt.pax_count || 1),
        cabin_class: qt.cabin_class || '일반석(Y)',
        route: qt.route_description || '',
        airfare_per_pax: String(qt.base_fare_per_person || 0),
        tax_per_pax: String(qt.tax_per_person || 0),
        fuel_surcharge_per_pax: String(qt.fuel_surcharge_per_person || 0),
        ticket_fee_per_pax: String(qt.ticket_fee_per_person || 0),
        valid_until: qt.valid_until || '',
        remarks: qt.remarks || '',
        booking_id: qt.booking_id || '',
        pnr: '',
      });

      if (qt.flight_schedule_id) setSelectedScheduleId(qt.flight_schedule_id);
      if (qt.booking_id) setSelectedBookingId(qt.booking_id);

      setSelectedSegments(segs.map((s: any) => ({
        flight_number: s.flight_number,
        route_from: s.route_from,
        route_to: s.route_to,
        departure_date: s.departure_date,
        departure_time: s.departure_time,
        arrival_date: s.arrival_date,
      })));

      toast.success(`견적서 ${qt.quotation_number} 불러옴`);
      // 스크롤 위로
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error('견적서 불러오기 실패');
    }
  };

  const handleReissue = (cert: CertListItem) => {
    setConfirmModal({
      open: true,
      title: '재발행 확인',
      message: `${cert.certificate_number} 증명서를 재발행하시겠습니까?\n기존 증명서는 재발행 상태로 변경됩니다.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/fare-certificates/${cert.id}/reissue`, {
            method: 'POST',
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success) {
            toast.success('재발행되었습니다.');
            fetchCerts(certPage);
          } else {
            toast.error(data.error || '재발행에 실패했습니다.');
          }
        } catch {
          toast.error('재발행에 실패했습니다.');
        }
      },
    });
  };

  // ─── 삭제 ──────────────────────────────────────────────────────

  const handleDelete = (cert: CertListItem) => {
    setConfirmModal({
      open: true,
      title: '삭제 확인',
      message: `${cert.certificate_number} 증명서를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      danger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/fare-certificates/${cert.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success) {
            toast.success('삭제되었습니다.');
            fetchCerts(certPage);
          } else {
            toast.error(data.error || '삭제에 실패했습니다.');
          }
        } catch {
          toast.error('삭제에 실패했습니다.');
        }
      },
    });
  };

  const bookingTotalPages = Math.max(1, Math.ceil(bookingTotal / LIMIT));
  const certTotalPages = Math.max(1, Math.ceil(certTotal / LIMIT));

  if (certLoading && certs.length === 0) return <LoadingSpinner />;

  return (
    <div className="fc-page">

      {/* ── 섹션 1: 데이터 소스 선택 ── */}
      <div className="fc-section-card fc-search-section">
        <div className="fc-source-tabs">
          <button
            className={`fc-source-tab ${sourceTab === 'booking' ? 'active' : ''}`}
            onClick={() => setSourceTab('booking')}
          >예약장부</button>
          <button
            className={`fc-source-tab ${sourceTab === 'schedule' ? 'active' : ''}`}
            onClick={() => { setSourceTab('schedule'); if (schedules.length === 0) fetchSchedules(); }}
          >항공스케줄</button>
        </div>

        <div className="fc-search-row">
          <div className="fc-search-field">
            <label>{sourceTab === 'booking' ? 'PNR / 승객명' : '그룹명 / 항공사'}</label>
            <input
              type="text"
              className="search-input"
              placeholder={sourceTab === 'booking' ? 'PNR 또는 승객명 검색...' : '그룹명 또는 항공사 검색...'}
              value={sourceTab === 'booking' ? bookingSearch : scheduleSearch}
              onChange={(e) => sourceTab === 'booking' ? setBookingSearch(e.target.value) : setScheduleSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sourceTab === 'booking' ? handleBookingSearch() : fetchSchedules(); }}
            />
          </div>
          <div className="fc-search-field">
            <label>출발일 시작</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="fc-search-field">
            <label>출발일 종료</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="fc-search-actions">
            <button className="fc-btn-search" onClick={() => sourceTab === 'booking' ? handleBookingSearch() : fetchSchedules()}>검색</button>
            <button className="fc-btn-reset" onClick={handleBookingReset}>초기화</button>
          </div>
        </div>

        {/* 예약장부 탭 */}
        {sourceTab === 'booking' && (
          bookingLoading ? (
            <div className="fc-empty">검색 중...</div>
          ) : bookings.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="fc-results-table">
                  <thead>
                    <tr>
                      <th>PNR</th>
                      <th>승객명</th>
                      <th>여정</th>
                      <th>출발일</th>
                      <th style={{ textAlign: 'right' }}>운임</th>
                      <th style={{ textAlign: 'right' }}>인원</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr
                        key={b.id}
                        className={selectedBookingId === b.id ? 'selected' : ''}
                        onClick={() => handleSelectBooking(b)}
                      >
                        <td className="fc-pnr-cell">{b.pnr || '-'}</td>
                        <td>{b.passenger_name || b.passenger_name_en || '-'}</td>
                        <td>
                          {b.route_from && b.route_to
                            ? `${b.route_from}→${b.route_to}`
                            : '-'}
                        </td>
                        <td>{formatDate(b.departure_date)}</td>
                        <td className="fc-amount-cell">{formatNum(b.fare)}원</td>
                        <td style={{ textAlign: 'right' }}>{b.pax_count || 1}명</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bookingTotalPages > 1 && (
                <div className="fc-pagination">
                  <button onClick={() => fetchBookings(bookingPage - 1)} disabled={bookingPage <= 1}>이전</button>
                  <span className="fc-page-info">{bookingPage} / {bookingTotalPages}</span>
                  <button onClick={() => fetchBookings(bookingPage + 1)} disabled={bookingPage >= bookingTotalPages}>다음</button>
                </div>
              )}
            </>
          ) : (
            <div className="fc-empty">PNR 또는 승객명으로 검색하세요.</div>
          )
        )}

        {/* 항공스케줄 탭 */}
        {sourceTab === 'schedule' && (
          scheduleLoading ? (
            <div className="fc-empty">검색 중...</div>
          ) : schedules.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-results-table">
                <thead>
                  <tr>
                    <th>그룹명</th>
                    <th>항공사/편명</th>
                    <th>여정</th>
                    <th>출발일</th>
                    <th>귀국일</th>
                    <th style={{ textAlign: 'right' }}>인원</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr
                      key={s.group_name}
                      className={selectedScheduleId === s.schedule_ids[0] ? 'selected' : ''}
                      onClick={() => handleSelectSchedule(s)}
                    >
                      <td>{s.group_name || '-'}</td>
                      <td>{s.flight_numbers || '-'}</td>
                      <td>{s.route || '-'}</td>
                      <td>{formatDate(s.departure_date)}</td>
                      <td>{s.departure_date !== s.return_date ? formatDate(s.return_date) : '-'}</td>
                      <td style={{ textAlign: 'right' }}>{s.passengers || 0}명</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="fc-empty">항공스케줄을 검색하세요.</div>
          )
        )}
      </div>

      {/* ── 섹션 2: 증명서/견적서 작성 폼 ── */}
      <div className="fc-section-card fc-form-section">
        <div className="fc-source-tabs" style={{ marginBottom: '12px' }}>
          <button
            className={`fc-source-tab ${docMode === 'certificate' ? 'active' : ''}`}
            onClick={() => setDocMode('certificate')}
          >운임증명서</button>
          <button
            className={`fc-source-tab ${docMode === 'quotation' ? 'active' : ''}`}
            onClick={() => setDocMode('quotation')}
          >항공견적서</button>
        </div>

        {(selectedBookingId || selectedScheduleId) && (
          <div className="fc-selected-notice">
            <span>
              {selectedBookingId
                ? `예약 선택됨 — PNR: ${form.pnr || selectedBookingId.slice(0, 8)}`
                : `항공스케줄 선택됨 — ${schedules.find(s => s.schedule_ids[0] === selectedScheduleId)?.group_name || ''} ${schedules.find(s => s.schedule_ids[0] === selectedScheduleId)?.flight_numbers || ''}`
              }
            </span>
            <button className="fc-clear-btn" onClick={handleClearSelection}>선택 해제</button>
          </div>
        )}

        <div className="fc-form-row">
          <div className="fc-form-field">
            <label>발행번호 (자동 생성)</label>
            <input
              type="text"
              value={form.certificate_number}
              readOnly
              placeholder="저장 시 자동 생성"
            />
          </div>
          <div className="fc-form-field">
            <label>발행일자</label>
            <input
              type="date"
              value={form.issue_date}
              onChange={(e) => updateForm('issue_date', e.target.value)}
            />
          </div>
        </div>

        <div className="fc-form-row fc-form-row-1">
          <div className="fc-form-field fc-recipient-field">
            <label>수신처 * (제출 대상 기관/회사)</label>
            <input
              type="text"
              value={form.recipient}
              onChange={(e) => updateForm('recipient', e.target.value)}
              placeholder="예: OO주식회사 인사팀"
              maxLength={100}
            />
          </div>
        </div>

        <div className="fc-form-row fc-form-row-1">
          <div className="fc-form-field">
            <label>탑승객</label>
            <input
              type="text"
              value={form.traveler_name}
              onChange={(e) => updateForm('traveler_name', e.target.value)}
              placeholder="예약 선택 시 자동 입력 / 직접 입력 가능"
            />
          </div>
        </div>

        <div className="fc-form-row fc-form-row-3">
          <div className="fc-form-field">
            <label>인원</label>
            <input
              type="number"
              min="1"
              value={form.pax_count}
              onChange={(e) => updateForm('pax_count', e.target.value)}
            />
          </div>
          <div className="fc-form-field">
            <label>좌석 등급</label>
            <input
              type="text"
              value={form.cabin_class}
              onChange={(e) => updateForm('cabin_class', e.target.value)}
              placeholder="예: 일반석(Y)"
            />
          </div>
          <div className="fc-form-field">
            <label>여정 (자동/직접 입력)</label>
            <input
              type="text"
              value={form.route}
              onChange={(e) => updateForm('route', e.target.value)}
              placeholder="자동 생성 / 직접 수정 가능"
            />
          </div>
        </div>

        {/* 편별 스케줄 */}
        {selectedSegments.length > 0 && (
          <div className="fc-form-row fc-form-row-1" style={{ marginBottom: '0.75rem' }}>
            <div className="fc-form-field">
              <label>편별 스케줄</label>
              <div className="fc-segment-list">
                {selectedSegments.map((seg, i) => (
                  <div key={i} className="fc-segment-item">
                    {buildSegmentLine(seg)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 운임 계산 테이블 */}
        <div style={{ overflowX: 'auto', marginBottom: '0.5rem' }}>
          <table className="fc-fare-table">
            <thead>
              <tr>
                <th>항목</th>
                <th style={{ textAlign: 'right' }}>1인 금액</th>
                <th style={{ textAlign: 'right' }}>인원</th>
                <th style={{ textAlign: 'right' }}>소계</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>항공권 운임</td>
                <td className="num">
                  <input
                    className="fare-input"
                    type="number"
                    min="0"
                    value={form.airfare_per_pax}
                    onChange={(e) => updateForm('airfare_per_pax', e.target.value)}
                  />
                </td>
                <td className="num">{paxCount}명</td>
                <td className="num">{formatNum(airfareTotal)}원</td>
              </tr>
              <tr>
                <td>TAX (공항세/전쟁보험료 등)</td>
                <td className="num">
                  <input
                    className="fare-input"
                    type="number"
                    min="0"
                    value={form.tax_per_pax}
                    onChange={(e) => updateForm('tax_per_pax', e.target.value)}
                  />
                </td>
                <td className="num">{paxCount}명</td>
                <td className="num">{formatNum(taxTotal)}원</td>
              </tr>
              {/* 견적서 모드: 유류할증료 + 발권수수료 */}
              {docMode === 'quotation' && (
                <>
                  <tr>
                    <td>유류할증료 (YQ)</td>
                    <td className="num">
                      <input className="fare-input" type="number" min="0"
                        value={form.fuel_surcharge_per_pax}
                        onChange={(e) => updateForm('fuel_surcharge_per_pax', e.target.value)} />
                    </td>
                    <td className="num">{paxCount}명</td>
                    <td className="num">{formatNum(fuelTotal)}원</td>
                  </tr>
                  <tr>
                    <td>발권수수료</td>
                    <td className="num">
                      <input className="fare-input" type="number" min="0"
                        value={form.ticket_fee_per_pax}
                        onChange={(e) => updateForm('ticket_fee_per_pax', e.target.value)} />
                    </td>
                    <td className="num">{paxCount}명</td>
                    <td className="num">{formatNum(feeTotal)}원</td>
                  </tr>
                </>
              )}
              <tr className="fc-fare-total-row">
                <td colSpan={3}>{docMode === 'quotation' ? '총 견적금액' : '합 계'}</td>
                <td className="num">{formatNum(grandTotal)}원</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 견적서 모드: 유효기간 + 비고 */}
        {docMode === 'quotation' && (
          <div className="fc-form-group" style={{ marginBottom: '16px' }}>
            <div className="fc-form-row">
              <label className="fc-label" style={{ width: '100px' }}>견적 유효기간</label>
              <input type="date" value={form.valid_until} onChange={(e) => updateForm('valid_until', e.target.value)}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #d0d5dd', borderRadius: '4px' }} />
            </div>
            <div className="fc-form-row" style={{ marginTop: '8px' }}>
              <label className="fc-label" style={{ width: '100px' }}>비고 사항</label>
              <textarea value={form.remarks} onChange={(e) => updateForm('remarks', e.target.value)}
                rows={3} placeholder="추가 안내사항, 특이사항 등"
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #d0d5dd', borderRadius: '4px', fontFamily: 'inherit', fontSize: '13px', resize: 'vertical' }} />
            </div>
          </div>
        )}

        <div className="fc-form-actions">
          {docMode === 'certificate' && (
            <>
              <button className="fc-btn-save" onClick={handleSave} disabled={saving || (!form.booking_id && !selectedScheduleId)}>
                {saving ? '저장 중...' : '저장'}
              </button>
              <button className="fc-btn-pdf" onClick={handleSaveAndPdf} disabled={saving || (!form.booking_id && !selectedScheduleId)}>
                저장 + PDF
              </button>
            </>
          )}
          {docMode === 'quotation' && (
            <>
              <button className="fc-btn-save" onClick={handleSaveQuotation} disabled={saving}>
                {saving ? '저장 중...' : '견적서 저장'}
              </button>
              <button className="fc-btn-pdf" onClick={handleSaveQuotationAndPdf} disabled={saving}>
                저장 + PDF
              </button>
            </>
          )}
          <button className="fc-btn-preview" onClick={handlePreview}>미리보기</button>
          <button className="fc-btn-print" onClick={handlePrint} disabled={saving}>인쇄</button>
        </div>
      </div>

      {/* ── 섹션 3: 발행 이력 ── */}
      <div className="fc-section-card fc-history-section">
        <div className="fc-section-title">{docMode === 'certificate' ? '증명서 발행 이력' : '견적서 발행 이력'}</div>

        {/* 견적서 이력 */}
        {docMode === 'quotation' && (
          qtLoading ? (
            <div className="fc-empty">불러오는 중...</div>
          ) : quotations.length === 0 ? (
            <div className="fc-empty">발행된 견적서가 없습니다.</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="fc-history-table">
                  <thead>
                    <tr>
                      <th>견적번호</th>
                      <th>수신처</th>
                      <th>견적일</th>
                      <th>유효기간</th>
                      <th style={{ textAlign: 'right' }}>인원</th>
                      <th style={{ textAlign: 'right' }}>총액</th>
                      <th>동작</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map(qt => (
                      <tr key={qt.id}>
                        <td className="fc-cert-number">{qt.quotation_number}</td>
                        <td>{qt.recipient}</td>
                        <td>{formatDate(qt.issue_date)}</td>
                        <td>{qt.valid_until ? formatDate(qt.valid_until) : '-'}</td>
                        <td style={{ textAlign: 'right' }}>{qt.pax_count}명</td>
                        <td className="fc-amount-cell">{formatNum(qt.total_amount)}원</td>
                        <td>
                          <div className="fc-actions">
                            <button className="btn-reissue" onClick={() => handleLoadQuotation(qt.id)}>수정</button>
                            <button className="btn-pdf-dl" onClick={async () => {
                              const res = await fetch(`/api/fare-certificates/quotation/${qt.id}/pdf`, { credentials: 'include' });
                              if (res.ok) { const html = await res.text(); await downloadPdfFromHtml(html, `항공견적서_${qt.quotation_number}.pdf`); }
                            }}>PDF</button>
                            <button className="btn-delete" onClick={() => {
                              setConfirmModal({
                                open: true, title: '견적서 삭제', danger: true,
                                message: `${qt.quotation_number} 견적서를 삭제하시겠습니까?`,
                                onConfirm: async () => {
                                  setConfirmModal(prev => ({ ...prev, open: false }));
                                  try {
                                    await fetch(`/api/fare-certificates/quotation/${qt.id}`, { method: 'DELETE', credentials: 'include' });
                                    toast.success('견적서 삭제 완료');
                                    fetchQuotations(1);
                                  } catch { toast.error('삭제 실패'); }
                                }
                              });
                            }}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {Math.ceil(qtTotal / LIMIT) > 1 && (
                <div className="fc-pagination">
                  <button onClick={() => fetchQuotations(qtPage - 1)} disabled={qtPage <= 1}>이전</button>
                  <span className="fc-page-info">{qtPage} / {Math.ceil(qtTotal / LIMIT)} (총 {qtTotal}건)</span>
                  <button onClick={() => fetchQuotations(qtPage + 1)} disabled={qtPage >= Math.ceil(qtTotal / LIMIT)}>다음</button>
                </div>
              )}
            </>
          )
        )}

        {/* 증명서 이력 */}
        {docMode === 'certificate' && (certLoading ? (
          <div className="fc-empty">불러오는 중...</div>
        ) : certs.length === 0 ? (
          <div className="fc-empty">발행된 증명서가 없습니다.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-history-table">
                <thead>
                  <tr>
                    <th>증명서 번호</th>
                    <th>수신처</th>
                    <th>PNR</th>
                    <th>발행일</th>
                    <th>상태</th>
                    <th>동작</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((cert) => (
                    <tr key={cert.id}>
                      <td className="fc-cert-number">{cert.certificate_number}</td>
                      <td>{cert.recipient}</td>
                      <td className="fc-pnr-cell">{cert.pnr || '-'}</td>
                      <td>{formatDate(cert.issue_date)}</td>
                      <td>
                        <span className={`fc-status-badge ${cert.status}`}>
                          {statusLabel(cert.status)}
                        </span>
                      </td>
                      <td>
                        <div className="fc-actions">
                          <button
                            className="btn-reissue"
                            onClick={() => handleReissue(cert)}
                            title="재발행"
                          >
                            재발행
                          </button>
                          <button
                            className="btn-pdf-dl"
                            onClick={async () => {
                              const res = await fetch(`/api/fare-certificates/${cert.id}/pdf`, { credentials: 'include' });
                              if (res.ok) { const html = await res.text(); await downloadPdfFromHtml(html, `운임증명서_${cert.certificate_number}.pdf`); }
                            }}
                            title="PDF 다운로드"
                          >
                            PDF
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(cert)}
                            title="삭제"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {certTotalPages > 1 && (
              <div className="fc-pagination">
                <button
                  onClick={() => fetchCerts(certPage - 1)}
                  disabled={certPage <= 1}
                >
                  이전
                </button>
                <span className="fc-page-info">{certPage} / {certTotalPages} (총 {certTotal}건)</span>
                <button
                  onClick={() => fetchCerts(certPage + 1)}
                  disabled={certPage >= certTotalPages}
                >
                  다음
                </button>
              </div>
            )}
          </>
        ))}
      </div>

      {/* ── 확인 모달 ── */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        title={confirmModal.title}
        size="sm"
      >
        <div className="fc-confirm-body">
          {confirmModal.message.split('\n').map((line, i) => (
            <p key={i} style={{ margin: i === 0 ? '0 0 0.25rem' : '0' }}>{line}</p>
          ))}
        </div>
        <div className="fc-confirm-actions">
          <button
            className="btn-cancel"
            onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
          >
            취소
          </button>
          <button
            className={`btn-confirm${confirmModal.danger ? ' danger' : ''}`}
            onClick={confirmModal.onConfirm}
          >
            확인
          </button>
        </div>
      </Modal>
    </div>
  );
}
