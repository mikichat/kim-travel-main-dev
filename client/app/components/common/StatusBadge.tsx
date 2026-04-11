'use client';

export type BadgeStatus = 'pending' | 'confirmed' | 'ticketed' | 'cancelled' | 'urgent' | 'imminent' | 'completed';

interface StatusBadgeProps {
  status: BadgeStatus;
}

const statusConfig: Record<BadgeStatus, { label: string; className: string }> = {
  pending: { label: '대기', className: 'bg-gray-100 text-gray-700' },
  confirmed: { label: '확정', className: 'bg-blue-100 text-blue-700' },
  ticketed: { label: '발권', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', className: 'bg-red-100 text-red-700' },
  urgent: { label: '긴급', className: 'bg-red-500 text-white' },
  imminent: { label: '임박', className: 'bg-orange-100 text-orange-700' },
  completed: { label: '완료', className: 'bg-gray-100 text-gray-500' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${config.className}`}>
      {config.label}
    </span>
  );
}

export default StatusBadge;
