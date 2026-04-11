// @TASK T6.2 - memberStore Zustand 스토어 테스트 (TDD RED)
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMemberStore } from '../../stores/memberStore'

// API 모킹
vi.mock('../../api/memberApi', () => ({
  fetchGroups: vi.fn().mockResolvedValue([]),
  fetchGroup: vi.fn().mockResolvedValue({ id: 1, name: '테스트', data: [] }),
  createGroup: vi.fn().mockResolvedValue({ id: 2, name: '새 단체', data: [] }),
  updateGroup: vi.fn().mockResolvedValue({}),
  deleteGroup: vi.fn().mockResolvedValue(undefined),
}))

// react-hot-toast 모킹
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

beforeEach(() => {
  // 스토어 상태 초기화
  useMemberStore.setState({
    groups: [],
    currentGroupId: null,
    currentGroup: null,
    members: [],
    loading: false,
    error: null,
    searchTerm: '',
    activeTab: 'active',
  })
})

describe('useMemberStore - 초기 상태', () => {
  it('초기 members가 빈 배열이다', () => {
    const { members } = useMemberStore.getState()
    expect(members).toEqual([])
  })

  it('초기 groups가 빈 배열이다', () => {
    const { groups } = useMemberStore.getState()
    expect(groups).toEqual([])
  })

  it('초기 searchTerm이 빈 문자열이다', () => {
    const { searchTerm } = useMemberStore.getState()
    expect(searchTerm).toBe('')
  })

  it('초기 activeTab이 active이다', () => {
    const { activeTab } = useMemberStore.getState()
    expect(activeTab).toBe('active')
  })
})

describe('useMemberStore - addRow', () => {
  it('빈 상태에서 행 추가 시 no가 1인 멤버가 추가된다', () => {
    useMemberStore.getState().addRow()
    const { members } = useMemberStore.getState()
    expect(members).toHaveLength(1)
    expect(members[0].no).toBe(1)
  })

  it('여러 번 addRow 시 no가 증가한다', () => {
    useMemberStore.getState().addRow()
    useMemberStore.getState().addRow()
    const { members } = useMemberStore.getState()
    expect(members).toHaveLength(2)
    expect(members[1].no).toBe(2)
  })
})

describe('useMemberStore - updateMember', () => {
  it('멤버 필드를 업데이트한다', () => {
    useMemberStore.getState().addRow()
    useMemberStore.getState().updateMember(0, 'nameKor', '홍길동')
    const { members } = useMemberStore.getState()
    expect(members[0].nameKor).toBe('홍길동')
  })

  it('특정 인덱스만 업데이트된다', () => {
    useMemberStore.getState().addRow()
    useMemberStore.getState().addRow()
    useMemberStore.getState().updateMember(1, 'nameKor', '김영희')
    const { members } = useMemberStore.getState()
    expect(members[0].nameKor).toBe('')
    expect(members[1].nameKor).toBe('김영희')
  })
})

describe('useMemberStore - deleteMember', () => {
  it('인덱스에 해당하는 멤버를 삭제한다', () => {
    useMemberStore.getState().addRow()
    useMemberStore.getState().addRow()
    useMemberStore.getState().deleteMember(0)
    const { members } = useMemberStore.getState()
    expect(members).toHaveLength(1)
  })
})

describe('useMemberStore - setSearchTerm', () => {
  it('searchTerm을 업데이트한다', () => {
    useMemberStore.getState().setSearchTerm('홍길동')
    expect(useMemberStore.getState().searchTerm).toBe('홍길동')
  })
})

describe('useMemberStore - setActiveTab', () => {
  it('activeTab을 archived로 변경한다', () => {
    useMemberStore.getState().setActiveTab('archived')
    expect(useMemberStore.getState().activeTab).toBe('archived')
  })

  it('activeTab을 다시 active로 변경한다', () => {
    useMemberStore.getState().setActiveTab('archived')
    useMemberStore.getState().setActiveTab('active')
    expect(useMemberStore.getState().activeTab).toBe('active')
  })
})

describe('useMemberStore - importMembers', () => {
  it('가져온 멤버들이 기존 목록에 추가된다', () => {
    const imported = [
      { nameKor: '홍길동', nameEn: 'HONG/GILDONG', gender: 'M' as const, passportNo: 'M111', birthDate: '1985-01-01', passportExpire: '2030-01-01' },
    ]
    useMemberStore.getState().importMembers(imported)
    const { members } = useMemberStore.getState()
    expect(members).toHaveLength(1)
    expect(members[0].nameKor).toBe('홍길동')
  })

  it('기존 멤버가 있을 때 no가 연속으로 증가한다', () => {
    useMemberStore.getState().addRow()
    const imported = [
      { nameKor: '김영희', nameEn: 'KIM/YOUNGHEE', gender: 'F' as const, passportNo: 'M222', birthDate: '1990-01-01', passportExpire: '2030-01-01' },
    ]
    useMemberStore.getState().importMembers(imported)
    const { members } = useMemberStore.getState()
    expect(members).toHaveLength(2)
    expect(members[1].no).toBe(2)
  })
})

describe('useMemberStore - generateAllIds', () => {
  it('생년월일과 성별이 있는 멤버의 idNo를 자동 생성한다', () => {
    useMemberStore.setState({
      members: [
        { no: 1, nameKor: '홍길동', nameEn: '', gender: 'M', passportNo: '', birthDate: '1985-03-15', passportExpire: '' },
      ],
    })
    useMemberStore.getState().generateAllIds()
    const { members } = useMemberStore.getState()
    expect(members[0].idNo).toBe('8503151')
  })
})
