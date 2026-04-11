// @TASK T6.2 - Zustand 그룹 전용 스토어
// @SPEC group-roster-manager-v2 (3).html — 그룹 목록, 탭, 현재 그룹 선택
import { create } from 'zustand'
import type { Group, ActiveTab } from '../types'
import { fetchGroups, createGroup, updateGroup, deleteGroup } from '../api/memberApi'
import toast from 'react-hot-toast'

interface GroupStore {
  // 상태
  groups: Group[]
  currentGroupId: number | null
  activeTab: ActiveTab
  loading: boolean
  error: string | null

  // 파생 데이터
  filteredGroups: () => Group[]

  // 액션
  loadGroups: () => Promise<void>
  selectGroup: (id: number) => void
  setActiveTab: (tab: ActiveTab) => void

  // 그룹 CRUD
  addGroup: (payload: { name: string; destination?: string; departureDate?: string; returnDate?: string }) => Promise<void>
  removeGroup: (id: number) => Promise<void>
  archiveGroup: (id: number) => Promise<void>
  restoreGroup: (id: number) => Promise<void>
  updateGroupInfo: (id: number, payload: { name?: string; destination?: string; departureDate?: string; returnDate?: string }) => Promise<void>
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],
  currentGroupId: null,
  activeTab: 'active',
  loading: false,
  error: null,

  filteredGroups: () => {
    const { groups, activeTab } = get()
    return groups.filter((g) => (activeTab === 'active' ? !g.archived : !!g.archived))
  },

  loadGroups: async () => {
    set({ loading: true, error: null })
    try {
      const groups = await fetchGroups()
      set({ groups, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '로드 실패' })
    }
  },

  selectGroup: (id) => {
    set({ currentGroupId: id })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  addGroup: async (payload) => {
    set({ loading: true })
    try {
      const newGroup = await createGroup(payload)
      const { groups } = get()
      set({ groups: [...groups, newGroup], loading: false })
      toast.success('단체가 생성되었습니다.')
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '그룹 생성 실패' })
      toast.error('그룹 생성 실패')
    }
  },

  removeGroup: async (id) => {
    set({ loading: true })
    try {
      await deleteGroup(id)
      const { groups, currentGroupId } = get()
      const updatedGroups = groups.filter((g) => g.id !== id)
      const newCurrentId =
        currentGroupId === id
          ? updatedGroups.find((g) => !g.archived)?.id ?? null
          : currentGroupId
      set({ groups: updatedGroups, currentGroupId: newCurrentId, loading: false })
      toast.success('삭제되었습니다.')
    } catch (err) {
      set({ loading: false })
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  },

  archiveGroup: async (id) => {
    try {
      await updateGroup(id, { archived: true })
      const { groups } = get()
      set({ groups: groups.map((g) => (g.id === id ? { ...g, archived: true } : g)) })
      toast.success('지난 행사로 이동했습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '아카이브 실패')
    }
  },

  restoreGroup: async (id) => {
    try {
      await updateGroup(id, { archived: false })
      const { groups } = get()
      set({ groups: groups.map((g) => (g.id === id ? { ...g, archived: false } : g)) })
      toast.success('진행 중으로 복원했습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '복원 실패')
    }
  },

  updateGroupInfo: async (id, payload) => {
    try {
      await updateGroup(id, payload)
      const { groups } = get()
      set({ groups: groups.map((g) => (g.id === id ? { ...g, ...payload } : g)) })
      toast.success('단체 정보가 수정되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수정 실패')
    }
  },
}))
