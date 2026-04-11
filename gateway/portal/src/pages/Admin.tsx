import React, { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

interface GatewayUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  permissions: Record<string, string[]>;
  created_at: string;
}

const MODULES = [
  { key: 'main', label: '여행상품 관리 (MAIN)' },
  { key: 'air', label: '항공 예약 관리 (AIR)' },
  { key: 'landing', label: '브로슈어 관리 (LANDING)' },
];

const EMPTY_FORM = {
  email: '',
  password: '',
  name: '',
  role: 'staff' as 'admin' | 'staff',
  permissions: { main: false, air: false, landing: false },
};

export default function Admin() {
  const { user: me, logout } = useAuth();

  const [users, setUsers] = useState<GatewayUser[]>([]);
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);

  const [form, setForm] = useState({ ...EMPTY_FORM, permissions: { ...EMPTY_FORM.permissions } });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchUsers() {
    setListLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/auth/users', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
      } else {
        setListError(data.error || '목록 조회 실패');
      }
    } catch {
      setListError('서버 연결 실패');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    const permissions: Record<string, string[]> = {};
    for (const mod of MODULES) {
      if (form.permissions[mod.key as keyof typeof form.permissions]) {
        permissions[mod.key] = ['read', 'write'];
      }
    }

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role,
          permissions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormSuccess(`${form.name} 계정이 생성되었습니다.`);
        setForm({ ...EMPTY_FORM, permissions: { ...EMPTY_FORM.permissions } });
        fetchUsers();
      } else {
        setFormError(data.error || '계정 생성 실패');
      }
    } catch {
      setFormError('서버 연결 실패');
    } finally {
      setFormLoading(false);
    }
  }

  function permLabel(perms: Record<string, string[]>): string {
    const keys = Object.keys(perms).filter(k => (perms[k] || []).length > 0);
    if (keys.length === 0) return '없음';
    const map: Record<string, string> = { main: 'MAIN', air: 'AIR', landing: 'LANDING' };
    return keys.map(k => map[k] || k).join(', ');
  }

  function formatDate(dt: string) {
    return new Date(dt).toLocaleDateString('ko-KR');
  }

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="header-icon">✈</span>
            <span className="header-title">여행세상</span>
          </div>
          <div className="header-right">
            <Link to="/" className="btn-ghost">대시보드</Link>
            <span className="badge badge-admin">관리자</span>
            <span className="header-name">{me?.name}</span>
            <button onClick={logout} className="btn-outline">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="welcome">
          <h2 className="welcome-heading">사용자 관리</h2>
          <p className="welcome-sub">시스템 접근 계정을 등록하고 권한을 부여하세요.</p>
        </div>

        {/* Add User Form */}
        <section className="admin-section">
          <h3 className="admin-section-title">새 계정 추가</h3>
          <form onSubmit={handleAdd} className="admin-form">
            <div className="form-row">
              <div className="field">
                <label className="field-label">이름</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="홍길동"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">이메일</label>
                <input
                  type="email"
                  className="field-input"
                  placeholder="user@tourworld.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">비밀번호</label>
                <input
                  type="password"
                  className="field-input"
                  placeholder="초기 비밀번호"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
              <div className="field">
                <label className="field-label">역할</label>
                <select
                  className="field-input"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}
                >
                  <option value="staff">직원</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">접근 권한</label>
              <div className="checkboxes">
                {MODULES.map(mod => (
                  <label key={mod.key} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.permissions[mod.key as keyof typeof form.permissions]}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          permissions: { ...f.permissions, [mod.key]: e.target.checked },
                        }))
                      }
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>

            {formError && <div className="error-box" role="alert">{formError}</div>}
            {formSuccess && <div className="success-box" role="status">{formSuccess}</div>}

            <button type="submit" className="btn-primary" disabled={formLoading}>
              {formLoading ? '추가 중...' : '계정 추가'}
            </button>
          </form>
        </section>

        {/* User List */}
        <section className="admin-section">
          <h3 className="admin-section-title">계정 목록</h3>

          {listLoading && <p className="text-muted">불러오는 중...</p>}
          {listError && <div className="error-box">{listError}</div>}

          {!listLoading && !listError && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>이메일</th>
                    <th>역할</th>
                    <th>접근 권한</th>
                    <th>등록일</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="td-name">{u.name}</td>
                      <td className="td-email">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-staff'}`}>
                          {u.role === 'admin' ? '관리자' : '직원'}
                        </span>
                      </td>
                      <td className="td-perms">{permLabel(u.permissions)}</td>
                      <td className="td-date">{formatDate(u.created_at)}</td>
                      <td>
                        {u.id !== me?.id && (
                          <button
                            className="btn-danger-sm"
                            onClick={() => setDeleteId(u.id)}
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Delete confirm modal */}
      {deleteId && (
        <DeleteModal
          user={users.find(u => u.id === deleteId)!}
          onConfirm={async () => {
            // Gateway does not have a DELETE /api/auth/users/:id endpoint yet.
            // We alert for now and close the modal.
            alert('삭제 기능은 게이트웨이 서버에 DELETE /api/auth/users/:id 엔드포인트를 추가하면 활성화됩니다.');
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

function DeleteModal({
  user,
  onConfirm,
  onCancel,
}: {
  user: GatewayUser;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal">
        <h3 id="modal-title" className="modal-title">계정 삭제</h3>
        <p className="modal-body">
          <strong>{user.name}</strong> ({user.email}) 계정을 삭제하시겠습니까?<br />
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="modal-actions">
          <button className="btn-outline" onClick={onCancel}>취소</button>
          <button className="btn-danger" onClick={onConfirm}>삭제</button>
        </div>
      </div>
    </div>
  );
}
