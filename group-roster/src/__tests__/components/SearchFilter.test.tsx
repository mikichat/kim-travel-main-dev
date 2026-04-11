// @TASK T6.2 - SearchFilter 컴포넌트 테스트 (TDD RED)
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SearchFilter } from '../../components/SearchFilter'

describe('SearchFilter', () => {
  it('검색 입력창이 렌더링된다', () => {
    render(<SearchFilter value="" onChange={vi.fn()} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('placeholder가 기본값으로 표시된다', () => {
    render(<SearchFilter value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('검색...')).toBeInTheDocument()
  })

  it('커스텀 placeholder를 표시한다', () => {
    render(<SearchFilter value="" onChange={vi.fn()} placeholder="이름으로 검색" />)
    expect(screen.getByPlaceholderText('이름으로 검색')).toBeInTheDocument()
  })

  it('입력값이 변경되면 onChange가 호출된다', () => {
    const onChange = vi.fn()
    render(<SearchFilter value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '홍길동' } })
    expect(onChange).toHaveBeenCalledWith('홍길동')
  })

  it('검색어가 있을 때 초기화(✕) 버튼이 표시된다', () => {
    render(<SearchFilter value="홍길동" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '검색어 지우기' })).toBeInTheDocument()
  })

  it('검색어가 없으면 초기화 버튼이 없다', () => {
    render(<SearchFilter value="" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: '검색어 지우기' })).toBeNull()
  })

  it('초기화 버튼 클릭 시 onChange("")가 호출된다', () => {
    const onChange = vi.fn()
    render(<SearchFilter value="홍길동" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('role="search" 영역이 있다', () => {
    render(<SearchFilter value="" onChange={vi.fn()} />)
    expect(screen.getByRole('search')).toBeInTheDocument()
  })
})
