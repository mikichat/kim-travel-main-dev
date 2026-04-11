// 그룹 선택 — Legacy select-group.html 마이그레이션

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface GroupSummary {
  name: string;
  count: number;
}

export default function SelectGroupPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch('/api/schedules');
        if (!res.ok) throw new Error('그룹 목록을 불러오는데 실패했습니다.');
        const schedules = await res.json();
        if (!schedules.length) { setGroups([]); return; }

        const map: Record<string, number> = {};
        schedules.forEach((s: any) => {
          const name = s.group_name || '그룹명 없음';
          map[name] = (map[name] || 0) + 1;
        });

        const list = Object.keys(map).map(name => ({ name, count: map[name] })).sort((a, b) => a.name.localeCompare(b.name));
        setGroups(list);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadGroups();
  }, []);

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🚌 여행 그룹 선택</h1>
          <p className="text-gray-500">일정을 확인할 그룹을 선택하세요</p>
        </div>

        {/* 검색 */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="그룹명 검색..."
            className="w-full px-4 py-3 rounded-xl border-0 shadow-lg text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>
        )}

        {/* 그룹 목록 */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {groups.length === 0 ? '등록된 그룹이 없습니다.' : '검색 결과가 없습니다.'}
            </div>
          ) : (
            <div className="max-h-96 overflow-auto">
              {filtered.map((group, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/landing?group=${encodeURIComponent(group.name)}`)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-lg">👥</div>
                    <div>
                      <div className="font-semibold text-gray-800">{group.name}</div>
                      <div className="text-xs text-gray-400">📅 {group.count}개의 일정</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/edit-schedule?group=${encodeURIComponent(group.name)}`); }}
                    className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 font-semibold"
                  >
                    ✏️ 수정
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={() => router.push('/schedules')} className="flex-1 bg-gray-200 text-gray-800 rounded-xl py-3 font-semibold hover:bg-gray-300 transition">📅 일정 관리</button>
          <button onClick={() => router.push('/')} className="flex-1 bg-white text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-50 transition border">🏠 메인으로</button>
        </div>
      </div>
    </div>
  );
}