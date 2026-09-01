import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from './ProtectedRoute';
import GuestRoute from './GuestRoute';
import AdminRoute from './AdminRoute';
import IndividualRoute from './IndividualRoute';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import VehicleListPage from '@/pages/vehicles/VehicleListPage';
import AddVehiclePage from '@/pages/vehicles/AddVehiclePage';
import EditVehiclePage from '@/pages/vehicles/EditVehiclePage';
import ProfilePage from '@/pages/profile/ProfilePage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminVehiclesPage from '@/pages/admin/AdminVehiclesPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { useAuth } from '@/hooks/useAuth';

function RoleAwareRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'Admin' ? '/admin/users' : '/dashboard'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Individual-only routes — Admin gets redirected to /admin/users */}
          <Route element={<IndividualRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/vehicles" element={<VehicleListPage />} />
            <Route path="/vehicles/new" element={<AddVehiclePage />} />
            <Route path="/vehicles/:id/edit" element={<EditVehiclePage />} />
          </Route>

          {/* Shared routes — accessible by both roles */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Admin-only routes — Individual gets redirected to /dashboard */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/vehicles" element={<AdminVehiclesPage />} />
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<RoleAwareRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
