// @TASK T6.1 - API 클라이언트 (fetch 래퍼)
// @SPEC group-roster-manager-v2 (3).html — /tables/groups, /api/ 엔드포인트

import type { Group, CreateGroupPayload, UpdateGroupPayload, Member } from '../types'

// 공통 응답 처리 헬퍼
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API 오류: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

// ==================== Groups ====================

export async function fetchGroups(): Promise<Group[]> {
  const res = await fetch('/tables/groups')
  return handleResponse<Group[]>(res)
}

export async function fetchGroup(id: number): Promise<Group> {
  const res = await fetch(`/tables/groups/${id}`)
  return handleResponse<Group>(res)
}

export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  const res = await fetch('/tables/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<Group>(res)
}

export async function updateGroup(id: number, payload: UpdateGroupPayload): Promise<Group> {
  const res = await fetch(`/tables/groups/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<Group>(res)
}

export async function deleteGroup(id: number): Promise<void> {
  const res = await fetch(`/tables/groups/${id}`, {
    method: 'DELETE',
  })
  await handleResponse<unknown>(res)
}

// ==================== Members (그룹 data 배열) ====================

export async function fetchMembers(groupId: number): Promise<Member[]> {
  const group = await fetchGroup(groupId)
  return group.data ?? []
}

// ==================== Customers ====================

export async function searchCustomer(passportNo: string): Promise<unknown> {
  const res = await fetch(`/tables/customers?search=${encodeURIComponent(passportNo)}`)
  return handleResponse<unknown>(res)
}

export async function updateCustomer(id: number, payload: Partial<Member>): Promise<unknown> {
  const res = await fetch(`/tables/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<unknown>(res)
}

export async function createCustomer(payload: Partial<Member>): Promise<unknown> {
  const res = await fetch('/tables/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<unknown>(res)
}

// ==================== 비행 일정 ====================

export async function createFlightSchedule(payload: unknown): Promise<unknown> {
  const res = await fetch('/api/flight-schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<unknown>(res)
}

// ==================== 여권 OCR ====================

export async function scanPassport(formData: FormData): Promise<unknown> {
  const res = await fetch('/api/passport-ocr/scan', {
    method: 'POST',
    body: formData,
  })
  return handleResponse<unknown>(res)
}
