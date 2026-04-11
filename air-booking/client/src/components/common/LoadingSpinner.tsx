// @TASK P1-S0-T1 - LoadingSpinner 컴포넌트 (중앙 정렬, 다크모드 대응)
import '../../styles/components.css';

interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = '로딩 중...' }: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner-wrapper" role="status" aria-label={label}>
      <div className="loading-spinner" aria-hidden="true" />
    </div>
  );
}
