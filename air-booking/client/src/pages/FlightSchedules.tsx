// 항공 스케줄 관리 — travel_agency.db flight_schedules 테이블 조회/생성/삭제

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import '../styles/flight-schedules.css';

interface FlightSchedule {
  id: string;
  group_id: string | null;
  group_name: string | null;
  airline: string;
  flight_number: string | null;
  departure_date: string;
  departure_airport: string;
  departure_time: string;
  arrival_date: string;
  arrival_airport: string;
  arrival_time: string;
  passengers: number;
  created_at: string;
}

interface CreateForm {
  group_name: string;
  airline: string;
  flight_number: string;
  departure_date: string;
  departure_airport: string;
  departure_time: string;
  arrival_date: string;
  arrival_airport: string;
  arrival_time: string;
  passengers: string;
}

const EMPTY_FORM: CreateForm = {
  group_name: '',
  airline: '',
  flight_number: '',
  departure_date: '',
  departure_airport: '',
  departure_time: '',
  arrival_date: '',
  arrival_airport: '',
  arrival_time: '',
  passengers: '0',
};

export function FlightSchedules() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<FlightSchedule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departureFrom, setDepartureFrom] = useState('');
  const [departureTo, setDepartureTo] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'bookings'>('schedule');
  const [relatedBookings, setRelatedBookings] = useState<{ id: string; pnr: string; airline: string; flight_number: string; departure_date: string; status: string; pax_count: number }[]>([]);

  const fetchSchedules = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (departureFrom) params.set('departure_from', departureFrom);
      if (departureTo) params.set('departure_to', departureTo);

      const res = await fetch(`/api/flight-schedules?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data.schedules);
        setTotal(data.data.total);
      }
    } catch {
      toast.error('항공 스케줄 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [search, departureFrom, departureTo]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = async () => {
    if (!form.airline || !form.departure_date || !form.departure_airport || !form.departure_time || !form.arrival_date || !form.arrival_airport || !form.arrival_time) {
      toast.error('필수 항목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/flight-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          passengers: Number(form.passengers) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('항공 스케줄이 등록되었습니다.');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        fetchSchedules();
      } else {
        toast.error(data.error || '등록에 실패했습니다.');
      }
    } catch {
      toast.error('항공 스케줄 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 스케줄을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/flight-schedules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('삭제되었습니다.');
        fetchSchedules();
      } else {
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return d.slice(0, 10);
  };

  const updateForm = (field: keyof CreateForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <LoadingSpinner />;

  const handleCsvExport = () => {
    window.open('/api/flight-schedules/export/csv', '_blank');
  };

  const fetchRelatedBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('sort', 'departure_date');
      params.set('order', 'desc');
      params.set('limit', '50');
      const res = await fetch(`/api/bookings?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRelatedBookings(data.data.bookings || []);
    } catch { /* ignore */ }
  }, [search]);

  useEffect(() => {
    if (activeTab === 'bookings') fetchRelatedBookings();
  }, [activeTab, fetchRelatedBookings]);

  return (
    <div className="fs-page">
      {/* 2탭 탭바 */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', marginBottom: '12px' }}>
        {[
          { id: 'schedule' as const, label: '스케줄' },
          { id: 'bookings' as const, label: '예약장부' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 24px', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: '-2px',
              background: activeTab === tab.id ? '#eff6ff' : 'transparent',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer', fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' ? (
        <div>
          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#64748b' }}>{relatedBookings.length}건의 예약</div>
          {relatedBookings.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>관련 예약이 없습니다.</div>
          ) : (
            <table className="fs-table">
              <thead><tr><th>PNR</th><th>항공사</th><th>편명</th><th>출발일</th><th>상태</th><th>인원</th></tr></thead>
              <tbody>
                {relatedBookings.map(b => (
                  <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/bookings?highlight=${b.id}`)}>
                    <td style={{ fontWeight: 600 }}>{b.pnr}</td>
                    <td>{b.airline}</td>
                    <td>{b.flight_number}</td>
                    <td>{b.departure_date}</td>
                    <td>{b.status}</td>
                    <td>{b.pax_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : <>

      <div className="fs-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="search-input"
            placeholder="단체명, 항공사, 편명, 공항 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="스케줄 검색"
          />
          <input
            type="date"
            value={departureFrom}
            onChange={(e) => setDepartureFrom(e.target.value)}
            aria-label="출발일 시작"
          />
          <input
            type="date"
            value={departureTo}
            onChange={(e) => setDepartureTo(e.target.value)}
            aria-label="출발일 종료"
          />
        </div>
        <div className="toolbar-right">
          <button
            className="fs-air1-link"
            onClick={() => navigate('/converter')}
          >
            PNR 변환기
          </button>
          <button className="fs-add-btn" onClick={handleCsvExport} style={{ background: '#059669' }}>
            CSV 내보내기
          </button>
          <label className="fs-add-btn" style={{ background: '#0284c7', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            CSV 가져오기
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              try {
                const res = await fetch('/api/flight-schedules/import', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  credentials: 'include', body: JSON.stringify({ csv: text }),
                });
                const data = await res.json();
                if (data.success) { toast.success(`${data.data.imported}건 가져오기 완료`); fetchSchedules(); }
                else toast.error(data.error || 'CSV 가져오기 실패');
              } catch { toast.error('CSV 가져오기 실패'); }
              e.target.value = '';
            }} />
          </label>
          <button className="fs-add-btn" onClick={() => setCreateOpen(true)}>
            + 스케줄 등록
          </button>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="fs-empty">항공 스케줄 데이터가 없습니다.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="fs-table">
            <thead>
              <tr>
                <th>단체명</th>
                <th>항공사</th>
                <th>편명</th>
                <th>출발</th>
                <th>출발시간</th>
                <th>도착</th>
                <th>도착시간</th>
                <th>인원</th>
                <th>등록일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{s.group_name || '-'}</td>
                  <td>{s.airline}</td>
                  <td>{s.flight_number || '-'}</td>
                  <td>
                    <span className="fs-airport">{s.departure_airport}</span>
                    <span className="fs-date">{formatDate(s.departure_date)}</span>
                  </td>
                  <td>{s.departure_time}</td>
                  <td>
                    <span className="fs-airport">{s.arrival_airport}</span>
                    <span className="fs-date">{formatDate(s.arrival_date)}</span>
                  </td>
                  <td>{s.arrival_time}</td>
                  <td>{s.passengers}명</td>
                  <td>{formatDate(s.created_at)}</td>
                  <td>
                    <button
                      className="fs-delete-btn"
                      onClick={() => handleDelete(s.id)}
                      aria-label="삭제"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="fs-footer">총 {total}건</div>

      {/* Create Modal */}
      </>}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="항공 스케줄 등록"
        size="lg"
      >
        <div className="fs-form">
          <div className="fs-form-row">
            <label>
              단체명
              <input type="text" value={form.group_name} onChange={(e) => updateForm('group_name', e.target.value)} />
            </label>
            <label>
              항공사 *
              <input type="text" value={form.airline} onChange={(e) => updateForm('airline', e.target.value)} placeholder="예: 대한항공" />
            </label>
            <label>
              편명
              <input type="text" value={form.flight_number} onChange={(e) => updateForm('flight_number', e.target.value)} placeholder="예: KE001" />
            </label>
          </div>
          <div className="fs-form-row">
            <label>
              출발일 *
              <input type="date" value={form.departure_date} onChange={(e) => updateForm('departure_date', e.target.value)} />
            </label>
            <label>
              출발공항 *
              <input type="text" value={form.departure_airport} onChange={(e) => updateForm('departure_airport', e.target.value)} placeholder="예: ICN" />
            </label>
            <label>
              출발시간 *
              <input type="time" value={form.departure_time} onChange={(e) => updateForm('departure_time', e.target.value)} />
            </label>
          </div>
          <div className="fs-form-row">
            <label>
              도착일 *
              <input type="date" value={form.arrival_date} onChange={(e) => updateForm('arrival_date', e.target.value)} />
            </label>
            <label>
              도착공항 *
              <input type="text" value={form.arrival_airport} onChange={(e) => updateForm('arrival_airport', e.target.value)} placeholder="예: NRT" />
            </label>
            <label>
              도착시간 *
              <input type="time" value={form.arrival_time} onChange={(e) => updateForm('arrival_time', e.target.value)} />
            </label>
          </div>
          <div className="fs-form-row">
            <label>
              인원
              <input type="number" min="0" value={form.passengers} onChange={(e) => updateForm('passengers', e.target.value)} />
            </label>
          </div>
          <div className="fs-form-actions">
            <button className="btn-cancel" onClick={() => setCreateOpen(false)}>취소</button>
            <button className="btn-save" onClick={handleCreate} disabled={saving}>
              {saving ? '저장 중...' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
