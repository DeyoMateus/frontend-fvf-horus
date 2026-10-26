import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  aprovarPedidoFolga,
  listarHistoricoPedidosFolga,
  listarPedidosFolgaPendentes,
  negarPedidoFolga,
} from "../api/solicitacoesFolga";
import type {
  PaginaHistoricoFolga,
  SolicitacaoFolga,
} from "../api/solicitacoesFolga";
import { useToast } from "../components/ToastProvider";
import { TextoLongo } from "../components/TextoLongo";
import { CampoTextoExpansivel } from "../components/CampoTextoExpansivel";
import { PainelFolgas } from "../components/PainelFolgas";

function fmtDia(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}
function periodo(s: SolicitacaoFolga): string {
  const a = fmtDia(s.dataInicio);
  const b = fmtDia(s.dataFim);
  return a === b ? a : `${a} a ${b}`;
}
function totalDias(s: SolicitacaoFolga): number {
  const ms =
    new Date(s.dataFim.slice(0, 10)).getTime() -
    new Date(s.dataInicio.slice(0, 10)).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * Rodada 221: o motorista PEDE folga pelo app, o RH decide aqui. Aprovar
 * cria uma folga por dia do período; negar exige justificativa (o
 * motorista vê a resposta no app). O lançamento direto de folga pelo RH
 * (quando não há pedido) continua na tela do motorista.
 */
export function PedidosFolgaPage() {
  const toast = useToast();
  const [pendentes, setPendentes] = useState<SolicitacaoFolga[]>([]);
  const [historico, setHistorico] = useState<PaginaHistoricoFolga | null>(null);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  // Muda a cada decisão para o dashboard do topo recarregar os indicadores.
  const [versaoDashboard, setVersaoDashboard] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [justificativas, setJustificativas] = useState<Record<string, string>>(
    {},
  );

  async function carregar(p = pagina) {
    setCarregando(true);
    try {
      const [pend, hist] = await Promise.all([
        listarPedidosFolgaPendentes(),
        listarHistoricoPedidosFolga(p, 10),
      ]);
      setPendentes(pend);
      setHistorico(hist);
      setErro(null);
    } catch {
      setErro("Não foi possível carregar os pedidos de folga.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar(pagina);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  async function decidir(s: SolicitacaoFolga, aprovar: boolean) {
    const texto = (justificativas[s.id] ?? "").trim();
    if (!aprovar && !texto) {
      toast.erro("Informe a justificativa para não aprovar a folga.");
      return;
    }
    setProcessandoId(s.id);
    try {
      if (aprovar) await aprovarPedidoFolga(s.id, texto);
      else await negarPedidoFolga(s.id, texto);
      toast.sucesso(aprovar ? "Folga aprovada e lançada." : "Pedido negado.");
      setVersaoDashboard((v) => v + 1);
      setJustificativas((j) => ({ ...j, [s.id]: "" }));
      await carregar();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Não foi possível registrar a decisão.";
      toast.erro(msg);
    } finally {
      setProcessandoId(null);
    }
  }

  const totalPaginas = historico
    ? Math.max(1, Math.ceil(historico.total / historico.pageSize))
    : 1;

  return (
    <div>
      <h1>Pedidos de folga</h1>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>O que cada indicador mostra</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "#000" }}>
          <li>
            <strong>De folga hoje:</strong> motoristas com folga concedida para
            o dia de hoje.
          </li>
          <li>
            <strong>Folgas vencidas:</strong> motoristas que já passaram do
            número de dias de trabalho permitido pela regra de folga e ainda não
            folgaram. Fica em atenção e passa a crítico ao atingir o limite
            configurado.
          </li>
          <li>
            <strong>Folgas marcadas:</strong> motoristas com folga concedida em
            um dia futuro.
          </li>
          <li>
            <strong>Pedidos em aberto:</strong> pedidos feitos pelos motoristas
            que aguardam a decisão do RH.
          </li>
          <li>
            <strong>Pedidos negados:</strong> pedidos negados pelo RH ou
            automaticamente por falta de resposta, nos últimos 90 dias.
          </li>
          <li>
            <strong>Folgas não realizadas:</strong> dias de folga marcados em que
            o motorista acabou trabalhando, nos últimos 90 dias. Ficam
            registrados para o RH.
          </li>
        </ul>
        <p style={{ fontSize: 12, color: "#000", margin: "8px 0 0" }}>
          Clique em qualquer indicador logo abaixo para ver a lista completa de
          motoristas ou pedidos.
        </p>
      </div>
      <PainelFolgas versao={versaoDashboard} />
      <p style={{ fontSize: 13 }}>
        Os motoristas pedem a folga pelo aplicativo (um ou vários dias seguidos,
        de hoje em diante). Aceite ou negue com justificativa. Para lançar folga
        sem pedido, use a tela do motorista.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          Aguardando decisão ({pendentes.length})
        </h2>
        {carregando && <p>Carregando...</p>}
        {erro && <p className="error-text">{erro}</p>}
        {!carregando && !erro && pendentes.length === 0 && (
          <p>Nenhum pedido pendente.</p>
        )}
        {pendentes.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Período</th>
                <th>Motivo do motorista</th>
                <th>Pedido em</th>
                <th>Decisão</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/motoristas/${s.motoristaId}`}>
                      {s.motorista?.nome ?? s.motoristaId}
                    </Link>
                  </td>
                  <td>
                    {periodo(s)} ({totalDias(s)} dia
                    {totalDias(s) === 1 ? "" : "s"})
                  </td>
                  <td style={{ maxWidth: 240 }}>
                    <TextoLongo
                      texto={s.observacao}
                      titulo="Motivo do motorista"
                    />
                  </td>
                  <td>{new Date(s.createdAt).toLocaleString("pt-BR")}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        minWidth: 240,
                      }}
                    >
                      <CampoTextoExpansivel
                        maxLength={400}
                        placeholder="Justificativa (obrigatória para negar)"
                        value={justificativas[s.id] ?? ""}
                        onChange={(e) =>
                          setJustificativas((j) => ({
                            ...j,
                            [s.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        disabled={processandoId === s.id}
                        onClick={() => void decidir(s, true)}
                      >
                        Aprovar e lançar folga
                      </button>
                      <button
                        type="button"
                        disabled={processandoId === s.id}
                        onClick={() => void decidir(s, false)}
                      >
                        Negar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Já decididos</h2>
        {historico && historico.dados.length === 0 && (
          <p>Nada decidido ainda.</p>
        )}
        {historico && historico.dados.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Período</th>
                  <th>Resultado</th>
                  <th>Justificativa</th>
                  <th>Decidido por</th>
                  <th>Em</th>
                </tr>
              </thead>
              <tbody>
                {historico.dados.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/motoristas/${s.motoristaId}`}>
                        {s.motorista?.nome ?? s.motoristaId}
                      </Link>
                    </td>
                    <td>{periodo(s)}</td>
                    <td
                      style={{
                        color: s.status === "APROVADA" ? "#15803d" : "#b91c1c",
                        fontWeight: 600,
                      }}
                    >
                      {s.status === "APROVADA" ? "Aprovada" : "Negada"}
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      <TextoLongo
                        texto={s.motivoDecisao}
                        titulo="Justificativa"
                      />
                    </td>
                    <td>
                      {s.decididoPorUsuario?.nome ??
                        (s.status === "NEGADA" ? "Sistema (automático)" : "—")}
                    </td>
                    <td>
                      {s.decididoEm
                        ? new Date(s.decididoEm).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
              >
                ← Anterior
              </button>
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
