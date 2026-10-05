import { useEffect, useRef, useState } from "react";
import { renderizarHorarios } from "../utils/fusoHorario";
import { Link, useNavigate } from "react-router-dom";
import { listAlertasByEmpresa, marcarAlertaVisualizado } from "../api/alertas";
import { listSolicitacoesPendentes } from "../api/solicitacoesAjuste";
import type { AlertaJornada, SolicitacaoAjustePonto } from "../api/types";

const INTERVALO_POLL_MS = 30000; // mesmo intervalo já usado no dashboard (ver DashboardPage).

const LIMIAR_PULSAR_MS = 10 * 60 * 1000; // mesmo limiar usado nos cards do dashboard (ver DashboardPage.tsx)

const ROTULOS_SEVERIDADE: Record<string, string> = {
  CRITICO: "Crítico",
  ATENCAO: "Atenção",
  INFO: "Info",
};

/**
 * Sininho de notificação no shell do painel. Resolve a lacuna "alerta
 * de estouro de jornada não chega pro gestor": o backend e o endpoint
 * já existiam (GET /alertas-jornada/empresa/minha), só não havia nada
 * ambiente/proativo na UI , o gestor precisava navegar manualmente até
 * /alertas pra descobrir que existia alguma coisa.
 *
 * Funciona "como um email": abre um alerta pra ler (marca como
 * visualizado, que é o "fechar" , some da lista de não-lidos), sem
 * nenhum loop de notificação repetindo pra sempre, porque o estado de
 * "visualizado" já é persistido no backend (marcarAlertaVisualizado) e
 * o polling seguinte só traz o que ainda estiver não-visualizado.
 *
 * Rodada 73 , pedido do usuário: "acrescentar notificação na aba de
 * notificação do telefone e desktop quando chega algum alerta." Isso
 * era só polling in-app (sininho + badge) , nada aparecia na bandeja de
 * notificações do sistema operacional/navegador. Agora, quando o
 * polling traz um alerta cujo id ainda não tinha sido visto NESTA sessão
 * do painel (não é o backlog inicial ao abrir a página, só o que chega
 * depois), dispara também uma notificação nativa do navegador (Web
 * Notification API) , que o Windows/macOS/Linux mostra como notificação
 * de desktop mesmo com a aba em segundo plano. Pede permissão uma vez
 * (no primeiro clique no sininho, que já é um gesto do usuário , a
 * maioria dos navegadores exige isso pra mostrar o prompt).
 */
function notificarAlertaNoDesktop(alerta: AlertaJornada) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const titulo =
    alerta.severidade === "CRITICO"
      ? "🔴 Alerta crítico de jornada"
      : "Alerta de jornada";
  try {
    const notificacao = new Notification(titulo, {
      body: renderizarHorarios(alerta.mensagem),
      tag: alerta.id, // evita duplicar a mesma notificação se o polling repetir o mesmo id
    });
    notificacao.onclick = () => {
      window.focus();
      notificacao.close();
    };
  } catch {
    // Alguns navegadores/contextos (ex.: sem foco de página) podem rejeitar , não é crítico, o sininho já mostra o alerta.
  }
}

function notificarSolicitacaoNoDesktop(solicitacao: SolicitacaoAjustePonto) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const notificacao = new Notification("Solicitação de ajuste de ponto", {
      body: `${solicitacao.motorista?.nome ?? "Um motorista"} pediu correção de ponto.`,
      tag: solicitacao.id,
    });
    notificacao.onclick = () => {
      window.focus();
      notificacao.close();
    };
  } catch {
    // Idem notificarAlertaNoDesktop , não é crítico.
  }
}

