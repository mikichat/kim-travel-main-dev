// 납품확인서/대금청구서 편집기 — standalone HTML을 iframe으로 임베드

export function DeliveryClaimEditor() {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      <iframe
        src="/delivery-claim-editor.html"
        title="납품확인서/대금청구서 편집기"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
