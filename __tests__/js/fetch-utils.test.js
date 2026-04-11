const { fetchJSON } = require('../../js/fetch-utils.js');

// global fetch mock
beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchJSON', () => {
  test('성공 응답 → JSON 파싱', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [1, 2, 3] }),
    });

    const result = await fetchJSON('/api/test');
    expect(result).toEqual({ data: [1, 2, 3] });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  test('204 No Content → null 반환', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('no body')),
    });

    const result = await fetchJSON('/api/test', { method: 'DELETE' });
    expect(result).toBeNull();
  });

  test('에러 응답 → Error throw (서버 메시지 포함)', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: '잘못된 요청입니다' }),
    });

    await expect(fetchJSON('/api/test')).rejects.toThrow('잘못된 요청입니다');
  });

  test('에러 응답 → JSON 파싱 실패 시 HTTP 상태 메시지', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('invalid json')),
    });

    await expect(fetchJSON('/api/test')).rejects.toThrow('HTTP 500');
  });

  test('네트워크 에러 → Error throw', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchJSON('/api/test')).rejects.toThrow('Failed to fetch');
  });

  test('Content-Type 기본 설정', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await fetchJSON('/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  test('커스텀 헤더 병합', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await fetchJSON('/api/test', {
      headers: { Authorization: 'Bearer token123' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        },
      })
    );
  });
});
