// @TASK T6.1 - 멤버 CRUD 훅
import { useState, useCallback } from 'react'
import type { Member, Group } from '../types'
import { fetchGroups, fetchGroup, updateGroup } from '../api/memberApi'

interface UseMembersReturn {
  groups: Group[]
  currentGroup: Group | null
  members: Member[]
  loading: boolean
  error: string | null
  loadGroups: () => Promise<void>
  selectGroup: (id: number) => Promise<void>
  saveMembers: (members: Member[]) => Promise<void>
}

export function useMembers(): UseMembersReturn {
  const [groups, setGroups] = useState<Group[]>([])
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchGroups()
      setGroups(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '그룹 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  const selectGroup = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      const group = await fetchGroup(id)
      setCurrentGroup(group)
      setMembers(group.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '그룹 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveMembers = useCallback(
    async (updatedMembers: Member[]) => {
      if (!currentGroup) return
      setLoading(true)
      setError(null)
      try {
        await updateGroup(currentGroup.id, { data: updatedMembers })
        setMembers(updatedMembers)
      } catch (err) {
        setError(err instanceof Error ? err.message : '저장 실패')
      } finally {
        setLoading(false)
      }
    },
    [currentGroup],
  )

  return {
    groups,
    currentGroup,
    members,
    loading,
    error,
    loadGroups,
    selectGroup,
    saveMembers,
  }
}
