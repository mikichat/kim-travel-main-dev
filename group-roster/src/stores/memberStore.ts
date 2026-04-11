// @TASK T6.2 - Zustand 멤버 스토어
import { create } from 'zustand'
import type { Member, Group, ActiveTab } from '../types'
import { fetchGroups, fetchGroup, updateGroup, createGroup, deleteGroup } from '../api/memberApi'
import { generateIdNo, formatEnglishName } from '../lib/utils'
import toast from 'react-hot-toast'

interface MemberStore {
  // 상태
  groups: Group[]
  currentGroupId: number | null
  currentGroup: Group | null
  members: Member[]
  loading: boolean
  error: string | null
  searchTerm: string
  activeTab: ActiveTab

  // 액션
  loadGroups: () => Promise<void>
  selectGroup: (id: number) => Promise<void>
  setActiveTab: (tab: ActiveTab) => void
  setSearchTerm: (term: string) => void

  // 멤버 CRUD
  addRow: () => void
  updateMember: (index: number, field: keyof Member, value: string) => void
  deleteMember: (index: number) => void
  saveMembers: () => Promise<void>
  generateAllIds: () => void
  importMembers: (imported: Member[]) => void

  // 그룹 CRUD
  addGroup: (payload: { name: string; destination?: string; departureDate?: string; returnDate?: string }) => Promise<void>
  removeGroup: (id: number) => Promise<void>
  archiveGroup: (id: number) => Promise<void>
  restoreGroup: (id: number) => Promise<void>
  updateGroupInfo: (id: number, payload: { name: string; destination?: string; departureDate?: string; returnDate?: string }) => Promise<void>
}

export const useMemberStore = create<MemberStore>((set, get) => ({
  groups: [],
  currentGroupId: null,
  currentGroup: null,
  members: [],
  loading: false,
  error: null,
  searchTerm: '',
  activeTab: 'active',

  loadGroups: async () => {
    set({ loading: true, error: null })
    try {
      const groups = await fetchGroups()
      set({ groups, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '로드 실패' })
    }
  },

  selectGroup: async (id) => {
    set({ loading: true, error: null })
    try {
      const group = await fetchGroup(id)
      set({
        currentGroupId: id,
        currentGroup: group,
        members: group.data ?? [],
        loading: false,
      })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '그룹 로드 실패' })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchTerm: (term) => set({ searchTerm: term }),

  addRow: () => {
    const { members } = get()
    const newNo = members.length > 0 ? Math.max(...members.map((m) => m.no ?? 0)) + 1 : 1
    set({
      members: [
        ...members,
        {
          no: newNo,
          nameKor: '',
          nameEn: '',
          gender: 'M',
          passportNo: '',
          birthDate: '',
          idNo: '',
          passportExpire: '',
          phone: '',
          room: '',
        },
      ],
    })
  },

  updateMember: (index, field, value) => {
    const { members } = get()
    const updated = [...members]
    updated[index] = { ...updated[index], [field]: value }
    set({ members: updated })
  },

  deleteMember: (index) => {
    const { members } = get()
    set({ members: members.filter((_, i) => i !== index) })
  },

  saveMembers: async () => {
    const { currentGroupId, members } = get()
    if (!currentGroupId) return
    set({ loading: true })
    try {
      await updateGroup(currentGroupId, { data: members })
      // 그룹 목록의 data도 업데이트
      const { groups } = get()
      const updatedGroups = groups.map((g) =>
        g.id === currentGroupId ? { ...g, data: members } : g,
      )
      set({ loading: false, groups: updatedGroups })
      toast.success('저장 완료!')
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '저장 실패' })
      toast.error('저장 실패')
    }
  },

  generateAllIds: () => {
    const { members } = get()
    let success = 0
    let fail = 0
    const updated = members.map((m) => {
      const gender = m.gender || 'M'
      const newId = generateIdNo(gender, m.birthDate)
      if (newId) success++
      else fail++
      const newNameEn = formatEnglishName(m.nameEn, gender, m.birthDate)
      return { ...m, gender, idNo: newId || m.idNo, nameEn: newNameEn }
    })
    set({ members: updated })
    let msg = `ID NO 생성 완료: ${success}명`
    if (fail > 0) msg += `, 실패: ${fail}명`
    toast.success(msg)
  },

  importMembers: (imported) => {
    const { members } = get()
    // 기존 멤버가 없으면 그대로, 있으면 번호 재정렬해서 append
    const startNo = members.length > 0 ? Math.max(...members.map((m) => m.no ?? 0)) + 1 : 1
    const withNos = imported.map((m, i) => ({ ...m, no: startNo + i }))
    set({ members: [...members, ...withNos] })
    toast.success(`${imported.length}명 가져오기 완료`)
  },

  addGroup: async (payload) => {
    set({ loading: true })
    try {
      const newGroup = await createGroup(payload)
      const { groups } = get()
      set({ groups: [...groups, newGroup], loading: false })
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
      if (newCurrentId && newCurrentId !== currentGroupId) {
        get().selectGroup(newCurrentId)
      } else if (!newCurrentId) {
        set({ currentGroup: null, members: [] })
      }
    } catch (err) {
      set({ loading: false })
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  },

  archiveGroup: async (id) => {
    try {
      await updateGroup(id, { archived: true })
      const { groups } = get()
      const updatedGroups = groups.map((g) => (g.id === id ? { ...g, archived: true } : g))
      set({ groups: updatedGroups })
      toast.success('지난 행사로 이동했습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '아카이브 실패')
    }
  },

  restoreGroup: async (id) => {
    try {
      await updateGroup(id, { archived: false })
      const { groups } = get()
      const updatedGroups = groups.map((g) => (g.id === id ? { ...g, archived: false } : g))
      set({ groups: updatedGroups })
      toast.success('진행 중으로 복원했습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '복원 실패')
    }
  },

  updateGroupInfo: async (id, payload) => {
    try {
      await updateGroup(id, payload)
      const { groups, currentGroup } = get()
      const updatedGroups = groups.map((g) => (g.id === id ? { ...g, ...payload } : g))
      const updatedCurrentGroup = currentGroup?.id === id ? { ...currentGroup, ...payload } : currentGroup
      set({ groups: updatedGroups, currentGroup: updatedCurrentGroup })
      toast.success('단체 정보가 수정되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수정 실패')
    }
  },
}))
