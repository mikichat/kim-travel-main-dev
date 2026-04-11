// @TASK T6.2 - 단체명단 관리 DB 메인 앱 (완전 구현)
// @SPEC group-roster-manager-v2 (3).html — App 컴포넌트 기반
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import './styles/global.css'

import { useMemberStore } from './stores/memberStore'
import { GroupSelector } from './components/GroupSelector'
import { MemberTable } from './components/MemberTable'
import { Statistics } from './components/Statistics'
import { MemberToolbar } from './components/MemberToolbar'
import { GroupFormModal } from './components/GroupFormModal'
import type { Member } from './types'

export default function App() {
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
    updateGroupInfo,
  } = useMemberStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editInitial, setEditInitial] = useState<{ name: string; destination: string; departureDate: string; returnDate: string } | undefined>()
  const [editId, setEditId] = useState<number | null>(null)

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  // 검색 필터 적용
  const filteredMembers = members.filter((p) => {
    if (!searchTerm) return true
    const t = searchTerm.toLowerCase()
    return (
      p.nameKor?.toLowerCase().includes(t) ||
      p.nameEn?.toLowerCase().includes(t) ||
      p.passportNo?.toLowerCase().includes(t) ||
      p.phone?.toLowerCase().includes(t)
    )
  })

  const isReadOnly = currentGroup?.archived ?? false

  const openEditModal = (id: number) => {
    const g = groups.find((gr) => gr.id === id)
    if (!g) return
    setEditId(id)
    setEditInitial({
      name: g.name,
      destination: g.destination ?? '',
      departureDate: g.departureDate ?? '',
      returnDate: g.returnDate ?? '',
    })
    setShowEditModal(true)
  }

  const handlePassportApply = (scanned: Partial<Member>[]) => {
    const maxNo = members.length > 0 ? Math.max(...members.map((m) => m.no ?? 0)) : 0
    const newMembers: Member[] = scanned.map((s, i) => ({
      no: maxNo + i + 1,
      nameKor: s.nameKor ?? '',
      nameEn: s.nameEn ?? '',
      gender: s.gender ?? 'M',
      passportNo: s.passportNo ?? '',
      birthDate: s.birthDate ?? '',
      passportExpire: s.passportExpire ?? '',
      idNo: '',
      phone: '',
      room: '',
    }))
    importMembers(newMembers)
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="container">
        {/* 헤더 */}
        <header role="banner" className="header">
          <div className="header-icon">&#x1F465;</div>
          <div>
            <h1>단체명단 관리 DB</h1>
            <p>단체여행 멤버 정보를 효율적으로 관리하세요</p>
          </div>
        </header>

        {/* 레이아웃: 사이드바 + 컨텐츠 */}
        <div className="app-layout">
          <GroupSelector
            groups={groups}
            currentGroupId={currentGroupId}
            activeTab={activeTab}
            onSelect={selectGroup}
            onTabChange={setActiveTab}
            onAdd={() => setShowAddModal(true)}
            onDelete={(id) => removeGroup(id)}
            onEdit={openEditModal}
            onArchive={archiveGroup}
            onRestore={restoreGroup}
          />

          <main role="main" className="content-area">
            {loading && (
              <div className="loading-state" role="status">로딩 중...</div>
            )}

            {!currentGroupId && !loading && (
              <div className="empty-state" style={{ padding: '80px 40px' }}>
                <h3>단체를 선택하거나 새로 만들어주세요</h3>
                <p>왼쪽 사이드바에서 단체를 관리할 수 있습니다</p>
              </div>
            )}

            {currentGroupId && currentGroup && (
              <>
                {isReadOnly && (
                  <div className="readonly-banner" role="alert">
                    📦 지난 행사 (읽기 전용) — 조회 및 엑셀 다운로드만 가능합니다
                    <button
                      type="button"
                      className="btn"
                      style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '13px', background: '#28a745', color: 'white' }}
                      onClick={() => restoreGroup(currentGroupId)}
                    >
                      ↩️ 진행 중으로 복원
                    </button>
                  </div>
                )}

                <Statistics members={filteredMembers} />

                <MemberToolbar
                  group={currentGroup}
                  members={filteredMembers}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  readOnly={isReadOnly}
                  onImport={importMembers}
                  onPassportApply={handlePassportApply}
                  onAddRow={addRow}
                  onGenerateIds={generateAllIds}
                  onSave={saveMembers}
                />

                <MemberTable
                  members={filteredMembers}
                  onUpdate={isReadOnly ? undefined : updateMember}
                  onDelete={isReadOnly ? undefined : deleteMember}
                  readOnly={isReadOnly}
                />
              </>
            )}
          </main>
        </div>

        {/* 모달 */}
        <GroupFormModal
          mode="add"
          open={showAddModal}
          onSubmit={async (data) => {
            await addGroup(data)
            setShowAddModal(false)
          }}
          onClose={() => setShowAddModal(false)}
        />

        <GroupFormModal
          mode="edit"
          open={showEditModal}
          initial={editInitial}
          onSubmit={async (data) => {
            if (editId) await updateGroupInfo(editId, data)
            setShowEditModal(false)
          }}
          onClose={() => setShowEditModal(false)}
        />
      </div>
    </>
  )
}
