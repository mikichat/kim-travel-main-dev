// 단체상품 관리 — Legacy migration from air-booking

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

interface GroupMember {
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
  id: string;
  name: string;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  member_count: number;
  is_archived: number;
  created_at: string;
}

interface GroupDetail extends Group {
  members: GroupMember[];
}

type StatusFilter = '' | 'active' | 'archived';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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
    } catch { showToast('단체상품 목록을 불러올 수 없습니다.', 'error'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/groups/${id}`);
      const data = await res.json();
      if (data.success) { setSelectedGroup(data.data.group); setDetailOpen(true); }
    } catch { showToast('단체 정보를 불러올 수 없습니다.', 'error'); }
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">단체상품 관리</h1>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex gap-3">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="단체명, 여행지 검색..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">전체</option><option value="active">진행중</option><option value="archived">종료</option>
            </select>
          </div>
          {groups.length === 0 ? (
            <div className="p-8 text-center text-gray-400">단체상품 데이터가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {groups.map(g => (
                <div key={g.id} onClick={() => openDetail(g.id)} className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-gray-900">{g.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${g.is_archived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {g.is_archived ? '종료' : '진행중'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>{g.destination || '미정'}</div>
                    <div>{formatDate(g.departure_date)} ~ {formatDate(g.return_date)}</div>
                  </div>
                  <div className="mt-3 text-sm font-medium text-indigo-600">{g.member_count}명</div>
                </div>
              ))}
            </div>
          )}
          <div className="p-3 border-t text-sm text-gray-500">총 {total}건</div>
        </div>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selectedGroup?.name || '단체 상세'} size="lg">
        {selectedGroup && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div><span className="text-xs text-gray-500">여행지</span><div className="font-medium">{selectedGroup.destination || '-'}</div></div>
              <div><span className="text-xs text-gray-500">상태</span><div className="font-medium">{selectedGroup.is_archived ? '종료' : '진행중'}</div></div>
              <div><span className="text-xs text-gray-500">출발일</span><div className="font-medium">{formatDate(selectedGroup.departure_date)}</div></div>
              <div><span className="text-xs text-gray-500">귀국일</span><div className="font-medium">{formatDate(selectedGroup.return_date)}</div></div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">명단 ({selectedGroup.members.length}명)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">No</th><th className="p-2 text-left">한글명</th><th className="p-2 text-left">영문명</th>
                      <th className="p-2 text-left">성별</th><th className="p-2 text-left">여권번호</th><th className="p-2 text-left">생년월일</th>
                      <th className="p-2 text-left">여권만료</th><th className="p-2 text-left">연락처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup.members.map((m, idx) => (
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
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
