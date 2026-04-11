// @TASK T6.2 - 유틸리티 추가 테스트 (TDD RED)
import { describe, it, expect } from 'vitest'
import {
  isMinor,
  formatEnglishName,
  formatPhoneIntl,
  formatDateForExport,
} from '../../lib/utils'

describe('isMinor', () => {
  it('15세 미만이면 true를 반환한다', () => {
    const today = new Date()
    const birthYear = today.getFullYear() - 10
    expect(isMinor(`${birthYear}-01-01`)).toBe(true)
  })

  it('15세 이상이면 false를 반환한다', () => {
    const today = new Date()
    const birthYear = today.getFullYear() - 20
    expect(isMinor(`${birthYear}-01-01`)).toBe(false)
  })

  it('빈 문자열이면 false를 반환한다', () => {
    expect(isMinor('')).toBe(false)
  })
})

describe('formatEnglishName', () => {
  it('성인 남성은 호칭 없이 반환된다', () => {
    const birthYear = new Date().getFullYear() - 30
    expect(formatEnglishName('HONG/GILDONG', 'M', `${birthYear}-01-01`)).toBe('HONG/GILDONG')
  })

  it('15세 미만 남성은 MSTR이 추가된다', () => {
    const birthYear = new Date().getFullYear() - 10
    const result = formatEnglishName('LEE/MINHO', 'M', `${birthYear}-01-01`)
    expect(result).toContain('MSTR')
  })

  it('15세 미만 여성은 MISS가 추가된다', () => {
    const birthYear = new Date().getFullYear() - 10
    const result = formatEnglishName('KIM/SOOAH', 'F', `${birthYear}-01-01`)
    expect(result).toContain('MISS')
  })

  it('기존 호칭(MR, MS)은 제거된다', () => {
    const birthYear = new Date().getFullYear() - 30
    const result = formatEnglishName('HONG/GILDONG MR', 'M', `${birthYear}-01-01`)
    expect(result).not.toContain('MR')
    expect(result).toBe('HONG/GILDONG')
  })

  it('빈 영문명이면 그대로 반환된다', () => {
    expect(formatEnglishName('', 'M', '1985-01-01')).toBe('')
  })
})

describe('formatPhoneIntl', () => {
  it('010으로 시작하는 번호를 국제 형식으로 변환한다', () => {
    expect(formatPhoneIntl('01012345678')).toBe('+82-10-1234-5678')
  })

  it('이미 국제 형식이면 그대로 반환한다', () => {
    expect(formatPhoneIntl('+82-10-1234-5678')).toBe('+82-10-1234-5678')
  })

  it('빈 값이면 빈 문자열을 반환한다', () => {
    expect(formatPhoneIntl('')).toBe('')
  })
})

describe('formatDateForExport', () => {
  it('YYYY-MM-DD 형식으로 그대로 반환한다', () => {
    expect(formatDateForExport('1985-03-15', 'YYYY-MM-DD')).toBe('1985-03-15')
  })

  it('DD-MMM-YY 형식으로 변환한다', () => {
    expect(formatDateForExport('1985-03-15', 'DD-MMM-YY')).toBe('15-MAR-85')
  })

  it('빈 값이면 빈 문자열을 반환한다', () => {
    expect(formatDateForExport('', 'YYYY-MM-DD')).toBe('')
  })

  it('6월은 JUN으로 변환한다', () => {
    expect(formatDateForExport('2030-06-13', 'DD-MMM-YY')).toBe('13-JUN-30')
  })
})
