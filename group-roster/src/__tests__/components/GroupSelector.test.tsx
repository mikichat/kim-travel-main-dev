// @TASK T6.2 - GroupSelector 컴포넌트 테스트 (TDD RED)
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GroupSelector } from '../../components/GroupSelector'
import type { Group } from '../../types'

const mockGroups: Group[] = [
  { id: 1, name: '태국 패키지', destination: '방콕', departureDate: '2026-04-10', returnDate: '2026-04-14', data: [] },
  { id: 2, name: '일본 성지순례', destination: '오사카', departureDate: '2026-05-01', returnDate: '2026-05-05', data: [], archived: true },
]

describe('GroupSelector', () => {
  it('그룹 목록을 렌더링한다', () => {
    render(<GroupSelector groups={mockGroups} currentGroupId={null} onSelect={vi.fn()} activeTab="active" onTabChange={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText('태국 패키지')).toBeInTheDocument()
  })

  it('activeTab이 active면 archived 그룹은 숨긴다', () => {
    render(<GroupSelector groups={mockGroups} currentGroupId={null} onSelect={vi.fn()} activeTab="active" onTabChange={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.queryByText('일본 성지순례')).toBeNull()
  })

  it('activeTab이 archived면 archived 그룹만 표시한다', () => {
    render(<GroupSelector groups={mockGroups} currentGroupId={null} onSelect={vi.fn()} activeTab="archived" onTabChange={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText('일본 성지순례')).toBeInTheDocument()
    expect(screen.queryByText('태국 패키지')).toBeNull()
  })

  it('그룹 클릭 시 onSelect가 호출된다', () => {
    const onSelect = vi.fn()
    render(<GroupSelector groups={mockGroups} currentGroupId={null} onSelect={onSelect} activeTab="active" onTabChange={vi.fn()} onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('태국 패키지'))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('새 단체 추가 버튼을 클릭하면 onAdd가 호출된다', () => {
    const onAdd = vi.fn()
    render(<GroupSelector groups={mockGroups} currentGroupId={null} onSelect={vi.fn()} activeTab="active" onTabChange={vi.fn()} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /새 단체/ }))
    expect(onAdd).toHaveBeenCalled()
  })

  it('진행 중 / 지난 행사 탭이 표시된다', () => {
    render(<GroupSelector groups={mockGroups} currentGroupId={null} onSelect={vi.fn()} activeTab="active" onTabChange={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /진행 중/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /지난 행사/ })).toBeInTheDocument()
  })

  it('그룹 검색으로 필터링된다', () => {
    render(<GroupSelector groups={mockGroups} currentGroupId={null} onSelect={vi.fn()} activeTab="active" onTabChange={vi.fn()} onAdd={vi.fn()} />)
    const searchInput = screen.getByPlaceholderText(/단체 검색/)
    fireEvent.change(searchInput, { target: { value: '태국' } })
    expect(screen.getByText('태국 패키지')).toBeInTheDocument()
  })
})
