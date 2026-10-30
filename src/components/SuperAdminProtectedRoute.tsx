import { Navigate, Outlet } from 'react-router-dom';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';
import { informarMeuCpfSuperAdmin, obterMeuPerfilSuperAdmin } from '../api/superAdmin';
import { CpfPendenteGate } from './CpfPendenteGate';

export function SuperAdminProtectedRoute() {
  const { superAdmin, carregando } = useSuperAdminAuth();
  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>;
  if (!superAdmin) return <Navigate to="/super-admin/login" replace />;
  // Rodada 537 (N136): sem CPF no cadastro, a area do super admin nao abre.
  return (
    <CpfPendenteGate
      carregarPendencia={() => obterMeuPerfilSuperAdmin().then((p) => p.cpfPendente)}
      salvarCpf={(cpf) => informarMeuCpfSuperAdmin(cpf)}
    >
      <Outlet />
    </CpfPendenteGate>
  );
}
