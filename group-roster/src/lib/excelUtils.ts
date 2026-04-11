// 엑셀 가져오기/내보내기 로직 (UI 분리)
import * as XLSX from 'xlsx'
import type { Member, Group } from '../types'
import { formatDate, normalizeGender, formatDateForExport } from './utils'

// --- 헤더 매핑 ---
const headerPatterns: Record<string, RegExp> = {
  nameKor: /한글|성명|이름/i,
  nameEn: /영문|영어|english/i,
  gender: /성별|gender/i,
  passportNo: /여권번호|passport/i,
  birthDate: /생년월일|birth/i,
  idNo: /id\s?no|아이디/i,
  passportExpire: /여권만료|expire/i,
  phone: /전화|phone|연락/i,
  room: /room|객실/i,
}

function buildHeaderMap(headers: string[]): Record<string, number | undefined> {
  const map: Record<string, number | undefined> = {}
  for (const [key, regex] of Object.entries(headerPatterns)) {
    const idx = headers.findIndex((h) => regex.test(String(h || '')))
    if (idx >= 0) map[key] = idx
  }
  return map
}

function getCellValue(row: (string | number)[], idx: number | undefined): string | number | undefined {
  if (idx === undefined) return undefined
  return row[idx]
}

// --- 엑셀 가져오기 파싱 ---
const HEADER_KEYWORDS = ['한글', '영문', '성별', '여권번호', 'NAME', 'PASSPORT', 'GENDER']

export function parseExcelData(data: Uint8Array): Member[] {
  const wb = XLSX.read(data, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]

  // 헤더 행 찾기
  let headerRow = 0
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]
    if (
      Array.isArray(row) &&
      row.some((cell) => {
        const cellStr = String(cell || '').trim().toUpperCase()
        return HEADER_KEYWORDS.some((kw) => cellStr.includes(kw))
      })
    ) {
      headerRow = i
      break
    }
  }

  const headers = rows[headerRow] as string[]
  const headerMap = buildHeaderMap(headers)
  const parsed: Member[] = []

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] as (string | number)[]
    const nameKor = getCellValue(row, headerMap.nameKor)
    const nameEn = getCellValue(row, headerMap.nameEn)
    const passportNo = String(getCellValue(row, headerMap.passportNo) || '').trim().toUpperCase()

    if (!nameKor && !nameEn && !passportNo) continue

    const gender = normalizeGender(String(getCellValue(row, headerMap.gender) || ''))
    const birthDate = formatDate(getCellValue(row, headerMap.birthDate) as string, 'birth')
    const passportExpire = formatDate(getCellValue(row, headerMap.passportExpire) as string, 'passport')

    parsed.push({
      no: parsed.length + 1,
      nameKor: String(nameKor || '').trim(),
      nameEn: String(nameEn || '').trim().toUpperCase(),
      gender: gender || 'M',
      passportNo,
      birthDate: birthDate || '',
      idNo: String(getCellValue(row, headerMap.idNo) || '').trim(),
      passportExpire: passportExpire || '',
      phone: String(getCellValue(row, headerMap.phone) || '').trim(),
      room: String(getCellValue(row, headerMap.room) || '').trim(),
    })
  }

  return parsed
}

// --- 엑셀 내보내기 ---
export function exportGroupToExcel(group: Group, members: Member[]) {
  const wb = XLSX.utils.book_new()
  const rows: (string | number | undefined)[][] = []

  rows.push(['단 체 명 단'])
  rows.push([
    `단체명: ${group.name}`, '', `여행지: ${group.destination || ''}`,
    '', `출발일: ${group.departureDate || ''}`, '', `귀국일: ${group.returnDate || ''}`,
  ])

  const total = members.length
  const male = members.filter((m) => m.gender === 'M').length
  const female = members.filter((m) => m.gender === 'F').length
  rows.push([`총 인원: ${total}명 (남 ${male}명 / 여 ${female}명)`])
  rows.push([])
  rows.push(['NO', '한글', '영문', '성별', '여권번호', '생년월일', 'ID NO', '여권만료일', '전화번호', 'ROOM'])

  members.forEach((p) => {
    rows.push([
      p.no,
      p.nameKor || '',
      p.nameEn || '',
      p.gender || '',
      p.passportNo || '',
      formatDateForExport(p.birthDate),
      p.idNo || '',
      formatDateForExport(p.passportExpire),
      p.phone || '',
      p.room || '',
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
  ]
  ws['!cols'] = [
    { wch: 5 }, { wch: 10 }, { wch: 22 }, { wch: 6 }, { wch: 14 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, '명단')
  const fileName = `${group.name}_명단_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
  return fileName
}
