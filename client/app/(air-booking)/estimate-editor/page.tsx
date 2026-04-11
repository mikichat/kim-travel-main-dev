// 견적서/내역서 통합 에디터 — Legacy migration from air-booking
// iframe 에디터 유지 + React 래퍼에서 CRUD 관리

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/common/Modal';

interface EstimateDoc {
  id: string;
  doc_number: string;
  doc_type: string;
  recipient: string;
  subject: string;
  quote_date: string;
  grand_total: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const TABS = [
  { id: 'domestic', label: '국내견적서', icon: '🏠', src: '/domestic-editor.html', docType: 'domestic' },
  { id: 'estimate', label: '해외견적서', icon: '🌐', src: '/estimate-editor.html', docType: 'estimate' },
  { id: 'delivery', label: '정산/배송', icon: '📦', src: '/delivery-claim-editor.html', docType: 'delivery' },
] as const;

type TabId = typeof TABS[number]['id'];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '초안', color: '#64748b', bg: '#f1f5f9' },
  sent: { label: '발송', color: '#2563eb', bg: '#dbeafe' },
  confirmed: { label: '확정', color: '#059669', bg: '#d1fae5' },
  cancelled: { label: '취소', color: '#dc2626', bg: '#fee2e2' },
};

export default function EstimateEditorPage() {
  const [activeTab, setActiveTab] = useState<TabId>('domestic');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [docs, setDocs] = useState<EstimateDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{ id: string; current: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const currentTab = TABS.find(t => t.id === activeTab)!;

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('doc_type', currentTab.docType);
      params.set('limit', '30');
      if (search) params.set('search', search);
      const res = await fetch(`/api/estimates?${params}`);
      const data = await res.json();
      if (data.success) setDocs(data.data.estimates || []);
    } catch { showToast('문서 목록 조회 실패', 'error'); }
    finally { setLoading(false); }
  }, [currentTab.docType, search]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/estimates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('문서가 삭제되었습니다.'); fetchDocs(); }
      else showToast(data.error || '삭제 실패', 'error');
    } catch { showToast('삭제 중 오류', 'error'); }
    setDeleteConfirm(null);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/estimates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { showToast(`상태가 ${STATUS_LABELS[newStatus]?.label || newStatus}(으)로 변경되었습니다.`); fetchDocs(); }
      else showToast(data.error || '상태 변경 실패', 'error');
    } catch { showToast('상태 변경 중 오류', 'error'); }
    setStatusModal(null);
  };

  const loadDocInIframe = (doc: EstimateDoc) => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'LOAD_DOCUMENT', id: doc.id }, '*');
    }
    const newSrc = `${currentTab.src}?id=${doc.id}`;
    if (iframe) iframe.src = newSrc;
  };

  const handlePrint = () => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  const filtered = docs.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.recipient?.toLowerCase().includes(s) || d.subject?.toLowerCase().includes(s) || d.doc_number?.toLowerCase().includes(s);
  });

  return (
    <div className="w-full" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-0 border-b-2 border-gray-200 bg-white flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 border-b-2 text-sm cursor-pointer transition-all ${
              activeTab === tab.id
                ? 'border-blue-500 bg-blue-50 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-3">
          <button onClick={handlePrint} className="px-3 py-1.5 border border-gray-300 rounded text-xs bg-white hover:bg-gray-50 cursor-pointer">
            🖨️ 인쇄
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`px-3 py-1.5 border border-gray-300 rounded text-xs cursor-pointer ${sidebarOpen ? 'bg-blue-50' : 'bg-white'}`}>
            📋 {sidebarOpen ? '사이드바 닫기' : '문서 목록'}
          </button>
        </div>
      </div>

      {/* Main Content: Sidebar + Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-72 border-r border-gray-200 bg-gray-50 flex-col flex flex-shrink-0">
            <div className="p-2.5 border-b border-gray-200">
              <input
                type="text"
                placeholder="수신처, 제목 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="p-5 text-center text-gray-400 text-xs">로딩 중...</div>
              ) : filtered.length === 0 ? (
                <div className="p-5 text-center text-gray-400 text-xs">
                  {search ? '검색 결과가 없습니다.' : '저장된 문서가 없습니다.'}
                </div>
              ) : filtered.map(doc => {
                const status = STATUS_LABELS[doc.status] || STATUS_LABELS.draft;
                return (
                  <div
                    key={doc.id}
                    className="p-2.5 mb-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-xs hover:shadow-md transition-all"
                    onClick={() => loadDocInIframe(doc)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-xs text-gray-900">{doc.recipient || '(수신처 없음)'}</strong>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: status.color, background: status.bg }}>{status.label}</span>
                    </div>
                    <div className="text-gray-500 text-xs mb-1 truncate">{doc.subject || doc.doc_number}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">{doc.quote_date || doc.created_at?.slice(0, 10)}</span>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setStatusModal({ id: doc.id, current: doc.status }); }} className="p-1 border border-gray-300 rounded text-xs bg-white" title="상태 변경">⚙️</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.id); }} className="p-1 border border-red-200 rounded text-xs text-red-600 bg-red-50" title="삭제">🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2 border-t border-gray-200 text-xs text-gray-400 text-center">
              {filtered.length}건
              <button onClick={fetchDocs} className="ml-2 px-2 py-0.5 border border-gray-300 rounded text-xs bg-white cursor-pointer">새로고침</button>
            </div>
          </div>
        )}

        {/* Editor iframe */}
        <div className="flex-1 overflow-hidden">
          <iframe
            key={currentTab.id}
            src={currentTab.src}
            title={currentTab.label}
            className="w-full h-full border-0"
          />
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal open={true} title="문서 삭제" onClose={() => setDeleteConfirm(null)}>
          <p>정말 삭제하시겠습니까?</p>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer">취소</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-500 text-white border-0 rounded-lg cursor-pointer">삭제</button>
          </div>
        </Modal>
      )}

      {/* Status Change Modal */}
      {statusModal && (
        <Modal open={true} title="문서 상태 변경" onClose={() => setStatusModal(null)}>
          <div className="flex flex-col gap-2">
            {Object.entries(STATUS_LABELS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => handleStatusChange(statusModal.id, key)}
                disabled={key === statusModal.current}
                className={`px-4 py-2.5 border border-gray-200 rounded-lg text-left text-sm ${
                  key === statusModal.current ? 'opacity-60 cursor-default' : 'cursor-pointer hover:bg-gray-50'
                }`}
                style={{ background: key === statusModal.current ? val.bg : '#fff', color: val.color }}
              >
                {val.label} {key === statusModal.current && '(현재)'}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
