// @TASK INV-5 - 인보이스 작성/편집 모달
// @SPEC air-booking/docs/planning/invoice-auto-populate.md#5-2-인보이스-작성편집-모달

import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import html2canvas from 'html2canvas';
import styles from './InvoiceModal.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface FlightInfo {
  airline: string;
  flight_number: string;
  route_from: string;
  route_to: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
}

interface PassengerInfo {
  name_en: string;
  name_kr: string;
  title: string;
  gender: string;
  fare: number;
}

interface TicketInfo {
  ticket_number: string;
  issue_date: string;
  status: string;
  passenger_name: string;
}

interface AdditionalItem {
  label: string;
  amount: number;
}

interface GroupItem {
  name: string;
  count: number;
  unitPrice: number;
  deposit: number;
}

interface ExtraItem {
  name: string;
  unitPrice: number;
  count: number;
  type: 'add' | 'subtract';
}

interface GroupedAdditionalItems {
  groups: GroupItem[];
  extras: ExtraItem[];
  cost_label?: string;
  deposit_label?: string;
}

function isGroupedFormat(val: unknown): val is GroupedAdditionalItems {
  return val != null && typeof val === 'object' && !Array.isArray(val) && 'groups' in (val as any);
}

interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string;
  recipient: string;
  flight_info: FlightInfo[];
  passenger_info: PassengerInfo[];
  ticket_info: TicketInfo[];
  total_participants: number;
  base_price_per_person: number;
  airfare_unit_price: number;
  airfare_quantity: number;
  airfare_total: number;
  seat_fee_per_person: number;
  seat_preference: string;
  additional_items: AdditionalItem[] | GroupedAdditionalItems;
  deposit_amount: number;
  total_amount: number;
  description: string;
  invoice_date: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
}

export interface InvoiceModalProps {
  bookingId?: string;       // 단일 예약
  bookingIds?: string[];    // 다중 예약
  invoiceId?: string;       // 기존 인보이스 편집
  bookingPnr: string;
  open: boolean;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

function toNum(v: string): number {
  return parseInt(v.replace(/[^0-9-]/g, ''), 10) || 0;
}

function parseJsonField<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T[]; } catch { return []; }
  }
  return [];
}

// ── Component ──────────────────────────────────────────────────────────────