export function NotificationBell() {
  const [alertas, setAlertas] = useState<AlertaJornada[]>([]);
  // Pedido do usuário: solicitação de ajuste enviada pelo motorista
  // também precisa avisar o gestor no sininho, igual já acontece com
  // os alertas de jornada , mesmo padrão de polling e notificação de
  // desktop, só que buscando em `/solicitacoes-ajuste-ponto/pendentes`.
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<
    SolicitacaoAjustePonto[]
  >([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // ids já vistos nesta sessão do painel , evita notificar de novo o mesmo
  // alerta a cada poll, e evita notificar o backlog inteiro ao abrir a página.
  const idsConhecidosRef = useRef<Set<string> | null>(null);
  const idsConhecidosSolicitacoesRef = useRef<Set<string> | null>(null);

  async function buscar() {
    try {
      const dados = await listAlertasByEmpresa(true);
      if (idsConhecidosRef.current === null) {
        // Primeira carga desta sessão: só registra o backlog, não notifica.
        idsConhecidosRef.current = new Set(dados.map((a) => a.id));
      } else {
        const novos = dados.filter((a) => !idsConhecidosRef.current!.has(a.id));
        for (const alerta of novos) {
          idsConhecidosRef.current.add(alerta.id);
          notificarAlertaNoDesktop(alerta);
        }
      }
      setAlertas(dados);
    } catch {
      // Sem rede/sessão momentaneamente , não derruba o resto do shell por causa do sininho.
    }
    try {
      const pendentes = await listSolicitacoesPendentes();
      if (idsConhecidosSolicitacoesRef.current === null) {
        idsConhecidosSolicitacoesRef.current = new Set(
          pendentes.map((s) => s.id),
        );
      } else {
        const novas = pendentes.filter(
          (s) => !idsConhecidosSolicitacoesRef.current!.has(s.id),
        );
        for (const solicitacao of novas) {
          idsConhecidosSolicitacoesRef.current.add(solicitacao.id);
          notificarSolicitacaoNoDesktop(solicitacao);
        }
      }
      setSolicitacoesPendentes(pendentes);
    } catch {
      // Idem , sininho não trava o resto do shell por isso.
    }
  }

  useEffect(() => {
    void buscar();
    const id = setInterval(() => void buscar(), INTERVALO_POLL_MS);
    return () => clearInterval(id);
  }, []);

  function pedirPermissaoDeNotificacao() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(evento.target as Node)
      ) {
        setAberto(false);
      }
    }
    if (aberto) document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  const quantidadeCritico = alertas.filter(
    (a) => a.severidade === "CRITICO",
  ).length;
  const quantidadeTotal = alertas.length + solicitacoesPendentes.length;
  const agora = Date.now();
  const pulsando =
    alertas.some(
      (a) => agora - new Date(a.createdAt).getTime() >= LIMIAR_PULSAR_MS,
    ) ||
    solicitacoesPendentes.some(
      (s) => agora - new Date(s.createdAt).getTime() >= LIMIAR_PULSAR_MS,
    );

  async function abrirEFechar(alerta: AlertaJornada) {
    setCarregando(true);
    try {
      await marcarAlertaVisualizado(alerta.id);
      setAlertas((atual) => atual.filter((a) => a.id !== alerta.id));
    } catch {
      // Se falhar, o alerta continua na lista , o gestor pode tentar de novo.
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="notif-bell" ref={containerRef}>
      <button
        type="button"
        className="notif-bell-botao"
        onClick={() => {
          setAberto((v) => !v);
          pedirPermissaoDeNotificacao();
        }}
        title="Alertas e solicitações pendentes"
        aria-label={`Alertas e solicitações pendentes${quantidadeTotal > 0 ? `, ${quantidadeTotal} não visualizados` : ""}`}
      >
        <span className="notif-bell-icone">🔔</span>
        {quantidadeTotal > 0 && (
          <span
            className={`notif-bell-badge ${quantidadeCritico > 0 ? "critico" : ""} ${pulsando ? "pulsando" : ""}`}
          >
            {quantidadeTotal > 99 ? "99+" : quantidadeTotal}
          </span>
        )}
      </button>

      {aberto && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-cabecalho">
            <strong>Alertas de jornada</strong>
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => {
                setAberto(false);
                // Pedido do usuário: "ver todos" deve levar pro painel ,
                // "/alertas" nunca existiu como rota própria (a lista de
                // alertas é a seção dentro do Painel de operação).
                navigate("/dashboard");
              }}
            >
              Ver todos
            </button>
          </div>

          {alertas.length === 0 && solicitacoesPendentes.length === 0 && (
            <div className="notif-dropdown-vazio">Nenhum alerta pendente.</div>
          )}

          <div className="notif-dropdown-lista">
            {solicitacoesPendentes.length > 0 && (
              <div className="notif-item">
                <div className="notif-item-topo">
                  <span className="badge neutro">Solicitação</span>
                </div>
                <div className="notif-item-mensagem">
                  {solicitacoesPendentes.length === 1
                    ? "1 solicitação de ajuste de ponto esperando decisão."
                    : `${solicitacoesPendentes.length} solicitações de ajuste de ponto esperando decisão.`}
                </div>
                <div style={{ marginTop: 4 }}>
                  <Link
                    to="/indicadores?secao=solicitacoes-pendentes"
                    onClick={() => setAberto(false)}
                    style={{ fontSize: 12 }}
                  >
                    Ver e decidir →
                  </Link>
                </div>
              </div>
            )}
            {alertas.slice(0, 8).map((alerta) => (
              <div key={alerta.id} className="notif-item">
                <div className="notif-item-topo">
                  <span
                    className={`badge ${alerta.severidade === "CRITICO" ? "erro" : "neutro"}`}
                  >
                    {ROTULOS_SEVERIDADE[alerta.severidade] ?? alerta.severidade}
                  </span>
                  <span className="notif-item-data">
                    {new Date(alerta.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="notif-item-mensagem">{renderizarHorarios(alerta.mensagem)}</div>
                {alerta.motorista && (
                  <div style={{ marginTop: 4 }}>
                    <Link
                      to={`/motoristas/${alerta.motorista.id}?secao=alertas-jornada`}
                      onClick={() => setAberto(false)}
                      style={{ fontSize: 12 }}
                    >
                      Ver {alerta.motorista.nome} →
                    </Link>
                  </div>
                )}
                <button
                  type="button"
                  className="secondary"
                  style={{ marginTop: 6, padding: "4px 10px", fontSize: 12 }}
                  disabled={carregando}
                  onClick={() => void abrirEFechar(alerta)}
                >
                  Marcar como visto
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
