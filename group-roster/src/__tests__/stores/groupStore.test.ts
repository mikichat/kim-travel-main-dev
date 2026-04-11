// @TASK T6.2 - groupStore Zustand 스토어 테스트 (TDD RED)
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGroupStore } from '../../stores/groupStore'

// API 모킹
vi.mock('../../api/memberApi', () => ({
  fetchGroups: vi.fn().mockResolvedValue([
    { id: 1, name: '태국 패키지', destination: '방콕', data: [] },
  ]),
  createGroup: vi.fn().mockResolvedValue({ id: 3, name: '새 단체', data: [] }),
  updateGroup: vi.fn().mockResolvedValue({}),
  deleteGroup: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

beforeEach(() => {
  useGroupStore.setState({
    groups: [],
    currentGroupId: null,
    activeTab: 'active',
    loading: false,
    error: null,
  })
})

describe('useGroupStore - 초기 상태', () => {
  it('초기 groups가 빈 배열이다', () => {
    expect(useGroupStore.getState().groups).toEqual([])
  })

  it('초기 currentGroupId가 null이다', () => {
    expect(useGroupStore.getState().currentGroupId).toBeNull()
  })

  it('초기 activeTab이 active이다', () => {
    expect(useGroupStore.getState().activeTab).toBe('active')
  })
})

describe('useGroupStore - setActiveTab', () => {
  it('activeTab을 archived로 변경한다', () => {
    useGroupStore.getState().setActiveTab('archived')
    expect(useGroupStore.getState().activeTab).toBe('archived')
  })
})

describe('useGroupStore - selectGroup', () => {
  it('currentGroupId를 변경한다', () => {
    useGroupStore.setState({ groups: [{ id: 5, name: '테스트', data: [] }] })
    useGroupStore.getState().selectGroup(5)
    expect(useGroupStore.getState().currentGroupId).toBe(5)
  })
})

describe('useGroupStore - filteredGroups', () => {
  it('active 탭에서는 archived 그룹이 제외된다', () => {
    useGroupStore.setState({
      groups: [
        { id: 1, name: '진행중', data: [] },
        { id: 2, name: '지난행사', data: [], archived: true },
      ],
      activeTab: 'active',
    })
    const filtered = useGroupStore.getState().filteredGroups()
    expect(filtered.every((g) => !g.archived)).toBe(true)
  })

  it('archived 탭에서는 archived 그룹만 포함된다', () => {
    useGroupStore.setState({
      groups: [
        { id: 1, name: '진행중', data: [] },
        { id: 2, name: '지난행사', data: [], archived: true },
      ],
      activeTab: 'archived',
    })
    const filtered = useGroupStore.getState().filteredGroups()
    expect(filtered.every((g) => !!g.archived)).toBe(true)
  })
})
