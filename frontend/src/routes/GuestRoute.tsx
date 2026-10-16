import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'Admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
}
