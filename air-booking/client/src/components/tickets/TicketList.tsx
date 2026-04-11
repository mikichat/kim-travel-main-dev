// @TASK tickets - 발권 티켓 목록 컴포넌트
// @SPEC GET /api/bookings/:id/tickets — 조회, 추가, 상태 수정, 삭제

import { useState, useEffect, useRef } from 'react';
import styles from './TicketList.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

type TicketStatus = 'issued' | 'refunded' | 'reissued' | 'void';

interface Ticket {
  id: string;
  booking_id: string;
  ticket_number: string;
  issue_date: string | null;
  status: TicketStatus;
}

export interface TicketListProps {
  bookingId: string;
  passengerName?: string;
  onClose: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TicketStatus, string> = {
  issued: '발권',
  refunded: '환불',
  reissued: '재발권',
  void: 'Void',
};

const STATUS_OPTIONS: TicketStatus[] = ['issued', 'refunded', 'reissued', 'void'];

// 붙여넣기 모드만 사용

interface ParsedTicket {
  ticket_number: string;
  passenger_name?: string;
  issue_date?: string;
  status: TicketStatus;
}

/**
 * 아바쿠스 TKT 텍스트 또는 일반 티켓번호 목록을 파싱
 *
 * 아바쿠스 형식 예시:
 *   2.TE 9885075523971-KR SIM/J TC88*AAB 1143/07NOV*I
 *   3.ME 9881933710740-KR SIM/J TC88*AAB 1307/05DEC*A
 *   5.MR 9881933710740-KR SIM/J TC88*AAB 1803/09JAN*A
 *
 * 타입코드: TE=발권, ME=재발행, MR=재발행, T=타임리밋(건너뜀)
 */
function parseTicketText(text: string): ParsedTicket[] {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);

  // 아바쿠스 TKT 형식 감지: "숫자.T" 또는 "TKT/" 패턴
  const isAbacus = lines.some(l => /^\d+\.\s*(TE|ME|MR)\s+\d{13}/.test(l));

  if (isAbacus) {
    return parseAbacusTkt(lines);
  }

  // 일반 모드: 줄바꿈/쉼표로 구분된 티켓번호
  return lines
    .flatMap(l => l.split(/[,;]+/))
    .map(s => s.trim())
    .filter(s => s.length >= 3)
    .map(ticket_number => ({ ticket_number, status: 'issued' as TicketStatus }));
}

const ABACUS_TYPE_MAP: Record<string, TicketStatus> = {
  TE: 'issued',    // Ticket Electronic — 발권
  ME: 'reissued',  // Manual Exchange — 재발행
  MR: 'reissued',  // Manual Reissue — 재발행
};

const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

