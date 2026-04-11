// @TASK P4-S2-T1 - 설정 화면
// @SPEC BSP 정산일 관리, 알림 설정, 비밀번호 변경, 화면 설정

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useToast } from '../components/common/Toast';
import '../styles/settings.css';

// ── 타입 ──

interface BspDate {
  id: number;
  payment_date: string;
  description: string | null;
  type: string;
  created_at: string;
}

const BSP_TYPE_LABELS: Record<string, string> = {
  billing: '청구',
  payment: '입금',
  report: '보고',
};

interface AlertSetting {
  id?: number;
  alert_type: 'nmtl' | 'tl' | 'bsp';
  hours_before: number;
  enabled: boolean;
}

type FontSize = 'small' | 'medium' | 'large';

const ALERT_LABELS: Record<string, string> = {
  nmtl: 'NMTL (No More Ticket Left)',
  tl:   'TL (Ticketing Limit)',
  bsp:  'BSP 정산일',
};

const DEFAULT_ALERT_SETTINGS: AlertSetting[] = [
  { alert_type: 'nmtl', hours_before: 24, enabled: true },
  { alert_type: 'tl',   hours_before: 24, enabled: true },
  { alert_type: 'bsp',  hours_before: 48, enabled: true },
];

function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  root.removeAttribute('data-font');
  if (size === 'large') {
    root.setAttribute('data-font', 'large');
  } else if (size === 'small') {
    root.style.fontSize = '14px';
  } else {
    root.style.fontSize = '';
  }
}

