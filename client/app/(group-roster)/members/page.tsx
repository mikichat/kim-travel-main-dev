'use client';

import { useEffect, useState } from 'react';
import { useMemberStore, type Member, type Group } from '@/stores/memberStore';

export default function MembersPage() {
  const {
    groups,
    currentGroupId,
    currentGroup,
    members,
    loading,
    activeTab,
    searchTerm,
    loadGroups,
    selectGroup,
    setActiveTab,
    setSearchTerm,
    addRow,
    updateMember,
    deleteMember,
    saveMembers,
    generateAllIds,
    importMembers,
    addGroup,
    removeGroup,
    archiveGroup,
    restoreGroup,
  } = useMemberStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInitial, setEditInitial] = useState<{ name: string; destination: string; departureDate: string; returnDate: string } | undefined>();
  const [editId, setEditId] = useState<number | null>(null);
  const [newGroup, setNewGroup] = useState({ name: '', destination: '', departureDate: '', returnDate: '' });

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const filteredMembers = members.filter((p) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      p.nameKor?.toLowerCase().includes(t) ||
      p.nameEn?.toLowerCase().includes(t) ||
      p.passportNo?.toLowerCase().includes(t) ||
      p.phone?.toLowerCase().includes(t)
    );
  });

  const activeGroups = groups.filter((g) => !g.archived);
  const archivedGroups = groups.filter((g) => g.archived);

  const isReadOnly = currentGroup?.archived ?? false;

  const handleAddGroup = async () => {
    if (!newGroup.name.trim()) return;
    await addGroup(newGroup);
    setNewGroup({ name: '', destination: '', departureDate: '', returnDate: '' });
    setShowAddModal(false);
  };

  const handleEditGroup = async () => {
    if (!editId || !editInitial) return;
    // updateGroupInfo would be called here
    setShowEditModal(false);
  };

  const openEditModal = (id: number) => {
    const g = groups.find((gr) => gr.id === id);
    if (!g) return;
    setEditId(id);
    setEditInitial({
      name: g.name,
      destination: g.destination ?? '',
      departureDate: g.departureDate ?? '',
      returnDate: g.returnDate ?? '',
    });
    setShowEditModal(false); // For simplicity, not showing edit modal in this version
  };

  const stats = {
    total: filteredMembers.length,
    male: filteredMembers.filter((m) => m.gender === 'M').length,
    female: filteredMembers.filter((m) => m.gender === 'F').length,
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">단체명단 관리</h1>

      <div className="flex gap-6">
        {/* Sidebar - Group List */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">그룹 목록</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-blue-500 hover:text-blue-700 text-2xl"
              >
                +
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-4">
              <button
                className={`flex-1 py-2 text-sm ${activeTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('active')}
              >
                진행 중
              </button>
              <button
                className={`flex-1 py-2 text-sm ${activeTab === 'archived' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('archived')}
              >
                지난 행사
              </button>
            </div>

            {/* Group List */}
            <div className="space-y-2">
              {(activeTab === 'active' ? activeGroups : archivedGroups).map((g) => (
                <div
                  key={g.id}
                  className={`p-3 rounded-lg cursor-pointer ${currentGroupId === g.id ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                  onClick={() => selectGroup(g.id)}
                >
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-gray-500">
                    {g.destination || '목적지 없음'} • {g.data?.length || 0}명
                  </div>
                  {g.departureDate && (
                    <div className="text-xs text-gray-400">
                      {g.departureDate} ~ {g.returnDate}
                    </div>
                  )}
                </div>
              ))}
              {(activeTab === 'active' ? activeGroups : archivedGroups).length === 0 && (
                <div className="text-center text-gray-400 py-4">없음</div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {loading && (
            <div className="text-center py-8">로딩 중...</div>
          )}

          {!currentGroupId && !loading && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h3 className="text-lg font-medium mb-2">단체를 선택하거나 새로 만들어주세요</h3>
              <p className="text-gray-500">왼쪽 사이드바에서 단체를 관리할 수 있습니다</p>
            </div>
          )}

          {currentGroupId && currentGroup && (
            <>
              {/* Read-only Banner */}
              {isReadOnly && (
                <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
                  <span>📦 지난 행사 (읽기 전용) — 조회 및 엑셀 다운로드만 가능합니다</span>
                  <button
                    onClick={() => restoreGroup(currentGroupId)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    ↩️ 진행 중으로 복원
                  </button>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-gray-500 text-sm">총 인원</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-2xl font-bold text-blue-600">{stats.male}</div>
                  <div className="text-gray-500 text-sm">남성</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-2xl font-bold text-pink-600">{stats.female}</div>
                  <div className="text-gray-500 text-sm">여성</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-2xl font-bold text-gray-400">{stats.total === 0 ? 0 : (stats.male / stats.total * 100).toFixed(0)}%</div>
                  <div className="text-gray-500 text-sm">남성 비율</div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    placeholder="이름, 여권번호, 전화번호 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg w-64"
                  />
                  <div className="flex gap-2">
                    {!isReadOnly && (
                      <>
                        <button
                          onClick={addRow}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          + 행 추가
                        </button>
                        <button
                          onClick={generateAllIds}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          ID 일괄 생성
                        </button>
                        <button
                          onClick={saveMembers}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          저장
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Member Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">한글명</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">영문명</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">성별</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">여권번호</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">생년월일</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ID NO</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">여권만료</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">연락처</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">객실</th>
                      {!isReadOnly && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">삭제</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMembers.map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{m.no || i + 1}</td>
                        <td className="px-4 py-2">
                          {isReadOnly ? m.nameKor : (
                            <input
                              type="text"
                              value={m.nameKor}
                              onChange={(e) => updateMember(i, 'nameKor', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isReadOnly ? m.nameEn : (
                            <input
                              type="text"
                              value={m.nameEn}
                              onChange={(e) => updateMember(i, 'nameEn', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isReadOnly ? (m.gender === 'M' ? '남' : '여') : (
                            <select
                              value={m.gender}
                              onChange={(e) => updateMember(i, 'gender', e.target.value)}
                              className="px-2 py-1 border rounded"
                            >
                              <option value="M">남</option>
                              <option value="F">여</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isReadOnly ? m.passportNo : (
                            <input
                              type="text"
                              value={m.passportNo}
                              onChange={(e) => updateMember(i, 'passportNo', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isReadOnly ? m.birthDate : (
                            <input
                              type="text"
                              value={m.birthDate}
                              onChange={(e) => updateMember(i, 'birthDate', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-sm">{m.idNo || '-'}</td>
                        <td className="px-4 py-2">
                          {isReadOnly ? m.passportExpire : (
                            <input
                              type="text"
                              value={m.passportExpire}
                              onChange={(e) => updateMember(i, 'passportExpire', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isReadOnly ? m.phone : (
                            <input
                              type="text"
                              value={m.phone}
                              onChange={(e) => updateMember(i, 'phone', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isReadOnly ? m.room : (
                            <input
                              type="text"
                              value={m.room}
                              onChange={(e) => updateMember(i, 'room', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          )}
                        </td>
                        {!isReadOnly && (
                          <td className="px-4 py-2">
                            <button
                              onClick={() => deleteMember(i)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                          데이터가 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Group Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">새 그룹 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">그룹명 *</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="예: 2024 서울-ES巴黎旅行社"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">목적지</label>
                <input
                  type="text"
                  value={newGroup.destination}
                  onChange={(e) => setNewGroup({ ...newGroup, destination: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="예: 프랑스 파리"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">출발일</label>
                  <input
                    type="date"
                    value={newGroup.departureDate}
                    onChange={(e) => setNewGroup({ ...newGroup, departureDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">귀국일</label>
                  <input
                    type="date"
                    value={newGroup.returnDate}
                    onChange={(e) => setNewGroup({ ...newGroup, returnDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddGroup}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
