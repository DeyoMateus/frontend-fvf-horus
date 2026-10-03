import { NavLink, Outlet } from "react-router-dom";
import { useSuperAdminAuth } from "../context/SuperAdminAuthContext";

// Casca própria da área do super admin , mais simples que o Layout do
// painel de grupo (só uma seção hoje: acompanhamento dos grupos), mas
// já separada como componente próprio pra crescer sem tocar no Layout
// do painel de grupo.
export function SuperAdminLayout() {
  const { superAdmin, sair } = useSuperAdminAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-topo">
          <h1>FVF Hórus</h1>
        </div>
        <p style={{ fontSize: 12, color: "#000000", padding: "0 12px" }}>
          Super admin da plataforma
        </p>
        <nav>
          <NavLink to="/super-admin/grupos">Empresas cadastradas</NavLink>
          <NavLink to="/super-admin/auditoria">Auditoria da plataforma</NavLink>
        </nav>
        <div className="sidebar-rodape">
          <div>{superAdmin?.email}</div>
          <button
            className="secondary"
            style={{ marginTop: 12 }}
            onClick={sair}
            title="Sair"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