function applyDarkMode(enabled: boolean) {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

// ── 컴포넌트 ──

export function Settings() {
  const { toast } = useToast();

  // BSP 정산일
  const [bspDates, setBspDates] = useState<BspDate[]>([]);
  const [bspLoading, setBspLoading] = useState(true);
  const [bspForm, setBspForm] = useState({ payment_date: '', description: '' });
  const [bspAdding, setBspAdding] = useState(false);

  // TOPAS BSP 동기화
  const [syncForm, setSyncForm] = useState({ topas_id: '', topas_pwd: '', year: new Date().getFullYear() });
  const [syncing, setSyncing] = useState(false);

  // 알림 설정
  const [alertSettings, setAlertSettings] = useState<AlertSetting[]>(DEFAULT_ALERT_SETTINGS);
  const [alertLoading, setAlertLoading] = useState(true);
  const [alertSaving, setAlertSaving] = useState<string | null>(null);

  // 비밀번호 변경
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErrors, setPwErrors] = useState<Partial<typeof pwForm>>({});

  // 화면 설정
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem('air-booking-font-size') as FontSize) || 'medium';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('air-booking-dark-mode') === 'true';
  });

  // ── 데이터 로드 ──

  const fetchBspDates = useCallback(async () => {
    setBspLoading(true);
    try {
      const res = await fetch('/api/bsp-dates', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setBspDates(data.data.bspDates);
      }
    } catch {
      toast.error('BSP 정산일을 불러올 수 없습니다.');
    } finally {
      setBspLoading(false);
    }
  }, []);

  const fetchAlertSettings = useCallback(async () => {
    setAlertLoading(true);
    try {
      const res = await fetch('/api/alert-settings', { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data.settings) && data.data.settings.length > 0) {
        // 서버 값을 기본값과 병합 (누락된 타입은 기본값 유지)
        const serverMap = new Map<string, AlertSetting>(
          data.data.settings.map((s: AlertSetting) => [s.alert_type, s])
        );
        setAlertSettings(
          DEFAULT_ALERT_SETTINGS.map((def) => serverMap.get(def.alert_type) ?? def)
        );
      }
    } catch {
      toast.error('알림 설정을 불러올 수 없습니다.');
    } finally {
      setAlertLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBspDates();
    fetchAlertSettings();
    // 저장된 화면 설정 초기 적용
    applyFontSize((localStorage.getItem('air-booking-font-size') as FontSize) || 'medium');
    applyDarkMode(localStorage.getItem('air-booking-dark-mode') === 'true');
  }, [fetchBspDates, fetchAlertSettings]);

  // ── BSP 핸들러 ──

  const handleBspAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bspForm.payment_date) {
      toast.error('정산일을 입력해 주세요.');
      return;
    }
    setBspAdding(true);
    try {
      const res = await fetch('/api/bsp-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          payment_date: bspForm.payment_date,
          description: bspForm.description || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('BSP 정산일이 추가되었습니다.');
        setBspForm({ payment_date: '', description: '' });
        fetchBspDates();
      } else {
        toast.error(data.message || 'BSP 정산일 추가에 실패했습니다.');
      }
    } catch {
      toast.error('BSP 정산일 추가 중 오류가 발생했습니다.');
    } finally {
      setBspAdding(false);
    }
  };

  // ── TOPAS BSP 동기화 핸들러 ──

  const handleBspSync = async () => {
    if (!syncForm.topas_id || !syncForm.topas_pwd) {
      toast.warning('TOPAS 아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch('/api/bsp-dates/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(syncForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message);
        setSyncForm({ ...syncForm, topas_pwd: '' });
        fetchBspDates();
      } else {
        toast.error(data.error || 'TOPAS 동기화에 실패했습니다.');
      }
    } catch {
      toast.error('TOPAS 동기화 중 오류가 발생했습니다.');
    } finally {
      setSyncing(false);
    }
  };

  // ── 알림 설정 핸들러 ──

  const handleAlertChange = async (
    alertType: string,
    field: 'enabled' | 'hours_before',
    value: boolean | number
  ) => {
    const updated = alertSettings.map((s) =>
      s.alert_type === alertType ? { ...s, [field]: value } : s
    );
    setAlertSettings(updated);

    const target = updated.find((s) => s.alert_type === alertType);
    if (!target) return;

    setAlertSaving(alertType);
    try {
      const res = await fetch('/api/alert-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          alert_type: target.alert_type,
          hours_before: target.hours_before,
          enabled: target.enabled,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error('알림 설정 저장에 실패했습니다.');
        // 롤백
        setAlertSettings(alertSettings);
      }
    } catch {
      toast.error('알림 설정 저장 중 오류가 발생했습니다.');
      setAlertSettings(alertSettings);
    } finally {
      setAlertSaving(null);
    }
  };

  // ── 비밀번호 핸들러 ──

  const validatePwForm = (): boolean => {
    const errors: Partial<typeof pwForm> = {};
    if (!pwForm.currentPassword) errors.currentPassword = '현재 비밀번호를 입력해 주세요.';
    if (!pwForm.newPassword) {
      errors.newPassword = '새 비밀번호를 입력해 주세요.';
    } else if (pwForm.newPassword.length < 8) {
      errors.newPassword = '비밀번호는 8자 이상이어야 합니다.';
    }
    if (!pwForm.confirmPassword) {
      errors.confirmPassword = '비밀번호 확인을 입력해 주세요.';
    } else if (pwForm.newPassword !== pwForm.confirmPassword) {
      errors.confirmPassword = '새 비밀번호가 일치하지 않습니다.';
    }
    setPwErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePwForm()) return;
    setPwSaving(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      if (res.status === 404) {
        toast.error('비밀번호 변경 기능을 사용할 수 없습니다.');
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast.success('비밀번호가 변경되었습니다.');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPwErrors({});
      } else {
        toast.error(data.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch {
      toast.error('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setPwSaving(false);
    }
  };

  // ── 화면 설정 핸들러 ──

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem('air-booking-font-size', size);
    applyFontSize(size);
  };

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem('air-booking-dark-mode', String(enabled));
    applyDarkMode(enabled);
  };

  // ── 렌더 ──

  return (
    <div className="settings-page" aria-label="설정">
      <h1 className="settings-page-title">설정</h1>

      {/* Section 1: BSP 정산일 관리 */}
      <section className="settings-section" aria-labelledby="bsp-section-title">
        <h2 className="section-title" id="bsp-section-title">BSP 정산일 관리</h2>

        {/* TOPAS 동기화 */}
        <div className="bsp-sync-box">
          <h3 className="subsection-title">TOPAS BSP 달력 동기화</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="topas-id">TOPAS ID</label>
              <input
                id="topas-id"
                type="text"
                value={syncForm.topas_id}
                onChange={(e) => setSyncForm({ ...syncForm, topas_id: e.target.value })}
                placeholder="TOPAS 아이디"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label htmlFor="topas-pwd">비밀번호</label>
              <input
                id="topas-pwd"
                type="password"
                value={syncForm.topas_pwd}
                onChange={(e) => setSyncForm({ ...syncForm, topas_pwd: e.target.value })}
                placeholder="TOPAS 비밀번호"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label htmlFor="topas-year">연도</label>
              <input
                id="topas-year"
                type="number"
                value={syncForm.year}
                onChange={(e) => setSyncForm({ ...syncForm, year: Number(e.target.value) })}
                min={2024}
                max={2030}
              />
            </div>
            <div className="form-group form-group--action">
              <button
                type="button"
                className="btn-primary"
                onClick={handleBspSync}
                disabled={syncing}
              >
                {syncing ? '동기화 중...' : 'TOPAS 동기화'}
              </button>
            </div>
          </div>
          <p className="bsp-sync-hint">TOPAS 로그인 후 1년치 BSP 청구/입금/보고 일정을 자동으로 가져옵니다.</p>
        </div>

        {bspLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {bspDates.length === 0 ? (
              <p className="settings-empty">등록된 BSP 정산일이 없습니다.</p>
            ) : (
              <div className="bsp-list-wrapper">
                <table className="bsp-list" aria-label="BSP 정산일 목록">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>유형</th>
                      <th>메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bspDates.map((d) => (
                      <tr key={d.id} className={`bsp-row bsp-row--${d.type || 'payment'}`}>
                        <td>{d.payment_date}</td>
                        <td>
                          <span className={`bsp-type-badge bsp-type--${d.type || 'payment'}`}>
                            {BSP_TYPE_LABELS[d.type] || d.type || '입금'}
                          </span>
                        </td>
                        <td>{d.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form className="bsp-add-form" onSubmit={handleBspAdd} aria-label="BSP 정산일 수동 추가">
              <h3 className="subsection-title">수동 추가</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bsp-payment-date">날짜 <span aria-hidden="true">*</span></label>
                  <input
                    id="bsp-payment-date"
                    type="date"
                    value={bspForm.payment_date}
                    onChange={(e) => setBspForm({ ...bspForm, payment_date: e.target.value })}
                    required
                    aria-required="true"
                  />
                </div>
                <div className="form-group form-group--grow">
                  <label htmlFor="bsp-description">메모 (선택)</label>
                  <input
                    id="bsp-description"
                    type="text"
                    placeholder="예: 1월 BSP 마감"
                    value={bspForm.description}
                    onChange={(e) => setBspForm({ ...bspForm, description: e.target.value })}
                  />
                </div>
                <div className="form-group form-group--action">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={bspAdding}
                    aria-busy={bspAdding}
                  >
                    {bspAdding ? '추가 중...' : '추가'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </section>

      {/* Section 2: 알림 설정 */}
      <section className="settings-section" aria-labelledby="alert-section-title">
        <h2 className="section-title" id="alert-section-title">알림 설정</h2>

        {alertLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="alert-settings-list">
            {alertSettings.map((s) => (
              <div
                key={s.alert_type}
                className="alert-row"
                aria-label={`${ALERT_LABELS[s.alert_type]} 알림 설정`}
              >
                <div className="alert-row__info">
                  <span className="alert-row__label">{ALERT_LABELS[s.alert_type]}</span>
                </div>

                <div className="alert-row__controls">
                  <div className="alert-row__hours">
                    <label htmlFor={`hours-${s.alert_type}`} className="hours-label">
                      몇 시간 전
                    </label>
                    <input
                      id={`hours-${s.alert_type}`}
                      type="number"
                      min={1}
                      max={72}
                      value={s.hours_before}
                      disabled={!s.enabled || alertSaving === s.alert_type}
                      aria-label={`${ALERT_LABELS[s.alert_type]} 알림 시간 (시간)`}
                      onChange={(e) =>
                        handleAlertChange(s.alert_type, 'hours_before', Number(e.target.value))
                      }
                      className="hours-input"
                    />
                    <span className="hours-unit">시간 전</span>
                  </div>

                  <label
                    className="toggle-switch"
                    aria-label={`${ALERT_LABELS[s.alert_type]} 알림 ${s.enabled ? '끄기' : '켜기'}`}
                  >
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      disabled={alertSaving === s.alert_type}
                      onChange={(e) =>
                        handleAlertChange(s.alert_type, 'enabled', e.target.checked)
                      }
                    />
                    <span className="toggle-slider" aria-hidden="true" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: 비밀번호 변경 */}
      <section className="settings-section" aria-labelledby="pw-section-title">
        <h2 className="section-title" id="pw-section-title">비밀번호 변경</h2>

        <form className="pw-form" onSubmit={handlePasswordChange} noValidate aria-label="비밀번호 변경 양식">
          <div className="form-group">
            <label htmlFor="current-password">현재 비밀번호</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              aria-invalid={!!pwErrors.currentPassword}
              aria-describedby={pwErrors.currentPassword ? 'current-pw-error' : undefined}
            />
            {pwErrors.currentPassword && (
              <span id="current-pw-error" className="field-error" role="alert">
                {pwErrors.currentPassword}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="new-password">새 비밀번호</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              aria-invalid={!!pwErrors.newPassword}
              aria-describedby={pwErrors.newPassword ? 'new-pw-error' : undefined}
            />
            {pwErrors.newPassword && (
              <span id="new-pw-error" className="field-error" role="alert">
                {pwErrors.newPassword}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">새 비밀번호 확인</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              aria-invalid={!!pwErrors.confirmPassword}
              aria-describedby={pwErrors.confirmPassword ? 'confirm-pw-error' : undefined}
            />
            {pwErrors.confirmPassword && (
              <span id="confirm-pw-error" className="field-error" role="alert">
                {pwErrors.confirmPassword}
              </span>
            )}
          </div>

          <div className="form-footer">
            <button
              type="submit"
              className="btn-primary"
              disabled={pwSaving}
              aria-busy={pwSaving}
            >
              {pwSaving ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </section>

      {/* Section 4: 화면 설정 */}
      <section className="settings-section" aria-labelledby="display-section-title">
        <h2 className="section-title" id="display-section-title">화면 설정</h2>

        {/* 글자 크기 */}
        <div className="display-row" aria-label="글자 크기 선택">
          <span className="display-row__label">글자 크기</span>
          <div className="font-size-group" role="group" aria-label="글자 크기">
            {(['small', 'medium', 'large'] as FontSize[]).map((size) => {
              const labels: Record<FontSize, string> = {
                small: '작게',
                medium: '보통',
                large: '크게',
              };
              return (
                <button
                  key={size}
                  type="button"
                  className={`font-size-btn ${fontSize === size ? 'font-size-btn--active' : ''}`}
                  onClick={() => handleFontSizeChange(size)}
                  aria-pressed={fontSize === size}
                >
                  {labels[size]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 다크 모드 */}
        <div className="display-row">
          <span className="display-row__label">다크 모드</span>
          <label
            className="toggle-switch"
            aria-label={`다크 모드 ${darkMode ? '끄기' : '켜기'}`}
          >
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => handleDarkModeToggle(e.target.checked)}
            />
            <span className="toggle-slider" aria-hidden="true" />
          </label>
        </div>
      </section>
    </div>
  );
}
