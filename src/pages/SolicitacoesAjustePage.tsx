import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  aprovarSolicitacao,
  baixarEvidenciaSolicitacao,
  listarHistoricoSolicitacoes,
  listSolicitacoesPendentes,
  obterUrlEvidenciaSolicitacao,
  rejeitarSolicitacao,
  removerEvidenciaSolicitacao,
} from "../api/solicitacoesAjuste";
import type { SolicitacaoAjustePonto } from "../api/types";
import { EvidenciasAnexo } from "../components/EvidenciasAnexo";
import { useConfirm } from "../components/ConfirmProvider";
import { useToast } from "../components/ToastProvider";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";
import { PaginacaoPopup } from "../components/PaginacaoPopup";
import { baixarCsvTabela } from "../utils/exportarTabelaModal";

const ROTULO_STATUS: Record<string, string> = {
  APROVADA: "Aprovada",
  REJEITADA: "Rejeitada",
};
const COR_STATUS: Record<string, string> = {
  APROVADA: "#15803d",
  REJEITADA: "#b91c1c",
};

/**
 * Caixa de entrada do RH: pedidos de ajuste que os motoristas mandaram
 * pelo app ("esqueci de bater, era mais ou menos este horário"). Aprovar
 * gera o TratamentoPonto oficial (entra na apuração/holerite); rejeitar
 * exige motivo, pro motorista entender por quê. Decidir uma nunca mexe
 * nas outras , sempre um pedido de cada vez.
 *
 * Lembrete importante (mostrado também no formulário): um horário
 * corrigido não comprova onde o motorista estava naquele momento , cabe
 * ao RH avaliar a justificativa e as evidências antes de aprovar.
 */
