// 여행 일정표 — Legacy migration from frontend

'use client';

import { useState, useEffect } from 'react';

interface Schedule {
  id: number;
  event_date: string;
  location: string | null;
  transport: string | null;
  transportation: string | null;
  time: string | null;
  schedule: string | null;
  itinerary: string | null;
  meals: string | null;
  meal: string | null;
  group_name: string | null;
}

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

export default function LandingPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const group = params.get('group');
    setGroupName(group);

    async function loadSchedules() {
      try {
        const url = group
          ? `/api/schedules?group=${encodeURIComponent(group)}`
          : '/api/schedules';
        const response = await fetch(url);
        if (!response.ok) throw new Error('일정을 불러오는데 실패했습니다.');
        const data = await response.json();
        setSchedules(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    }
    loadSchedules();
  }, []);

  const dateGroups: Record<string, Schedule[]> = {};
  schedules.forEach(schedule => {
    const date = schedule.event_date;
    if (!dateGroups[date]) dateGroups[date] = [];
    dateGroups[date].push(schedule);
  });

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* 상단 헤더 */}
      <div className="bg-white shadow-lg px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl">✈️</span>
          </div>
          <span className="text-xl font-bold text-indigo-600">여행사</span>
        </div>
        <div className="flex gap-6 text-gray-600 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-indigo-500">📍</span>
            <span>전주시 완산구 서신로8</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-indigo-500">📞</span>
            <span>063-271-9090</span>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-6xl mx-auto my-8 px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* 카드 헤더 */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8 text-center">
            <h1 className="text-3xl font-bold mb-2">📅 여행 일정표</h1>
            <p className="text-lg opacity-90">
              {groupName ? `👥 ${escapeHtml(groupName)}` : '상세한 일정을 확인하세요'}
            </p>
          </div>

          {/* 일정 테이블 */}
          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">일정을 불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                <p className="text-2xl mb-2">⚠️</p>
                <p>일정을 불러오는 중 오류가 발생했습니다.</p>
                <p className="text-sm text-gray-400 mt-2">{error}</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-4">📭</p>
                <p>등록된 일정이 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left font-medium text-gray-600 border-b-2 border-gray-200 w-24">일자</th>
                      <th className="p-3 text-left font-medium text-gray-600 border-b-2 border-gray-200 w-28">지역</th>
                      <th className="p-3 text-left font-medium text-gray-600 border-b-2 border-gray-200 w-24">교통편</th>
                      <th className="p-3 text-left font-medium text-gray-600 border-b-2 border-gray-200 w-20">시간</th>
                      <th className="p-3 text-left font-medium text-gray-600 border-b-2 border-gray-200">세부일정</th>
                      <th className="p-3 text-left font-medium text-gray-600 border-b-2 border-gray-200 w-28">식사</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(dateGroups).sort().map(date => {
                      const schedulesByDate = dateGroups[date];
                      const dateRowspan = schedulesByDate.length;

                      const locationGroups: Record<string, Schedule[]> = {};
                      schedulesByDate.forEach(s => {
                        const location = s.location || '-';
                        if (!locationGroups[location]) locationGroups[location] = [];
                        locationGroups[location].push(s);
                      });

                      let isFirstDateRow = true;

                      return Object.keys(locationGroups).map(location => {
                        const schedulesByLocation = locationGroups[location];
                        const locationRowspan = schedulesByLocation.length;

                        return schedulesByLocation.map((schedule, locationIndex) => (
                          <tr key={schedule.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                            {isFirstDateRow && (
                              <td
                                className="p-3 font-semibold text-indigo-600 bg-gray-50 border-r-2 border-gray-200 text-center align-middle"
                                rowSpan={dateRowspan}
                              >
                                {formatDate(schedule.event_date)}
                              </td>
                            )}
                            {locationIndex === 0 && (
                              <td
                                className="p-3 font-semibold text-gray-700 bg-gray-50 border-r-2 border-gray-200 text-center align-middle"
                                rowSpan={locationRowspan}
                              >
                                {escapeHtml(location)}
                              </td>
                            )}
                            <td className="p-3">
                              <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                {schedule.transport || schedule.transportation || '-'}
                              </span>
                            </td>
                            <td className="p-3 text-gray-500">{schedule.time || '-'}</td>
                            <td className="p-3 text-gray-700 leading-relaxed whitespace-pre-line">
                              {schedule.schedule || schedule.itinerary || '-'}
                            </td>
                            <td className="p-3 text-gray-500 text-xs">
                              {(schedule.meals || schedule.meal) && (
                                <span>
                                  <span className="text-orange-400 mr-1">🍽️</span>
                                  {schedule.meals || schedule.meal}
                                </span>
                              )}
                            </td>
                          </tr>
                        ));
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
