import { useAuth } from '@/features/auth/context/AuthContext';
import { DashboardPage } from '@/pages/DashboardPage';
import { StudentDashboardPage } from '@/pages/StudentDashboardPage';

/** Same URL (/dashboard) for every role — the dual-dashboard split happens here rather
 * than via separate routes, since it's genuinely the same "home" concept per role. */
export function DashboardRouter() {
  const { user } = useAuth();
  return user?.role === 'student' ? <StudentDashboardPage /> : <DashboardPage />;
}
