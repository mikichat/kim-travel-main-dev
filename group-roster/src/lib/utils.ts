// @TASK T6.2 - 날짜/유틸리티 함수 (group-roster-manager-v2 (3).html 이식)
// @SPEC group-roster-manager-v2 (3).html — formatDate, normalizeGender, generateIdNo

/**
 * 날짜 값을 YYYY-MM-DD 형식 문자열로 변환합니다.
 * @param dateValue 날짜값 (string | number | Date | null)
 * @param dateType 'birth' (생년월일) | 'passport' (여권만료일)
 */
export function formatDate(
  dateValue: string | number | Date | null | undefined,
  dateType: 'birth' | 'passport' = 'birth',
): string {
  if (!dateValue) return ''

  if (typeof dateValue === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
      return dateValue.split(' ')[0].split('T')[0]
    }

    // 한국어 날짜 형식 (예: "1985년 03월 15일")
    const korDateMatch = dateValue.match(/(\d{4})\s*년?\s*(\d{1,2})\s*월?\s*(\d{1,2})/)
    if (korDateMatch) {
      return `${korDateMatch[1]}-${String(korDateMatch[2]).padStart(2, '0')}-${String(korDateMatch[3]).padStart(2, '0')}`
    }

    // 점(.) 구분자
    const dotMatch = dateValue.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)
    if (dotMatch) {
      return `${dotMatch[1]}-${String(dotMatch[2]).padStart(2, '0')}-${String(dotMatch[3]).padStart(2, '0')}`
    }

    // 슬래시(/) 구분자
    const slashMatch = dateValue.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
    if (slashMatch) {
      return `${slashMatch[1]}-${String(slashMatch[2]).padStart(2, '0')}-${String(slashMatch[3]).padStart(2, '0')}`
    }

    // 8자리 숫자 (19850315)
    const numericMatch = dateValue.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (numericMatch) {
      return `${numericMatch[1]}-${numericMatch[2]}-${numericMatch[3]}`
    }

    // 6자리 숫자 (670110)
    const sixDigitMatch = dateValue.match(/^(\d{2})(\d{2})(\d{2})$/)
    if (sixDigitMatch) {
      const yy = parseInt(sixDigitMatch[1])
      const year = yy > 30 ? `19${sixDigitMatch[1]}` : `20${sixDigitMatch[1]}`
      return `${year}-${sixDigitMatch[2]}-${sixDigitMatch[3]}`
    }

    const monthMap: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
    }

    // ddMMMyyyy (13JUN2032, 13-JUN-2032)
    const ddMMMyyyyyMatch = dateValue.match(/^(\d{1,2})[\s-]*([A-Za-z]{3})[\s-]*(\d{4})$/)
    if (ddMMMyyyyyMatch) {
      const day = String(ddMMMyyyyyMatch[1]).padStart(2, '0')
      const month = monthMap[ddMMMyyyyyMatch[2].toUpperCase()]
      if (month) return `${ddMMMyyyyyMatch[3]}-${month}-${day}`
    }

    // ddMMMyyy (13JUN32, 15MAR85)
    const ddMMMyyMatch = dateValue.match(/^(\d{1,2})[\s-]*([A-Za-z]{3})[\s-]*(\d{2})$/)
    if (ddMMMyyMatch) {
      const day = String(ddMMMyyMatch[1]).padStart(2, '0')
      const monthStr = ddMMMyyMatch[2].toUpperCase()
      const yearShort = parseInt(ddMMMyyMatch[3])
      const month = monthMap[monthStr]
      if (month) {
        let year: number
        if (dateType === 'passport') {
          year = 2000 + yearShort
        } else {
          const currentYearShort = new Date().getFullYear() % 100
          year = yearShort <= currentYearShort ? 2000 + yearShort : 1900 + yearShort
        }
        return `${year}-${month}-${day}`
      }
    }

    // 표준 Date 파싱
    try {
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    } catch {
      return ''
    }
  }

  if (typeof dateValue === 'number') {
    try {
      // XLSX 날짜 (엑셀 시리얼 번호)
      const jsDate = new Date((dateValue - 25569) * 86400 * 1000)
      let year = jsDate.getFullYear()
      const month = String(jsDate.getMonth() + 1).padStart(2, '0')
      const day = String(jsDate.getDate()).padStart(2, '0')
      if (dateType === 'passport' && year < 2000) {
        year = 2000 + (year % 100)
      }
      return `${year}-${month}-${day}`
    } catch {
      return ''
    }
  }

  if (dateValue instanceof Date) {
    let year = dateValue.getFullYear()
    const month = String(dateValue.getMonth() + 1).padStart(2, '0')
    const day = String(dateValue.getDate()).padStart(2, '0')
    if (dateType === 'passport' && year < 2000) {
      year = 2000 + (year % 100)
    }
    return `${year}-${month}-${day}`
  }

  return ''
}

