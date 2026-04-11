// @TASK T6.1 - memberApi 함수 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  fetchMembers,
} from '../../api/memberApi'

// fetch 모킹
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchGroups', () => {
  it('/tables/groups 엔드포인트를 호출한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })
    const result = await fetchGroups()
    expect(mockFetch).toHaveBeenCalledWith('/tables/groups')
    expect(result).toEqual([])
  })

  it('응답이 실패하면 에러를 던진다', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(fetchGroups()).rejects.toThrow()
  })
})

describe('createGroup', () => {
  it('POST /tables/groups 를 호출한다', async () => {
    const newGroup = { name: '테스트단체', destination: '일본', departureDate: '2026-04-01', returnDate: '2026-04-05' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, ...newGroup }),
    })
    const result = await createGroup(newGroup)
    expect(mockFetch).toHaveBeenCalledWith('/tables/groups', expect.objectContaining({ method: 'POST' }))
    expect(result).toMatchObject(newGroup)
  })
})

describe('updateGroup', () => {
  it('PUT /tables/groups/:id 를 호출한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: '수정단체' }),
    })
    await updateGroup(1, { name: '수정단체' })
    expect(mockFetch).toHaveBeenCalledWith('/tables/groups/1', expect.objectContaining({ method: 'PUT' }))
  })
})

describe('deleteGroup', () => {
  it('DELETE /tables/groups/:id 를 호출한다', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await deleteGroup(1)
    expect(mockFetch).toHaveBeenCalledWith('/tables/groups/1', expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('fetchMembers', () => {
  it('그룹의 멤버(data 배열)를 반환한다', async () => {
    const mockGroup = { id: 1, name: '테스트', data: [{ nameKor: '홍길동' }] }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGroup,
    })
    const result = await fetchMembers(1)
    expect(mockFetch).toHaveBeenCalledWith('/tables/groups/1')
    expect(result).toEqual([{ nameKor: '홍길동' }])
  })
})
