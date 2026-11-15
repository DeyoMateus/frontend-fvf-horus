import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmProvider } from "./components/ConfirmProvider";
import { PromptProvider } from "./components/PromptProvider";
import { Layout } from "./components/Layout";
import { TravaScrollDePopups } from "./components/TravaScrollDePopups";
import { ContadorDeCaracteres } from "./components/ContadorDeCaracteres";
import { ExpandirCamposDeTexto } from "./components/ExpandirCamposDeTexto";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { SuperAdminAuthProvider } from "./context/SuperAdminAuthContext";
import { SuperAdminProtectedRoute } from "./components/SuperAdminProtectedRoute";
import { SuperAdminLayout } from "./components/SuperAdminLayout";

// Rodada 746: páginas carregadas sob demanda (cada tela vira um arquivo próprio no build);
// o primeiro acesso baixa só o necessário. A tela de login continua no pacote principal.
const PrivacidadePublicaPage = lazy(() => import("./pages/PrivacidadePublicaPage").then((m) => ({ default: m.PrivacidadePublicaPage })));
const PrivacidadePainelPage = lazy(() => import("./pages/PrivacidadePainelPage").then((m) => ({ default: m.PrivacidadePainelPage })));
const MotoristasListPage = lazy(() => import("./pages/MotoristasListPage").then((m) => ({ default: m.MotoristasListPage })));
const MotoristaDetailPage = lazy(() => import("./pages/MotoristaDetailPage").then((m) => ({ default: m.MotoristaDetailPage })));
const AjudantesPage = lazy(() => import("./pages/AjudantesPage").then((m) => ({ default: m.AjudantesPage })));
const AjudanteDetailPage = lazy(() => import("./pages/AjudanteDetailPage").then((m) => ({ default: m.AjudanteDetailPage })));
const DocumentosCargaPage = lazy(() => import("./pages/DocumentosCargaPage").then((m) => ({ default: m.DocumentosCargaPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const IndicadoresPage = lazy(() => import("./pages/IndicadoresPage").then((m) => ({ default: m.IndicadoresPage })));
const PedidosFolgaPage = lazy(() => import("./pages/PedidosFolgaPage").then((m) => ({ default: m.PedidosFolgaPage })));
const EmpresasPage = lazy(() => import("./pages/EmpresasPage").then((m) => ({ default: m.EmpresasPage })));
const RetencaoPage = lazy(() => import("./pages/RetencaoPage").then((m) => ({ default: m.RetencaoPage })));
const RegrasSindicaisPage = lazy(() => import("./pages/RegrasSindicaisPage").then((m) => ({ default: m.RegrasSindicaisPage })));
const PerfilPage = lazy(() => import("./pages/PerfilPage").then((m) => ({ default: m.PerfilPage })));
const AuditoriaPage = lazy(() => import("./pages/AuditoriaPage").then((m) => ({ default: m.AuditoriaPage })));
const UsuariosEmpresaPage = lazy(() => import("./pages/UsuariosEmpresaPage").then((m) => ({ default: m.UsuariosEmpresaPage })));
const SuperAdminLoginPage = lazy(() => import("./pages/SuperAdminLoginPage").then((m) => ({ default: m.SuperAdminLoginPage })));
const SuperAdminDashboardPage = lazy(() => import("./pages/SuperAdminDashboardPage").then((m) => ({ default: m.SuperAdminDashboardPage })));
const SuperAdminSegurancaPage = lazy(() => import("./pages/SuperAdminSegurancaPage").then((m) => ({ default: m.SuperAdminSegurancaPage })));
const SuperAdminGrupoDetailPage = lazy(() => import("./pages/SuperAdminGrupoDetailPage").then((m) => ({ default: m.SuperAdminGrupoDetailPage })));
const SuperAdminAuditoriaPage = lazy(() => import("./pages/SuperAdminAuditoriaPage").then((m) => ({ default: m.SuperAdminAuditoriaPage })));
const EventoIntegridadePage = lazy(() => import("./pages/EventoIntegridadePage").then((m) => ({ default: m.EventoIntegridadePage })));
const EsqueciSenhaPage = lazy(() => import("./pages/EsqueciSenhaPage").then((m) => ({ default: m.EsqueciSenhaPage })));
const RedefinirSenhaPage = lazy(() => import("./pages/RedefinirSenhaPage").then((m) => ({ default: m.RedefinirSenhaPage })));
const SuperAdminEsqueciSenhaPage = lazy(() => import("./pages/SuperAdminEsqueciSenhaPage").then((m) => ({ default: m.SuperAdminEsqueciSenhaPage })));
const SuperAdminRedefinirSenhaPage = lazy(() => import("./pages/SuperAdminRedefinirSenhaPage").then((m) => ({ default: m.SuperAdminRedefinirSenhaPage })));

// Duas áreas completamente independentes na mesma SPA: o painel do
// grupo (AuthProvider/token/cookie de UsuarioEmpresa) e a área do
// super admin da plataforma (SuperAdminAuthProvider/token/cookie
// próprios , ver context/SuperAdminAuthContext.tsx e
// api/superAdminClient.ts). Os dois Providers ficam sempre montados
// (nenhum dos dois lê/afeta o estado do outro), mas cada rota só usa
// o Provider da própria área , nunca compartilham usuário/token.
export function CarregandoPagina() {
  return <p style={{ padding: 16 }}>Carregando...</p>;
}

export function App() {
  return (
    <ToastProvider>
      <TravaScrollDePopups />
      <ContadorDeCaracteres />
      <ExpandirCamposDeTexto />
      <ConfirmProvider>
        <PromptProvider>
          <AuthProvider>
            <SuperAdminAuthProvider>
              <Suspense fallback={<CarregandoPagina />}>
              <Routes>
                {/* ===== Painel do grupo (empresa/RH) ===== */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/privacidade" element={<PrivacidadePublicaPage />} />
                <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
                <Route
                  path="/redefinir-senha"
                  element={<RedefinirSenhaPage />}
                />
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route
                      path="/"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/indicadores" element={<IndicadoresPage />} />
                    <Route path="/pedidos-folga" element={<PedidosFolgaPage />} />
                    <Route
                      path="/motoristas"
                      element={<MotoristasListPage />}
                    />
                    <Route
                      path="/motoristas/:motoristaId"
                      element={<MotoristaDetailPage />}
                    />
                    <Route
                      path="/motoristas/:motoristaId/integridade/:sequencial"
                      element={<EventoIntegridadePage />}
                    />
                    <Route path="/ajudantes" element={<AjudantesPage />} />
                    <Route path="/ajudantes/:ajudanteId" element={<AjudanteDetailPage />} />
                    <Route
                      path="/documentos-carga"
                      element={<DocumentosCargaPage />}
                    />
                    <Route path="/empresas" element={<EmpresasPage />} />
                    <Route
                      path="/regras-sindicais"
                      element={<RegrasSindicaisPage />}
                    />
                    <Route path="/perfil" element={<PerfilPage />} />
                    <Route path="/auditoria" element={<AuditoriaPage />} />
                    <Route path="/lgpd" element={<PrivacidadePainelPage />} />
                    {/* Rodada 109 , só ADMIN consegue entrar; GESTOR que digitar a URL direto cai no dashboard (ver ProtectedRoute/Layout). */}
                    <Route path="/usuarios" element={<UsuariosEmpresaPage />} />
                    <Route path="/retencao" element={<RetencaoPage />} />
                  </Route>
                </Route>

                {/* ===== Super admin da plataforma (Rodada 31) ===== */}
                <Route
                  path="/super-admin/login"
                  element={<SuperAdminLoginPage />}
                />
                <Route
                  path="/super-admin/esqueci-senha"
                  element={<SuperAdminEsqueciSenhaPage />}
                />
                <Route
                  path="/super-admin/redefinir-senha"
                  element={<SuperAdminRedefinirSenhaPage />}
                />
                <Route element={<SuperAdminProtectedRoute />}>
                  <Route element={<SuperAdminLayout />}>
                    <Route
                      path="/super-admin"
                      element={<Navigate to="/super-admin/grupos" replace />}
                    />
                    <Route
                      path="/super-admin/grupos"
                      element={<SuperAdminDashboardPage />}
                    />
                    <Route
                      path="/super-admin/grupos/:grupoId"
                      element={<SuperAdminGrupoDetailPage />}
                    />
                    <Route
                      path="/super-admin/auditoria"
                      element={<SuperAdminAuditoriaPage />}
                    />
                    <Route
                      path="/super-admin/seguranca"
                      element={<SuperAdminSegurancaPage />}
                    />
                  </Route>
                </Route>

                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
              </Suspense>
            </SuperAdminAuthProvider>
          </AuthProvider>
        </PromptProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
