// 일정 관리 — Legacy itinerary.html 마이그레이션

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ItineraryItem {
  id: number;
  group_id: number;
  day: number;
  date: string;
  time: string;
  location: string;
  transport: string;
  content: string;
  meal: string;
}

export default function ItineraryPage() {
  const router = useRouter();
  const params = useSearchParams();
  const groupId = params.get('group_id');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ day: 1, date: '', time: '', location: '', transport: '', content: '', meal: '' });

  const fetchItems = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const res = await fetch(`/tables/itineraries?group_id=${groupId}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { console.error('Failed to load itineraries'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!groupId) return;
    const url = editingId ? `/tables/itineraries/${editingId}` : '/tables/itineraries';
    const method = editingId ? 'PUT' : 'POST';
    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, group_id: Number(groupId) }),
      });
      setEditingId(null);
      setForm({ day: 1, date: '', time: '', location: '', transport: '', content: '', meal: '' });
      fetchItems();
    } catch { alert('저장 실패'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await fetch(`/tables/itineraries/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  if (!groupId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        그룹 ID가 필요합니다.团体 목록에서 선택해주세요.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">일정 관리</h1>
            <div className="text-sm text-gray-500">그룹 ID: {groupId}</div>
          </div>
          <button onClick={() => router.push('/group-list')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">←団体 목록</button>
        </div>

        {/* 일정 추가/수정 폼 */}
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h2 className="text-lg font-semibold text-blue-600 mb-4">{editingId ? '일정 수정' : '일정 추가'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">일차</label>
              <input type="number" value={form.day} onChange={e => setForm(f => ({ ...f, day: Number(e.target.value) }))} min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">날짜</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">시간</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">장소</label>
              <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">교통</label>
              <input type="text" value={form.transport} onChange={e => setForm(f => ({ ...f, transport: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">식사</label>
              <input type="text" value={form.meal} onChange={e => setForm(f => ({ ...f, meal: e.target.value }))} placeholder="조:호텔식 / 중:현지식 / 석:기내식" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">일정 내용</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">저장</button>
            {editingId && (
              <button onClick={() => { setEditingId(null); setForm({ day: 1, date: '', time: '', location: '', transport: '', content: '', meal: '' }); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">취소</button>
            )}
          </div>
        </div>

        {/* 일정 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">일차</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">날짜</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">시간</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">장소</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">교통</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">내용</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">식사</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">일정 데이터가 없습니다.</td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">D{item.day}</td>
                  <td className="px-4 py-3">{item.date}</td>
                  <td className="px-4 py-3">{item.time}</td>
                  <td className="px-4 py-3">{item.location}</td>
                  <td className="px-4 py-3 text-xs">{item.transport || '-'}</td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate">{item.content}</td>
                  <td className="px-4 py-3 text-xs">{item.meal || '-'}</td>
                  <td className="px-4 py-3 flex gap-1">
                    <button onClick={() => { setEditingId(item.id); setForm({ day: item.day, date: item.date, time: item.time, location: item.location, transport: item.transport, content: item.content, meal: item.meal }); }} className="text-blue-600 hover:text-blue-800 text-xs">편집</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-xs">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}