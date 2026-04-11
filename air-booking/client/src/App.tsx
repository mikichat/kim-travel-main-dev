// @TASK P2 - App Router with MainLayout + Auth Guard + Code Splitting
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { MainLayout } from './components/layout/MainLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Login } from './pages/Login';

// React.lazy로 코드 스플리팅 — 라우트별 동적 import
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Bookings = lazy(() => import('./pages/Bookings').then(m => ({ default: m.Bookings })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Settlements = lazy(() => import('./pages/Settlements').then(m => ({ default: m.Settlements })));
const Vendors = lazy(() => import('./pages/Vendors').then(m => ({ default: m.Vendors })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Groups = lazy(() => import('./pages/Groups').then(m => ({ default: m.Groups })));
const FlightSchedules = lazy(() => import('./pages/FlightSchedules').then(m => ({ default: m.FlightSchedules })));
const CostCalculations = lazy(() => import('./pages/CostCalculations').then(m => ({ default: m.CostCalculations })));
const Invoices = lazy(() => import('./pages/Invoices').then(m => ({ default: m.Invoices })));
const PnrConverter = lazy(() => import('./pages/PnrConverter').then(m => ({ default: m.PnrConverter })));
const FareCertificates = lazy(() => import('./pages/FareCertificates').then(m => ({ default: m.FareCertificates })));
const EstimateEditor = lazy(() => import('./pages/EstimateEditor').then(m => ({ default: m.EstimateEditor })));
const ReservationCard = lazy(() => import('./pages/ReservationCard').then(m => ({ default: m.ReservationCard })));

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/bookings': '예약장부',
  '/calendar': '달력',
  '/groups': '단체 상품',
  '/flight-schedules': '항공 스케줄',
  '/converter': 'PNR 변환기',
  '/cost-calculations': '원가 계산서',
  '/invoices': '인보이스',
  '/estimate-editor': '견적서/내역서',
  '/fare-certificates': '증명서 관리',
  '/settlements': '정산 관리',
  '/customers': '고객 관리',
  '/vendors': '거래처 관리',
  '/settings': '설정',
};

function AuthenticatedRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAuthenticated(true);
          setUserName(data.data?.user?.name || '관리자');
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    navigate('/login');
  }, [navigate]);

  if (!authChecked) return <LoadingSpinner />;
  if (!authenticated) return <Navigate to="/login" replace />;

  const title = PAGE_TITLES[location.pathname] || '항공 예약 관리';

  return (
    <MainLayout title={title} userName={userName} onLogout={handleLogout}>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/flight-schedules" element={<FlightSchedules />} />
          <Route path="/converter" element={<PnrConverter />} />
          <Route path="/pnr-converter" element={<Navigate to="/converter" replace />} />
          <Route path="/cost-calculations" element={<CostCalculations />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/estimate-editor" element={<EstimateEditor />} />
          <Route path="/domestic-editor" element={<Navigate to="/estimate-editor" replace />} />
          <Route path="/delivery-claim-editor" element={<Navigate to="/estimate-editor" replace />} />
          <Route path="/fare-certificates" element={<FareCertificates />} />
          <Route path="/settlements" element={<Settlements />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
}

function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reservation/:id" element={<ReservationCard />} />
          <Route path="/estimate-editor" element={<EstimateEditor />} />
          <Route path="/*" element={<AuthenticatedRoutes />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}

export default App;
