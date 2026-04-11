// @TASK P2-S3-T1 - 예약 인라인 편집 컴포넌트
// @SPEC 예약 상태/운임/비고/날짜 수정, PNR 업데이트 반영

import { useState } from 'react';
import { TicketList } from '../../components/tickets/TicketList';
import type { Booking } from './types';

interface BookingEditFieldsProps {
  booking: Booking;
  onSave: (b: Partial<Booking> & { id: string }) => void;
}

/** 인라인 편집 컴포넌트 */
export function BookingEditFields({ booking, onSave }: BookingEditFieldsProps) {
  const [editing, setEditing] = useState(false);
  const [showTicketsInEdit, setShowTicketsInEdit] = useState(false);
  const [pnrMode, setPnrMode] = useState(false);
  const [pnrText, setPnrText] = useState('');
  const [pnrParsing, setPnrParsing] = useState(false);
  const [form, setForm] = useState({
    status: booking.status || 'pending',
    agency: booking.agency || '',
    fare: booking.fare != null ? String(booking.fare) : '',
    remarks: booking.remarks || '',
    nmtl_date: booking.nmtl_date || '',
    tl_date: booking.tl_date || '',
  });
  const [saving, setSaving] = useState(false);

  /** PNR 텍스트 파싱 → 폼 자동 반영 */
  const handlePnrUpdate = async () => {
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
      if (data.success && data.data.parsed?.length > 0) {
        const parsed = data.data.parsed[0];
        setForm(prev => ({
          ...prev,
          status: parsed.status || prev.status,
          nmtl_date: parsed.nmtl_date || prev.nmtl_date,
          tl_date: parsed.tl_date || prev.tl_date,
          remarks: parsed.remarks || prev.remarks,
        }));
        setPnrMode(false);
        setPnrText('');
      }
    } catch (err) {
      console.error('PNR 파싱 실패:', err);
    } finally {
      setPnrParsing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        status: form.status,
        agency: form.agency || null,
        fare: form.fare ? Number(form.fare) : null,
        remarks: form.remarks || null,
        nmtl_date: form.nmtl_date || null,
        tl_date: form.tl_date || null,
      };
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setEditing(false);
        onSave({ id: booking.id, ...body } as Partial<Booking> & { id: string });
      }
    } catch (err) {
      console.error('저장 실패:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="booking-info-table-wrap">
        <div className="booking-info-table-titlerow">
          <span className="card-col-title">예약 정보</span>
          <button
            className="edit-toggle-btn"
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            수정 (Edit)
          </button>
        </div>
        <table className="booking-info-table">
          <thead>
            <tr>
              <th>항목</th>
              <th>상세 내용</th>
              <th>기한 날짜</th>
            </tr>
          </thead>
          <tbody>
            <tr className={booking.nmtl_date ? 'info-row-nmtl' : ''}>
              <td>NMTL (발권 마감)</td>
              <td>Name &amp; Ticket Limit</td>
              <td>{booking.nmtl_date || '-'}</td>
            </tr>
            <tr className={booking.tl_date ? 'info-row-tl' : ''}>
              <td>TL (발권 기한)</td>
              <td>Ticketing Limit</td>
              <td>{booking.tl_date || '-'}</td>
            </tr>
            <tr>
              <td>대리점 / 단체</td>
              <td colSpan={2}>{booking.agency || '-'}</td>
            </tr>
            <tr>
              <td>운임</td>
              <td colSpan={2}>{booking.fare ? `${booking.fare.toLocaleString()}원` : '-'}</td>
            </tr>
            {booking.remarks && (
              <tr>
                <td>비고</td>
                <td colSpan={2}>{booking.remarks}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="card-edit-form" onClick={(e) => e.stopPropagation()}>
      <div className="card-edit-grid">
        <div className="card-edit-field">
          <label>상태</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">대기 (Pending)</option>
            <option value="confirmed">확인 (Confirmed)</option>
            <option value="ticketed">발권완료 (Ticketed)</option>
            <option value="cancelled">취소 (Cancelled)</option>
          </select>
        </div>
        <div className="card-edit-field">
          <label>대리점/단체</label>
          <input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} placeholder="예: 롯데관광 / 김사장 유럽단체" />
        </div>
        <div className="card-edit-field">
          <label>운임</label>
          <input type="number" value={form.fare} onChange={(e) => setForm({ ...form, fare: e.target.value })} placeholder="1500000" />
        </div>
        <div className="card-edit-field">
          <label>NMTL</label>
          <input type="date" value={form.nmtl_date} onChange={(e) => setForm({ ...form, nmtl_date: e.target.value })} />
        </div>
        <div className="card-edit-field">
          <label>TL</label>
          <input type="date" value={form.tl_date} onChange={(e) => setForm({ ...form, tl_date: e.target.value })} />
        </div>
        <div className="card-edit-field card-edit-wide">
          <label>비고</label>
          <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="메모 입력" />
        </div>
      </div>

      {/* PNR 업데이트 영역 */}
      {pnrMode ? (
        <div className="pnr-update-area">
          <textarea
            className="pnr-update-textarea"
            value={pnrText}
            onChange={(e) => setPnrText(e.target.value)}
            placeholder="변경된 PNR 텍스트를 붙여넣으세요.&#10;상태(HK/HL/PN), NMTL, TL이 자동 반영됩니다."
            rows={6}
          />
          <div className="pnr-update-actions">
            <button className="cancel-btn" onClick={() => { setPnrMode(false); setPnrText(''); }}>취소</button>
            <button className="submit-btn pnr-parse-btn" onClick={handlePnrUpdate} disabled={pnrParsing || !pnrText.trim()}>
              {pnrParsing ? '파싱중...' : 'PNR 반영'}
            </button>
          </div>
        </div>
      ) : (
        <div className="pnr-update-toggle">
          <button className="pnr-update-btn" onClick={() => setPnrMode(true)}>
            PNR 업데이트
          </button>
        </div>
      )}

      {/* 티켓 관리 영역 (수정 폼 내) */}
      {showTicketsInEdit ? (
        <TicketList
          bookingId={booking.id}
          onClose={() => setShowTicketsInEdit(false)}
        />
      ) : (
        <div className="pnr-update-toggle">
          <button className="pnr-update-btn" onClick={() => setShowTicketsInEdit(true)}>
            🎫 티켓 관리
          </button>
        </div>
      )}

      <div className="card-edit-actions">
        <button className="cancel-btn" onClick={() => setEditing(false)}>취소</button>
        <button className="submit-btn" onClick={handleSave} disabled={saving}>{saving ? '저장중...' : '저장'}</button>
      </div>
    </div>
  );
}