/**
 * 성별 값을 M 또는 F로 정규화합니다.
 */
export function normalizeGender(gender: string | null | undefined): 'M' | 'F' | '' {
  if (!gender) return ''
  const g = String(gender).trim().toUpperCase()
  if (['M', 'MALE', '남', '남성', '1', 'MR', 'MR.', 'MSTR', 'MASTER'].includes(g)) return 'M'
  if (['F', 'FEMALE', '여', '여성', '2', 'MRS', 'MRS.', 'MS', 'MS.', 'MISS'].includes(g)) return 'F'
  return ''
}

/**
 * 성별과 생년월일로 7자리 ID NO를 생성합니다 (YYMMDD + 성별코드).
 */
export function generateIdNo(gender: string, birthDate: string): string {
  if (!birthDate || !gender) return ''
  const normalizedGender = normalizeGender(gender)
  if (!normalizedGender) return ''

  let dateStr = String(birthDate).trim()
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    dateStr = formatDate(dateStr, 'birth')
  }
  if (!dateStr) return ''

  const parts = dateStr.split('-')
  if (parts.length < 3) return ''

  const yy = parts[0].slice(-2)
  const mm = parts[1]
  const dd = parts[2].slice(0, 2)
  const gCode = normalizedGender === 'M' ? '1' : '2'

  return `${yy}${mm}${dd}${gCode}`
}

/**
 * 생년월일로 만 나이를 계산합니다.
 */
export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * 15세 미만 여부 확인
 */
export function isMinor(birthDate: string): boolean {
  const age = calculateAge(birthDate)
  return age !== null && age < 15
}

/**
 * 영문명에 MSTR/MISS 호칭 추가 (15세 미만)
 */
export function formatEnglishName(nameEn: string, gender: string, birthDate: string): string {
  if (!nameEn) return nameEn
  // 기존 호칭 제거
  const cleaned = nameEn.replace(/\s*(MR|MS|MRS|MSTR|MISS)\s*$/i, '').trim()
  const age = calculateAge(birthDate)
  if (age !== null && age < 15) {
    const g = normalizeGender(gender)
    return g === 'M' ? `${cleaned} MSTR` : g === 'F' ? `${cleaned} MISS` : cleaned
  }
  return cleaned
}

/**
 * 전화번호 국제 형식으로 변환 (010-xxxx → +82-10-xxxx)
 */
export function formatPhoneIntl(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '')
  if (cleaned.startsWith('010') && !cleaned.startsWith('+')) {
    return `+82-10-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

/**
 * 엑셀 날짜 형식으로 변환 (dateFormat에 따라)
 */
export function formatDateForExport(
  dateValue: string | number | undefined,
  dateFormat: 'YYYY-MM-DD' | 'DD-MMM-YY' = 'YYYY-MM-DD',
): string {
  if (!dateValue) return ''
  if (typeof dateValue !== 'string') return String(dateValue)

  if (dateFormat === 'DD-MMM-YY') {
    const parts = dateValue.split('-')
    if (parts.length === 3) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
      const monthIdx = parseInt(parts[1]) - 1
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${parts[2]}-${months[monthIdx]}-${parts[0].slice(-2)}`
      }
    }
  }

  return dateValue
}
