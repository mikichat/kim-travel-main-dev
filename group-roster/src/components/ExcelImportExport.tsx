// @TASK T6.2 - 엑셀 가져오기/내보내기 컴포넌트
// @SPEC group-roster-manager-v2 (3).html — handleFileUpload, exportToExcel 로직
import { useRef } from 'react'
import type { Member, Group } from '../types'
import { parseExcelData, exportGroupToExcel } from '../lib/excelUtils'
import toast from 'react-hot-toast'

interface ExcelImportExportProps {
  group: Group
  members: Member[]
  onImport: (members: Member[]) => void
  readOnly?: boolean
}

export function ExcelImportExport({ group, members, onImport, readOnly = false }: ExcelImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const parsed = parseExcelData(data)
        onImport(parsed)
        toast.success(`${parsed.length}명의 데이터를 가져왔습니다.`)
      } catch (err) {
        console.error('엑셀 파싱 오류:', err)
        toast.error('엑셀 파일 읽기 실패')
      }

      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsArrayBuffer(file)
  }

  const handleExport = () => {
    const fileName = exportGroupToExcel(group, members)
    toast.success(`${fileName} 다운로드 완료`)
  }

  return (
    <div className="excel-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {!readOnly && (
        <label className="btn btn-primary" style={{ cursor: 'pointer' }} aria-label="엑셀 가져오기">
          📁 엑셀 가져오기
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            data-testid="excel-file-input"
          />
        </label>
      )}

      <button
        type="button"
        className="btn btn-success"
        onClick={handleExport}
        aria-label="엑셀 내보내기"
      >
        📥 엑셀 내보내기
      </button>

      <button
        type="button"
        className="btn"
        style={{ background: '#6c757d', color: 'white' }}
        onClick={handleExport}
        aria-label="맞춤형 내보내기"
      >
        🎯 맞춤형 내보내기
      </button>
    </div>
  )
}
