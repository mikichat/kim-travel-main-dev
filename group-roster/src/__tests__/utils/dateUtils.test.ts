// @TASK T6.2 - 날짜 유틸리티 테스트 (TDD RED)
import { describe, it, expect } from 'vitest'
import { formatDate, normalizeGender, generateIdNo, calculateAge } from '../../lib/utils'

describe('formatDate', () => {
  it('YYYY-MM-DD 형식 문자열을 그대로 반환한다', () => {
    expect(formatDate('1985-03-15')).toBe('1985-03-15')
  })

  it('8자리 숫자를 YYYY-MM-DD로 변환한다', () => {
    expect(formatDate('19850315')).toBe('1985-03-15')
  })

  it('ddMMMyyyy 형식 (여권)을 YYYY-MM-DD로 변환한다', () => {
    expect(formatDate('13JUN2032', 'passport')).toBe('2032-06-13')
  })

  it('ddMMMyyy 2자리 연도 생년월일을 변환한다', () => {
    expect(formatDate('15MAR85', 'birth')).toBe('1985-03-15')
  })

  it('빈 값이면 빈 문자열을 반환한다', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null as unknown as string)).toBe('')
  })

  it('한국어 날짜 형식을 변환한다', () => {
    expect(formatDate('1985년 03월 15일')).toBe('1985-03-15')
  })
})

describe('normalizeGender', () => {
  it('M, MALE, 남, 남성, MR, MR.을 M으로 반환한다', () => {
    expect(normalizeGender('M')).toBe('M')
    expect(normalizeGender('MALE')).toBe('M')
    expect(normalizeGender('남')).toBe('M')
    expect(normalizeGender('남성')).toBe('M')
    expect(normalizeGender('MR')).toBe('M')
  })

  it('F, FEMALE, 여, 여성, MRS, MS, MISS를 F로 반환한다', () => {
    expect(normalizeGender('F')).toBe('F')
    expect(normalizeGender('FEMALE')).toBe('F')
    expect(normalizeGender('여')).toBe('F')
    expect(normalizeGender('MRS')).toBe('F')
    expect(normalizeGender('MISS')).toBe('F')
  })

  it('빈 값이면 빈 문자열을 반환한다', () => {
    expect(normalizeGender('')).toBe('')
    expect(normalizeGender(null as unknown as string)).toBe('')
  })
})

describe('generateIdNo', () => {
  it('남성 1985-03-15 → 8503151 (7자리)', () => {
    expect(generateIdNo('M', '1985-03-15')).toBe('8503151')
  })

  it('여성 1990-07-22 → 9007222 (7자리)', () => {
    expect(generateIdNo('F', '1990-07-22')).toBe('9007222')
  })

  it('성별 없으면 빈 문자열 반환', () => {
    expect(generateIdNo('', '1985-03-15')).toBe('')
  })

  it('생년월일 없으면 빈 문자열 반환', () => {
    expect(generateIdNo('M', '')).toBe('')
  })
})

describe('calculateAge', () => {
  it('생년월일로 만 나이를 계산한다', () => {
    const today = new Date()
    const birthYear = today.getFullYear() - 30
    const birthDate = `${birthYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(calculateAge(birthDate)).toBe(30)
  })

  it('빈 값이면 null을 반환한다', () => {
    expect(calculateAge('')).toBeNull()
    expect(calculateAge(null as unknown as string)).toBeNull()
  })
})
