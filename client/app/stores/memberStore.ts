// @TASK - Zustand 멤버 스토어 (group-roster 마이그레이션용)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Member {
  no?: number;
  nameKor: string;
  nameEn: string;
  gender: 'M' | 'F' | '';
  passportNo: string;
  birthDate: string;
  idNo?: string;
  passportExpire: string;
  phone?: string;
  room?: string;
  nationality?: string;
  note?: string;
}

export interface Group {
  id: number;
  name: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  data: Member[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ActiveTab = 'active' | 'archived';

interface MemberStore {
  // 상태
  groups: Group[];
  currentGroupId: number | null;
  currentGroup: Group | null;
  members: Member[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  activeTab: ActiveTab;

  // 액션
  loadGroups: () => Promise<void>;
  selectGroup: (id: number) => Promise<void>;
  setActiveTab: (tab: ActiveTab) => void;
  setSearchTerm: (term: string) => void;

  // 멤버 CRUD
  addRow: () => void;
  updateMember: (index: number, field: keyof Member, value: string) => void;
  deleteMember: (index: number) => void;
  saveMembers: () => Promise<void>;
  generateAllIds: () => void;
  importMembers: (imported: Member[]) => void;

  // 그룹 CRUD
  addGroup: (payload: { name: string; destination?: string; departureDate?: string; returnDate?: string }) => Promise<void>;
  removeGroup: (id: number) => Promise<void>;
  archiveGroup: (id: number) => Promise<void>;
  restoreGroup: (id: number) => Promise<void>;
  updateGroupInfo: (id: number, payload: { name?: string; destination?: string; departureDate?: string; returnDate?: string }) => Promise<void>;
}

export const useMemberStore = create<MemberStore>()(
  persist(
    (set, get) => ({
      groups: [],
      currentGroupId: null,
      currentGroup: null,
      members: [],
      loading: false,
      error: null,
      searchTerm: '',
      activeTab: 'active',

      loadGroups: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/tables/groups');
          const json = await response.json();
          const groups = json.success ? json.data.rows : [];
          set({ groups, loading: false });
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : '로드 실패' });
        }
      },

      selectGroup: async (id) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/tables/groups/${id}`);
          const json = await response.json();
          const groupData = json.success ? json.data : null;
          set({
            currentGroupId: id,
            currentGroup: groupData,
            members: [],
            loading: false,
          });
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : '그룹 로드 실패' });
        }
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSearchTerm: (term) => set({ searchTerm: term }),

      addRow: () => {
        const { members } = get();
        const newNo = members.length > 0 ? Math.max(...members.map((m) => m.no ?? 0)) + 1 : 1;
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
        });
      },

      updateMember: (index, field, value) => {
        const { members } = get();
        const updated = [...members];
        updated[index] = { ...updated[index], [field]: value };
        set({ members: updated });
      },

      deleteMember: (index) => {
        const { members } = get();
        set({ members: members.filter((_, i) => i !== index) });
      },

      saveMembers: async () => {
        const { currentGroupId, members } = get();
        if (!currentGroupId) return;
        set({ loading: true });
        try {
          await fetch(`/tables/groups/${currentGroupId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: members }),
          });
          const { groups } = get();
          const updatedGroups = groups.map((g) =>
            g.id === currentGroupId ? { ...g, data: members } : g,
          );
          set({ loading: false, groups: updatedGroups });
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : '저장 실패' });
        }
      },

      generateAllIds: () => {
        const { members } = get();
        const updated = members.map((m) => {
          const gender = m.gender || 'M';
          const birthYear = m.birthDate?.substring(0, 2) || '';
          const birthMonth = m.birthDate?.substring(2, 4) || '';
          const birthDay = m.birthDate?.substring(4, 6) || '';
          const idNo = gender + birthYear + birthMonth + birthDay;
          return { ...m, gender, idNo: idNo || m.idNo };
        });
        set({ members: updated });
      },

      importMembers: (imported) => {
        const { members } = get();
        const startNo = members.length > 0 ? Math.max(...members.map((m) => m.no ?? 0)) + 1 : 1;
        const withNos = imported.map((m, i) => ({ ...m, no: startNo + i }));
        set({ members: [...members, ...withNos] });
      },

      addGroup: async (payload) => {
        set({ loading: true });
        try {
          const response = await fetch('/tables/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await response.json();
          const newGroup = json.success ? json.data : null;
          const { groups } = get();
          set({ groups: [...groups, newGroup].filter(Boolean), loading: false });
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : '그룹 생성 실패' });
        }
      },

      removeGroup: async (id) => {
        set({ loading: true });
        try {
          await fetch(`/tables/groups/${id}`, { method: 'DELETE' });
          const { groups, currentGroupId } = get();
          const updatedGroups = groups.filter((g) => g.id !== id);
          const newCurrentId =
            currentGroupId === id
              ? updatedGroups.find((g) => !g.archived)?.id ?? null
              : currentGroupId;
          set({ groups: updatedGroups, currentGroupId: newCurrentId, loading: false });
          if (newCurrentId && newCurrentId !== currentGroupId) {
            get().selectGroup(newCurrentId);
          } else if (!newCurrentId) {
            set({ currentGroup: null, members: [] });
          }
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : '삭제 실패' });
        }
      },

      archiveGroup: async (id) => {
        try {
          await fetch(`/tables/groups/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true }),
          });
          const { groups } = get();
          const updatedGroups = groups.map((g) => (g.id === id ? { ...g, archived: true } : g));
          set({ groups: updatedGroups });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '아카이브 실패' });
        }
      },

      restoreGroup: async (id) => {
        try {
          await fetch(`/tables/groups/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: false }),
          });
          const { groups } = get();
          const updatedGroups = groups.map((g) => (g.id === id ? { ...g, archived: false } : g));
          set({ groups: updatedGroups });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '복원 실패' });
        }
      },

      updateGroupInfo: async (id, payload) => {
        try {
          await fetch(`/tables/groups/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const { groups, currentGroup } = get();
          const updatedGroups = groups.map((g) => (g.id === id ? { ...g, ...payload } : g));
          const updatedCurrentGroup = currentGroup?.id === id ? { ...currentGroup, ...payload } : currentGroup;
          set({ groups: updatedGroups, currentGroup: updatedCurrentGroup });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '수정 실패' });
        }
      },
    }),
    {
      name: 'member-storage',
    }
  )
);

// Selector hooks
export const useGroups = () => useMemberStore((state) => state.groups);
export const useCurrentGroup = () => useMemberStore((state) => state.currentGroup);
export const useMembers = () => useMemberStore((state) => state.members);
export const useMemberLoading = () => useMemberStore((state) => state.loading);
export const useMemberError = () => useMemberStore((state) => state.error);
