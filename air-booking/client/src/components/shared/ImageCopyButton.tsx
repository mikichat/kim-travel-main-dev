import React, { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

interface ImageCopyButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  label?: string;
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  transition: 'background-color 0.15s',
};

export function ImageCopyButton({ targetRef, label = '카드 복사' }: ImageCopyButtonProps) {
  const [copying, setCopying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'fallback'>('idle');

  const handleCopy = useCallback(async () => {
    if (!targetRef.current || copying) return;
    setCopying(true);
    setStatus('idle');

    try {
      const canvas = await html2canvas(targetRef.current, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 2,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Blob 생성 실패'))), 'image/png');
      });

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        // 클립보드 접근 실패 → 새 탭 폴백
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        // 메모리 누수 방지: 탭 로드 후 URL 해제
        if (win) win.addEventListener('load', () => URL.revokeObjectURL(url));
        else setTimeout(() => URL.revokeObjectURL(url), 60000);
        setStatus('fallback');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('fallback');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setCopying(false);
    }
  }, [targetRef, copying]);

  const statusText = status === 'success' ? '복사 완료!' : status === 'fallback' ? '새 탭에서 확인' : label;

  return (
    <button
      style={{
        ...btnStyle,
        backgroundColor: status === 'success' ? '#e8f5e9' : status === 'fallback' ? '#fff3e0' : '#fff',
        opacity: copying ? 0.7 : 1,
      }}
      onClick={handleCopy}
      disabled={copying}
    >
      {copying ? '처리 중...' : statusText}
    </button>
  );
}