export function InvoiceModal({ bookingId, bookingIds, invoiceId, bookingPnr, open, onClose }: InvoiceModalProps) {
  const isMulti = bookingIds && bookingIds.length > 1;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [copying, setCopying] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Editable fields
  const [recipient, setRecipient] = useState('');
  const [basePricePerPerson, setBasePricePerPerson] = useState(0);
  const [seatFeePerPerson, setSeatFeePerPerson] = useState(0);
  const [seatPreference, setSeatPreference] = useState('');
  const [showSeatFee, setShowSeatFee] = useState(false);
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedAdditionalItems | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [bankName, setBankName] = useState('하나은행');
  const [accountNumber, setAccountNumber] = useState('611-016420-721');
  const [accountHolder, setAccountHolder] = useState('(유)여행세상');
  const [showBankInfo, setShowBankInfo] = useState(true);

  // Derived (read-only from invoice)
  const [flightInfo, setFlightInfo] = useState<FlightInfo[]>([]);
  const [passengerInfo, setPassengerInfo] = useState<PassengerInfo[]>([]);
  const totalParticipants = passengerInfo.length || 1;

  // Fare editing mode
  const [showIndividualFare, setShowIndividualFare] = useState(false);

  // ── Computed totals ──────────────────────────────────────────────────────

  const airfareSubtotal = passengerInfo.reduce((sum, p) => sum + (p.fare || 0), 0);
  const seatSubtotal = seatFeePerPerson * totalParticipants;
  const additionalSubtotal = additionalItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const grandTotal = airfareSubtotal + seatSubtotal + additionalSubtotal;
  const balance = grandTotal - depositAmount;

  // ── 회사 설정에서 계좌 로드 ──────────────────────────────────────────────
  const loadCompanySettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data?.bank_accounts) {
        const accounts = JSON.parse(data.data.bank_accounts);
        const def = accounts.find((a: any) => a.is_default) || accounts[0];
        if (def) {
          setBankName(prev => prev === '하나은행' ? def.bank_name : prev);
          setAccountNumber(prev => prev === '611-016420-721' ? def.account_number : prev);
          setAccountHolder(prev => prev === '(유)여행세상' ? def.account_holder : prev);
        }
      }
    } catch { /* fallback to defaults */ }
  }, []);

  // ── Fetch / auto-create invoice ──────────────────────────────────────────

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (invoiceId) {
        // 기존 인보이스 로드 (편집 모드)
        res = await fetch(`/api/invoices/${invoiceId}`, { credentials: 'include' });
      } else if (isMulti && bookingIds) {
        res = await fetch('/api/invoices/multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ bookingIds }),
        });
      } else {
        res = await fetch(`/api/bookings/${bookingId}/invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
      }
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '인보이스를 불러오지 못했습니다.');
        return;
      }
      const inv: Invoice = data.data.invoice;

      const flights = parseJsonField<FlightInfo>(inv.flight_info);
      const rawPassengers = parseJsonField<PassengerInfo>(inv.passenger_info);

      // additional_items: 그룹 형식 vs 배열 형식 감지
      let addItems: AdditionalItem[] = [];
      let grouped: GroupedAdditionalItems | null = null;
      if (isGroupedFormat(inv.additional_items)) {
        grouped = inv.additional_items;
      } else {
        addItems = parseJsonField<AdditionalItem>(inv.additional_items);
      }

      // 탑승객별 요금 — 기존 fare가 없으면 base_price_per_person으로 초기화
      const defaultFare = inv.base_price_per_person || 0;
      const passengers = rawPassengers.map(p => ({
        ...p,
        fare: p.fare || defaultFare,
      }));

      // 탑승객 없으면 수량 기반으로 더미 생성
      if (passengers.length === 0 && (inv.airfare_quantity || inv.total_participants)) {
        const qty = inv.airfare_quantity || inv.total_participants || 1;
        const unitPrice = inv.airfare_unit_price || inv.base_price_per_person || 0;
        for (let i = 0; i < qty; i++) {
          passengers.push({ name_en: `탑승객 ${i + 1}`, name_kr: '', title: '', gender: '', fare: unitPrice });
        }
      }

      setInvoice(inv);
      setFlightInfo(flights);
      setPassengerInfo([...passengers]);
      setRecipient(inv.recipient || '');
      setBasePricePerPerson(inv.base_price_per_person || inv.airfare_unit_price || 0);
      setSeatFeePerPerson(inv.seat_fee_per_person || 0);
      setSeatPreference(inv.seat_preference || '');
      setShowSeatFee((inv.seat_fee_per_person || 0) > 0);
      setAdditionalItems(addItems);
      setGroupedData(grouped);
      setDepositAmount(inv.deposit_amount || 0);
      setDescription(inv.description || '');
      setBankName(inv.bank_name || '하나은행');
      setAccountNumber(inv.account_number || '611-016420-721');
      setAccountHolder(inv.account_holder || '(유)여행세상');
    } catch {
      setError('인보이스를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, bookingIds, invoiceId, isMulti]);

  useEffect(() => {
    if (open) {
      setSaveOk(false);
      setSaveError(null);
      fetchInvoice();
      loadCompanySettings();
    }
  }, [open, fetchInvoice, loadCompanySettings]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // ── Fare handlers ────────────────────────────────────────────────────────

  const applyFareToAll = () => {
    setPassengerInfo(prev => prev.map(p => ({ ...p, fare: basePricePerPerson })));
  };

  const updatePassengerFare = (index: number, value: number) => {
    setPassengerInfo(prev => prev.map((p, i) => i === index ? { ...p, fare: value } : p));
  };

  // ── Passenger add/remove ────────────────────────────────────────────────

  const addPassenger = () => {
    setPassengerInfo(prev => [...prev, { name_en: '', name_kr: '', title: 'MR', gender: 'M', fare: basePricePerPerson }]);
  };

  const removePassenger = (index: number) => {
    if (passengerInfo.length <= 1) return;
    setPassengerInfo(prev => prev.filter((_, i) => i !== index));
  };

  const updatePassengerField = (index: number, field: keyof PassengerInfo, value: string | number) => {
    setPassengerInfo(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  // ── 이미지 캡처 공통 헬퍼 ──────────────────────────────────────────────

  const captureAndCopy = async (el: HTMLElement, filename: string): Promise<boolean> => {
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return false;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      // 클립보드 실패 ��� 새 탭에 이미지 표시 → 우클릭 복사 가능
      const url = URL.createObjectURL(blob);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><head><title>${filename}</title></head><body style="margin:0;display:flex;justify-content:center;background:#f0f0f0;padding:20px"><img src="${url}" style="max-width:100%" /></body></html>`);
        win.document.title = filename;
      } else {
        // 팝업 차단 시 다운로드
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      return false;
    }
  };

  // ── 탑승객 명단 이미지 복사 ────────────────────────────────────────────

  const paxListRef = useRef<HTMLDivElement>(null);
  const [copyingPax, setCopyingPax] = useState(false);

  const handleCopyPaxImage = async () => {
    if (!paxListRef.current) return;
    setCopyingPax(true);
    try {
      const copied = await captureAndCopy(paxListRef.current, `pax-list-${invoice?.invoice_number || 'draft'}.png`);
      alert(copied
        ? '탑승객 명단이 클립보드에 복사되었습니다.\n카카오톡에 Ctrl+V로 붙여넣기 하세요.'
        : '새 탭에 이미지가 열렸습니다.\n우클릭 → 이미지 복사 → 카톡에 Ctrl+V');
    } catch {
      alert('이미지 캡처에 실패했습니다.');
    } finally {
      setCopyingPax(false);
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!invoice) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const payload = {
        recipient,
        flight_info: JSON.stringify(flightInfo),
        passenger_info: JSON.stringify(passengerInfo),
        total_participants: passengerInfo.length,
        base_price_per_person: basePricePerPerson,
        seat_fee_per_person: seatFeePerPerson,
        seat_preference: seatPreference,
        additional_items: JSON.stringify(additionalItems),
        deposit_amount: depositAmount,
        total_amount: grandTotal,
        description,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        account_holder: accountHolder || null,
      };
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSaveOk(true);
      } else {
        setSaveError(data.error || '저장에 실패했습니다.');
      }
    } catch {
      setSaveError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // ── 행 삭제 ────────────────────────────────────────────────────────────

  const removeFlight = (index: number) => {
    setFlightInfo(prev => prev.filter((_, i) => i !== index));
  };

  // ── Additional items ─────────────────────────────────────────────────────

  const addAdditionalItem = () => {
    setAdditionalItems(prev => [...prev, { label: '', amount: 0 }]);
  };

  const updateAdditionalItem = (index: number, field: keyof AdditionalItem, value: string | number) => {
    setAdditionalItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeAdditionalItem = (index: number) => {
    setAdditionalItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── Print (인보이스 모달만 인쇄) ─────────────────────────────────────────

  const handlePrint = () => {
    // 인쇄 시 모달 외 모든 요소 숨기기
    const style = document.createElement('style');
    style.id = 'invoice-print-style';
    style.textContent = `
      @media print {
        .sidebar { display: none !important; }
        .main-content { margin-left: 0 !important; padding: 0 !important; }
        .app-header, .top-bar { display: none !important; }
        .page-header { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    // backdrop에 마커 추가
    const backdrop = document.querySelector('[aria-modal="true"]') as HTMLElement | null;
    if (backdrop) backdrop.setAttribute('data-invoice-print-root', '');

    window.print();

    // 인쇄 후 정리
    setTimeout(() => {
      style.remove();
      if (backdrop) backdrop.removeAttribute('data-invoice-print-root');
    }, 500);
  };

  // ── 이미지 복사 (카톡 전달용) ────────────────────────────────────────────

  const waitForPaint = () => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const handleCopyImage = async () => {
    if (!contentRef.current) return;
    setCopying(true);

    // 미리보기 모드 전환 → DOM 반영 보장
    flushSync(() => setPreviewMode(true));
    await waitForPaint();

    const el = contentRef.current;
    const parentBody = el.closest(`.${styles.body}`) as HTMLElement | null;
    const prevOverflow = parentBody?.style.overflow;
    const prevMaxHeight = parentBody?.style.maxHeight;

    try {
      // 캡처 전: 스크롤 영역 임시 해제
      if (parentBody) {
        parentBody.style.overflow = 'visible';
        parentBody.style.maxHeight = 'none';
      }

      const filename = `invoice-${invoice?.invoice_number || 'draft'}.png`;
      const copied = await captureAndCopy(el, filename);

      // 캡처 완료 → 편집 모드 복원 후 알림
      setPreviewMode(false);
      alert(copied
        ? '이미지가 클립보드에 복사되었습니다.\n카카오톡에 Ctrl+V로 붙여넣기 하세요.'
        : '새 탭에 이미지가 열렸습니다.\n이미지에서 우클릭 → 이미지 복사 → 카톡에 Ctrl+V');
    } catch (err) {
      console.error('[invoice] Image capture failed:', err);
      alert('이미지 캡처에 실패했습니다.');
    } finally {
      // overflow 복원 (예외 안전)
      if (parentBody) {
        parentBody.style.overflow = prevOverflow || '';
        parentBody.style.maxHeight = prevMaxHeight || '';
      }
      setPreviewMode(false);
      setCopying(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="invoice-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon} aria-hidden="true">📋</span>
            <h2 className={styles.headerTitle} id="invoice-modal-title">인보이스 작성</h2>
            {invoice && (
              <span className={styles.invoiceNumber}>{invoice.invoice_number}</span>
            )}
          </div>
          <div className={styles.headerRight}>
            <span className={styles.pnrBadge}>PNR: {bookingPnr}</span>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="인보이스 모달 닫기"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          {loading && (
            <div className={styles.stateRow}>
              <span className={styles.stateText}>인보이스를 불러오는 중...</span>
            </div>
          )}

          {!loading && error && (
            <div className={styles.stateRow}>
              <span className={styles.errorText}>{error}</span>
              <button className={styles.retryBtn} onClick={fetchInvoice} type="button">
                다시 시도
              </button>
            </div>
          )}

          {!loading && !error && invoice && (
            <div className={`${styles.formContent} ${previewMode ? styles.previewMode : ''}`} ref={contentRef}>

              {/* ── 프리뷰 헤더 (프리뷰 모드에서만) ── */}
              {previewMode && (
                <div className={styles.pvHeader}>
                  <div className={styles.pvHeaderLeft}>
                    <div className={styles.pvAccentBar}></div>
                    <div className={styles.pvCompanyBlock}>
                      <div className={styles.pvCompanyName}>여행세상</div>
                      <div className={styles.pvCompanyDesc}>Travel Agency</div>
                    </div>
                  </div>
                  <div className={styles.pvHeaderRight}>
                    <div className={styles.pvTitle}>INVOICE</div>
                    <div className={styles.pvMeta}>
                      <span className={styles.pvMetaItem}>No. {invoice.invoice_number}</span>
                      <span className={styles.pvMetaItem}>{invoice.invoice_date || ''}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 수신자 ── */}
              <div className={styles.topRow}>
                <div className={styles.fieldGroup}>
                  {previewMode ? (
                    <div className={styles.pvRecipientBlock}>
                      <span className={styles.pvRecipientLabel}>수신</span>
                      <span className={styles.pvRecipientName}>{recipient || '-'}</span>
                    </div>
                  ) : (
                    <>
                      <label className={styles.fieldLabel} htmlFor="inv-recipient">수신자</label>
                      <input
                        id="inv-recipient"
                        className={styles.textInput}
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="수신자 이름 또는 대리점명"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* ── 항공 스케줄 ── */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>항공 스케줄</div>
                {flightInfo.length === 0 ? (
                  <p className={styles.emptyNote}>항공 스케줄 정보가 없습니다.</p>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.infoTable}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>편명</th>
                          <th>구간</th>
                          <th>날짜</th>
                          <th>출발</th>
                          <th>도착</th>
                          {!previewMode && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {flightInfo.map((f, i) => (
                          <tr key={i}>
                            <td className={styles.indexCell}>{i + 1}</td>
                            <td className={styles.monoCell}>{f.flight_number}</td>
                            <td>{f.route_from}&rarr;{f.route_to}</td>
                            <td>{f.departure_date}</td>
                            <td>{f.departure_time || '-'}</td>
                            <td>{f.arrival_time || '-'}</td>
                            {!previewMode && (
                              <td>
                                <button className={styles.rowDeleteBtn} type="button" onClick={() => removeFlight(i)} title="삭제">✕</button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── 탑승객 (추가/삭제 가능) ── */}
              <div className={styles.section}>
                {previewMode ? (
                  <>
                    <div className={styles.sectionTitle}>탑승객 ({passengerInfo.length}명)</div>
                    <div className={styles.tableWrapper}>
                      <table className={styles.infoTable}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>영문명</th>
                            <th>타이틀</th>
                            <th>한글명</th>
                          </tr>
                        </thead>
                        <tbody>
                          {passengerInfo.map((p, i) => (
                            <tr key={i}>
                              <td className={styles.indexCell}>{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>{p.name_en || '-'}</td>
                              <td>{p.title || '-'}</td>
                              <td>{p.name_kr || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.additionalHeader}>
                      <span className={styles.sectionTitle}>탑승객</span>
                      <span className={styles.paxTotal} style={{ marginLeft: 'auto', marginRight: 8 }}>총 {passengerInfo.length}명</span>
                      <button
                        className={styles.addItemBtn}
                        type="button"
                        onClick={addPassenger}
                      >
                        + 탑승객 추가
                      </button>
                    </div>
                    {passengerInfo.map((p, i) => (
                      <div key={i} className={styles.additionalRow}>
                        <span className={styles.indexCell} style={{ minWidth: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>{i + 1}</span>
                        <input
                          className={styles.additionalLabelInput}
                          type="text"
                          placeholder="영문명 (예: HONG/GILDONG)"
                          value={p.name_en}
                          onChange={(e) => updatePassengerField(i, 'name_en', e.target.value)}
                          aria-label={`탑승객 ${i + 1} 영문명`}
                        />
                        <select
                          className={styles.titleSelect}
                          value={p.title}
                          onChange={(e) => updatePassengerField(i, 'title', e.target.value)}
                          aria-label={`탑승객 ${i + 1} 호칭`}
                        >
                          <option value="MR">MR</option>
                          <option value="MS">MS</option>
                          <option value="MRS">MRS</option>
                          <option value="MSTR">MSTR</option>
                          <option value="MISS">MISS</option>
                        </select>
                        <input
                          className={styles.additionalLabelInput}
                          type="text"
                          placeholder="한글명"
                          value={p.name_kr}
                          onChange={(e) => updatePassengerField(i, 'name_kr', e.target.value)}
                          aria-label={`탑승객 ${i + 1} 한글명`}
                          style={{ maxWidth: 100 }}
                        />
                        <button
                          className={styles.removeItemBtn}
                          type="button"
                          onClick={() => removePassenger(i)}
                          aria-label={`탑승객 ${i + 1} 삭제`}
                          disabled={passengerInfo.length <= 1}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* ── 요금 ── */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>요금</div>

                {/* 그룹 형식 (backend에서 생성된 인보이스) — 읽기 전용 */}
                {groupedData ? (
                  <div className={styles.feeGrid}>
                    {groupedData.groups.map((g, i) => {
                      const sub = (g.unitPrice || 0) * (g.count || 0);
                      return (
                        <div key={i} className={styles.previewFeeRow}>
                          <span className={styles.previewFeeLabel}>{g.name || (groupedData.cost_label || '여행경비')} ({formatNumber(g.unitPrice)}원 × {g.count}명)</span>
                          <span className={styles.previewFeeDots} />
                          <span className={styles.previewFeeAmount}>{formatNumber(sub)}원</span>
                        </div>
                      );
                    })}
                    {groupedData.extras?.filter(ex => ex.name).map((ex, i) => {
                      const sub = (ex.unitPrice || 0) * (ex.count || 0);
                      return (
                        <div key={`ex-${i}`} className={styles.previewFeeRow}>
                          <span className={styles.previewFeeLabel}>{ex.type === 'subtract' ? '(차감) ' : ''}{ex.name} ({formatNumber(ex.unitPrice)}원 × {ex.count}명)</span>
                          <span className={styles.previewFeeDots} />
                          <span className={styles.previewFeeAmount} style={ex.type === 'subtract' ? { color: '#ef4444' } : undefined}>{ex.type === 'subtract' ? '-' : ''}{formatNumber(sub)}원</span>
                        </div>
                      );
                    })}
                    <div className={styles.feeDivider} />
                    {(() => {
                      const airTotal = groupedData.groups.reduce((s, g) => s + (g.unitPrice || 0) * (g.count || 0), 0);
                      const extTotal = (groupedData.extras || []).reduce((s, ex) => {
                        const sub = (ex.unitPrice || 0) * (ex.count || 0);
                        return ex.type === 'subtract' ? s - sub : s + sub;
                      }, 0);
                      const depTotal = groupedData.groups.reduce((s, g) => s + (g.deposit || 0) * (g.count || 0), 0);
                      const total = airTotal + extTotal;
                      const balance = total - depTotal;
                      const depLabel = groupedData.deposit_label || '계약금';
                      return (<>
                        <div className={`${styles.previewFeeRow} ${styles.totalRow}`}>
                          <span className={styles.totalLabel}>총 청구액</span>
                          <span className={styles.previewFeeDots} />
                          <span className={styles.totalAmount}>{formatNumber(total)}원</span>
                        </div>
                        {depTotal > 0 && groupedData.groups.filter(g => g.deposit > 0).map((g, i) => (
                          <div key={`dep-${i}`} className={styles.previewFeeRow}>
                            <span className={styles.previewFeeLabel} style={{ color: '#059669' }}>{depLabel} — {g.name} ({formatNumber(g.deposit)}원 × {g.count}명)</span>
                            <span className={styles.previewFeeDots} />
                            <span className={styles.previewFeeAmount} style={{ color: '#059669' }}>-{formatNumber((g.deposit || 0) * (g.count || 0))}원</span>
                          </div>
                        ))}
                        {depTotal > 0 && (
                          <div className={`${styles.previewFeeRow} ${styles.balanceRow}`}>
                            <span className={styles.previewFeeLabel}>잔금</span>
                            <span className={styles.previewFeeDots} />
                            <span className={`${styles.previewFeeAmount} ${balance > 0 ? styles.balancePositive : ''}`}>{formatNumber(balance)}원</span>
                          </div>
                        )}
                      </>);
                    })()}
                    <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>* 그룹 상세 편집은 인보이스 관리(포트 5001)에서 가능합니다.</p>
                  </div>
                ) : previewMode ? (
                  /* ── 미리보기 모드: 깔끔한 텍스트 ── */
                  <div className={styles.feeGrid}>
                    <div className={styles.previewFeeRow}>
                      <span className={styles.previewFeeLabel}>항공운임 ({totalParticipants}명)</span>
                      <span className={styles.previewFeeDots} />
                      <span className={styles.previewFeeAmount}>{formatNumber(airfareSubtotal)}원</span>
                    </div>

                    {seatSubtotal > 0 && (
                      <div className={styles.previewFeeRow}>
                        <span className={styles.previewFeeLabel}>
                          유료좌석 ({formatNumber(seatFeePerPerson)}원 × {totalParticipants}명)
                          {seatPreference && ` — ${seatPreference}`}
                        </span>
                        <span className={styles.previewFeeDots} />
                        <span className={styles.previewFeeAmount}>{formatNumber(seatSubtotal)}원</span>
                      </div>
                    )}

                    {additionalItems.filter(item => item.label || item.amount > 0).map((item, i) => (
                      <div key={i} className={styles.previewFeeRow}>
                        <span className={styles.previewFeeLabel}>{item.label || `추가항목 ${i + 1}`}</span>
                        <span className={styles.previewFeeDots} />
                        <span className={styles.previewFeeAmount}>{formatNumber(item.amount)}원</span>
                      </div>
                    ))}

                    <div className={styles.feeDivider} />

                    <div className={`${styles.previewFeeRow} ${styles.totalRow}`}>
                      <span className={styles.totalLabel}>합계</span>
                      <span className={styles.previewFeeDots} />
                      <span className={styles.totalAmount}>{formatNumber(grandTotal)}원</span>
                    </div>

                    {depositAmount > 0 && (
                      <div className={styles.previewFeeRow}>
                        <span className={styles.previewFeeLabel}>선입금</span>
                        <span className={styles.previewFeeDots} />
                        <span className={styles.previewFeeAmount}>{formatNumber(depositAmount)}원</span>
                      </div>
                    )}

                    {depositAmount > 0 && (
                      <div className={`${styles.previewFeeRow} ${styles.balanceRow}`}>
                        <span className={styles.previewFeeLabel}>잔액</span>
                        <span className={styles.previewFeeDots} />
                        <span className={`${styles.previewFeeAmount} ${balance > 0 ? styles.balancePositive : ''}`}>
                          {formatNumber(balance)}원
                        </span>
                      </div>
                    )}

                  </div>
                ) : (
                  /* ── 편집 모드: 기존 UI ── */
                  <div className={styles.feeGrid}>
                    {/* 항공운임 — 1인 요금 입력 + 전체 적용 */}
                    <div className={styles.feeRow}>
                      <span className={styles.feeLabel}>항공운임 ({totalParticipants}명)</span>
                      <div className={styles.feeInputGroup}>
                        <div className={styles.fareInputWrap}>
                          <input
                            className={styles.fareInput}
                            type="text" inputMode="numeric"
                            value={formatNumber(basePricePerPerson)}
                            onChange={(e) => setBasePricePerPerson(toNum(e.target.value))}
                            aria-label="1인 항공운임"
                            placeholder="1인 요금"
                          />
                          <span className={styles.feeUnit}>원</span>
                          <button
                            className={styles.applyAllBtn}
                            type="button"
                            onClick={applyFareToAll}
                            title="모든 탑승객에게 동일 요금 적용"
                          >
                            전체 적용
                          </button>
                        </div>
                        <button
                          className={styles.individualToggleBtn}
                          type="button"
                          onClick={() => setShowIndividualFare(v => !v)}
                        >
                          {showIndividualFare ? '▲ 개별 편집 닫기' : '▼ 개별 편집'}
                        </button>
                      </div>
                      <span className={styles.feeSubtotal}>{formatNumber(airfareSubtotal)}원</span>
                    </div>

                    {/* 개별 요금 편집 — 토글 ON 시 표시 */}
                    {showIndividualFare && passengerInfo.map((p, i) => (
                      <div key={i} className={styles.fareIndividualRow}>
                        <span className={styles.farePassengerName}>
                          {p.name_en || `탑승객 ${i + 1}`}
                        </span>
                        <div className={styles.fareInputWrap}>
                          <input
                            className={styles.fareInput}
                            type="text" inputMode="numeric"
                            value={formatNumber(p.fare || 0)}
                            onChange={(e) => updatePassengerFare(i, toNum(e.target.value))}
                            aria-label={`${p.name_en || `탑승객 ${i + 1}`} 요금`}
                          />
                          <span className={styles.feeUnit}>원</span>
                        </div>
                        <span className={styles.feeSubtotal}>{formatNumber(p.fare || 0)}원</span>
                      </div>
                    ))}

                    {/* Divider */}
                    <div className={styles.feeDivider} />

                    {/* 유료좌석 — 표시/숨김 토글 */}
                    {showSeatFee ? (
                      <>
                        <div className={styles.feeRow}>
                          <span className={styles.feeLabel}>유료좌석 (1인)</span>
                          <div className={styles.feeInputGroup}>
                            <input
                              className={styles.numberInput}
                              type="text" inputMode="numeric"
                              value={formatNumber(seatFeePerPerson)}
                              onChange={(e) => setSeatFeePerPerson(toNum(e.target.value))}
                              aria-label="유료좌석 1인 금액"
                            />
                            <span className={styles.feeUnit}>원</span>
                            <span className={styles.feeMul}>×</span>
                            <span className={styles.feePaxCount}>{totalParticipants}명</span>
                            <button
                              className={styles.removeItemBtn}
                              type="button"
                              onClick={() => { setShowSeatFee(false); setSeatFeePerPerson(0); setSeatPreference(''); }}
                              aria-label="유료좌석 삭제"
                              title="유료좌석 삭제"
                            >
                              ✕
                            </button>
                          </div>
                          <span className={styles.feeSubtotal}>{formatNumber(seatSubtotal)}원</span>
                        </div>
                        {/* 좌석 유형 — 유료좌석 금액이 있을 때만 표시 */}
                        {seatFeePerPerson > 0 && (
                          <div className={styles.feeRow}>
                            <span className={styles.feeLabel}>좌석 유형</span>
                            <div className={styles.feeInputGroup}>
                              <input
                                className={styles.textInputShort}
                                type="text"
                                value={seatPreference}
                                onChange={(e) => setSeatPreference(e.target.value)}
                                placeholder="예: 창가, 통로, 비상구"
                                aria-label="좌석 선호"
                              />
                            </div>
                            <span className={styles.feeSubtotal} />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.feeRow}>
                        <button
                          className={styles.addItemBtn}
                          type="button"
                          onClick={() => setShowSeatFee(true)}
                        >
                          + 유료좌석 추가
                        </button>
                      </div>
                    )}

                    {/* Divider */}
                    <div className={styles.feeDivider} />

                    {/* 추가 항목 */}
                    <div className={styles.additionalSection}>
                      <div className={styles.additionalHeader}>
                        <span className={styles.feeLabel}>추가 항목</span>
                        <button
                          className={styles.addItemBtn}
                          type="button"
                          onClick={addAdditionalItem}
                        >
                          + 항목 추가
                        </button>
                      </div>
                      {additionalItems.map((item, i) => (
                        <div key={i} className={styles.additionalRow}>
                          <input
                            className={styles.additionalLabelInput}
                            type="text"
                            placeholder="항목명 (예: 수하물, 유류할증료)"
                            value={item.label}
                            onChange={(e) => updateAdditionalItem(i, 'label', e.target.value)}
                            aria-label={`추가항목 ${i + 1} 이름`}
                          />
                          <input
                            className={styles.additionalAmountInput}
                            type="text" inputMode="numeric"
                            placeholder="0"
                            value={formatNumber(item.amount)}
                            onChange={(e) => updateAdditionalItem(i, 'amount', toNum(e.target.value))}
                            aria-label={`추가항목 ${i + 1} 금액`}
                          />
                          <span className={styles.feeUnit}>원</span>
                          <button
                            className={styles.removeItemBtn}
                            type="button"
                            onClick={() => removeAdditionalItem(i)}
                            aria-label={`추가항목 ${i + 1} 삭제`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {additionalItems.length > 0 && (
                        <div className={styles.feeRow}>
                          <span className={styles.feeLabel} />
                          <div className={styles.feeInputGroup} />
                          <span className={styles.feeSubtotal}>{formatNumber(additionalSubtotal)}원</span>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className={styles.feeDivider} />

                    {/* 합계 */}
                    <div className={`${styles.feeRow} ${styles.totalRow}`}>
                      <span className={styles.totalLabel}>합계</span>
                      <div className={styles.feeInputGroup} />
                      <span className={styles.totalAmount}>{formatNumber(grandTotal)}원</span>
                    </div>

                    {/* 선입금 */}
                    <div className={styles.feeRow}>
                      <span className={styles.feeLabel}>선입금</span>
                      <div className={styles.feeInputGroup}>
                        <input
                          className={styles.numberInput}
                          type="text" inputMode="numeric"
                          min={0}
                          value={formatNumber(depositAmount)}
                          onChange={(e) => setDepositAmount(toNum(e.target.value))}
                          aria-label="선입금"
                        />
                        <span className={styles.feeUnit}>원</span>
                      </div>
                      <span className={styles.feeSubtotal}>{formatNumber(depositAmount)}원</span>
                    </div>

                    {/* 잔액 */}
                    <div className={`${styles.feeRow} ${styles.balanceRow}`}>
                      <span className={styles.feeLabel}>잔액</span>
                      <div className={styles.feeInputGroup} />
                      <span className={`${styles.feeSubtotal} ${balance > 0 ? styles.balancePositive : ''}`}>
                        {formatNumber(balance)}원
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 입금 계좌 ── */}
              {previewMode ? (
                showBankInfo && bankName && (
                  <div className={styles.bankInfoPreview} style={{ marginTop: '16px' }}>
                    <div className={styles.bankInfoTitle}>입금 계좌</div>
                    <div className={styles.bankInfoRow}>
                      <span className={styles.bankLabel}>{bankName}</span>
                      <span className={styles.bankAccount}>{accountNumber}</span>
                    </div>
                    <div className={styles.bankHolder}>예금주: {accountHolder}</div>
                  </div>
                )
              ) : (
                <div className={styles.section}>
                  <div className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>입금 계좌</span>
                    <label style={{ fontSize: '12px', fontWeight: 400, cursor: 'pointer' }}>
                      <input type="checkbox" checked={showBankInfo} onChange={(e) => setShowBankInfo(e.target.checked)} style={{ marginRight: '4px' }} />
                      인쇄 시 표시
                    </label>
                  </div>
                  <div className={styles.bankEditGrid}>
                    <div className={styles.bankEditField}>
                      <label>은행명</label>
                      <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="하나은행" />
                    </div>
                    <div className={styles.bankEditField}>
                      <label>계좌번호</label>
                      <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="611-016420-721" />
                    </div>
                    <div className={styles.bankEditField}>
                      <label>예금주</label>
                      <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="(유)여행세상" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── 비고 ── */}
              {previewMode ? (
                description && (
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>비고</div>
                    <div className={styles.previewText} style={{ whiteSpace: 'pre-wrap' }}>{description}</div>
                  </div>
                )
              ) : (
                <div className={styles.section}>
                  <label className={styles.fieldLabel} htmlFor="inv-desc">비고</label>
                  <textarea
                    id="inv-desc"
                    className={styles.textarea}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="추가 안내사항이나 메모를 입력하세요."
                    rows={3}
                  />
                </div>
              )}

              {/* ── 회사 정보 (미리보기 모드 하단) ── */}
              {previewMode && (
                <div className={styles.companyFooter}>
                  <div className={styles.companyFooterLeft}>
                    <div className={styles.companyName}>여행세상</div>
                    <div className={styles.companyContact}>
                      TEL 063-271-9090 · FAX 063-271-9030 · pyo4seyo@naver.com
                    </div>
                  </div>
                  <div className={styles.pvSignArea}>
                    <div className={styles.pvSealCircle}>직인</div>
                  </div>
                </div>
              )}

              {/* ── Save feedback ── */}
              {!previewMode && saveError && <p className={styles.saveError}>{saveError}</p>}
              {!previewMode && saveOk && <p className={styles.saveOk}>저장되었습니다.</p>}
            </div>
          )}

          {/* ── 탑승객 명단 (인쇄 시 별도 페이지) ── */}
          {!loading && !error && invoice && passengerInfo.length > 0 && (
            <>
              <div ref={paxListRef} className={styles.paxListPage}>
                <div className={styles.paxListHeader}>
                  <span className={styles.headerIcon} aria-hidden="true">📋</span>
                  <h3 className={styles.paxListTitle}>탑승객 명단</h3>
                  <span className={styles.paxListInvNum}>{invoice.invoice_number}</span>
                </div>
                <table className={styles.infoTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>영문명</th>
                      <th>한글명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengerInfo.map((p, i) => (
                      <tr key={i}>
                        <td className={styles.indexCell}>{i + 1}</td>
                        <td className={styles.monoCell}>{p.name_en} {p.title}</td>
                        <td>{p.name_kr || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalFootRow}>
                      <td colSpan={3} className={styles.totalFootLabel}>총 {passengerInfo.length}명</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className={styles.paxListActions}>
                <button
                  className={styles.copyImgBtn}
                  type="button"
                  onClick={handleCopyPaxImage}
                  disabled={copyingPax}
                >
                  {copyingPax ? '캡처 중...' : '📋 탑승객 명단 이미지 복사'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Footer actions ── */}
        {!loading && !error && invoice && (
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose} type="button">
              취소
            </button>
            <button className={styles.copyImgBtn} onClick={handleCopyImage} disabled={copying} type="button">
              {copying ? '캡처 중...' : '📋 이미지 복사 (카톡)'}
            </button>
            <button className={styles.printBtn} onClick={handlePrint} type="button">
              PDF 미리보기
            </button>
            <button
              className={styles.printBtn}
              onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
              type="button"
            >
              🖨️ PDF 인쇄
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saving}
              type="button"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
