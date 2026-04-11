// 단체명단 관리 — Legacy migration from frontend
// React 기반 인라인 코드를 Next.js로 재작성

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

interface Member {
  id?: number;
  no: number;
  nameKr: string;
  nameEn: string;
  gender: string;
  passportNo: string;
  birthDate: string;
  passportExpire: string;
  phone: string;
}

interface Group {
  id: number;
  name: string;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  member_count: number;
  is_archived: number;
  created_at: string;
  members?: Member[];
}

type StatusFilter = '' | 'active' | 'archived';

export default function GroupRosterPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', destination: '', departure_date: '', return_date: '' });
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchGroups = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/groups?${params}`);
      const data = await res.json();
      if (data.success) { setGroups(data.data.groups); setTotal(data.data.total); }
    } catch { showToast('단체명단을 불러올 수 없습니다.', 'error'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const openDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/groups/${id}`);
      const data = await res.json();
      if (data.success) { setSelectedGroup(data.data.group); setDetailOpen(true); }
    } catch { showToast('단체 정보를 불러올 수 없습니다.', 'error'); }
  };

  const openGroupForm = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        destination: group.destination || '',
        departure_date: group.departure_date || '',
        return_date: group.return_date || '',
      });
    } else {
      setEditingGroup(null);
      setGroupForm({ name: '', destination: '', departure_date: '', return_date: '' });
    }
    setGroupFormOpen(true);
  };

  const saveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        name: groupForm.name,
        destination: groupForm.destination || null,
        departure_date: groupForm.departure_date || null,
        return_date: groupForm.return_date || null,
      };
      const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';
      const method = editingGroup ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        showToast(editingGroup ? '수정되었습니다.' : '생성되었습니다.');
        setGroupFormOpen(false);
        fetchGroups();
      } else {
        showToast(data.error || '저장에 실패했습니다.', 'error');
      }
    } catch { showToast('저장에 실패했습니다.', 'error'); }
  };

  const deleteGroup = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('삭제되었습니다.'); fetchGroups(); }
      else showToast(data.error || '삭제에 실패했습니다.', 'error');
    } catch { showToast('삭제에 실패했습니다.', 'error'); }
  };

  const formatDate = (d: string | null) => d ? d.slice(0, 10) : '-';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">团体名单管理</h1>
          <button onClick={() => openGroupForm()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            + 새 단체
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="단체명, 여행지 검색..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">전체</option>
              <option value="active">진행중</option>
              <option value="archived">종료</option>
            </select>
          </div>

          {groups.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-4">📋</p>
              <p>단체 데이터가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {groups.map(g => (
                <div
                  key={g.id}
                  onClick={() => openDetail(g.id)}
                  className="border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all bg-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-semibold text-gray-900">{g.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.is_archived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {g.is_archived ? '종료' : '진행중'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📍</span>
                      <span>{g.destination || '미정'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📅</span>
                      <span>{formatDate(g.departure_date)} ~ {formatDate(g.return_date)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-indigo-600">{g.member_count}명</span>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); openGroupForm(g); }} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }} className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 border-t text-sm text-gray-500">총 {total}건</div>
        </div>
      </div>

      {/* 그룹 상세 모달 */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selectedGroup?.name || '团体 상세'} size="lg">
        {selectedGroup && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
              <div><span className="text-xs text-gray-500">여행지</span><div className="font-medium">{selectedGroup.destination || '-'}</div></div>
              <div><span className="text-xs text-gray-500">상태</span><div className="font-medium">{selectedGroup.is_archived ? '종료' : '진행중'}</div></div>
              <div><span className="text-xs text-gray-500">출발일</span><div className="font-medium">{formatDate(selectedGroup.departure_date)}</div></div>
              <div><span className="text-xs text-gray-500">귀국일</span><div className="font-medium">{formatDate(selectedGroup.return_date)}</div></div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">명단 ({selectedGroup.members?.length || 0}명)</div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">No</th>
                      <th className="p-2 text-left">한글명</th>
                      <th className="p-2 text-left">영문명</th>
                      <th className="p-2 text-left">성별</th>
                      <th className="p-2 text-left">여권번호</th>
                      <th className="p-2 text-left">생년월일</th>
                      <th className="p-2 text-left">여권만료</th>
                      <th className="p-2 text-left">연락처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedGroup.members || []).map((m, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="p-2">{m.no || idx + 1}</td>
                        <td className="p-2">{m.nameKr || '-'}</td>
                        <td className="p-2">{m.nameEn || '-'}</td>
                        <td className="p-2">{m.gender === 'M' ? '남' : m.gender === 'F' ? '여' : m.gender || '-'}</td>
                        <td className="p-2">{m.passportNo || '-'}</td>
                        <td className="p-2">{m.birthDate || '-'}</td>
                        <td className="p-2">{m.passportExpire || '-'}</td>
                        <td className="p-2">{m.phone || '-'}</td>
                      </tr>
                    ))}
                    {(!selectedGroup.members || selectedGroup.members.length === 0) && (
                      <tr><td colSpan={8} className="p-4 text-center text-gray-400">명단이 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 그룹 생성/수정 폼 모달 */}
      <Modal open={groupFormOpen} onClose={() => setGroupFormOpen(false)} title={editingGroup ? '团体 수정' : '새团体'} size="sm">
        <form onSubmit={saveGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">团体명 <span className="text-red-500">*</span></label>
            <input type="text" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">여행지</label>
            <input type="text" value={groupForm.destination} onChange={(e) => setGroupForm({ ...groupForm, destination: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">출발일</label>
              <input type="date" value={groupForm.departure_date} onChange={(e) => setGroupForm({ ...groupForm, departure_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">귀국일</label>
              <input type="date" value={groupForm.return_date} onChange={(e) => setGroupForm({ ...groupForm, return_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setGroupFormOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">취소</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">{editingGroup ? '수정' : '생성'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
