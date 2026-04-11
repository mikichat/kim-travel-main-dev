// @TASK T6.2 - MemberForm 컴포넌트 테스트 (TDD RED)
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemberForm } from '../../components/MemberForm'
import type { Member } from '../../types'

const mockMember: Member = {
  nameKor: '홍길동',
  nameEn: 'HONG/GILDONG',
  gender: 'M',
  passportNo: 'M12345678',
  birthDate: '1985-03-15',
  passportExpire: '2030-06-13',
  phone: '010-1234-5678',
  room: '101',
}

describe('MemberForm', () => {
  it('빈 폼으로 렌더링된다', () => {
    render(<MemberForm onSubmit={vi.fn()} />)
    expect(screen.getByRole('form', { name: '멤버 입력 폼' })).toBeInTheDocument()
  })

  it('initialValues로 폼이 채워진다', () => {
    render(<MemberForm initialValues={mockMember} onSubmit={vi.fn()} />)
    expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument()
    expect(screen.getByDisplayValue('M12345678')).toBeInTheDocument()
  })

  it('한글명, 영문명, 성별, 여권번호, 생년월일, 여권만료일, 연락처, 객실 필드가 있다', () => {
    render(<MemberForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText('한글명')).toBeInTheDocument()
    expect(screen.getByLabelText('영문명')).toBeInTheDocument()
    expect(screen.getByLabelText('성별')).toBeInTheDocument()
    expect(screen.getByLabelText('여권번호')).toBeInTheDocument()
    expect(screen.getByLabelText('생년월일')).toBeInTheDocument()
    expect(screen.getByLabelText('여권만료일')).toBeInTheDocument()
    expect(screen.getByLabelText('연락처')).toBeInTheDocument()
    expect(screen.getByLabelText('객실')).toBeInTheDocument()
  })

  it('폼 제출 시 onSubmit이 값과 함께 호출된다', () => {
    const onSubmit = vi.fn()
    render(<MemberForm onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('한글명'), { target: { value: '홍길동' } })
    fireEvent.submit(screen.getByRole('form', { name: '멤버 입력 폼' }))
    expect(onSubmit).toHaveBeenCalled()
    const submitted = onSubmit.mock.calls[0][0] as Member
    expect(submitted.nameKor).toBe('홍길동')
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    const onCancel = vi.fn()
    render(<MemberForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('submitLabel prop이 버튼에 표시된다', () => {
    render(<MemberForm onSubmit={vi.fn()} submitLabel="추가" />)
    expect(screen.getByRole('button', { name: '추가' })).toBeInTheDocument()
  })
})
