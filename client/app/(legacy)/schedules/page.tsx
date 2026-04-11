// 일정 관리 — Legacy migration from frontend
// 달력 뷰, 통계, 필터, CRUD

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Schedule {
  id: number;
  group_name: string | null;
  event_date: string | null;
  location: string | null;
  transport: string | null;
  transportation: string | null;
  time: string | null;
  schedule: string | null;
  itinerary: string | null;
  meals: string | null;
  meal: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateForDB(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    group_name: '',
    event_date: '',
    location: '',
    transport: '',
    time: '',
    schedule: '',
    meals: '',
  });

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules');
      if (!res.ok) throw new Error('일정을 불러오는데 실패했습니다.');
      const data = await res.json();
      setSchedules(data);
      setFilteredSchedules(data);
    } catch (err) {
      showToast('일정을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  useEffect(() => {
    let filtered = schedules;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(sch =>
        (sch.group_name && sch.group_name.toLowerCase().includes(s)) ||
        (sch.schedule && sch.schedule.toLowerCase().includes(s)) ||
        (sch.location && sch.location.toLowerCase().includes(s)) ||
        (sch.transport && sch.transport.toLowerCase().includes(s))
      );
    }
    if (dateFilter) filtered = filtered.filter(sch => sch.event_date === dateFilter);
    if (groupFilter) filtered = filtered.filter(sch => sch.group_name === groupFilter);
    setFilteredSchedules(filtered);
  }, [search, dateFilter, groupFilter, schedules]);

  const resetForm = () => {
    setForm({ group_name: '', event_date: '', location: '', transport: '', time: '', schedule: '', meals: '' });
    setEditId(null);
  };

  const editSchedule = (sch: Schedule) => {
    setEditId(sch.id);
    setForm({
      group_name: sch.group_name || '',
      event_date: sch.event_date || '',
      location: sch.location || '',
      transport: sch.transport || '',
      time: sch.time || '',
      schedule: sch.schedule || '',
      meals: sch.meals || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        group_name: form.group_name || null,
        event_date: form.event_date || null,
        location: form.location || null,
        transport: form.transport || null,
        time: form.time || null,
        schedule: form.schedule,
        meals: form.meals || null,
      };
      const url = editId ? `/api/schedules/${editId}` : '/api/schedules';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('저장에 실패했습니다.');
      showToast(editId ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.');
      resetForm();
      fetchSchedules();
    } catch {
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  const deleteSchedule = async (id: number) => {
    if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      showToast('일정이 삭제되었습니다.');
      fetchSchedules();
    } catch {
      showToast('삭제에 실패했습니다.', 'error');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setDateFilter('');
    setGroupFilter('');
  };

  // 통계
  const today = formatDateForDB(new Date());
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  const stats = {
    total: schedules.length,
    today: schedules.filter(s => s.event_date === today).length,
    week: schedules.filter(s => {
      if (!s.event_date) return false;
      const d = new Date(s.event_date);
      return d >= weekStart && d <= new Date();
    }).length,
    month: schedules.filter(s => {
      if (!s.event_date) return false;
      const d = new Date(s.event_date);
      return d >= monthStart && d <= new Date();
    }).length,
  };

  // 캘린더
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const cells: React.ReactNode[] = [];

    // 이전 달 날짜
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      cells.push(
        <div key={`prev-${i}`} className="p-2 text-center text-gray-300 text-sm">
          {prevLastDate - i}
        </div>
      );
    }

    // 현재 달 날짜
    for (let date = 1; date <= lastDate; date++) {
      const dateStr = formatDateForDB(new Date(year, month, date));
      const daySchedules = schedules.filter(s => s.event_date === dateStr);
      const isToday = dateStr === today;

      cells.push(
        <div
          key={date}
          onClick={() => { setDateFilter(dateStr); }}
          className={`p-2 rounded-lg cursor-pointer transition-all text-sm min-h-16 ${
            isToday ? 'bg-amber-100 border-2 border-amber-400' :
            daySchedules.length > 0 ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100' :
            'hover:bg-gray-50'
          }`}
        >
          <div className={`font-semibold ${isToday ? 'text-amber-700' : 'text-gray-700'}`}>{date}</div>
          {daySchedules.slice(0, 2).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 inline-block mr-1" />
          ))}
          {daySchedules.length > 2 && <span className="text-xs text-blue-600">+{daySchedules.length - 2}</span>}
        </div>
      );
    }

    // 다음 달 날짜
    const remaining = 42 - cells.length;
    for (let date = 1; date <= remaining; date++) {
      cells.push(
        <div key={`next-${date}`} className="p-2 text-center text-gray-300 text-sm">
          {date}
        </div>
      );
    }

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{year}년 {month + 1}월</h2>
          <div className="flex gap-2">
            <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200">←</button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-blue-100 rounded text-sm hover:bg-blue-200">오늘</button>
            <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200">→</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => (
            <div key={d} className="p-2 text-center font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded text-sm">{d}</div>
          ))}
          {cells}
        </div>
      </div>
    );
  };

  // 그룹 목록
  const groupNames = [...new Set(schedules.map(s => s.group_name).filter(Boolean))] as string[];

  // 날짜별 그룹화
  const groupedByDate: Record<string, Schedule[]> = {};
  [...filteredSchedules].sort((a, b) => b.event_date?.localeCompare(a.event_date || '') || 0).forEach(s => {
    const date = s.event_date || 'no-date';
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(s);
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}

      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-indigo-600 mb-6">📅 일정 관리</h1>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow text-center">
            <div className="text-3xl font-bold text-indigo-600">{stats.total}</div>
            <div className="text-sm text-gray-500">전체 일정</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow text-center">
            <div className="text-3xl font-bold text-green-600">{stats.today}</div>
            <div className="text-sm text-gray-500">오늘</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow text-center">
            <div className="text-3xl font-bold text-amber-600">{stats.week}</div>
            <div className="text-sm text-gray-500">이번 주</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.month}</div>
            <div className="text-sm text-gray-500">이번 달</div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-xl p-4 shadow mb-6 flex gap-4 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="일정 검색..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm min-w-48"
          />
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">모든 그룹</option>
            {groupNames.sort().map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button onClick={resetFilters} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">초기화</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 폼 */}
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{editId ? '✏️ 일정 수정' : '➕ 새 일정 추가'}</h2>
            <form onSubmit={saveSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">그룹명</label>
                <input type="text" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} placeholder="예: 하노이 골프단" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">일자</label>
                <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">지역</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="예: 인천, 하노이" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">교통편</label>
                <input type="text" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} placeholder="예: OZ123편" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
                <input type="text" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="09:00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">세부일정 <span className="text-red-500">*</span></label>
                <textarea value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} required rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">식사</label>
                <input type="text" value={form.meals} onChange={(e) => setForm({ ...form, meals: e.target.value })} placeholder="조식, 중식" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">{editId ? '수정' : '추가'}</button>
                {editId && <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">취소</button>}
              </div>
            </form>
          </div>

          {/* 달력 + 목록 */}
          <div className="lg:col-span-2 space-y-6">
            {renderCalendar()}

            {/* 목록 */}
            <div className="bg-white rounded-xl p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">일정 목록</h2>
              {Object.keys(groupedByDate).length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-4">📭</p>
                  <p>등록된 일정이 없습니다.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left font-medium text-gray-600 border-b w-24">일자</th>
                        <th className="p-3 text-left font-medium text-gray-600 border-b w-24">지역</th>
                        <th className="p-3 text-left font-medium text-gray-600 border-b w-24">교통편</th>
                        <th className="p-3 text-left font-medium text-gray-600 border-b w-20">시간</th>
                        <th className="p-3 text-left font-medium text-gray-600 border-b">세부일정</th>
                        <th className="p-3 text-left font-medium text-gray-600 border-b w-20">식사</th>
                        <th className="p-3 text-left font-medium text-gray-600 border-b w-24">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(groupedByDate).map(date => {
                        const items = groupedByDate[date];
                        return items.map((sch, idx) => (
                          <tr key={sch.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-medium text-indigo-600">{date !== 'no-date' ? formatDate(date) : '-'}</td>
                            <td className="p-3">{sch.location || '-'}</td>
                            <td className="p-3 text-gray-500 text-xs">{sch.transport || '-'}</td>
                            <td className="p-3 text-gray-500">{sch.time || '-'}</td>
                            <td className="p-3">
                              {sch.group_name && <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs mb-1">{sch.group_name}</span>}
                              <p className="whitespace-pre-line text-gray-700">{sch.schedule || sch.itinerary || '-'}</p>
                            </td>
                            <td className="p-3 text-gray-500 text-xs">{sch.meals || sch.meal || '-'}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <button onClick={() => editSchedule(sch)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">✏️</button>
                                <button onClick={() => deleteSchedule(sch.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
