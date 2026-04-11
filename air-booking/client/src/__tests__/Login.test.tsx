// @TASK P2-S1-T1 - Login Page Tests

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../pages/Login';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLogin() {
  const onLogin = vi.fn();
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Login onLogin={onLogin} />
    </MemoryRouter>
  );
  return { onLogin };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login Page', () => {
  it('should render login form', () => {
    renderLogin();
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
    expect(screen.getByText('항공 예약 관리')).toBeInTheDocument();
  });

  it('should show error for empty fields', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(screen.getByRole('alert')).toHaveTextContent('이메일과 비밀번호를 입력해주세요.');
  });

  it('should call API on submit', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { user: { id: 1, email: 'test@test.com', name: 'Test', role: 'admin' } },
      }),
    });

    const { onLogin } = renderLogin();

    await user.type(screen.getByLabelText('이메일'), 'test@test.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
      }));
    });

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@test.com' }));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show error on failed login', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.',
      }),
    });

    renderLogin();

    await user.type(screen.getByLabelText('이메일'), 'test@test.com');
    await user.type(screen.getByLabelText('비밀번호'), 'wrong');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다.');
    });
  });

  it('should show locked account message', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: '계정이 잠금되었습니다. 15분 후 다시 시도하세요.',
      }),
    });

    renderLogin();

    await user.type(screen.getByLabelText('이메일'), 'test@test.com');
    await user.type(screen.getByLabelText('비밀번호'), 'wrong');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('15분 후');
    });
  });

  it('should show network error message', async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderLogin();

    await user.type(screen.getByLabelText('이메일'), 'test@test.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('서버에 연결할 수 없습니다.');
    });
  });

  it('should disable button while loading', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((resolve) => { resolvePromise = resolve; }));

    renderLogin();

    await user.type(screen.getByLabelText('이메일'), 'test@test.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(screen.getByRole('button', { name: '로그인 중...' })).toBeDisabled();

    // Resolve to clean up
    resolvePromise!({ json: () => Promise.resolve({ success: false, error: 'err' }) });
  });
});
