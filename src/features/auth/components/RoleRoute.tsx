import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { UserRole } from '@/types/contract';

/** Client-side convenience only — the real enforcement is server-side (backend's
 * requireRole/canAccessStudent). This just keeps the wrong nav out of the wrong user's way. */
export function RoleRoute({ allow }: { allow: UserRole[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
