// @TASK T6.1 - App 컴포넌트 기본 렌더링 테스트
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('단체명단 관리 헤더가 렌더링된다', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('단체명단 관리 DB 제목이 표시된다', () => {
    render(<App />)
    expect(screen.getByText(/단체명단/)).toBeInTheDocument()
  })

  it('메인 컨텐츠 영역이 존재한다', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
