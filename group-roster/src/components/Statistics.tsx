// @TASK T6.2 - 통계 대시보드 컴포넌트
// @SPEC group-roster-manager-v2 (3).html — stats 계산 로직
import type { Member } from '../types'
import { calculateAge } from '../lib/utils'

interface StatisticsProps {
  members: Member[]
}

export function Statistics({ members }: StatisticsProps) {
  const total = members.length
  const male = members.filter((m) => m.gender === 'M').length
  const female = members.filter((m) => m.gender === 'F').length
  const minor = members.filter((m) => {
    const age = calculateAge(m.birthDate)
    return age !== null && age < 15
  }).length
  const withId = members.filter((m) => m.idNo && m.idNo.trim() !== '').length

  const cards = [
    { label: '전체 인원', ariaLabel: '전체 인원', value: total },
    { label: '남성', ariaLabel: '남성 인원', value: male },
    { label: '여성', ariaLabel: '여성 인원', value: female },
    { label: '미성년자 (15세 미만)', ariaLabel: '미성년자 인원', value: minor },
    { label: 'ID 생성 완료', ariaLabel: 'ID 생성 완료 인원', value: withId },
  ]

  return (
    <div className="stats" role="region" aria-label="멤버 통계">
      {cards.map(({ label, ariaLabel, value }) => (
        <div key={label} className="stat-card">
          <h4>{label}</h4>
          <div className="value" aria-label={ariaLabel}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}
