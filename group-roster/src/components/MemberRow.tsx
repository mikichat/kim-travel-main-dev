import type { Member } from '../types'
import { calculateAge, generateIdNo, isMinor } from '../lib/utils'

interface Props {
  member: Member
  index: number
  readOnly: boolean
  onUpdate?: (index: number, field: keyof Member, value: string) => void
  onDelete?: (index: number) => void
}

export function MemberRow({ member, index, readOnly, onUpdate, onDelete }: Props) {
  const age = calculateAge(member.birthDate)
  const minor = member.birthDate ? isMinor(member.birthDate) : false

  const editableText = (field: keyof Member, value: string | undefined, ariaLabel: string) =>
    readOnly ? (
      value
    ) : (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onUpdate?.(index, field, e.target.value)}
        aria-label={ariaLabel}
      />
    )

  const editableDate = (field: keyof Member, value: string | undefined, ariaLabel: string) =>
    readOnly ? (
      value
    ) : (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onUpdate?.(index, field, e.target.value)}
        aria-label={ariaLabel}
      />
    )

  const label = member.nameKor

  return (
    <tr>
      <td style={{ textAlign: 'center', fontWeight: 600 }}>{member.no ?? index + 1}</td>

      <td>{editableText('nameKor', member.nameKor, `${label} 한글명 편집`)}</td>
      <td>{editableText('nameEn', member.nameEn, `${label} 영문명 편집`)}</td>

      <td>
        {readOnly ? (
          member.gender
        ) : (
          <select
            value={member.gender}
            onChange={(e) => onUpdate?.(index, 'gender', e.target.value)}
            aria-label={`${label} 성별 편집`}
          >
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        )}
      </td>

      <td style={{ textAlign: 'center', color: minor ? '#e91e63' : '#666', fontWeight: 600 }}>
        {age !== null ? `${age}세` : '-'}
      </td>

      <td>{editableText('passportNo', member.passportNo, `${label} 여권번호 편집`)}</td>
      <td>{editableDate('birthDate', member.birthDate, `${label} 생년월일 편집`)}</td>

      <td>
        {readOnly ? (
          member.idNo
        ) : (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
              type="text"
              value={member.idNo ?? ''}
              onChange={(e) => onUpdate?.(index, 'idNo', e.target.value)}
              placeholder="YYMMDD#"
              style={{ flex: 1 }}
              aria-label={`${label} ID NO 편집`}
            />
            <button
              type="button"
              title="ID NO 자동생성"
              aria-label="ID NO 자동생성"
              onClick={() => {
                const newId = generateIdNo(member.gender, member.birthDate)
                if (newId) onUpdate?.(index, 'idNo', newId)
              }}
              style={{
                padding: '4px 8px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              ⚡
            </button>
          </div>
        )}
      </td>

      <td>{editableDate('passportExpire', member.passportExpire, `${label} 여권만료일 편집`)}</td>
      <td>{editableText('phone', member.phone, `${label} 연락처 편집`)}</td>
      <td>{editableText('room', member.room, `${label} 객실 편집`)}</td>

      {!readOnly && (
        <td>
          <button
            type="button"
            onClick={() => onDelete?.(index)}
            aria-label={`${label} 삭제`}
            style={{
              padding: '6px 12px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            삭제
          </button>
        </td>
      )}
    </tr>
  )
}
