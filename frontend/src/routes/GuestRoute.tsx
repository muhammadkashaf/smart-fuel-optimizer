import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AuthLoading from './AuthLoading';
import getReturnTo from './getReturnTo';

export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const location = useLocation();

  if (isInitializing) return <AuthLoading />;

  if (isAuthenticated) {
    return (
      <Navigate
        to={getReturnTo(location.state) ?? (user?.role === 'Admin' ? '/admin' : '/dashboard')}
        replace
      />
    );
  }

  return children;
}
