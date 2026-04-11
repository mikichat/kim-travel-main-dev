import { SearchFilter } from './SearchFilter'
import { ExcelImportExport } from './ExcelImportExport'
import { PassportScanner } from './PassportScanner'
import type { Group, Member } from '../types'

interface Props {
  group: Group
  members: Member[]
  searchTerm: string
  onSearchChange: (v: string) => void
  readOnly: boolean
  onImport: (members: Member[]) => void
  onPassportApply: (scanned: Partial<Member>[]) => void
  onAddRow: () => void
  onGenerateIds: () => void
  onSave: () => void
}

export function MemberToolbar({
  group,
  members,
  searchTerm,
  onSearchChange,
  readOnly,
  onImport,
  onPassportApply,
  onAddRow,
  onGenerateIds,
  onSave,
}: Props) {
  return (
    <div className="toolbar">
      <SearchFilter
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="이름, 영문명, 여권번호, 전화번호로 검색..."
      />

      {!readOnly && (
        <>
          <ExcelImportExport group={group} members={members} onImport={onImport} />
          <PassportScanner onApply={onPassportApply} />

          <button type="button" className="btn btn-primary" onClick={onAddRow}>
            + 행 추가
          </button>

          <button
            type="button"
            className="btn"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
            onClick={onGenerateIds}
          >
            ⚡ ID 일괄생성
          </button>

          <button type="button" className="btn btn-primary" onClick={onSave}>
            💾 저장
          </button>
        </>
      )}

      {readOnly && (
        <ExcelImportExport group={group} members={members} onImport={onImport} readOnly />
      )}
    </div>
  )
}
