// @TASK T6.2 - PassportScanner 컴포넌트 테스트 (TDD RED)
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PassportScanner } from '../../components/PassportScanner'

describe('PassportScanner', () => {
  it('여권 스캔 레이블이 렌더링된다', () => {
    render(<PassportScanner onApply={vi.fn()} />)
    expect(screen.getByLabelText('여권 스캔')).toBeInTheDocument()
  })

  it('파일 input은 이미지 형식만 허용한다', () => {
    render(<PassportScanner onApply={vi.fn()} />)
    const fileInput = screen.getByTestId('passport-file-input')
    expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  })

  it('파일 input은 multiple을 지원한다', () => {
    render(<PassportScanner onApply={vi.fn()} />)
    const fileInput = screen.getByTestId('passport-file-input')
    expect(fileInput).toHaveAttribute('multiple')
  })

  it('스캔 중이 아닐 때 스캔 진행 상태가 표시되지 않는다', () => {
    render(<PassportScanner onApply={vi.fn()} />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
