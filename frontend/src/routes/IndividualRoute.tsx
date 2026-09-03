import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Route guard that only allows Individual users through.
 * If an Admin navigates to these routes, redirect them to /admin/users.
 */
export default function IndividualRoute() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'Individual') {
    return <Navigate to={user?.role === 'Admin' ? '/admin/users' : '/login'} replace />;
  }

  return <Outlet />;
}
