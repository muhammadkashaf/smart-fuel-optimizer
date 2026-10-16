import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function IndividualRoute() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'Individual' && user?.role !== 'Organizational') {
    return <Navigate to={user?.role === 'Admin' ? '/admin' : '/login'} replace />;
  }

  return <Outlet />;
}
