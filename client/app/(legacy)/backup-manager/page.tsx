// 백업 관리 — Legacy migration from frontend

'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';

interface Backup {
  id: string;
  filename: string;
  size_bytes: number;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(isoStr: string | null): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatShortTime(isoStr: string | null): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function BackupManagerPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [nextAutoBackup, setNextAutoBackup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadBackups();
    const interval = setInterval(loadBackups, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadBackups = async () => {
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups);
        setNextAutoBackup(data.nextAutoBackup);
      }
    } catch (err) {
      console.error('백업 목록 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const createBackupNow = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/backup/create', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`백업 생성 완료: ${data.backup.filename}`);
        loadBackups();
      } else {
        showToast(data.error || '백업 생성 실패', 'error');
      }
    } catch (err) {
      showToast('백업 생성 중 오류: ' + (err instanceof Error ? err.message : '알 수 없는 오류'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const confirmRestore = (backupId: string) => {
    setConfirmModal({
      title: '백업 복원',
      message: '이 백업을 복원하면 현재 데이터베이스가 덮어씌워집니다. 복원 전에 자동으로 안전 백업이 생성됩니다. 복원 후 서버를 재시작해야 합니다. 계속하시겠습니까?',
      action: async () => {
        try {
          const res = await fetch(`/api/backup/restore/${backupId}`, { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast(data.message);
            loadBackups();
          } else {
            showToast(data.error || '복원 실패', 'error');
          }
        } catch (err) {
          showToast('복원 중 오류: ' + (err instanceof Error ? err.message : '알 수 없는 오류'), 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const confirmDelete = (backupId: string) => {
    setConfirmModal({
      title: '백업 삭제',
      message: '이 백업을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      action: async () => {
        try {
          const res = await fetch(`/api/backup/${backupId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast('백업이 삭제되었습니다.');
            loadBackups();
          } else {
            showToast(data.error || '삭제 실패', 'error');
          }
        } catch (err) {
          showToast('삭제 중 오류: ' + (err instanceof Error ? err.message : '알 수 없는 오류'), 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const downloadBackup = (backupId: string) => {
    const a = document.createElement('a');
    a.href = `/api/backup/${backupId}/download`;
    a.download = '';
    a.click();
  };

  const downloadJsonBackup = () => {
    const a = document.createElement('a');
    a.href = '/api/backup/download';
    a.download = `database-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const totalSize = backups.reduce((sum, b) => sum + b.size_bytes, 0);

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}

      <div className="max-w-4xl mx-auto">
        <a href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4 text-sm font-medium">
          ← 대시보드로 돌아가기
        </a>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            💾 백업 관리
          </h1>

          {/* 백업 상태 */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6 border-l-4 border-indigo-500">
            <h2 className="text-sm font-medium text-gray-600 mb-4">백업 상태</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{backups.length}</div>
                <div className="text-xs text-gray-500 mt-1">총 백업 수 (최대 5개)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {backups.length > 0 ? formatShortTime(backups[0].created_at) : '-'}
                </div>
                <div className="text-xs text-gray-500 mt-1">마지막 백업</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{formatShortTime(nextAutoBackup)}</div>
                <div className="text-xs text-gray-500 mt-1">다음 자동 백업</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{formatBytes(totalSize)}</div>
                <div className="text-xs text-gray-500 mt-1">총 크기</div>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <button
              onClick={createBackupNow}
              disabled={creating}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  백업 중...
                </>
              ) : (
                <>💾 지금 백업하기</>
              )}
            </button>
            <button
              onClick={downloadJsonBackup}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              📄 JSON 다운로드
            </button>
          </div>

          {/* 백업 목록 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">백업 목록</h2>
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p>로딩 중...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
                <p className="text-4xl mb-4">💾</p>
                <p>백업이 없습니다.</p>
                <p className="text-xs mt-2">지금 백업하기 버튼을 클릭하여 첫 백업을 생성하세요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup, index) => (
                  <div key={backup.id} className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-100">
                    <div>
                      <div className="font-semibold text-gray-800 flex items-center gap-2">
                        📅 {formatDate(backup.created_at)}
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-normal">최신</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        💾 {formatBytes(backup.size_bytes)} &nbsp;&middot;&nbsp; 📄 {backup.filename}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmRestore(backup.id)}
                        className="px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600"
                      >
                        ↩️ 복원
                      </button>
                      <button
                        onClick={() => downloadBackup(backup.id)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => confirmDelete(backup.id)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 확인 모달 */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title={confirmModal?.title || ''} size="sm">
        {confirmModal && (
          <div>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">취소</button>
              <button onClick={confirmModal.action} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">확인</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
