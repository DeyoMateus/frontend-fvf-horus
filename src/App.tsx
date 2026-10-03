import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmProvider } from "./components/ConfirmProvider";
import { PromptProvider } from "./components/PromptProvider";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { MotoristasListPage } from "./pages/MotoristasListPage";
import { MotoristaDetailPage } from "./pages/MotoristaDetailPage";
import { AjudantesPage } from "./pages/AjudantesPage";
import { DocumentosCargaPage } from "./pages/DocumentosCargaPage";
import { DashboardPage } from "./pages/DashboardPage";
import { IndicadoresPage } from "./pages/IndicadoresPage";
import { EmpresasPage } from "./pages/EmpresasPage";
import { RegrasSindicaisPage } from "./pages/RegrasSindicaisPage";
import { PerfilPage } from "./pages/PerfilPage";
import { AuditoriaPage } from "./pages/AuditoriaPage";
import { UsuariosEmpresaPage } from "./pages/UsuariosEmpresaPage";
import { SuperAdminAuthProvider } from "./context/SuperAdminAuthContext";
import { SuperAdminProtectedRoute } from "./components/SuperAdminProtectedRoute";
import { SuperAdminLoginPage } from "./pages/SuperAdminLoginPage";
import { SuperAdminDashboardPage } from "./pages/SuperAdminDashboardPage";
import { SuperAdminGrupoDetailPage } from "./pages/SuperAdminGrupoDetailPage";
import { SuperAdminAuditoriaPage } from "./pages/SuperAdminAuditoriaPage";
import { SuperAdminLayout } from "./components/SuperAdminLayout";
import { EsqueciSenhaPage } from "./pages/EsqueciSenhaPage";
import { RedefinirSenhaPage } from "./pages/RedefinirSenhaPage";
import { SuperAdminEsqueciSenhaPage } from "./pages/SuperAdminEsqueciSenhaPage";
import { SuperAdminRedefinirSenhaPage } from "./pages/SuperAdminRedefinirSenhaPage";

// Duas áreas completamente independentes na mesma SPA: o painel do
// grupo (AuthProvider/token/cookie de UsuarioEmpresa) e a área do
// super admin da plataforma (SuperAdminAuthProvider/token/cookie
// próprios , ver context/SuperAdminAuthContext.tsx e
// api/superAdminClient.ts). Os dois Providers ficam sempre montados
// (nenhum dos dois lê/afeta o estado do outro), mas cada rota só usa
// o Provider da própria área , nunca compartilham usuário/token.
export function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <PromptProvider>
          <AuthProvider>
            <SuperAdminAuthProvider>
              <Routes>
                {/* ===== Painel do grupo (empresa/RH) ===== */}
                <Route path="/login" element={<LoginPage />} />
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
                    <Route
                      path="/motoristas"
                      element={<MotoristasListPage />}
                    />
                    <Route
                      path="/motoristas/:motoristaId"
                      element={<MotoristaDetailPage />}
                    />
                    <Route path="/ajudantes" element={<AjudantesPage />} />
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
                    {/* Rodada 109 , só ADMIN consegue entrar; GESTOR que digitar a URL direto cai no dashboard (ver ProtectedRoute/Layout). */}
                    <Route path="/usuarios" element={<UsuariosEmpresaPage />} />
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
                  </Route>
                </Route>

                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </SuperAdminAuthProvider>
          </AuthProvider>
        </PromptProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
