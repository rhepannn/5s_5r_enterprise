import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ToastProvider } from '@/components/ui/toast';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';

import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import MasterDataPage from '@/pages/master-data/MasterDataPage';
import UsersPage from '@/pages/users/UsersPage';
import AuditListPage from '@/pages/audit/AuditListPage';
import AuditFormPage from '@/pages/audit/AuditFormPage';
import ScheduleManagementPage from '@/pages/audit/ScheduleManagementPage';
import LeaderboardPage from '@/pages/competition/LeaderboardPage';
import CertificatePage from '@/pages/competition/CertificatePage';
import KpiOkrPage from '@/pages/kpi-okr/KpiOkrPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import QccPage from '@/pages/qcc/QccPage';
import QccDetailPage from '@/pages/qcc/QccDetailPage';
import IsoPage from '@/pages/iso/IsoPage';
import IsoEvidencePage from '@/pages/iso/IsoEvidencePage';
import ProperPage from '@/pages/proper/ProperPage';
import ProperRklRplPage from '@/pages/proper/ProperRklRplPage';
import GamificationPage from '@/pages/gamification/GamificationPage';
import DigitalTwinPage from '@/pages/gamification/DigitalTwinPage';
import BeforeAfterListPage from '@/pages/before-after/BeforeAfterListPage';
import ImprovementDetailPage from '@/pages/before-after/ImprovementDetailPage';
import PlaceholderPage from '@/pages/PlaceholderPage';
import ForbiddenPage from '@/pages/error/ForbiddenPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/403" element={<ForbiddenPage />} />

            {/* Protected — semua role terautentikasi */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/competition" element={<LeaderboardPage />} />
                <Route path="/gamification" element={<GamificationPage />} />
              </Route>
              {/* Sertifikat — standalone (tanpa layout) agar bersih saat cetak */}
              <Route path="/certificate" element={<CertificatePage />} />
            </Route>

            {/* ISO evidence package — standalone print (admin) */}
            <Route element={<ProtectedRoute roles={['SUPERADMIN', 'ADMIN_5S']} />}>
              <Route path="/iso/evidence/:standard" element={<IsoEvidencePage />} />
            </Route>

            {/* Protected — Audit: Auditor, Kepala Divisi (review), Admin */}
            <Route element={<ProtectedRoute roles={['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI']} />}>
              <Route element={<AppLayout />}>
                <Route path="/audit" element={<AuditListPage />} />
                <Route path="/audit/:id" element={<AuditFormPage />} />
              </Route>
            </Route>

            {/* Protected — PIC ke atas */}
            <Route element={<ProtectedRoute roles={['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC']} />}>
              <Route element={<AppLayout />}>
                <Route path="/before-after" element={<BeforeAfterListPage />} />
                <Route path="/before-after/:id" element={<ImprovementDetailPage />} />
                <Route path="/qcc" element={<QccPage />} />
                <Route path="/qcc/:id" element={<QccDetailPage />} />
                <Route path="/digital-twin" element={<DigitalTwinPage />} />
              </Route>
            </Route>

            {/* Protected — Kepala Divisi ke atas */}
            <Route element={<ProtectedRoute roles={['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI']} />}>
              <Route element={<AppLayout />}>
                <Route path="/kpi-okr" element={<KpiOkrPage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>
            </Route>

            {/* Protected — Admin ke atas */}
            <Route element={<ProtectedRoute roles={['SUPERADMIN', 'ADMIN_5S']} />}>
              <Route element={<AppLayout />}>
                <Route path="/master-data" element={<MasterDataPage />} />
                <Route path="/audit/schedules" element={<ScheduleManagementPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/iso" element={<IsoPage />} />
                <Route path="/proper" element={<ProperPage />} />
                <Route path="/proper/rkl-rpl" element={<ProperRklRplPage />} />
                <Route path="/settings" element={<PlaceholderPage title="Pengaturan" description="Konfigurasi sistem" phase="Fase 2" />} />
              </Route>
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </ToastProvider>
    </QueryClientProvider>
  );
}
