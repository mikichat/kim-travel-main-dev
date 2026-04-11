import React from 'react';

interface DeadlineIndicatorProps {
  date: string;
  type: 'nmtl' | 'tl';
}

function getDaysRemaining(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStyle(days: number, type: 'nmtl' | 'tl'): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  };

  if (days < 0) {
    return { ...base, color: '#999', backgroundColor: '#f5f5f5' };
  }

  if (type === 'nmtl') {
    if (days === 0) return { ...base, color: '#fff', backgroundColor: '#000' };
    if (days <= 3) return { ...base, color: '#fff', backgroundColor: '#e03131' };
    if (days <= 7) return { ...base, color: '#fff', backgroundColor: '#ff6b6b' };
    return { ...base, color: '#ff6b6b' };
  }

  // tl
  if (days === 0) return { ...base, color: '#fff', backgroundColor: '#000' };
  if (days <= 3) return { ...base, color: '#fff', backgroundColor: '#f76707' };
  if (days <= 7) return { ...base, color: '#fff', backgroundColor: '#ffa940' };
  return { ...base, color: '#ffa940' };
}

export function DeadlineIndicator({ date, type }: DeadlineIndicatorProps) {
  if (!date) return null;

  const days = getDaysRemaining(date);
  const style = getStyle(days, type);
  const label = type === 'nmtl' ? 'NMTL' : 'TL';
  const dLabel = days < 0 ? `D+${Math.abs(days)}` : days === 0 ? 'D-Day' : `D-${days}`;
  const formatted = new Date(date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });

  return (
    <span style={style} title={`${label}: ${date}`}>
      <span>{formatted}</span>
      <span style={{ fontSize: '10px', opacity: 0.9 }}>{dLabel}</span>
    </span>
  );
}