function parseAbacusTkt(lines: string[]): ParsedTicket[] {
  const results: ParsedTicket[] = [];

  for (const line of lines) {
    // 패턴: 숫자.타입코드 13자리티켓번호-국가코드 승객명 ...나머지 HHMM/DDMMM*상태
    const m = line.match(
      /^\d+\.\s*(TE|ME|MR)\s+(\d{13})-\w{2}\s+(\S+)\s+\S+\s+\d{4}\/(\d{2})([A-Z]{3})/
    );
    if (!m) continue;

    const [, typeCode, rawNumber, passenger, day, monthStr] = m;
    const status = ABACUS_TYPE_MAP[typeCode] || 'issued';

    // 티켓번호 포맷: 988-5075523971 (3-10)
    const ticket_number = `${rawNumber.slice(0, 3)}-${rawNumber.slice(3)}`;

    // 날짜 변환: 07NOV → 현재연도 기준 추정
    const mm = MONTH_MAP[monthStr];
    let issue_date: string | undefined;
    if (mm && day) {
      const now = new Date();
      const year = now.getFullYear();
      // 미래 월이면 작년으로 추정
      const dateStr = `${year}-${mm}-${day}`;
      const parsed = new Date(dateStr);
      issue_date = parsed > now
        ? `${year - 1}-${mm}-${day}`
        : dateStr;
    }

    results.push({
      ticket_number,
      passenger_name: passenger.replace('/', ' '),
      issue_date,
      status,
    });
  }

  return results;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(raw: string | null): string {
  if (!raw) return '-';
  // Already formatted (YYYY-MM-DD) or ISO timestamp — show date part only
  return raw.slice(0, 10);
}

// ── Component ─────────────────────────────────────────────────────────────

export function TicketList({ bookingId, passengerName, onClose }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form — 붙여넣기 모드만
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [bulkPasteText, setBulkPasteText] = useState('');

  // Inline status dropdown: ticketId → open?
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/tickets`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data.tickets ?? data.data ?? []);
      } else {
        setError(data.error || '티켓 정보를 불러오지 못했습니다.');
      }
    } catch {
      setError('티켓 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropdownId) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setStatusDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusDropdownId]);

  // ── Add (붙여넣기만) ──────────────────────────────────────────────────

  const handleAddCancel = () => {
    setBulkPasteText('');
    setAddError(null);
    setShowAddForm(false);
  };

  const handleBulkPaste = async () => {
    const parsed = parseTicketText(bulkPasteText);
    const existingNumbers = new Set(tickets.map(t => t.ticket_number));
    const newOnly = parsed.filter(p => !existingNumbers.has(p.ticket_number));
    if (newOnly.length === 0) {
      setAddError(parsed.length > 0
        ? '모든 티켓이 이미 등록되어 있습니다.'
        : '티켓 번호를 인식할 수 없습니다. 아바쿠스 TKT 형식이나 티켓번호 목록을 붙여넣으세요.');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const tickets = newOnly.map(p => ({
        ticket_number: p.ticket_number,
        passenger_name: p.passenger_name,
        issue_date: p.issue_date,
        status: p.status,
      }));
      const res = await fetch(`/api/bookings/${bookingId}/tickets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tickets }),
      });
      const data = await res.json();
      if (data.success) {
        handleAddCancel();
        fetchTickets();
      } else {
        setAddError(data.error || '일괄 추가에 실패했습니다.');
      }
    } catch {
      setAddError('일괄 추가 중 오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  };

  // ── Status Update ──────────────────────────────────────────────────────

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    setStatusDropdownId(null);
    setUpdatingId(ticketId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTickets(prev =>
          prev.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
      }
    } catch {
      // silently fail — refetch to stay consistent
      fetchTickets();
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async (ticketId: string) => {
    setConfirmDeleteId(null);
    setDeletingId(ticketId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/tickets/${ticketId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
      }
    } catch {
      fetchTickets();
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon} aria-hidden="true">🎫</span>
          <span className={styles.headerTitle}>
            발권 티켓
            {passengerName && (
              <span className={styles.headerPassenger}> — {passengerName}</span>
            )}
          </span>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.addBtn}
            onClick={() => { setShowAddForm(true); setStatusDropdownId(null); }}
            disabled={showAddForm}
            type="button"
          >
            + 티켓 추가
          </button>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            aria-label="티켓 목록 닫기"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Loading */}
        {loading && (
          <div className={styles.stateRow}>
            <span className={styles.stateText}>불러오는 중...</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className={styles.stateRow}>
            <span className={styles.errorText}>{error}</span>
            <button className={styles.retryBtn} onClick={fetchTickets} type="button">
              다시 시도
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && tickets.length === 0 && !showAddForm && (
          <div className={styles.stateRow}>
            <span className={styles.stateText}>등록된 티켓이 없습니다.</span>
          </div>
        )}

        {/* Ticket rows */}
        {!loading && !error && tickets.length > 0 && (
          <div className={styles.ticketList}>
            {tickets.map(ticket => (
              <div key={ticket.id} className={styles.ticketRow}>
                {/* Ticket number */}
                <span className={styles.ticketNumber}>{ticket.ticket_number}</span>

                {/* Issue date */}
                <span className={styles.issueDate}>{formatDate(ticket.issue_date)}</span>

                {/* Status badge — click to open dropdown */}
                <div className={styles.statusCell}>
                  <button
                    className={`${styles.statusBadge} ${styles[`status_${ticket.status}`]}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusDropdownId(
                        statusDropdownId === ticket.id ? null : ticket.id
                      );
                    }}
                    disabled={updatingId === ticket.id || deletingId === ticket.id}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={statusDropdownId === ticket.id}
                    title="클릭하여 상태 변경"
                  >
                    {updatingId === ticket.id ? '…' : STATUS_LABEL[ticket.status]}
                    <span className={styles.statusChevron} aria-hidden="true">▾</span>
                  </button>

                  {/* Dropdown */}
                  {statusDropdownId === ticket.id && (
                    <div className={styles.statusDropdown} role="listbox" aria-label="상태 선택">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          role="option"
                          aria-selected={opt === ticket.status}
                          className={`${styles.statusOption} ${opt === ticket.status ? styles.statusOptionActive : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(ticket.id, opt);
                          }}
                          type="button"
                        >
                          <span className={`${styles.statusDot} ${styles[`dot_${opt}`]}`} aria-hidden="true" />
                          {STATUS_LABEL[opt]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <div className={styles.deleteCell}>
                  {confirmDeleteId === ticket.id ? (
                    <span className={styles.confirmRow}>
                      <span className={styles.confirmText}>삭제?</span>
                      <button
                        className={styles.confirmYes}
                        onClick={(e) => { e.stopPropagation(); handleDeleteConfirm(ticket.id); }}
                        type="button"
                      >
                        예
                      </button>
                      <button
                        className={styles.confirmNo}
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        type="button"
                      >
                        아니오
                      </button>
                    </span>
                  ) : (
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(ticket.id); }}
                      disabled={deletingId === ticket.id}
                      type="button"
                      aria-label={`티켓 ${ticket.ticket_number} 삭제`}
                    >
                      {deletingId === ticket.id ? '…' : '✕'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 티켓 추가 — 붙여넣기 */}
        {showAddForm && (() => {
          const parsed = bulkPasteText ? parseTicketText(bulkPasteText) : [];
          const existingNumbers = new Set(tickets.map(t => t.ticket_number));
          const duplicates = parsed.filter(p => existingNumbers.has(p.ticket_number));
          const newOnly = parsed.filter(p => !existingNumbers.has(p.ticket_number));

          return (
            <div className={styles.addForm}>
              <div className={styles.bulkPasteArea}>
                <label className={styles.formLabel} htmlFor="bulk-paste">
                  아바쿠스 TKT 또는 티켓번호를 붙여넣으세요
                </label>
                <textarea
                  id="bulk-paste"
                  className={styles.bulkTextarea}
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder={"2.TE 9885075523971-KR SIM/J TC88*AAB 1143/07NOV*I\n3.ME 9881933710740-KR SIM/J TC88*AAB 1307/05DEC*A\n5.MR 9881933710740-KR SIM/J TC88*AAB 1803/09JAN*A"}
                  rows={8}
                  autoFocus
                />
              </div>

              {/* 미리보기 */}
              {parsed.length > 0 && (
                <div className={styles.bulkPreview}>
                  <p className={styles.bulkPreviewCount}>
                    {parsed.length}건 감지 — {newOnly.length}건 신규
                    {duplicates.length > 0 && (
                      <span className={styles.duplicateWarn}>, {duplicates.length}건 중복</span>
                    )}
                  </p>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th></th>
                        <th>티켓번호</th>
                        <th>승객</th>
                        <th>발행일</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((p, i) => {
                        const isDup = existingNumbers.has(p.ticket_number);
                        return (
                          <tr key={i} className={isDup ? styles.previewRowDup : ''}>
                            <td>{isDup
                              ? <span className={styles.dupBadge} title="이미 등록된 번호">중복</span>
                              : <span className={styles.newBadge}>신규</span>
                            }</td>
                            <td className={styles.previewNumber}>{p.ticket_number}</td>
                            <td>{p.passenger_name || '-'}</td>
                            <td>{p.issue_date || '-'}</td>
                            <td>
                              <span className={`${styles.previewStatusDot} ${styles[`dot_${p.status}`]}`} />
                              {STATUS_LABEL[p.status]}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {duplicates.length > 0 && (
                    <p className={styles.duplicateWarnMsg}>
                      ⚠ 중복 티켓은 저장되지 않습니다 (신규 {newOnly.length}건만 추가)
                    </p>
                  )}
                </div>
              )}

              {addError && <p className={styles.addError}>{addError}</p>}
              <div className={styles.addFormActions}>
                <span className={styles.bulkHint}>아바쿠스 TKT 자동 인식</span>
                <button className={styles.cancelBtn} onClick={handleAddCancel} type="button">취소</button>
                <button className={styles.submitBtn} onClick={handleBulkPaste} disabled={adding || newOnly.length === 0} type="button">
                  {adding ? '추가 중...' : `${newOnly.length}건 추가`}
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
