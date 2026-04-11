// @TASK T6.1 - 단체명단 관리 타입 정의
// @SPEC group-roster-manager-v2 (3).html 분석 기반

export interface Member {
  no?: number
  nameKor: string
  nameEn: string
  gender: 'M' | 'F' | ''
  passportNo: string
  birthDate: string
  idNo?: string
  passportExpire: string
  phone?: string
  room?: string
  nationality?: string
  note?: string
}

export interface Group {
  id: number
  name: string
  destination?: string
  departureDate?: string
  returnDate?: string
  data: Member[]
  archived?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateGroupPayload {
  name: string
  destination?: string
  departureDate?: string
  returnDate?: string
}

export interface UpdateGroupPayload extends Partial<CreateGroupPayload> {
  data?: Member[]
  archived?: boolean
}

export type ExportFields = {
  no: boolean
  nameKor: boolean
  nameEn: boolean
  gender: boolean
  passportNo: boolean
  birthDate: boolean
  idNo: boolean
  passportExpire: boolean
  phone: boolean
  room: boolean
}

export type DateFormat = 'YYYY-MM-DD' | 'DD-MMM-YY'
export type PhoneFormat = 'intl' | 'local'
export type ActiveTab = 'active' | 'archived'
