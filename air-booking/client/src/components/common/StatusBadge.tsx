// @TASK P1-S0-T1 - StatusBadge 컴포넌트 (4가지 긴급도)
import '../../styles/components.css';

export type BadgeStatus = 'urgent' | 'imminent' | 'completed' | 'pending';

const STATUS_LABEL: Record<BadgeStatus, string> = {
  urgent: '긴급',
  imminent: '임박',
  completed: '완료',
  pending: '대기',
};

interface StatusBadgeProps {
  status: BadgeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge badge-${status}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
