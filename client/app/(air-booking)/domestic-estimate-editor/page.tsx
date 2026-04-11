// 국내 내역서 편집기 — standalone HTML을 iframe으로 임베드

'use client';

export default function DomesticEstimateEditorPage() {
  return (
    <div className="w-full h-[calc(100vh-60px)] overflow-hidden">
      <iframe
        src="/domestic-editor.html"
        title="국내 내역서 편집기"
        className="w-full h-full border-none"
      />
    </div>
  );
}