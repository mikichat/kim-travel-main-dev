import { useState, useEffect } from 'react'

interface GroupFormData {
  name: string
  destination: string
  departureDate: string
  returnDate: string
}

const emptyForm: GroupFormData = { name: '', destination: '', departureDate: '', returnDate: '' }

interface Props {
  mode: 'add' | 'edit'
  open: boolean
  initial?: GroupFormData
  onSubmit: (data: GroupFormData) => void
  onClose: () => void
}

export function GroupFormModal({ mode, open, initial, onSubmit, onClose }: Props) {
  const [form, setForm] = useState<GroupFormData>(emptyForm)

  useEffect(() => {
    if (open) setForm(initial ?? emptyForm)
  }, [open, initial])

  if (!open) return null

  const isAdd = mode === 'add'
  const title = isAdd ? '새 단체 만들기' : '단체 정보 수정'
  const titleId = isAdd ? 'add-group-title' : 'edit-group-title'

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSubmit(form)
  }

  const set = (key: keyof GroupFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div className="form-group">
          <label htmlFor={`${mode}-group-name`}>단체명 *</label>
          <input id={`${mode}-group-name`} type="text" value={form.name} onChange={set('name')} placeholder={isAdd ? '예: 태국 방콕 패키지 2026' : undefined} autoFocus />
        </div>
        <div className="form-group">
          <label htmlFor={`${mode}-group-dest`}>여행지역</label>
          <input id={`${mode}-group-dest`} type="text" value={form.destination} onChange={set('destination')} placeholder={isAdd ? '예: 태국 방콕/파타야' : undefined} />
        </div>
        <div className="form-group">
          <label htmlFor={`${mode}-group-dep`}>출발일</label>
          <input id={`${mode}-group-dep`} type="date" value={form.departureDate} onChange={set('departureDate')} />
        </div>
        <div className="form-group">
          <label htmlFor={`${mode}-group-ret`}>귀국일</label>
          <input id={`${mode}-group-ret`} type="date" value={form.returnDate} onChange={set('returnDate')} />
        </div>

        <div className="modal-footer">
          <button type="button" className={`btn ${isAdd ? 'btn-primary' : 'btn-success'}`} onClick={handleSubmit}>
            {isAdd ? '만들기' : '저장'}
          </button>
          <button type="button" className="btn" onClick={onClose} style={{ background: '#ccc' }}>취소</button>
        </div>
      </div>
    </div>
  )
}
