'use client';

import { useState, useEffect } from 'react';

interface Group {
  id: number;
  name: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function GroupListPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [filterStartDateFrom, setFilterStartDateFrom] = useState('');
  const [filterStartDateTo, setFilterStartDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    async function fetchGroups() {
      try {
        const params = new URLSearchParams();
        if (searchName) params.set('search', searchName);
        if (filterStartDateFrom) params.set('dateFrom', filterStartDateFrom);
        if (filterStartDateTo) params.set('dateTo', filterStartDateTo);
        if (filterStatus) params.set('status', filterStatus);

        const res = await fetch(`/tables/groups?${params}`);
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[group-list] Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGroups();
  }, [searchName, filterStartDateFrom, filterStartDateTo, filterStatus]);

  const calculateDuration = (departure?: string, returnDate?: string) => {
    if (!departure || !returnDate) return '-';
    const d1 = new Date(departure);
    const d2 = new Date(returnDate);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return `${diff}일`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      estimate: { label: '견적', className: 'bg-yellow-100 text-yellow-800' },
      contract: { label: '계약', className: 'bg-blue-100 text-blue-800' },
      confirmed: { label: '확정', className: 'bg-green-100 text-green-800' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 text-xs rounded ${config.className}`}>{config.label}</span>;
  };

  const handleCreateNew = () => {
    window.location.href = '/group-form';
  };

  const handleRowClick = (id: number) => {
    window.location.href = `/group-dashboard?id=${id}`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <p className="text-gray-500">홈 &gt; 상품 관리 &gt; 목록</p>
      </div>

      {/* 검색 및 필터 영역 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="상품명 검색..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="flex-2 px-4 py-2 border border-gray-300 rounded-lg min-w-[200px]"
          />
          <input
            type="date"
            value={filterStartDateFrom}
            onChange={(e) => setFilterStartDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={filterStartDateTo}
            onChange={(e) => setFilterStartDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">전체 상태</option>
            <option value="estimate">견적</option>
            <option value="contract">계약</option>
            <option value="confirmed">확정</option>
          </select>
          <button
            onClick={() => {
              setSearchName('');
              setFilterStartDateFrom('');
              setFilterStartDateTo('');
              setFilterStatus('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleCreateNew}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          + 신규 상품 생성
        </button>
        <div className="text-gray-500">
          총 {groups.length}건
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">출발일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">도착일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">기간</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">인원</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">최종 수정일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    <span className="ml-3">데이터를 불러오는 중...</span>
                  </div>
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  데이터가 없습니다
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr
                  key={group.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRowClick(group.id)}
                >
                  <td className="px-6 py-4 font-medium">{group.name}</td>
                  <td className="px-6 py-4 text-gray-500">{group.departureDate || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{group.returnDate || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {calculateDuration(group.departureDate, group.returnDate)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">-</td>
                  <td className="px-6 py-4">{getStatusBadge(group.status)}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {group.updatedAt ? new Date(group.updatedAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
