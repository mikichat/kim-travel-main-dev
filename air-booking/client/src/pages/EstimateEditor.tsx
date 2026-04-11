// 견적서/내역서 통합 에디터 — 3탭 + 문서 관리 사이드바
// iframe 에디터 유지 + React 래퍼에서 CRUD 관리

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';

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

export function EstimateEditor() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('domestic');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [docs, setDocs] = useState<EstimateDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{ id: string; current: string } | null>(null);

  const currentTab = TABS.find(t => t.id === activeTab)!;

  // 문서 목록 조회
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
    } catch { toast.error('문서 목록 조회 실패'); }
    finally { setLoading(false); }
  }, [currentTab.docType, search]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // 문서 삭제
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/estimates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success('문서가 삭제되었습니다.'); fetchDocs(); }
      else toast.error(data.error || '삭제 실패');
    } catch { toast.error('삭제 중 오류'); }
    setDeleteConfirm(null);
  };

  // 상태 변경
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/estimates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`상태가 ${STATUS_LABELS[newStatus]?.label || newStatus}(으)로 변경되었습니다.`); fetchDocs(); }
      else toast.error(data.error || '상태 변경 실패');
    } catch { toast.error('상태 변경 중 오류'); }
    setStatusModal(null);
  };

  // iframe에서 문서 불러오기 (postMessage)
  const loadDocInIframe = (doc: EstimateDoc) => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'LOAD_DOCUMENT', id: doc.id }, '*');
    }
    // 폴백: iframe URL에 ?id= 추가
    const newSrc = `${currentTab.src}?id=${doc.id}`;
    if (iframe) iframe.src = newSrc;
  };

  // 인쇄 미리보기
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
    <div style={{ width: '100%', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 24px', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: '-2px',
              background: activeTab === tab.id ? '#eff6ff' : 'transparent',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s',
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px' }}>
          <button onClick={handlePrint} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', background: '#fff' }}>
            🖨️ 인쇄
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', background: sidebarOpen ? '#eff6ff' : '#fff' }}>
            📋 {sidebarOpen ? '사이드바 닫기' : '문서 목록'}
          </button>
        </div>
      </div>

      {/* Main Content: Sidebar + Editor */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{ width: '280px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {/* Search */}
            <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
              <input
                type="text"
                placeholder="수신처, 제목 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px' }}
              />
            </div>

            {/* Document List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>로딩 중...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  {search ? '검색 결과가 없습니다.' : '저장된 문서가 없습니다.'}
                </div>
              ) : filtered.map(doc => {
                const status = STATUS_LABELS[doc.status] || STATUS_LABELS.draft;
                return (
                  <div
                    key={doc.id}
                    style={{ padding: '10px', marginBottom: '6px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => loadDocInIframe(doc)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '12px', color: '#1e293b' }}>{doc.recipient || '(수신처 없음)'}</strong>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', color: status.color, background: status.bg }}>{status.label}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>{doc.subject || doc.doc_number}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{doc.quote_date || doc.created_at?.slice(0, 10)}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={(e) => { e.stopPropagation(); setStatusModal({ id: doc.id, current: doc.status }); }} style={{ padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', background: '#fff' }} title="상태 변경">
                          ⚙️
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.id); }} style={{ padding: '2px 6px', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', color: '#dc2626', background: '#fef2f2' }} title="삭제">
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '8px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              {filtered.length}건
              <button onClick={fetchDocs} style={{ marginLeft: '8px', padding: '2px 8px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', background: '#fff' }}>
                새로고침
              </button>
            </div>
          </div>
        )}

        {/* Editor iframe */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <iframe
            key={currentTab.id}
            src={currentTab.src}
            title={currentTab.label}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal open={true} title="문서 삭제" onClose={() => setDeleteConfirm(null)}>
          <p>정말 삭제하시겠습니까?</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>삭제</button>
          </div>
        </Modal>
      )}

      {/* Status Change Modal */}
      {statusModal && (
        <Modal open={true} title="문서 상태 변경" onClose={() => setStatusModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(STATUS_LABELS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => handleStatusChange(statusModal.id, key)}
                disabled={key === statusModal.current}
                style={{
                  padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '6px',
                  cursor: key === statusModal.current ? 'default' : 'pointer',
                  background: key === statusModal.current ? val.bg : '#fff',
                  color: val.color, fontWeight: key === statusModal.current ? 600 : 400,
                  opacity: key === statusModal.current ? 0.6 : 1,
                  textAlign: 'left', fontSize: '13px',
                }}
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
