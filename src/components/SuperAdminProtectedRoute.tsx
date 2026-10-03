import { Navigate, Outlet } from 'react-router-dom';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';

export function SuperAdminProtectedRoute() {
  const { superAdmin, carregando } = useSuperAdminAuth();
  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>;
  if (!superAdmin) return <Navigate to="/super-admin/login" replace />;
  return <Outlet />;
}
