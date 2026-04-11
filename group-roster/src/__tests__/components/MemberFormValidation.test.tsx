// @TASK T6.2 - MemberForm 유효성 검사 테스트 (TDD RED)
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemberForm } from '../../components/MemberForm'

describe('MemberForm - 유효성 검사', () => {
  it('한글명 없이 제출하면 에러 메시지를 표시한다', () => {
    render(<MemberForm onSubmit={vi.fn()} />)
    // 여권번호만 입력
    fireEvent.change(screen.getByLabelText('여권번호'), { target: { value: 'M12345678' } })
    fireEvent.submit(screen.getByRole('form', { name: '멤버 입력 폼' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('한글명이 있으면 유효성 에러 없이 제출된다', () => {
    const onSubmit = vi.fn()
    render(<MemberForm onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('한글명'), { target: { value: '홍길동' } })
    fireEvent.submit(screen.getByRole('form', { name: '멤버 입력 폼' }))
    expect(onSubmit).toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('여권번호가 없어도 한글명만 있으면 제출된다', () => {
    const onSubmit = vi.fn()
    render(<MemberForm onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('한글명'), { target: { value: '홍길동' } })
    fireEvent.submit(screen.getByRole('form', { name: '멤버 입력 폼' }))
    expect(onSubmit).toHaveBeenCalled()
  })
})
