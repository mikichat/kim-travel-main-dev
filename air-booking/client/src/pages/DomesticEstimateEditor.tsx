// 국내 내역서 편집기 — standalone HTML을 iframe으로 임베드

export function DomesticEstimateEditor() {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      <iframe
        src="/domestic-editor.html"
        title="국내 내역서 편집기"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
