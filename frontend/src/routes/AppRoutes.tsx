import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageSkeleton } from '@/components/common';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from './ProtectedRoute';
import GuestRoute from './GuestRoute';
import AdminRoute from './AdminRoute';
import IndividualRoute from './IndividualRoute';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import CrisisModePage from '@/pages/crisis/CrisisModePage';
import FuelBudgetPage from '@/pages/budgets/FuelBudgetPage';
import VehicleListPage from '@/pages/vehicles/VehicleListPage';
import AddVehiclePage from '@/pages/vehicles/AddVehiclePage';
import EditVehiclePage from '@/pages/vehicles/EditVehiclePage';
import FuelRecordListPage from '@/pages/fuelRecords/FuelRecordListPage';
import AddFuelRecordPage from '@/pages/fuelRecords/AddFuelRecordPage';
import EditFuelRecordPage from '@/pages/fuelRecords/EditFuelRecordPage';
import TripListPage from '@/pages/trips/TripListPage';
import AddTripPage from '@/pages/trips/AddTripPage';
import EditTripPage from '@/pages/trips/EditTripPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminVehiclesPage from '@/pages/admin/AdminVehiclesPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { useAuth } from '@/hooks/useAuth';

const RoutePlannerPage = lazy(() => import('@/pages/trips/RoutePlannerPage'));
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage'));

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
            <Route path="/analytics" element={<Suspense fallback={<PageSkeleton />}><AnalyticsPage /></Suspense>} />
            <Route path="/crisis-mode" element={<CrisisModePage />} />
            <Route path="/vehicles" element={<VehicleListPage />} />
            <Route path="/vehicles/new" element={<AddVehiclePage />} />
            <Route path="/vehicles/:id/edit" element={<EditVehiclePage />} />
            <Route path="/fuel-records" element={<FuelRecordListPage />} />
            <Route path="/fuel-records/new" element={<AddFuelRecordPage />} />
            <Route path="/fuel-records/:id/edit" element={<EditFuelRecordPage />} />
            <Route path="/fuel-budget" element={<FuelBudgetPage />} />
            <Route path="/trips" element={<TripListPage />} />
            <Route path="/trips/new" element={<AddTripPage />} />
            <Route path="/trips/:id/edit" element={<EditTripPage />} />
            <Route path="/trips/:id/route" element={<Suspense fallback={<PageSkeleton />}><RoutePlannerPage /></Suspense>} />
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
