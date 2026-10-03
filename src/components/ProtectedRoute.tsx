import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Outlet />;
}
