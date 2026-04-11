// @TASK T6.2 - MemberTable 컴포넌트 테스트 (TDD RED)
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemberTable } from '../../components/MemberTable'
import type { Member } from '../../types'

const mockMembers: Member[] = [
  {
    no: 1,
    nameKor: '홍길동',
    nameEn: 'HONG/GILDONG',
    gender: 'M',
    passportNo: 'M12345678',
    birthDate: '1985-03-15',
    passportExpire: '2030-06-13',
    phone: '010-1234-5678',
    room: '101',
    idNo: '8503151',
  },
  {
    no: 2,
    nameKor: '김영희',
    nameEn: 'KIM/YOUNGHEE',
    gender: 'F',
    passportNo: 'M87654321',
    birthDate: '1990-07-22',
    passportExpire: '2029-09-10',
    phone: '010-9876-5432',
    room: '102',
    idNo: '9007222',
  },
]

describe('MemberTable', () => {
  it('멤버 목록이 비어있으면 빈 상태 메시지를 표시한다', () => {
    render(<MemberTable members={[]} />)
    expect(screen.getByLabelText('빈 멤버 목록')).toBeInTheDocument()
  })

  it('멤버 목록을 테이블로 렌더링한다 (readOnly)', () => {
    render(<MemberTable members={mockMembers} readOnly />)
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.getByText('김영희')).toBeInTheDocument()
  })

  it('한글명, 영문명, 성별, 여권번호, 생년월일 컬럼이 표시된다 (편집모드)', () => {
    render(<MemberTable members={mockMembers} onUpdate={vi.fn()} />)
    expect(screen.getByDisplayValue('M12345678')).toBeInTheDocument()
    expect(screen.getByDisplayValue('HONG/GILDONG')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 onDelete가 호출된다', () => {
    const onDelete = vi.fn()
    render(<MemberTable members={mockMembers} onDelete={onDelete} />)
    const deleteBtns = screen.getAllByRole('button', { name: /삭제/ })
    fireEvent.click(deleteBtns[0])
    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('인라인 편집: 이름 필드를 수정하면 onUpdate가 호출된다', () => {
    const onUpdate = vi.fn()
    render(<MemberTable members={mockMembers} onUpdate={onUpdate} />)
    const nameInputs = screen.getAllByDisplayValue('홍길동')
    fireEvent.change(nameInputs[0], { target: { value: '홍길순' } })
    expect(onUpdate).toHaveBeenCalledWith(0, 'nameKor', '홍길순')
  })

  it('readOnly 모드에서는 편집 불가하고 삭제 버튼이 없다', () => {
    render(<MemberTable members={mockMembers} readOnly />)
    expect(screen.queryByRole('button', { name: /삭제/ })).toBeNull()
  })

  it('ID NO 자동생성 버튼(⚡)이 있다', () => {
    render(<MemberTable members={mockMembers} onUpdate={vi.fn()} />)
    const genBtns = screen.getAllByTitle('ID NO 자동생성')
    expect(genBtns.length).toBeGreaterThan(0)
  })
})
