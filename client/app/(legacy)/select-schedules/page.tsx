// 일정 선택 및 관리 — Legacy select-schedules.html 마이그레이션

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Schedule {
  id: number;
  group_name?: string;
  event_date?: string;
  location?: string;
  transport?: string;
  transportation?: string;
  time?: string;
  schedule?: string;
  itinerary?: string;
  meals?: string;
  meal?: string;
}

export default function SelectSchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filtered, setFiltered] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      setSchedules(data);
      setFiltered(data);
    } catch (e: any) {
      showToast('일정을 불러오는 중 오류가 발생했습니다: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const groups = [...new Set(schedules.map(s => s.group_name).filter(Boolean))] as string[];
  const dates = [...new Set(schedules.map(s => s.event_date).filter(Boolean))] as string[];

  useEffect(() => {
    const filtered = schedules.filter(s => {
      const matchSearch = !search ||
        (s.group_name?.toLowerCase().includes(search.toLowerCase())) ||
        (s.location?.toLowerCase().includes(search.toLowerCase())) ||
        (s.schedule?.toLowerCase().includes(search.toLowerCase())) ||
        (s.itinerary?.toLowerCase().includes(search.toLowerCase()));
      const matchGroup = !groupFilter || s.group_name === groupFilter;
      const matchDate = !dateFilter || s.event_date === dateFilter;
      return matchSearch && matchGroup && matchDate;
    });
    setFiltered(filtered);
  }, [search, groupFilter, dateFilter, schedules]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filtered.map(s => s.id)));
    else setSelected(new Set());
  };

  const deleteSelected = async () => {
    if (selected.size === 0) { showToast('삭제할 일정을 선택해주세요.', 'warning'); return; }
    if (!confirm(`선택한 ${selected.size}개의 일정을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all([...selected].map(id =>
        fetch(`/api/schedules/${id}`, { method: 'DELETE' })
      ));
      showToast('선택한 일정이 삭제되었습니다.');
      setSelected(new Set());
      loadSchedules();
    } catch { showToast('삭제 중 오류가 발생했습니다.', 'error'); }
  };

  const exportSelected = () => {
    if (selected.size === 0) { showToast('내보낼 일정을 선택해주세요.', 'warning'); return; }
    const selectedItems = filtered.filter(s => selected.has(s.id));
    const headers = ['그룹명', '일자', '지역', '교통편', '시간', '세부일정', '식사'];
    const csv = [
      headers.join(','),
      ...selectedItems.map(s => [
        s.group_name || '', s.event_date || '', s.location || '',
        s.transport || s.transportation || '', s.time || '',
        (s.schedule || s.itinerary || '').replace(/,/g, ';'),
        s.meals || s.meal || ''
      ].join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `일정_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('CSV 파일이 다운로드되었습니다.');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-800 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' :
          toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">✅ 일정 선택 및 관리</h1>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="검색... (그룹명, 지역, 일정)"
              className="px-4 py-2 border-2 border-gray-200 rounded-lg flex-1 min-w-[250px] focus:outline-none focus:border-purple-500"
            />
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500">
              <option value="">전체 그룹</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500">
              <option value="">전체 날짜</option>
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={() => selected.size < filtered.length ? setSelected(new Set(filtered.map(s => s.id))) : setSelected(new Set())} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium">
              {selected.size < filtered.length ? '☑️ 전체 선택' : '⬜ 선택 해제'}
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 p-3 text-center">
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={e => toggleAll(e.target.checked)} />
                  </th>
                  <th className="p-3 text-left font-medium text-gray-600">그룹명</th>
                  <th className="p-3 text-left font-medium text-gray-600">일자</th>
                  <th className="p-3 text-left font-medium text-gray-600">지역</th>
                  <th className="p-3 text-left font-medium text-gray-600">교통편</th>
                  <th className="p-3 text-left font-medium text-gray-600">시간</th>
                  <th className="p-3 text-left font-medium text-gray-600">세부일정</th>
                  <th className="p-3 text-left font-medium text-gray-600">식사</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className={`border-t border-gray-100 hover:bg-gray-50 ${selected.has(s.id) ? 'bg-purple-50' : ''}`}>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} />
                    </td>
                    <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{s.group_name || '-'}</span></td>
                    <td className="p-3">{s.event_date || '-'}</td>
                    <td className="p-3">{s.location || '-'}</td>
                    <td className="p-3">{s.transport || s.transportation || '-'}</td>
                    <td className="p-3">{s.time || '-'}</td>
                    <td className="p-3 max-w-xs truncate">{s.schedule || s.itinerary || '-'}</td>
                    <td className="p-3">{s.meals || s.meal || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 액션 바 */}
        <div className="bg-white rounded-xl shadow-2xl p-4 flex justify-between items-center flex-wrap gap-3 sticky bottom-4">
          <span className="text-purple-600 font-semibold text-lg">{selected.size}개 선택됨</span>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportSelected} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">📤 선택 항목 내보내기</button>
            <button onClick={deleteSelected} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">🗑️ 선택 항목 삭제</button>
            <button onClick={() => router.push('/select-group')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">← 그룹 선택</button>
          </div>
        </div>
      </div>
    </div>
  );
}