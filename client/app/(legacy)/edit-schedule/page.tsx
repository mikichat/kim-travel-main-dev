// 일정 수정 — Legacy migration from frontend
// SortableJS 드래그-drop + inline 필드 편집

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

export default function EditSchedulePage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const group = params.get('group');
    if (!group) {
      showToast('그룹명이 지정되지 않았습니다.', 'error');
      router.push('/');
      return;
    }
    setGroupName(group);
    loadSchedules(group);
  }, []);

  const loadSchedules = async (group: string) => {
    try {
      const response = await fetch(`/api/schedules?group=${encodeURIComponent(group)}`);
      if (!response.ok) throw new Error('일정을 불러오는데 실패했습니다.');
      const data = await response.json();
      if (data.length === 0) {
        showToast('해당 그룹의 일정이 없습니다.', 'error');
        router.push('/');
        return;
      }
      setSchedules(data);
    } catch (err) {
      showToast(`오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`, 'error');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (id: number, field: string, value: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteSchedule = async (id: number) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
    setSchedules(prev => prev.filter(s => s.id !== id));
    await fetch(`/api/schedules/${id}`, { method: 'DELETE' }).catch(console.error);
    showToast('삭제되었습니다.');
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === schedules.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(schedules.map(s => s.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) {
      showToast('삭제할 일정을 선택해주세요.', 'error');
      return;
    }
    if (!confirm(`선택한 ${selectedIds.size}개의 일정을 삭제하시겠습니까?`)) return;

    setSchedules(prev => prev.filter(s => !selectedIds.has(s.id)));
    selectedIds.forEach(id => {
      fetch(`/api/schedules/${id}`, { method: 'DELETE' }).catch(console.error);
    });
    showToast(`${selectedIds.size}개 삭제되었습니다.`);
    setSelectedIds(new Set());
  };

  const saveChanges = async () => {
    if (!confirm('변경사항을 저장하시겠습니까?')) return;
    try {
      await Promise.all(schedules.map(s =>
        fetch(`/api/schedules/${s.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_name: s.group_name,
            event_date: s.event_date,
            location: s.location,
            transport: s.transport || s.transportation,
            time: s.time,
            schedule: s.schedule || s.itinerary,
            meals: s.meals || s.meal,
          }),
        })
      ));
      showToast('변경사항이 저장되었습니다.');
    } catch {
      showToast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const previewLanding = () => {
    window.open(`/landing?group=${encodeURIComponent(groupName)}`, '_blank');
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-white text-center">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">✏️ 일정 수정</h1>
            <p className="text-indigo-600 font-medium mt-1">👥 {groupName}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={selectAll} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
              {selectedIds.size === schedules.length ? '전체 해제' : '전체 선택'}
            </button>
            <button onClick={deleteSelected} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
              선택 삭제
            </button>
          </div>
        </div>

        {/* 일정 목록 */}
        <div ref={listRef} className="space-y-4 mb-6">
          {schedules.map((schedule, index) => (
            <div
              key={schedule.id}
              className={`bg-white rounded-xl p-5 shadow-md border-2 transition-all ${
                selectedIds.has(schedule.id) ? 'border-indigo-400 bg-indigo-50' : 'border-transparent hover:border-indigo-200'
              }`}
            >
              <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-100">
                <div className="text-gray-300 text-2xl cursor-grab">⋮⋮</div>
                <input
                  type="checkbox"
                  checked={selectedIds.has(schedule.id)}
                  onChange={() => toggleSelect(schedule.id)}
                  className="mt-1 w-5 h-5 accent-indigo-600 cursor-pointer"
                />
                <div className="flex gap-3 flex-wrap flex-1">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                    📅 {formatDate(schedule.event_date) || '일자 미정'}
                  </span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                    📍 {schedule.location || '위치 미정'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">일자</label>
                  <input
                    type="date"
                    value={schedule.event_date || ''}
                    onChange={(e) => updateField(schedule.id, 'event_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">지역</label>
                  <input
                    type="text"
                    value={schedule.location || ''}
                    onChange={(e) => updateField(schedule.id, 'location', e.target.value)}
                    placeholder="위치 미정"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">교통편</label>
                  <input
                    type="text"
                    value={schedule.transport || schedule.transportation || ''}
                    onChange={(e) => updateField(schedule.id, 'transport', e.target.value)}
                    placeholder="항공, 버스 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">시간</label>
                  <input
                    type="text"
                    value={schedule.time || ''}
                    onChange={(e) => updateField(schedule.id, 'time', e.target.value)}
                    placeholder="09:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">식사</label>
                  <input
                    type="text"
                    value={schedule.meals || schedule.meal || ''}
                    onChange={(e) => updateField(schedule.id, 'meals', e.target.value)}
                    placeholder="조식, 중식"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">세부일정</label>
                  <textarea
                    value={schedule.schedule || schedule.itinerary || ''}
                    onChange={(e) => updateField(schedule.id, 'schedule', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => deleteSchedule(schedule.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                >
                  🗑️ 삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 액션 바 */}
        <div className="bg-white rounded-xl p-6 shadow-lg flex justify-between items-center flex-wrap gap-4">
          <div className="text-sm text-gray-500">
            {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : `${schedules.length}개 일정`}
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              ← 그룹 선택
            </button>
            <button onClick={previewLanding} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              👁️ 미리보기
            </button>
            <button onClick={saveChanges} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              💾 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
