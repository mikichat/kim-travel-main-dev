// @TASK T6.2 - 멤버 테이블 컴포넌트 (인라인 편집, ID 자동생성)
// @SPEC group-roster-manager-v2 (3).html — 테이블 행 편집 로직
import type { Member } from '../types'
import { MemberRow } from './MemberRow'

interface MemberTableProps {
  members: Member[]
  onUpdate?: (index: number, field: keyof Member, value: string) => void
  onDelete?: (index: number) => void
  readOnly?: boolean
}

export function MemberTable({ members, onUpdate, onDelete, readOnly = false }: MemberTableProps) {
  if (members.length === 0) {
    return (
      <div className="empty-state" aria-label="빈 멤버 목록">
        <p>등록된 멤버가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper" role="region" aria-label="멤버 목록">
      <table className="member-table">
        <thead>
          <tr>
            <th>No</th>
            <th>한글명</th>
            <th>영문명</th>
            <th>성별</th>
            <th>나이</th>
            <th>여권번호</th>
            <th>생년월일</th>
            <th>ID NO</th>
            <th>여권만료</th>
            <th>연락처</th>
            <th>객실</th>
            {!readOnly && <th>관리</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((member, index) => (
            <MemberRow
              key={`${member.passportNo}-${index}`}
              member={member}
              index={index}
              readOnly={readOnly}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
