// 납품확인서/대금청구서 편집기 — standalone HTML을 iframe으로 임베드

'use client';

export default function DeliveryClaimEditorPage() {
  return (
    <div className="w-full h-[calc(100vh-60px)] overflow-hidden">
      <iframe
        src="/delivery-claim-editor.html"
        title="납품확인서/대금청구서 편집기"
        className="w-full h-full border-none"
      />
    </div>
  );
}