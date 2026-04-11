// @TASK T6.2 - Statistics 컴포넌트 테스트 (TDD RED)
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Statistics } from '../../components/Statistics'
import type { Member } from '../../types'

const mockMembers: Member[] = [
  { nameKor: '홍길동', nameEn: 'HONG/GILDONG', gender: 'M', passportNo: 'M11111111', birthDate: '1985-03-15', passportExpire: '2030-06-13' },
  { nameKor: '김영희', nameEn: 'KIM/YOUNGHEE', gender: 'F', passportNo: 'M22222222', birthDate: '1990-07-22', passportExpire: '2029-09-10' },
  { nameKor: '이아이', nameEn: 'LEE/AI', gender: 'M', passportNo: 'M33333333', birthDate: '2015-01-01', passportExpire: '2028-01-01' },
]

describe('Statistics', () => {
  it('전체 인원이 표시된다', () => {
    render(<Statistics members={mockMembers} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('남성 인원이 표시된다', () => {
    render(<Statistics members={mockMembers} />)
    expect(screen.getByLabelText('남성 인원')).toHaveTextContent('2')
  })

  it('여성 인원이 표시된다', () => {
    render(<Statistics members={mockMembers} />)
    expect(screen.getByLabelText('여성 인원')).toHaveTextContent('1')
  })

  it('미성년자(15세 미만) 인원이 표시된다', () => {
    render(<Statistics members={mockMembers} />)
    expect(screen.getByLabelText('미성년자 인원')).toHaveTextContent('1')
  })

  it('빈 멤버 목록에서도 렌더링된다', () => {
    render(<Statistics members={[]} />)
    expect(screen.getByLabelText('전체 인원')).toHaveTextContent('0')
  })
})
