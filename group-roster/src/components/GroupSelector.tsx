// @TASK T6.2 - 그룹 선택 컴포넌트 (사이드바)
// @SPEC group-roster-manager-v2 (3).html — 그룹 목록, 탭, 검색
import { useState } from 'react'
import type { Group, ActiveTab } from '../types'
import { GroupItem } from './GroupItem'

interface GroupSelectorProps {
  groups: Group[]
  currentGroupId: number | null
  activeTab: ActiveTab
  onSelect: (id: number) => void
  onTabChange: (tab: ActiveTab) => void
  onAdd: () => void
  onDelete?: (id: number) => void
  onEdit?: (id: number) => void
  onArchive?: (id: number) => void
  onRestore?: (id: number) => void
}

export function GroupSelector({
  groups,
  currentGroupId,
  activeTab,
  onSelect,
  onTabChange,
  onAdd,
  onDelete,
  onEdit,
  onArchive,
  onRestore,
}: GroupSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = groups.filter((g) => {
    const matchTab = activeTab === 'active' ? !g.archived : !!g.archived
    const matchSearch = !searchTerm || g.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchTab && matchSearch
  })

  const activeCount = groups.filter((g) => !g.archived).length
  const archivedCount = groups.filter((g) => !!g.archived).length

  return (
    <div className="sidebar" aria-label="단체 목록">
      <h3>단체 관리</h3>

      {/* 탭 */}
      <div className="archive-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'active'}
          className={`archive-tab${activeTab === 'active' ? ' active' : ''}`}
          onClick={() => onTabChange('active')}
        >
          진행 중
          <span className="archive-badge">{activeCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'archived'}
          className={`archive-tab${activeTab === 'archived' ? ' active' : ''}`}
          onClick={() => onTabChange('archived')}
        >
          지난 행사
          <span className="archive-badge">{archivedCount}</span>
        </button>
      </div>

      {/* 그룹 검색 */}
      <div className="search-filter" style={{ marginBottom: '12px', width: '100%' }}>
        <label htmlFor="group-search" className="sr-only">단체 검색</label>
        <input
          id="group-search"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="단체 검색..."
          style={{ width: '100%' }}
        />
        {searchTerm && (
          <button
            type="button"
            className="clear-btn"
            onClick={() => setSearchTerm('')}
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        )}
      </div>

      {/* 새 단체 추가 버튼 */}
      {activeTab === 'active' && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '12px' }}
          onClick={onAdd}
          aria-label="새 단체 추가"
        >
          + 새 단체 만들기
        </button>
      )}

      {/* 그룹 목록 */}
      <div className="group-list">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            {searchTerm ? `"${searchTerm}" 검색 결과 없음` : activeTab === 'active' ? '진행 중인 단체가 없습니다.' : '지난 행사가 없습니다.'}
          </div>
        ) : (
          filtered.map((group) => (
            <GroupItem
              key={group.id}
              group={group}
              isActive={currentGroupId === group.id}
              activeTab={activeTab}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onArchive={onArchive}
              onRestore={onRestore}
            />
          ))
        )}
      </div>
    </div>
  )
}
