import type { Group, ActiveTab } from '../types'

interface Props {
  group: Group
  isActive: boolean
  activeTab: ActiveTab
  onSelect: (id: number) => void
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
  onArchive?: (id: number) => void
  onRestore?: (id: number) => void
}

export function GroupItem({ group, isActive, activeTab, onSelect, onEdit, onDelete, onArchive, onRestore }: Props) {
  return (
    <div
      className={`group-item${isActive ? ' active' : ''}`}
      onClick={() => onSelect(group.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(group.id)}
      aria-pressed={isActive}
      aria-label={`${group.name} 단체 선택`}
    >
      <div className="group-info">
        <div className="group-name">{group.name}</div>
        {group.destination && (
          <div className="group-destination">📍 {group.destination}</div>
        )}
        {(group.departureDate || group.returnDate) && (
          <div style={{ fontSize: '12px', color: '#2196F3', marginTop: '2px' }}>
            {group.departureDate && <span>출발 {group.departureDate}</span>}
            {group.departureDate && group.returnDate && ' ~ '}
            {group.returnDate && <span>{group.returnDate}</span>}
          </div>
        )}
        <div className="group-meta">
          {group.data?.length ?? 0}명
          {group.createdAt && ` · ${new Date(group.createdAt).toLocaleDateString()}`}
        </div>
      </div>

      <div className="group-actions" onClick={(e) => e.stopPropagation()}>
        {activeTab === 'active' ? (
          <>
            {onArchive && (
              <button
                type="button"
                className="btn-archive"
                onClick={() => onArchive(group.id)}
                title="지난 행사로 이동"
                aria-label={`${group.name} 지난 행사로 이동`}
              >
                📦
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                className="btn-icon"
                onClick={() => onEdit(group.id)}
                title="단체 정보 수정"
                aria-label={`${group.name} 수정`}
                style={{ background: '#4CAF50', color: 'white' }}
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="btn-icon btn-delete"
                onClick={() => onDelete(group.id)}
                title="단체 삭제"
                aria-label={`${group.name} 삭제`}
              >
                🗑️
              </button>
            )}
          </>
        ) : (
          onRestore && (
            <button
              type="button"
              className="btn-archive"
              onClick={() => onRestore(group.id)}
              title="진행 중으로 복원"
              aria-label={`${group.name} 복원`}
            >
              ↩️
            </button>
          )
        )}
      </div>
    </div>
  )
}
