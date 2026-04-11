// @TASK T6.2 - 여권 스캔 컴포넌트
// @SPEC group-roster-manager-v2 (3).html — handlePassportScan, applyPassportScanResults
import { useRef, useState } from 'react'
import { scanPassport } from '../api/memberApi'
import type { Member } from '../types'
import toast from 'react-hot-toast'

interface PassportScanResult {
  success: boolean
  filename?: string
  data?: {
    nameKor?: string
    surname?: string
    givenName?: string
    gender?: string
    birthDate?: string
    passportNo?: string
    passportExpire?: string
  }
  error?: string
}

interface PassportScannerProps {
  onApply: (members: Partial<Member>[]) => void
}

export function PassportScanner({ onApply }: PassportScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, scanning: false })
  const [results, setResults] = useState<{ results: PassportScanResult[] } | null>(null)

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setProgress({ current: 0, total: files.length, scanning: true })
    setResults(null)

    const scanResults: PassportScanResult[] = []

    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length, scanning: true })
      const formData = new FormData()
      formData.append('passport_image', files[i])

      try {
        const result = await scanPassport(formData) as PassportScanResult
        scanResults.push({ ...result, success: true, filename: files[i].name })
      } catch (err) {
        scanResults.push({
          success: false,
          filename: files[i].name,
          error: err instanceof Error ? err.message : '스캔 실패',
        })
      }
    }

    setProgress({ current: files.length, total: files.length, scanning: false })
    setResults({ results: scanResults })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const applyResults = () => {
    if (!results?.results) return

    const successResults = results.results.filter((r) => r.success && r.data)
    if (successResults.length === 0) {
      toast('적용할 성공 결과가 없습니다.', { icon: '⚠️' })
      return
    }

    const newMembers: Partial<Member>[] = successResults.map((r) => {
      const d = r.data!
      return {
        nameKor: d.nameKor || '',
        nameEn: [d.surname, d.givenName].filter(Boolean).join('/'),
        gender: (d.gender as 'M' | 'F') || 'M',
        passportNo: d.passportNo || '',
        birthDate: d.birthDate || '',
        passportExpire: d.passportExpire || '',
      }
    })

    onApply(newMembers)
    setResults(null)
    toast.success(`${successResults.length}명의 여권 정보를 적용했습니다.`)
  }

  return (
    <div className="passport-scanner">
      <label
        className="btn"
        style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', color: 'white', cursor: 'pointer' }}
        aria-label="여권 스캔"
      >
        📷 여권 스캔
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleScan}
          style={{ display: 'none' }}
          data-testid="passport-file-input"
        />
      </label>

      {progress.scanning && (
        <div className="scan-progress" role="status" aria-live="polite">
          스캔 중... {progress.current}/{progress.total}
        </div>
      )}

      {results && !progress.scanning && (
        <div className="scan-results" style={{ marginTop: '8px' }}>
          <p>
            완료: 성공 {results.results.filter((r) => r.success).length}건 /
            실패 {results.results.filter((r) => !r.success).length}건
          </p>
          <button type="button" className="btn btn-primary" onClick={applyResults}>
            명단에 적용
          </button>
          <button type="button" className="btn" onClick={() => setResults(null)} style={{ marginLeft: '8px' }}>
            취소
          </button>
        </div>
      )}
    </div>
  )
}
