import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { atualizarMeuPerfil, obterMeuPerfil } from '../api/usuariosEmpresa';
import { CpfPendenteGate } from './CpfPendenteGate';

export function ProtectedRoute() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  // Rodada 537 (N136): sem CPF no cadastro, o painel nao abre.
  return (
    <CpfPendenteGate
      carregarPendencia={() => obterMeuPerfil().then((p) => !!p.cpfPendente)}
      salvarCpf={(cpf) => atualizarMeuPerfil({ cpf }).then(() => undefined)}
    >
      <Outlet />
    </CpfPendenteGate>
  );
}