export function SolicitacoesAjustePage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  // Pedido do usuário: o sininho deve levar o gestor direto pra caixa
  // de pendentes (pra aceitar ou rejeitar), não só pra página de
  // Indicadores no geral , o link manda `?secao=solicitacoes-pendentes`,
  // aqui só rola a tela até lá quando chegar.
  const secaoPendentesRef = useRef<HTMLDivElement | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAjustePonto[]>(
    [],
  );
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState<Record<string, string>>(
    {},
  );

  async function carregar() {
    setCarregando(true);
    try {
      setSolicitacoes(await listSolicitacoesPendentes());
      setErro(null);
    } catch {
      setErro("Não foi possível carregar as solicitações pendentes.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (carregando) return;
    if (searchParams.get("secao") !== "solicitacoes-pendentes") return;
    secaoPendentesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [carregando, searchParams]);

  async function onAprovar(id: string) {
    if (
      !(await confirm(
        "Aprovar este pedido? O horário informado pelo motorista vira o registro oficial e entra na apuração/holerite.",
        { textoConfirmar: "Aprovar" },
      ))
    ) {
      return;
    }
    setProcessandoId(id);
    try {
      await aprovarSolicitacao(id);
      await carregar();
      await carregarHistorico();
    } finally {
      setProcessandoId(null);
    }
  }

  async function onRejeitar(id: string) {
    const motivo = (motivoRejeicao[id] ?? "").trim();
    if (!motivo) {
      toast.erro(
        "Informe o motivo da rejeição, o motorista precisa entender por quê.",
      );
      return;
    }
    setProcessandoId(id);
    try {
      await rejeitarSolicitacao(id, motivo);
      await carregar();
      await carregarHistorico();
    } finally {
      setProcessandoId(null);
    }
  }

  // Rodada 108 , pedido do usuário: ordenar, filtrar por período e
  // paginar com popup dedicado em toda tabela de listagem do painel.
  const paginacao = useListaPaginada(solicitacoes, (s) => s.createdAt);

  // Pedido do usuário: "só mostra as solicitações em aberto mas não
  // mostra as que já foram fechadas, deve trazer o histórico do que já
  // foi resolvido tbm" , histórico paginado no servidor (pode crescer
  // muito, diferente da caixa de pendentes que é sempre pequena).
  const [historico, setHistorico] = useState<SolicitacaoAjustePonto[]>([]);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);
  const [paginaHist, setPaginaHist] = useState(1);
  const [qtdPorPaginaHist, setQtdPorPaginaHist] = useState<
    10 | 20 | 50 | 100
  >(10);
  const [ordemHist, setOrdemHist] = useState<"asc" | "desc">("desc");
  const [popupPaginacaoHistAberto, setPopupPaginacaoHistAberto] =
    useState(false);

  async function carregarHistorico() {
    setCarregandoHistorico(true);
    try {
      const r = await listarHistoricoSolicitacoes(
        paginaHist,
        qtdPorPaginaHist,
        ordemHist,
      );
      setHistorico(r.dados);
      setTotalHistorico(r.total);
      setErroHistorico(null);
    } catch {
      setErroHistorico("Não foi possível carregar o histórico agora.");
    } finally {
      setCarregandoHistorico(false);
    }
  }

  useEffect(() => {
    void carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaHist, qtdPorPaginaHist, ordemHist]);

  const totalPaginasHist = Math.max(
    1,
    Math.ceil(totalHistorico / qtdPorPaginaHist),
  );

  // Pedido do usuário: exportar o histórico de solicitações decididas
  // (não só a página exibida na tela, que é paginada no servidor). Como
  // o endpoint tem um máximo de 200 por página, busca em várias
  // chamadas até juntar tudo, sempre mais recentes primeiro,
  // independente do que estiver selecionado em "Ordem" na tela.
  const [exportandoHistorico, setExportandoHistorico] = useState(false);

  async function exportarHistoricoCompleto() {
    setExportandoHistorico(true);
    try {
      const TAMANHO_PAGINA_EXPORTACAO = 200;
      const todas: SolicitacaoAjustePonto[] = [];
      let pagina = 1;
      let total = Infinity;
      while (todas.length < total) {
        const r = await listarHistoricoSolicitacoes(
          pagina,
          TAMANHO_PAGINA_EXPORTACAO,
          "desc",
        );
        todas.push(...r.dados);
        total = r.total;
        if (r.dados.length === 0) break; // segurança, evita loop infinito
        pagina += 1;
      }
      baixarCsvTabela(
        "historico-solicitacoes-decididas.csv",
        [
          "Motorista",
          "Evento",
          "Horário pedido",
          "Justificativa",
          "Pedido em",
          "Decidido em",
          "Decisão",
          "Decidido por",
          "Motivo da decisão",
        ],
        todas.map((s) => [
          s.motorista?.nome ?? s.motoristaId,
          s.tipoEvento,
          new Date(s.timestampEvento).toLocaleString("pt-BR"),
          s.justificativa,
          new Date(s.createdAt).toLocaleString("pt-BR"),
          s.decididoEm ? new Date(s.decididoEm).toLocaleString("pt-BR") : "-",
          ROTULO_STATUS[s.status] ?? s.status,
          s.decididoPorUsuario?.nome ?? "-",
          s.motivoDecisao ?? "-",
        ]),
      );
    } catch {
      toast.erro("Não foi possível exportar o histórico agora.");
    } finally {
      setExportandoHistorico(false);
    }
  }

  return (
    <div>
      <h2 ref={secaoPendentesRef}>Solicitações de ajuste de ponto</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Pedidos de correção enviados pelos próprios motoristas pelo app. Um
        horário corrigido não comprova onde o motorista estava naquele momento.
        Avalie a justificativa e as evidências antes de decidir.
      </p>

      <div className="card">
        {carregando && <p>Carregando...</p>}
        {erro && <p className="error-text">{erro}</p>}
        {!carregando && !erro && (
          <>
            {/* Pedido do usuário: deixar claro que esta caixa de entrada
                SEMPRE lista todas as solicitações em aberto (sem decisão
                do RH) , o filtro de período abaixo só restringe a
                VISUALIZAÇÃO (por data do pedido), nunca o que existe de
                fato pendente. Mostra os dois números pra não gerar dúvida
                se o filtro "sumiu" com pedidos de verdade. */}
            <p style={{ fontSize: 13, color: "#000000", marginTop: 0 }}>
              {solicitacoes.length} solicitaç{solicitacoes.length === 1 ? "ão" : "ões"} em aberto no total
              {(paginacao.dataInicio || paginacao.dataFim) &&
                ` (${paginacao.itensFiltrados.length} no período filtrado abaixo)`}
              .
            </p>
            <ControlesListaPaginada
              ordem={paginacao.ordem}
              onAlternarOrdem={paginacao.alternarOrdem}
              qtdPorPagina={paginacao.qtdPorPagina}
              onMudarQtdPorPagina={paginacao.mudarQtdPorPagina}
              pagina={paginacao.pagina}
              totalPaginas={paginacao.totalPaginas}
              popupAberto={paginacao.popupAberto}
              onAbrirPopup={paginacao.abrirPopup}
              onFecharPopup={paginacao.fecharPopup}
              onSelecionarPagina={paginacao.irParaPagina}
              filtroData={{
                dataInicio: paginacao.dataInicio,
                onDataInicio: paginacao.setDataInicio,
                dataFim: paginacao.dataFim,
                onDataFim: paginacao.setDataFim,
                rotulo: "data do pedido",
              }}
            />
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Evento</th>
                  <th>Horário pedido</th>
                  <th>Justificativa</th>
                  <th>Evidências</th>
                  <th>Pedido em</th>
                  <th>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {paginacao.itensExibidos.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/motoristas/${s.motoristaId}`}>
                        {s.motorista?.nome ?? s.motoristaId}
                      </Link>
                    </td>
                    <td>{s.tipoEvento}</td>
                    <td>
                      {new Date(s.timestampEvento).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ maxWidth: 240 }}>{s.justificativa}</td>
                    <td>
                      <EvidenciasAnexo
                        evidencias={s.evidencias ?? []}
                        obterUrl={(evidenciaId) =>
                          obterUrlEvidenciaSolicitacao(evidenciaId)
                        }
                        baixar={(evidenciaId, nomeArquivo) =>
                          baixarEvidenciaSolicitacao(evidenciaId, nomeArquivo)
                        }
                        remover={async (evidenciaId) => {
                          await removerEvidenciaSolicitacao(evidenciaId);
                          await carregar();
                        }}
                      />
                    </td>
                    <td>{new Date(s.createdAt).toLocaleString("pt-BR")}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          minWidth: 220,
                        }}
                      >
                        <button
                          type="button"
                          disabled={processandoId === s.id}
                          onClick={() => onAprovar(s.id)}
                        >
                          {processandoId === s.id
                            ? "Processando..."
                            : "Aprovar"}
                        </button>
                        <textarea
                          placeholder="Motivo da rejeição (obrigatório se rejeitar)"
                          rows={2}
                          value={motivoRejeicao[s.id] ?? ""}
                          onChange={(e) =>
                            setMotivoRejeicao((m) => ({
                              ...m,
                              [s.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="secondary"
                          disabled={processandoId === s.id}
                          onClick={() => onRejeitar(s.id)}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginacao.itensExibidos.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ color: "#000000" }}>
                      {solicitacoes.length === 0 ? (
                        "Nenhuma solicitação pendente."
                      ) : (
                        <>
                          Nenhuma solicitação pendente no período filtrado , há{" "}
                          {solicitacoes.length} no total.{" "}
                          <button
                            type="button"
                            className="secondary"
                            style={{ fontSize: 12, padding: "2px 8px" }}
                            onClick={() => {
                              paginacao.setDataInicio("");
                              paginacao.setDataFim("");
                            }}
                          >
                            Limpar filtro
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Pedido do usuário: trazer o histórico do que já foi decidido
          (aprovado/rejeitado) , antes só existia a caixa de pendentes. */}
      <h3 style={{ marginTop: 32 }}>Histórico de solicitações decididas</h3>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Pedidos já aprovados ou rejeitados pelo RH, mais recentes primeiro.
      </p>
      <div className="card">
        {carregandoHistorico && <p>Carregando...</p>}
        {erroHistorico && <p className="error-text">{erroHistorico}</p>}
        {!carregandoHistorico && !erroHistorico && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <label style={{ fontSize: 13 }}>
                Ordem:{" "}
                <select
                  value={ordemHist}
                  onChange={(e) => {
                    setOrdemHist(e.target.value as "asc" | "desc");
                    setPaginaHist(1);
                  }}
                >
                  <option value="desc">Mais recentes primeiro</option>
                  <option value="asc">Mais antigos primeiro</option>
                </select>
              </label>
              <label style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                Mostrar{" "}
                <select
                  value={qtdPorPaginaHist}
                  onChange={(e) => {
                    setQtdPorPaginaHist(
                      Number(e.target.value) as 10 | 20 | 50 | 100,
                    );
                    setPaginaHist(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>{" "}
                por vez
              </label>
              <button
                type="button"
                className="secondary"
                style={{ padding: "4px 10px", fontSize: 12 }}
                disabled={exportandoHistorico || totalHistorico === 0}
                onClick={() => void exportarHistoricoCompleto()}
              >
                {exportandoHistorico
                  ? "Exportando..."
                  : `Baixar CSV (${totalHistorico})`}
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Evento</th>
                  <th>Horário pedido</th>
                  <th>Justificativa</th>
                  <th>Evidências</th>
                  <th>Pedido em</th>
                  <th>Decidido em</th>
                  <th>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/motoristas/${s.motoristaId}`}>
                        {s.motorista?.nome ?? s.motoristaId}
                      </Link>
                    </td>
                    <td>{s.tipoEvento}</td>
                    <td>
                      {new Date(s.timestampEvento).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ maxWidth: 240 }}>{s.justificativa}</td>
                    <td>
                      <EvidenciasAnexo
                        evidencias={s.evidencias ?? []}
                        obterUrl={(evidenciaId) =>
                          obterUrlEvidenciaSolicitacao(evidenciaId)
                        }
                        baixar={(evidenciaId, nomeArquivo) =>
                          baixarEvidenciaSolicitacao(evidenciaId, nomeArquivo)
                        }
                      />
                    </td>
                    <td>{new Date(s.createdAt).toLocaleString("pt-BR")}</td>
                    <td>
                      {s.decididoEm
                        ? new Date(s.decididoEm).toLocaleString("pt-BR")
                        : "-"}
                    </td>
                    <td>
                      <div
                        style={{
                          color: COR_STATUS[s.status] ?? "#000000",
                          fontWeight: 600,
                        }}
                      >
                        {ROTULO_STATUS[s.status] ?? s.status}
                      </div>
                      {s.decididoPorUsuario?.nome && (
                        <div style={{ fontSize: 12, color: "#000000" }}>
                          por {s.decididoPorUsuario.nome}
                        </div>
                      )}
                      {s.motivoDecisao && (
                        <div style={{ fontSize: 12, color: "#000000" }}>
                          Motivo: {s.motivoDecisao}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {historico.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ color: "#000000" }}>
                      Nenhuma solicitação decidida ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: "10px 0 0",
                flexWrap: "wrap",
              }}
            >
              <button
                disabled={paginaHist <= 1}
                onClick={() => setPaginaHist((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: 13, color: "#000000" }}>
                Página {paginaHist} de {totalPaginasHist} ({totalHistorico}{" "}
                solicitaç{totalHistorico === 1 ? "ão" : "ões"})
              </span>
              <button
                disabled={paginaHist >= totalPaginasHist}
                onClick={() =>
                  setPaginaHist((p) => Math.min(totalPaginasHist, p + 1))
                }
              >
                Próxima →
              </button>
              {totalPaginasHist > 1 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPopupPaginacaoHistAberto(true)}
                >
                  Ir para página…
                </button>
              )}
            </div>

            {popupPaginacaoHistAberto && (
              <PaginacaoPopup
                paginaAtual={paginaHist}
                totalPaginas={totalPaginasHist}
                onSelecionarPagina={setPaginaHist}
                onFechar={() => setPopupPaginacaoHistAberto(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
