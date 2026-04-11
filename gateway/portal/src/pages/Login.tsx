import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        login(data.data.user);
        navigate('/', { replace: true });
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch {
      setError('서버에 연결할 수 없습니다. 게이트웨이 서버가 실행 중인지 확인하세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">✈</span>
        </div>
        <h1 className="login-title">여행세상 업무 시스템</h1>
        <p className="login-subtitle">계속하려면 로그인하세요</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label htmlFor="email" className="field-label">이메일</label>
            <input
              id="email"
              type="email"
              className="field-input"
              placeholder="example@tourworld.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password" className="field-label">비밀번호</label>
            <input
              id="password"
              type="password"
              className="field-input"
              placeholder="비밀번호 입력"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="login-hint">
          기본 계정: admin@tourworld.com / admin1234
        </p>
      </div>
    </div>
  );
}
