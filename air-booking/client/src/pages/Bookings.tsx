// @TASK P2-S3-T1 - 예약장부 화면
// @SPEC PNR 파싱, 테이블 정렬/필터/검색, 행 확장 상세
// @TASK P2-T2 - 예약장부 키보드 단축키 (Ctrl+K, /, Ctrl+Shift+N)

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import html2canvas from 'html2canvas';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { TicketList } from '../components/tickets/TicketList';
import { InvoiceModal } from '../components/invoice/InvoiceModal';
import { BookingDetailCard } from './bookings/BookingDetailCard';
import { PaxModal } from './bookings/PaxModal';
import { useBookings } from './bookings/useBookings';
import { buildShareText, parseSegments } from './bookings/utils';
import { STATUS_MAP, PAX_THRESHOLD } from './bookings/types';
import type { Booking, StatusFilter, SortField } from './bookings/types';
import { DeadlineIndicator } from '../components/shared/DeadlineIndicator';
import '../styles/bookings.css';

export function Bookings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 전체 탑승객 모달
  const [paxModalOpen, setPaxModalOpen] = useState(false);
  const [paxModalBooking, setPaxModalBooking] = useState<Booking | null>(null);

  // 티켓 관리 패널
  const [selectedBookingForTickets, setSelectedBookingForTickets] = useState<string | null>(null);

  // 인보이스 모달
  const [invoiceBookingId, setInvoiceBookingId] = useState<string | null>(null);
  const [invoiceBookingIds, setInvoiceBookingIds] = useState<string[]>([]); // 다중 선택

  // 체크박스 선택
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllCheck = () => {
    if (checkedIds.size === bookings.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(bookings.map(b => b.id)));
    }
  };
  const handleMultiInvoice = () => {
    const ids = Array.from(checkedIds);
    if (ids.length === 0) { toast.warning('예약을 선택해주세요.'); return; }
    if (ids.length === 1) { setInvoiceBookingId(ids[0]); return; }
    setInvoiceBookingIds(ids);
  };

  // Notice Modal
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeEmail, setNoticeEmail] = useState('');
  const [noticeBookingId, setNoticeBookingId] = useState<string | null>(null);
  const [noticeSending, setNoticeSending] = useState(false);

  // PNR Modal
  const [pnrModalOpen, setPnrModalOpen] = useState(false);
  const [pnrText, setPnrText] = useState('');
  const [pnrAgency, setPnrAgency] = useState('');
  const [agencySuggestions, setAgencySuggestions] = useState<string[]>([]);
  const [pnrParsing, setPnrParsing] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    pnr: '', airline: '', flight_number: '', route_from: '', route_to: '',
    name_kr: '', name_en: '', passport_number: '', seat_number: '',
    fare: '', nmtl_date: '', tl_date: '', departure_date: '', remarks: '', agency: '',
  });

  const {
    bookings,
    setBookings,
    total,
    loading,
    expandedId,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortField,
    setSortField,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    highlightId,
    fetchBookings,
    handleTicketing,
    handleDelete,
    handleExpand,
  } = useBookings();

  // 그룹 뷰 토글
  const [groupView, setGroupView] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  // 그룹핑된 데이터 (group_id 우선, agency 폴백)
  const groupedBookings = React.useMemo(() => {
    if (!groupView) return null;
    const groups: { key: string; label: string; bookings: Booking[] }[] = [];
    const map = new Map<string, Booking[]>();
    bookings.forEach(b => {
      // group_id가 있으면 그것으로, 없으면 agency로 그룹핑
      const key = b.group_id || `agency:${b.agency || '(미분류)'}`;
      const label = b.agency || '(미분류)';
      if (!map.has(key)) { map.set(key, []); groups.push({ key, label, bookings: map.get(key)! }); }
      map.get(key)!.push(b);
    });
    return groups;
  }, [bookings, groupView]);

  // 대리점 클릭 → 필터 + 전체 선택
  const [agencyFilter, setAgencyFilter] = useState('');
  const handleAgencyClick = useCallback((agency: string) => {
    if (!agency) return;
    setSearch(agency);
    setAgencyFilter(agency);
  }, []);

  // agencyFilter 변경 시 해당 대리점 예약 전체 체크 (로딩 완료 후)
  useEffect(() => {
    if (!agencyFilter || loading) return;
    const matched = bookings.filter(b => b.agency === agencyFilter);
    if (matched.length > 0) {
      setCheckedIds(new Set(matched.map(b => b.id)));
      setAgencyFilter('');
    }
  }, [agencyFilter, bookings, loading]);

  // ── 키보드 단축키 ─────────────────────────────────────────────────────────
  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  useKeyboardShortcuts({
    'ctrl+k': focusSearch,
    '/': focusSearch,
    'ctrl+shift+n': () => setPnrModalOpen(true),
  });

  // ── PNR 등록 ──────────────────────────────────────────────────────────────

  // 대리점 자동완성 목록 로드
  const fetchAgencySuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings/agencies', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setAgencySuggestions(data.data || []);
    } catch { /* ignore */ }
  }, []);

  const handlePnrParse = async () => {
    if (!pnrText.trim()) return;
    setPnrParsing(true);

    try {
      const res = await fetch('/api/bookings/parse-pnr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: pnrText }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.warning(data.error || 'PNR 파싱에 실패했습니다. 수동 입력을 이용해주세요.');
        setShowManualForm(true);
        return;
      }

      // PNR 중복 체크 (flight_schedules)
      for (const parsed of data.data.parsed) {
        if (parsed.pnr) {
          try {
            const chkRes = await fetch(`/api/bookings/check-pnr/${encodeURIComponent(parsed.pnr)}`, { credentials: 'include' });
            const chkData = await chkRes.json();
            if (chkData.existsInFlightSchedules && chkData.schedule) {
              const s = chkData.schedule;
              toast.warning(
                `PNR ${parsed.pnr}: 포털 항공 스케줄에 이미 등록됨 ` +
                `(${s.airline || ''}${s.flight_number || ''} ${s.departure_airport || ''}→${s.arrival_airport || ''} ${s.departure_date || ''})`,
              );
            }
          } catch { /* 체크 실패해도 등록은 진행 */ }
        }
      }

      let createdCount = 0;
      // 다중 PNR이면 group_id 자동 생성
      const groupId = data.data.parsed.length > 1
        ? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
        : undefined;
      for (const parsed of data.data.parsed) {
        const lastSegDate = parsed.segments?.length > 1
          ? parsed.segments[parsed.segments.length - 1].departure_date
          : undefined;
        const firstPax = parsed.passengers?.[0];
        const bookingData = {
          pnr: parsed.pnr,
          airline: parsed.airline,
          flight_number: parsed.flight_number,
          route_from: parsed.route_from,
          route_to: parsed.route_to,
          departure_date: parsed.departure_date,
          return_date: lastSegDate,
          nmtl_date: parsed.nmtl_date,
          tl_date: parsed.tl_date,
          name_en: firstPax?.name_en || undefined,
          remarks: parsed.remarks,
          status: parsed.status,
          pax_count: parsed.pax_count,
          passengers: parsed.passengers,
          segments: parsed.segments,
          agency: pnrAgency.trim() || undefined,
          group_id: groupId,
          original_pnr_text: pnrText,
        };
        const createRes = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(bookingData),
        });
        const createData = await createRes.json();
        if (createData.success) createdCount++;
      }

      const agencyLabel = pnrAgency.trim() ? ` [${pnrAgency.trim()}]` : '';
      toast.success(`${createdCount}건의 예약이 등록되었습니다.${agencyLabel}`);
      setPnrModalOpen(false);
      setPnrText('');
      // pnrAgency는 유지 — 연속 등록 시 같은 대리점 재사용
      fetchBookings();
    } catch (err) {
      console.error('[bookings] PNR parse failed:', err);
      toast.error('PNR 파싱 중 오류가 발생했습니다.');
    } finally {
      setPnrParsing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualForm.pnr.trim()) {
      toast.warning('PNR은 필수 입력입니다.');
      return;
    }
    try {
      // PNR 중복 체크 (flight_schedules)
      try {
        const chkRes = await fetch(`/api/bookings/check-pnr/${encodeURIComponent(manualForm.pnr.trim())}`, { credentials: 'include' });
        const chkData = await chkRes.json();
        if (chkData.existsInFlightSchedules && chkData.schedule) {
          const s = chkData.schedule;
          toast.warning(
            `포털 스케줄에 이미 등록된 PNR입니다 ` +
            `(${s.airline || ''}${s.flight_number || ''} ${s.departure_date || ''})`,
          );
        }
      } catch { /* 체크 실패해도 등록은 진행 */ }

      const body: Record<string, unknown> = { ...manualForm };
      if (manualForm.fare) body.fare = Number(manualForm.fare);
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('예약이 등록되었습니다.');
        setPnrModalOpen(false);
        setShowManualForm(false);
        setPnrText('');
        setManualForm({ pnr: '', airline: '', flight_number: '', route_from: '', route_to: '', name_kr: '', name_en: '', passport_number: '', seat_number: '', fare: '', nmtl_date: '', tl_date: '', departure_date: '', remarks: '', agency: '' });
        fetchBookings();
      } else {
        toast.error(data.error || '예약 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('[bookings] Manual submit failed:', err);
      toast.error('예약 등록 중 오류가 발생했습니다.');
    }
  };

  // ── 공유 ──────────────────────────────────────────────────────────────────

  const handleCopyText = (b: Booking) => {
    navigator.clipboard.writeText(buildShareText(b)).then(() => {
      toast.success('텍스트 복사됨! 카톡에 붙여넣기 하세요.');
    }).catch(() => {
      toast.error('복사에 실패했습니다.');
    });
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    const b = bookings.find(x => x.id === expandedId);
    try {
      const clone = cardRef.current.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.card-share, .card-actions, .view-all-pax-btn').forEach(el => el.remove());

      const paxList = b?.passengers || [];
      if (paxList.length > PAX_THRESHOLD) {
        clone.querySelectorAll('.card-detail-left').forEach(el => el.remove());
        clone.querySelectorAll('.card-detail-grid').forEach(el => {
          (el as HTMLElement).style.gridTemplateColumns = '1fr';
        });

        const gridSection = document.createElement('div');
        gridSection.style.cssText = 'padding:24px;border-top:2px solid #e2e8f0;background:#fff;';

        const gridTitle = document.createElement('div');
        gridTitle.style.cssText = 'font-size:18px;font-weight:800;color:#1e293b;margin-bottom:4px;';
        gridTitle.textContent = '전체 탑승객 명단';
        gridSection.appendChild(gridTitle);

        const gridSub = document.createElement('div');
        gridSub.style.cssText = 'font-size:12px;color:#64748b;margin-bottom:16px;';
        gridSub.textContent = `총 ${paxList.length}명의 탑승객이 확인되었습니다.`;
        gridSection.appendChild(gridSub);

        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;';
        paxList.forEach((p, i) => {
          const card = document.createElement('div');
          card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;';
          const num = document.createElement('span');
          num.style.cssText = 'font-size:14px;font-weight:700;color:#f97316;min-width:28px;';
          num.textContent = String(i + 1).padStart(2, '0');
          const name = document.createElement('span');
          name.style.cssText = 'font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;';
          name.textContent = p.name_en || p.name_kr || '-';
          card.appendChild(num);
          card.appendChild(name);
          grid.appendChild(card);
        });
        gridSection.appendChild(grid);
        clone.appendChild(gridSection);
      }

      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '820px';
      clone.style.background = '#ffffff';
      clone.style.borderRadius = '12px';
      clone.style.overflow = 'hidden';
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        removeContainer: false,
      });
      document.body.removeChild(clone);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) { toast.error('이미지 생성 실패'); return; }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        toast.success('이미지 복사됨! 카톡에 Ctrl+V로 붙여넣으세요.');
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `booking-${expandedId}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('이미지가 다운로드되었습니다.');
      }
    } catch (err) {
      console.error('이미지 캡처 오류:', err);
      toast.error('이미지 캡처에 실패했습니다.');
    }
  };

  // ── 안내문 발송 ────────────────────────────────────────────────────────────

  const openNoticeModal = (b: Booking) => {
    setNoticeBookingId(b.id);
    setNoticeEmail('');
    setNoticeModalOpen(true);
  };

  const handleSendNotice = async () => {
    if (!noticeBookingId || !noticeEmail) return;
    setNoticeSending(true);
    try {
      const res = await fetch(`/api/bookings/${noticeBookingId}/send-notice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: noticeEmail }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('안내문이 발송되었습니다.');
        setNoticeModalOpen(false);
      } else {
        toast.error(data.error || '안내문 발송에 실패했습니다.');
      }
    } catch (err) {
      console.error('[bookings] Notice send failed:', err);
      toast.error('안내문 발송 중 오류가 발생했습니다.');
    } finally {
      setNoticeSending(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bookings-page">
      {/* Toolbar */}
      <div className="bookings-toolbar">
        <div className="toolbar-left">
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="PNR, 이름으로 검색... (Ctrl+K)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="예약 검색"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="상태 필터"
          >
            <option value="">전체 상태</option>
            <option value="pending">대기</option>
            <option value="confirmed">확정</option>
            <option value="ticketed">발권완료</option>
            <option value="cancelled">취소</option>
          </select>
          <button
            className={`group-view-btn ${groupView ? 'active' : ''}`}
            onClick={() => { setGroupView(v => !v); setCollapsedGroups(new Set()); }}
            title="단체별 그룹 보기"
          >
            {groupView ? '목록 보기' : '단체별 보기'}
          </button>
          {search && (
            <button className="filter-clear-btn" onClick={() => { setSearch(''); setCheckedIds(new Set()); }} title="필터 해제">
              ✕ {search}
            </button>
          )}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="출발일 시작"
            title="출발일 시작"
            style={{ fontSize: '13px', padding: '4px 6px' }}
          />
          <span style={{ color: '#999', fontSize: '12px' }}>~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="출발일 종료"
            title="출발일 종료"
            style={{ fontSize: '13px', padding: '4px 6px' }}
          />
          {(dateFrom || dateTo) && (
            <button className="filter-clear-btn" onClick={() => { setDateFrom(''); setDateTo(''); }} title="날짜 필터 해제">
              ✕ 날짜
            </button>
          )}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            aria-label="정렬"
          >
            <option value="created_at">등록순</option>
            <option value="departure_date">출발일순</option>
          </select>
        </div>
        <div className="toolbar-right">
          {checkedIds.size > 0 && (
            <button className="pnr-btn" onClick={handleMultiInvoice}>
              📋 선택 인보이스 ({checkedIds.size}건)
            </button>
          )}
          <button className="pnr-btn" onClick={() => setPnrModalOpen(true)}>
            PNR 등록
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bookings-table-wrapper">
        <table className="bookings-table">
          <thead>
            <tr>
              <th className="check-col">
                <input type="checkbox" checked={bookings.length > 0 && checkedIds.size === bookings.length} onChange={toggleAllCheck} aria-label="전체 선택" />
              </th>
              <th>대리점/단체</th>
              <th>PNR</th>
              <th>승객</th>
              <th>항공편</th>
              <th>구간</th>
              <th>출발일</th>
              <th>NMTL</th>
              <th>TL</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-cell">
                  예약 데이터가 없습니다.
                </td>
              </tr>
            ) : groupView && groupedBookings ? (
              groupedBookings.map((group) => {
                const isCollapsed = collapsedGroups.has(group.key);
                const totalPax = group.bookings.reduce((s, b) => s + (b.pax_count || 1), 0);
                const allChecked = group.bookings.every(b => checkedIds.has(b.id));
                // 공통 스케줄: 첫 번째 예약의 세그먼트 사용
                const groupSegs = parseSegments(group.bookings[0]);
                return (
                  <React.Fragment key={`g-${group.key}`}>
                    <tr className="group-header-row" onClick={() => toggleGroupCollapse(group.key)}>
                      <td className="check-col" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={allChecked} onChange={() => {
                          const ids = group.bookings.map(b => b.id);
                          setCheckedIds(prev => {
                            const next = new Set(prev);
                            if (allChecked) ids.forEach(id => next.delete(id));
                            else ids.forEach(id => next.add(id));
                            return next;
                          });
                        }} />
                      </td>
                      <td colSpan={9} className="group-header-cell">
                        <span className="group-toggle">{isCollapsed ? '▶' : '▼'}</span>
                        <span className="group-name">{group.label}</span>
                        <span className="group-badge">{group.bookings.length}건</span>
                        <span className="group-pax">{totalPax}명</span>
                        <span className="group-schedule">
                          {groupSegs.map((s, i) => <span key={i} className="group-seg">{s.flight} {s.from}→{s.to} {s.date}</span>)}
                        </span>
                      </td>
                    </tr>
                    {!isCollapsed && group.bookings.map((b) => (
                      <React.Fragment key={b.id}>
                        <tr
                          className={`booking-row grouped ${expandedId === b.id ? 'expanded' : ''} ${highlightId === String(b.id) ? 'highlighted' : ''}`}
                          onClick={() => handleExpand(b.id)}
                          role="button"
                          tabIndex={0}
                        >
                          <td className="check-col" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={checkedIds.has(b.id)} onChange={() => toggleCheck(b.id)} aria-label={`${b.pnr} 선택`} />
                          </td>
                          <td className="group-indent"></td>
                          <td className="pnr-cell">{b.pnr}</td>
                          <td>{b.pax_count > 1 ? `${b.name_en || b.name_kr || '-'} 외 ${b.pax_count - 1}명` : (b.name_en || b.name_kr || '-')}</td>
                          <td className="group-sub-dim">{b.pax_count}명</td>
                          <td className="group-sub-dim">{b.fare ? `${b.fare.toLocaleString()}원` : '-'}</td>
                          <td className="group-sub-dim">{b.departure_date || '-'}</td>
                          <td>{b.nmtl_date ? <DeadlineIndicator date={b.nmtl_date} type="nmtl" /> : '-'}</td>
                          <td>{b.tl_date ? <DeadlineIndicator date={b.tl_date} type="tl" /> : '-'}</td>
                          <td><StatusBadge status={STATUS_MAP[b.status] || 'pending'} /></td>
                        </tr>
                        {expandedId === b.id && (
                          <tr className="detail-row">
                            <td colSpan={10}>
                              <BookingDetailCard
                                booking={b}
                                cardRef={expandedId === b.id ? cardRef : undefined}
                                onSave={(updated) => { setBookings(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x)); toast.success('수정되었습니다.'); }}
                                onCopyText={() => handleCopyText(b)}
                                onCopyImage={handleCopyImage}
                                onOpenNotice={() => openNoticeModal(b)}
                                onTicketing={() => handleTicketing(b.id)}
                                onDelete={() => handleDelete(b.id)}
                                onNavigateCustomer={() => navigate(`/customers?highlight=${b.customer_id}`)}
                                onNavigateSettlement={() => navigate(`/settlements?booking=${b.id}`)}
                                onViewAllPax={() => { setPaxModalBooking(b); setPaxModalOpen(true); }}
                                onViewTickets={() => setSelectedBookingForTickets(selectedBookingForTickets === b.id ? null : b.id)}
                                onInvoice={() => setInvoiceBookingId(b.id)}
                                ticketPanelOpen={selectedBookingForTickets === b.id}
                              />
                              {selectedBookingForTickets === b.id && <TicketList bookingId={b.id} onClose={() => setSelectedBookingForTickets(null)} />}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })
            ) : (
              bookings.map((b) => (
                <React.Fragment key={b.id}>
                  <tr
                    className={`booking-row ${expandedId === b.id ? 'expanded' : ''} ${highlightId === String(b.id) ? 'highlighted' : ''}`}
                    onClick={() => handleExpand(b.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="check-col" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checkedIds.has(b.id)} onChange={() => toggleCheck(b.id)} aria-label={`${b.pnr} 선택`} />
                    </td>
                    <td className={b.agency ? 'agency-cell clickable' : ''} onClick={(e) => { if (b.agency) { e.stopPropagation(); handleAgencyClick(b.agency); } }}>{b.agency || '-'}</td>
                    <td className="pnr-cell">{b.pnr}</td>
                    <td>{b.pax_count > 1 ? `${b.name_en || b.name_kr || '-'} 외 ${b.pax_count - 1}명` : (b.name_en || b.name_kr || '-')}</td>
                    <td>{(() => { const segs = parseSegments(b); return segs.map((s, i) => <div key={i}>{s.flight}</div>); })()}</td>
                    <td>{(() => { const segs = parseSegments(b); return segs.map((s, i) => <div key={i}>{s.from}→{s.to}</div>); })()}</td>
                    <td>{(() => { const segs = parseSegments(b); return segs.map((s, i) => <div key={i}>{s.date}</div>); })()}</td>
                    <td>{b.nmtl_date || '-'}</td>
                    <td>{b.tl_date || '-'}</td>
                    <td><StatusBadge status={STATUS_MAP[b.status] || 'pending'} /></td>
                  </tr>
                  {expandedId === b.id && (
                    <tr className="detail-row">
                      <td colSpan={10}>
                        <BookingDetailCard
                          booking={b}
                          cardRef={expandedId === b.id ? cardRef : undefined}
                          onSave={(updated) => { setBookings(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x)); toast.success('수정되었습니다.'); }}
                          onCopyText={() => handleCopyText(b)}
                          onCopyImage={handleCopyImage}
                          onOpenNotice={() => openNoticeModal(b)}
                          onTicketing={() => handleTicketing(b.id)}
                          onDelete={() => handleDelete(b.id)}
                          onNavigateCustomer={() => navigate(`/customers?highlight=${b.customer_id}`)}
                          onNavigateSettlement={() => navigate(`/settlements?booking=${b.id}`)}
                          onViewAllPax={() => { setPaxModalBooking(b); setPaxModalOpen(true); }}
                          onViewTickets={() => setSelectedBookingForTickets(selectedBookingForTickets === b.id ? null : b.id)}
                          onInvoice={() => setInvoiceBookingId(b.id)}
                          ticketPanelOpen={selectedBookingForTickets === b.id}
                        />
                        {selectedBookingForTickets === b.id && <TicketList bookingId={b.id} onClose={() => setSelectedBookingForTickets(null)} />}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bookings-footer">
        총 {total}건
      </div>

      {/* PNR Modal */}
      <Modal open={pnrModalOpen} onClose={() => { setPnrModalOpen(false); setShowManualForm(false); }} title="PNR 등록" size="lg">
        <div className="pnr-modal-body">
          {!showManualForm ? (
            <>
              <p className="pnr-hint">GDS PNR 텍스트를 붙여넣기 하세요. <span style={{color:'#888',fontSize:'11px'}}>여러 PNR은 빈 줄로 구분하면 한 단체로 일괄 등록됩니다.</span></p>
              <textarea
                className="pnr-textarea"
                value={pnrText}
                onChange={(e) => setPnrText(e.target.value)}
                placeholder={`1.KIM/GUKJIN MR\n2 KE 631 Y 15MAR ICNLAX HK1 1750 1150\nPNR: ABC123`}
                rows={8}
                disabled={pnrParsing}
              />
              <div className="pnr-agency-row">
                <label className="pnr-agency-label">대리점/단체</label>
                <input
                  className="pnr-agency-input"
                  list="agency-list"
                  value={pnrAgency}
                  onChange={(e) => setPnrAgency(e.target.value)}
                  onFocus={fetchAgencySuggestions}
                  placeholder="예: 롯데관광 / 김사장 유럽단체"
                />
                <datalist id="agency-list">
                  {agencySuggestions.map((a, i) => <option key={i} value={a} />)}
                </datalist>
              </div>
              <div className="pnr-actions">
                <button onClick={() => setShowManualForm(true)} className="cancel-btn">
                  수동 입력
                </button>
                <button onClick={() => { setPnrModalOpen(false); setShowManualForm(false); }} className="cancel-btn">
                  취소
                </button>
                <button onClick={handlePnrParse} className="submit-btn" disabled={pnrParsing || !pnrText.trim()}>
                  {pnrParsing ? '파싱 중...' : '등록'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="pnr-hint">예약 정보를 직접 입력하세요.</p>
              <div className="manual-form">
                <div className="manual-form-grid">
                  <div className="form-group">
                    <label htmlFor="m-pnr">PNR *</label>
                    <input id="m-pnr" value={manualForm.pnr} onChange={(e) => setManualForm({ ...manualForm, pnr: e.target.value })} placeholder="ABC123" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-airline">항공사</label>
                    <input id="m-airline" value={manualForm.airline} onChange={(e) => setManualForm({ ...manualForm, airline: e.target.value })} placeholder="KE" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-flight">편명</label>
                    <input id="m-flight" value={manualForm.flight_number} onChange={(e) => setManualForm({ ...manualForm, flight_number: e.target.value })} placeholder="KE631" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-from">출발지</label>
                    <input id="m-from" value={manualForm.route_from} onChange={(e) => setManualForm({ ...manualForm, route_from: e.target.value })} placeholder="ICN" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-to">도착지</label>
                    <input id="m-to" value={manualForm.route_to} onChange={(e) => setManualForm({ ...manualForm, route_to: e.target.value })} placeholder="LAX" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-name-kr">한글명</label>
                    <input id="m-name-kr" value={manualForm.name_kr} onChange={(e) => setManualForm({ ...manualForm, name_kr: e.target.value })} placeholder="김국진" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-name-en">영문명</label>
                    <input id="m-name-en" value={manualForm.name_en} onChange={(e) => setManualForm({ ...manualForm, name_en: e.target.value })} placeholder="KIM/GUKJIN" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-passport">여권번호</label>
                    <input id="m-passport" value={manualForm.passport_number} onChange={(e) => setManualForm({ ...manualForm, passport_number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-seat">좌석</label>
                    <input id="m-seat" value={manualForm.seat_number} onChange={(e) => setManualForm({ ...manualForm, seat_number: e.target.value })} placeholder="12A" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-fare">운임</label>
                    <input id="m-fare" type="number" value={manualForm.fare} onChange={(e) => setManualForm({ ...manualForm, fare: e.target.value })} placeholder="1500000" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-dep">출발일</label>
                    <input id="m-dep" type="date" value={manualForm.departure_date} onChange={(e) => setManualForm({ ...manualForm, departure_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-nmtl">NMTL</label>
                    <input id="m-nmtl" type="date" value={manualForm.nmtl_date} onChange={(e) => setManualForm({ ...manualForm, nmtl_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-tl">TL</label>
                    <input id="m-tl" type="date" value={manualForm.tl_date} onChange={(e) => setManualForm({ ...manualForm, tl_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-agency">대리점/단체</label>
                    <input id="m-agency" list="agency-list" value={manualForm.agency} onChange={(e) => setManualForm({ ...manualForm, agency: e.target.value })} onFocus={fetchAgencySuggestions} placeholder="예: 롯데관광 / 김사장 유럽단체" />
                  </div>
                  <div className="form-group form-group-wide">
                    <label htmlFor="m-remarks">비고</label>
                    <input id="m-remarks" value={manualForm.remarks} onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="pnr-actions">
                <button onClick={() => setShowManualForm(false)} className="cancel-btn">
                  PNR 입력으로
                </button>
                <button onClick={() => { setPnrModalOpen(false); setShowManualForm(false); }} className="cancel-btn">
                  취소
                </button>
                <button onClick={handleManualSubmit} className="submit-btn" disabled={!manualForm.pnr.trim()}>
                  등록
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Notice Modal */}
      <Modal open={noticeModalOpen} onClose={() => setNoticeModalOpen(false)} title="안내문 발송" size="sm">
        <div className="notice-modal-body">
          <p>고객에게 예약 확인 안내문을 이메일로 발송합니다.</p>
          <div className="form-group">
            <label htmlFor="notice-email">받는 사람 이메일</label>
            <input
              id="notice-email"
              type="email"
              value={noticeEmail}
              onChange={(e) => setNoticeEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
          <div className="modal-actions">
            <button onClick={() => setNoticeModalOpen(false)} className="cancel-btn">취소</button>
            <button onClick={handleSendNotice} className="submit-btn" disabled={noticeSending || !noticeEmail.trim()}>
              {noticeSending ? '발송 중...' : '발송'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 전체 탑승객 명단 모달 */}
      {paxModalBooking && (
        <PaxModal
          open={paxModalOpen}
          booking={paxModalBooking}
          onClose={() => setPaxModalOpen(false)}
        />
      )}

      {/* 인보이스 작성 모달 */}
      {invoiceBookingId && (() => {
        const b = bookings.find(x => x.id === invoiceBookingId);
        if (!b) return null;
        return (
          <InvoiceModal
            bookingId={b.id}
            bookingPnr={b.pnr}
            open={true}
            onClose={() => setInvoiceBookingId(null)}
          />
        );
      })()}

      {/* 다중 예약 인보이스 모달 */}
      {invoiceBookingIds.length > 0 && (
        <InvoiceModal
          bookingIds={invoiceBookingIds}
          bookingPnr={invoiceBookingIds.map(id => bookings.find(b => b.id === id)?.pnr).filter(Boolean).join(', ')}
          open={true}
          onClose={() => { setInvoiceBookingIds([]); setCheckedIds(new Set()); }}
        />
      )}
    </div>
  );
}
