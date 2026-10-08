import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

const CHAVE_SIDEBAR_COLAPSADA = "fvfhorus.sidebarColapsada";

// Menu reduzido: Alertas de jornada foi para dentro do Painel,
// Solicitações de ajuste foi para dentro de Indicadores (renomeado
// "Fechamento") e Feriados foi para dentro de Regras sindicais
// (renomeado "Regras sindicais") , cada página agora traz o conteúdo
// combinado, só a rota/nav é que foi unificada.
// Rodada 72 , pedido do usuário: separar "fechamento de ponto e
// extração de relatório" (ficou em /indicadores, nav "Fechamento") de
// "indicadores e métricas" (foi para dentro do Painel, como seção
// própria , ver PainelIndicadores.tsx). A rota /indicadores continua
// existindo (só perdeu as métricas), não é uma aba nova.
const ITENS_NAV: {
  to: string;
  label: string;
  abreviacao: string;
  somenteAdmin?: boolean;
}[] = [
  { to: "/dashboard", label: "Painel", abreviacao: "PA" },
  { to: "/indicadores", label: "Fechamento", abreviacao: "FE" },
  { to: "/motoristas", label: "Motoristas", abreviacao: "MO" },
  { to: "/ajudantes", label: "Ajudantes", abreviacao: "AJ" },
  { to: "/documentos-carga", label: "Documentos de carga", abreviacao: "DC" },
  { to: "/regras-sindicais", label: "Regras sindicais", abreviacao: "RS" },
  { to: "/empresas", label: "Empresas", abreviacao: "EM" },
  // Rodada 74 , pedido do usuário: a trilha de auditoria (antes uma
  // seção dentro do Painel, ver DashboardPage) passou a ter aba/rota
  // própria, com um detalhamento mais claro (ver AuditoriaPage.tsx).
  { to: "/auditoria", label: "Auditoria", abreviacao: "AU" },
  // Rodada 109 , gestão do time do próprio grupo, exclusiva do ADMIN
  // (ver UsuariosEmpresaPage.tsx e UsuariosEmpresaController).
  { to: "/usuarios", label: "Usuários", abreviacao: "US", somenteAdmin: true },
];

// Rodada 42 , abaixo dessa largura a barra lateral expandida (220px)
// não cabe mais junto com o conteúdo de forma confortável, então ela
// fica minimizada automaticamente (mesmo visual de quando a pessoa
// clica no botão de recolher), independente da preferência salva.
// Quando a janela volta a ficar larga, a preferência salva volta a
// valer normalmente.
const LARGURA_MINIMA_MENU_EXPANDIDO = 860;

export function Layout() {
  const { usuario, sair } = useAuth();
  const [colapsada, setColapsada] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_SIDEBAR_COLAPSADA) === "1";
    } catch {
      return false;
    }
  });
  const [telaEstreita, setTelaEstreita] = useState(
    () =>
      typeof window !== "undefined" &&
      window.innerWidth < LARGURA_MINIMA_MENU_EXPANDIDO,
  );

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_SIDEBAR_COLAPSADA, colapsada ? "1" : "0");
    } catch {
      // localStorage indisponível (modo privado, etc.) , só não persiste a preferência.
    }
  }, [colapsada]);

  useEffect(() => {
    function aoRedimensionar() {
      setTelaEstreita(window.innerWidth < LARGURA_MINIMA_MENU_EXPANDIDO);
    }
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, []);

  const efetivamenteColapsada = colapsada || telaEstreita;

  return (
    <div
      className={`app-shell ${efetivamenteColapsada ? "sidebar-colapsada" : ""}`}
    >
      <aside className="sidebar">
        <div className="sidebar-topo">
          {!efetivamenteColapsada && <h1>FVF Hórus</h1>}
          <button
            className="sidebar-toggle"
            onClick={() => setColapsada((v) => !v)}
            title={efetivamenteColapsada ? "Expandir menu" : "Minimizar menu"}
            aria-label={
              efetivamenteColapsada ? "Expandir menu" : "Minimizar menu"
            }
            disabled={telaEstreita}
          >
            {efetivamenteColapsada ? "»" : "«"}
          </button>
        </div>
        <nav>
          {ITENS_NAV.filter(
            (item) => !item.somenteAdmin || usuario?.papel === "ADMIN",
          ).map((item) => (
            <NavLink key={item.to} to={item.to} title={item.label}>
              {efetivamenteColapsada ? item.abreviacao : item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-rodape">
          {!efetivamenteColapsada && (
            <div className="sidebar-usuario-info">
              <div>{usuario?.email}</div>
              <div>{usuario?.papel}</div>
            </div>
          )}
          <NavLink to="/perfil" className="botao-perfil" title="Configuração">
            {efetivamenteColapsada ? "CF" : "Configuração"}
          </NavLink>
          <button className="secondary" onClick={sair} title="Sair">
            {efetivamenteColapsada ? "⏻" : "Sair"}
          </button>
        </div>
      </aside>
      <main className="content">
        <div className="content-inner">
          <div className="content-topo">
            <NotificationBell />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
