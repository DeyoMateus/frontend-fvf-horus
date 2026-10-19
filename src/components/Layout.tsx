import { obterDadosGrupo, type DadosGrupo } from "../api/empresas";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { PoliticaGate } from "./PoliticaGate";
import { TourProvider, useTour } from "../tour/TourProvider";

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
  // Rodada 216: percurso do motorista no mapa (coordenadas + sentido), com PDF.
  { to: "/indicadores", label: "Fechamento", abreviacao: "FE" },
  { to: "/motoristas", label: "Motoristas", abreviacao: "MO" },
  // Rodada 221: pedidos de folga dos motoristas (aprovar/negar com justificativa).
  { to: "/pedidos-folga", label: "Pedidos de folga", abreviacao: "PF" },
  { to: "/ajudantes", label: "Ajudantes", abreviacao: "AJ" },
  { to: "/documentos-carga", label: "Documentos de carga", abreviacao: "DC" },
  { to: "/regras-sindicais", label: "Regras sindicais", abreviacao: "RS" },
  { to: "/empresas", label: "Empresas", abreviacao: "EM" },
  // Rodada 74 , pedido do usuário: a trilha de auditoria (antes uma
  // seção dentro do Painel, ver DashboardPage) passou a ter aba/rota
  // própria, com um detalhamento mais claro (ver AuditoriaPage.tsx).
  { to: "/auditoria", label: "Auditoria", abreviacao: "AU" },
  // Rodada 206 (LGPD): pedidos de titulares, encarregado e ciências.
  { to: "/lgpd", label: "Privacidade (LGPD)", abreviacao: "LG" },
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

// Rodada 264 , o tour guiado envolve todo o painel.
export function Layout() {
  return (
    <PoliticaGate>
      <TourProvider>
        <LayoutInterno />
      </TourProvider>
    </PoliticaGate>
  );
}

function LayoutInterno() {
  const { usuario, sair } = useAuth();
  const { iniciarTour } = useTour();
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

  // Empresa mae do grupo (nome + CNPJ) em destaque sob o nome da ferramenta.
  const [grupo, setGrupo] = useState<DadosGrupo | null>(null);
  useEffect(() => {
    let ativo = true;
    obterDadosGrupo()
      .then((g) => ativo && setGrupo(g))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [usuario?.grupoId]);

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
        {!efetivamenteColapsada && grupo && (
          <div className="sidebar-empresa-mae" title="Empresa do grupo">
            <strong>{grupo.razaoSocial}</strong>
            {grupo.cnpj && <span>CNPJ {grupo.cnpj}</span>}
          </div>
        )}
        <nav>
          {ITENS_NAV.filter(
            (item) => !item.somenteAdmin || usuario?.papel === "ADMIN",
          ).map((item) => (
            <NavLink key={item.to} to={item.to} title={item.label}>
              {efetivamenteColapsada ? item.abreviacao : item.label}
            </NavLink>
          ))}
          <button
            type="button"
            className="nav-tour"
            onClick={iniciarTour}
            title="Tour guiado do sistema"
            data-tour="refazer-tour"
          >
            {efetivamenteColapsada ? "?" : "? Tour guiado"}
          </button>
        </nav>
        <div className="sidebar-rodape">
          <div className="sidebar-usuario-linha">
            {!efetivamenteColapsada && (
              <div className="sidebar-usuario-info">
                <div>{usuario?.email}</div>
                <div>{usuario?.papel}</div>
              </div>
            )}
          </div>
          <div className="sidebar-acoes">
            <NavLink
              to="/perfil"
              className="botao-perfil botao-perfil-icone"
              title="Configuração"
              aria-label="Configuração"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </NavLink>
          <button
            className="secondary"
            onClick={sair}
            title="Sair"
            data-tour="sair"
          >
            {efetivamenteColapsada ? "⏻" : "Sair"}
          </button>
          </div>
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
