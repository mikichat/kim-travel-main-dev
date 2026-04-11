// @TASK T6.2 - 멤버 입력 폼 컴포넌트 (유효성 검사 포함)
// @SPEC group-roster-manager-v2 (3).html — 멤버 추가/수정 폼
import { useState } from 'react'
import type { Member } from '../types'

const EMPTY_MEMBER: Member = {
  nameKor: '',
  nameEn: '',
  gender: '',
  passportNo: '',
  birthDate: '',
  passportExpire: '',
  phone: '',
  room: '',
}

interface MemberFormProps {
  initialValues?: Partial<Member>
  onSubmit: (member: Member) => void
  onCancel?: () => void
  submitLabel?: string
}

export function MemberForm({ initialValues, onSubmit, onCancel, submitLabel = '저장' }: MemberFormProps) {
  const [values, setValues] = useState<Member>({ ...EMPTY_MEMBER, ...initialValues })
  const [errors, setErrors] = useState<Partial<Record<keyof Member, string>>>({})

  const handleChange = (field: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }))
    // 필드 수정 시 에러 초기화
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof Member, string>> = {}
    if (!values.nameKor.trim()) {
      newErrors.nameKor = '한글명은 필수입니다.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} aria-label="멤버 입력 폼">
      <div className="form-group">
        <label htmlFor="nameKor">한글명</label>
        <input
          id="nameKor"
          type="text"
          value={values.nameKor}
          onChange={handleChange('nameKor')}
          placeholder="홍길동"
          aria-invalid={!!errors.nameKor}
          aria-describedby={errors.nameKor ? 'nameKor-error' : undefined}
        />
        {errors.nameKor && (
          <span id="nameKor-error" role="alert" style={{ color: '#dc3545', fontSize: '13px' }}>
            {errors.nameKor}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="nameEn">영문명</label>
        <input
          id="nameEn"
          type="text"
          value={values.nameEn}
          onChange={handleChange('nameEn')}
          placeholder="HONG GILDONG"
        />
      </div>

      <div className="form-group">
        <label htmlFor="gender">성별</label>
        <select id="gender" value={values.gender} onChange={handleChange('gender')}>
          <option value="">선택</option>
          <option value="M">남성 (M)</option>
          <option value="F">여성 (F)</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="passportNo">여권번호</label>
        <input
          id="passportNo"
          type="text"
          value={values.passportNo}
          onChange={handleChange('passportNo')}
          placeholder="M12345678"
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthDate">생년월일</label>
        <input
          id="birthDate"
          type="date"
          value={values.birthDate}
          onChange={handleChange('birthDate')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="passportExpire">여권만료일</label>
        <input
          id="passportExpire"
          type="date"
          value={values.passportExpire}
          onChange={handleChange('passportExpire')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">연락처</label>
        <input
          id="phone"
          type="text"
          value={values.phone ?? ''}
          onChange={handleChange('phone')}
          placeholder="010-1234-5678"
        />
      </div>

      <div className="form-group">
        <label htmlFor="room">객실</label>
        <input
          id="room"
          type="text"
          value={values.room ?? ''}
          onChange={handleChange('room')}
          placeholder="101"
        />
      </div>

      <div className="form-actions">
        <button type="submit">{submitLabel}</button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            취소
          </button>
        )}
      </div>
    </form>
  )
}
