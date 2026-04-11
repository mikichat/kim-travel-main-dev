// @TASK T6.2 - ExcelImportExport 컴포넌트 테스트 (TDD RED)
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExcelImportExport } from '../../components/ExcelImportExport'
import type { Member, Group } from '../../types'

const mockGroup: Group = {
  id: 1,
  name: '태국 패키지',
  destination: '방콕',
  departureDate: '2026-04-10',
  returnDate: '2026-04-14',
  data: [],
}

const mockMembers: Member[] = [
  { no: 1, nameKor: '홍길동', nameEn: 'HONG/GILDONG', gender: 'M', passportNo: 'M12345678', birthDate: '1985-03-15', passportExpire: '2030-06-13', phone: '010-1234-5678', room: '101' },
]

describe('ExcelImportExport', () => {
  it('엑셀 가져오기 버튼이 렌더링된다', () => {
    render(<ExcelImportExport group={mockGroup} members={mockMembers} onImport={vi.fn()} />)
    expect(screen.getByLabelText('엑셀 가져오기')).toBeInTheDocument()
  })

  it('엑셀 내보내기 버튼이 렌더링된다', () => {
    render(<ExcelImportExport group={mockGroup} members={mockMembers} onImport={vi.fn()} />)
    expect(screen.getByRole('button', { name: /엑셀 내보내기/ })).toBeInTheDocument()
  })

  it('맞춤형 내보내기 버튼이 렌더링된다', () => {
    render(<ExcelImportExport group={mockGroup} members={mockMembers} onImport={vi.fn()} />)
    expect(screen.getByRole('button', { name: /맞춤형/ })).toBeInTheDocument()
  })

  it('파일 input은 .xlsx, .xls를 허용한다', () => {
    render(<ExcelImportExport group={mockGroup} members={mockMembers} onImport={vi.fn()} />)
    const fileInput = screen.getByTestId('excel-file-input')
    expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls')
  })

  it('readOnly 모드에서는 가져오기 버튼이 없다', () => {
    render(<ExcelImportExport group={mockGroup} members={mockMembers} onImport={vi.fn()} readOnly />)
    expect(screen.queryByLabelText('엑셀 가져오기')).toBeNull()
  })
})
