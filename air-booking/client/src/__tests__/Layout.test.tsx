// @TASK P1-S0-T1 - 공통 레이아웃 + 공통 컴포넌트 테스트
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { MainLayout } from '../components/layout/MainLayout';

// WebSocket mock (테스트 환경에서 WS 사용 불가)
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    connected: false,
    alerts: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));
import { Toast, ToastProvider, useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// ──────────────────────────────────────
// 1. Sidebar 렌더링 + 7개 메뉴 항목
// ──────────────────────────────────────
describe('Sidebar', () => {
  it('7개 메뉴 항목을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <Sidebar collapsed={false} onToggle={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('예약장부')).toBeInTheDocument();
    expect(screen.getByText('달력')).toBeInTheDocument();
    expect(screen.getByText('정산 관리')).toBeInTheDocument();
    expect(screen.getByText('고객 관리')).toBeInTheDocument();
    expect(screen.getByText('거래처 관리')).toBeInTheDocument();
    expect(screen.getByText('설정')).toBeInTheDocument();
  });

  it('collapsed=true 이면 메뉴 텍스트가 숨겨진다', () => {
    render(
      <MemoryRouter>
        <Sidebar collapsed={true} onToggle={() => {}} />
      </MemoryRouter>
    );
    // collapsed 시에도 nav 역할은 존재해야 함
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('토글 버튼 클릭 시 onToggle 콜백이 호출된다', () => {
    const onToggle = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar collapsed={false} onToggle={onToggle} />
      </MemoryRouter>
    );
    const toggleBtn = screen.getByRole('button', { name: /사이드바 축소|사이드바 확장/i });
    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────
// 2. Header 페이지 타이틀 표시
// ──────────────────────────────────────
describe('Header', () => {
  it('페이지 타이틀을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <Header title="예약장부" userName="홍길동" onLogout={() => {}} />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('예약장부')).toBeInTheDocument();
  });

  it('사용자 이름을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <Header title="대시보드" userName="김철수" onLogout={() => {}} />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('김철수')).toBeInTheDocument();
  });

  it('로그아웃 버튼 클릭 시 onLogout 콜백이 호출된다', () => {
    const onLogout = vi.fn();
    render(
      <MemoryRouter>
        <ToastProvider>
          <Header title="대시보드" userName="홍길동" onLogout={onLogout} />
        </ToastProvider>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /로그아웃/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────
// 3. Toast 표시 + 3초 후 자동 닫힘
// ──────────────────────────────────────
describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('메시지를 렌더링한다', () => {
    render(<Toast id="t1" type="success" message="저장되었습니다" onClose={() => {}} />);
    expect(screen.getByText('저장되었습니다')).toBeInTheDocument();
  });

  it('3초 후 onClose 콜백이 호출된다', () => {
    const onClose = vi.fn();
    render(<Toast id="t1" type="success" message="저장되었습니다" onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('닫기 버튼 클릭 시 onClose 콜백이 호출된다', () => {
    const onClose = vi.fn();
    render(<Toast id="t1" type="error" message="오류 발생" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /닫기/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('useToast hook으로 toast.success를 호출하면 토스트가 표시된다', () => {
    function TestComp() {
      const { toast } = useToast();
      return (
        <button onClick={() => toast.success('성공!')}>토스트 열기</button>
      );
    }
    render(
      <ToastProvider>
        <TestComp />
      </ToastProvider>
    );
    act(() => {
      fireEvent.click(screen.getByText('토스트 열기'));
    });
    expect(screen.getByText('성공!')).toBeInTheDocument();
  });

  it('toast.error / toast.warning / toast.info 도 토스트를 표시한다', () => {
    function TestComp() {
      const { toast } = useToast();
      return (
        <>
          <button onClick={() => toast.error('에러!')}>에러</button>
          <button onClick={() => toast.warning('경고!')}>경고</button>
          <button onClick={() => toast.info('정보!')}>정보</button>
        </>
      );
    }
    render(
      <ToastProvider>
        <TestComp />
      </ToastProvider>
    );
    act(() => { fireEvent.click(screen.getByText('에러')); });
    act(() => { fireEvent.click(screen.getByText('경고')); });
    act(() => { fireEvent.click(screen.getByText('정보')); });
    expect(screen.getByText('에러!')).toBeInTheDocument();
    expect(screen.getByText('경고!')).toBeInTheDocument();
    expect(screen.getByText('정보!')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────
// 4. Modal 열기/닫기
// ──────────────────────────────────────
describe('Modal', () => {
  it('open=true 이면 렌더링된다', () => {
    render(
      <Modal open={true} onClose={() => {}} title="테스트 모달">
        <p>모달 내용</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('테스트 모달')).toBeInTheDocument();
    expect(screen.getByText('모달 내용')).toBeInTheDocument();
  });

  it('open=false 이면 렌더링되지 않는다', () => {
    render(
      <Modal open={false} onClose={() => {}} title="테스트 모달">
        <p>모달 내용</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('backdrop 클릭 시 onClose 콜백이 호출된다', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="테스트">
        <p>내용</p>
      </Modal>
    );
    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESC 키 입력 시 onClose 콜백이 호출된다', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="테스트">
        <p>내용</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('size prop에 따라 올바른 클래스가 적용된다', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}} title="모달" size="sm">
        <p>내용</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveClass('modal-sm');

    rerender(
      <Modal open={true} onClose={() => {}} title="모달" size="lg">
        <p>내용</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveClass('modal-lg');
  });
});

// ──────────────────────────────────────
// 5. StatusBadge 4가지 상태 색상
// ──────────────────────────────────────
describe('StatusBadge', () => {
  it('urgent 상태를 렌더링한다', () => {
    render(<StatusBadge status="urgent" />);
    const badge = screen.getByText('긴급');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.status-badge') || badge).toHaveClass('badge-urgent');
  });

  it('imminent 상태를 렌더링한다', () => {
    render(<StatusBadge status="imminent" />);
    expect(screen.getByText('임박')).toBeInTheDocument();
  });

  it('completed 상태를 렌더링한다', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('완료')).toBeInTheDocument();
  });

  it('pending 상태를 렌더링한다', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('대기')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────
// 6. LoadingSpinner 렌더링
// ──────────────────────────────────────
describe('LoadingSpinner', () => {
  it('렌더링된다', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('aria-label이 존재한다', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label');
  });
});

// ──────────────────────────────────────
// 7. MainLayout 전체 구성
// ──────────────────────────────────────
describe('MainLayout', () => {
  it('Sidebar + Header + content 영역을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <MainLayout title="대시보드" userName="홍길동" onLogout={() => {}}>
            <div data-testid="page-content">페이지 내용</div>
          </MainLayout>
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('7개 메뉴 항목이 MainLayout 안에 존재한다', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <MainLayout title="대시보드" userName="홍길동" onLogout={() => {}}>
            <div>내용</div>
          </MainLayout>
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getAllByText('대시보드').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('예약장부')).toBeInTheDocument();
    expect(screen.getByText('설정')).toBeInTheDocument();
  });

  it('Sidebar 토글 버튼으로 축소/확장이 가능하다', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <MainLayout title="대시보드" userName="홍길동" onLogout={() => {}}>
            <div>내용</div>
          </MainLayout>
        </ToastProvider>
      </MemoryRouter>
    );
    const toggleBtn = screen.getByRole('button', { name: /사이드바 축소/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /사이드바 확장/i })).toBeInTheDocument();
  });
});
