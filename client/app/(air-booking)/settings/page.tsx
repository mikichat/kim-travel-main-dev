// 설정 화면 — Legacy migration from air-booking
// BSP 정산일 관리, 알림 설정, 비밀번호 변경, 화면 설정

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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
  tl: 'TL (Ticketing Limit)',
  bsp: 'BSP 정산일',
};

const DEFAULT_ALERT_SETTINGS: AlertSetting[] = [
  { alert_type: 'nmtl', hours_before: 24, enabled: true },
  { alert_type: 'tl', hours_before: 24, enabled: true },
  { alert_type: 'bsp', hours_before: 48, enabled: true },
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

export default function SettingsPage() {
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('air-booking-font-size') as FontSize) || 'medium';
    }
    return 'medium';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('air-booking-dark-mode') === 'true';
    }
    return false;
  });

  // 데이터 로드
  const fetchBspDates = useCallback(async () => {
    setBspLoading(true);
    try {
      const res = await fetch('/api/bsp-dates', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setBspDates(data.data.bspDates);
      }
    } catch {
      showToast('BSP 정산일을 불러올 수 없습니다.', 'error');
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
        const serverMap = new Map<string, AlertSetting>(
          data.data.settings.map((s: AlertSetting) => [s.alert_type, s])
        );
        setAlertSettings(
          DEFAULT_ALERT_SETTINGS.map((def) => serverMap.get(def.alert_type) ?? def)
        );
      }
    } catch {
      showToast('알림 설정을 불러올 수 없습니다.', 'error');
    } finally {
      setAlertLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBspDates();
    fetchAlertSettings();
    applyFontSize(localStorage.getItem('air-booking-font-size') as FontSize || 'medium');
    applyDarkMode(localStorage.getItem('air-booking-dark-mode') === 'true');
  }, [fetchBspDates, fetchAlertSettings]);

  // BSP 핸들러
  const handleBspAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bspForm.payment_date) {
      showToast('정산일을 입력해 주세요.', 'error');
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
        showToast('BSP 정산일이 추가되었습니다.');
        setBspForm({ payment_date: '', description: '' });
        fetchBspDates();
      } else {
        showToast(data.message || 'BSP 정산일 추가에 실패했습니다.', 'error');
      }
    } catch {
      showToast('BSP 정산일 추가 중 오류가 발생했습니다.', 'error');
    } finally {
      setBspAdding(false);
    }
  };

  // TOPAS BSP 동기화 핸들러
  const handleBspSync = async () => {
    if (!syncForm.topas_id || !syncForm.topas_pwd) {
      showToast('TOPAS 아이디와 비밀번호를 입력해주세요.', 'error');
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
        showToast(data.data.message);
        setSyncForm({ ...syncForm, topas_pwd: '' });
        fetchBspDates();
      } else {
        showToast(data.error || 'TOPAS 동기화에 실패했습니다.', 'error');
      }
    } catch {
      showToast('TOPAS 동기화 중 오류가 발생했습니다.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // 알림 설정 핸들러
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
        showToast('알림 설정 저장에 실패했습니다.', 'error');
        setAlertSettings(alertSettings);
      }
    } catch {
      showToast('알림 설정 저장 중 오류가 발생했습니다.', 'error');
      setAlertSettings(alertSettings);
    } finally {
      setAlertSaving(null);
    }
  };

  // 비밀번호 핸들러
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
        showToast('비밀번호 변경 기능을 사용할 수 없습니다.', 'error');
        return;
      }
      const data = await res.json();
      if (data.success) {
        showToast('비밀번호가 변경되었습니다.');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPwErrors({});
      } else {
        showToast(data.message || '비밀번호 변경에 실패했습니다.', 'error');
      }
    } catch {
      showToast('비밀번호 변경 중 오류가 발생했습니다.', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  // 화면 설정 핸들러
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">설정</h1>

        {/* Section 1: BSP 정산일 관리 */}
        <section className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">BSP 정산일 관리</h2>

            {/* TOPAS 동기화 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">TOPAS BSP 달력 동기화</h3>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">TOPAS ID</label>
                  <input
                    type="text"
                    value={syncForm.topas_id}
                    onChange={(e) => setSyncForm({ ...syncForm, topas_id: e.target.value })}
                    placeholder="TOPAS 아이디"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={syncForm.topas_pwd}
                    onChange={(e) => setSyncForm({ ...syncForm, topas_pwd: e.target.value })}
                    placeholder="TOPAS 비밀번호"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">연도</label>
                  <input
                    type="number"
                    value={syncForm.year}
                    onChange={(e) => setSyncForm({ ...syncForm, year: Number(e.target.value) })}
                    min={2024}
                    max={2030}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleBspSync}
                    disabled={syncing}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {syncing ? '동기화 중...' : 'TOPAS 동기화'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">TOPAS 로그인 후 1년치 BSP 청구/입금/보고 일정을 자동으로 가져옵니다.</p>
            </div>

            {bspLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {bspDates.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">등록된 BSP 정산일이 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-2 text-left border">날짜</th>
                          <th className="p-2 text-left border">유형</th>
                          <th className="p-2 text-left border">메모</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bspDates.map((d) => (
                          <tr key={d.id} className="border-t">
                            <td className="p-2 border">{d.payment_date}</td>
                            <td className="p-2 border">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                d.type === 'billing' ? 'bg-blue-100 text-blue-700' :
                                d.type === 'payment' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {BSP_TYPE_LABELS[d.type] || d.type || '입금'}
                              </span>
                            </td>
                            <td className="p-2 border">{d.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <form onSubmit={handleBspAdd} className="flex gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">날짜 <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={bspForm.payment_date}
                      onChange={(e) => setBspForm({ ...bspForm, payment_date: e.target.value })}
                      required
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">메모 (선택)</label>
                    <input
                      type="text"
                      placeholder="예: 1월 BSP 마감"
                      value={bspForm.description}
                      onChange={(e) => setBspForm({ ...bspForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={bspAdding}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {bspAdding ? '추가 중...' : '추가'}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>

        {/* Section 2: 알림 설정 */}
        <section className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">알림 설정</h2>

            {alertLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-4">
                {alertSettings.map((s) => (
                  <div key={s.alert_type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{ALERT_LABELS[s.alert_type]}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">시간 전</label>
                        <input
                          type="number"
                          min={1}
                          max={72}
                          value={s.hours_before}
                          disabled={!s.enabled || alertSaving === s.alert_type}
                          onChange={(e) => handleAlertChange(s.alert_type, 'hours_before', Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                        <span className="text-xs text-gray-500">시간</span>
                      </div>
                      <button
                        onClick={() => handleAlertChange(s.alert_type, 'enabled', !s.enabled)}
                        disabled={alertSaving === s.alert_type}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          s.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            s.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: 비밀번호 변경 */}
        <section className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">비밀번호 변경</h2>

            <form onSubmit={handlePasswordChange} noValidate className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {pwErrors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600">{pwErrors.currentPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {pwErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">{pwErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {pwErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{pwErrors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={pwSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {pwSaving ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </div>
        </section>

        {/* Section 4: 화면 설정 */}
        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">화면 설정</h2>

            <div className="space-y-4">
              {/* 글자 크기 */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">글자 크기</span>
                <div className="flex gap-2">
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
                        onClick={() => handleFontSizeChange(size)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          fontSize === size
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {labels[size]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 다크 모드 */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">다크 모드</span>
                <button
                  onClick={() => handleDarkModeToggle(!darkMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    darkMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
