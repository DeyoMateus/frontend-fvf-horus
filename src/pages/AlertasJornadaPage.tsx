import { primeiroESegundoNome } from "../utils/nomeMotorista";
import { rotuloCampoDetalhe } from "../utils/rotuloCampoDetalhe";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { renderizarHorarios } from "../utils/fusoHorario";
import { Link } from "react-router-dom";
import { DicaAoPassar } from "../components/DicaAoPassar";
import { listAlertasByEmpresa } from "../api/alertas";
import {
  BarraTratamentoEmLote,
  FiltrosTratamento,
  FormularioTratamentoAlerta,
  alertaPodeTratarEmLote,
  aplicarFiltroTratamento,
} from "../components/TratamentoAlertas";
import type { FiltroTratamento } from "../components/TratamentoAlertas";
import type { AlertaJornada, SeveridadeAlerta } from "../api/types";
import { minParaHoras } from "../utils/formatarDuracao";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";
import { baixarCsvTabela } from "../utils/exportarTabelaModal";
import { dataLocalIso } from "../utils/mascaras";
import { rotuloSeveridade } from "../utils/rotulos";

// Pedido do usuário: mesmos atalhos de 7/30/90 dias usados no gráfico de
// evolução do Painel de operação, aqui aplicados ao filtro de período já
// existente (De/Até) , e, junto com ele, poder baixar os dados do
// período filtrado (não só visualizar na tela).
function diasAtrasISO(qtd: number): string {
  return new Date(Date.now() - qtd * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
const OPCOES_PERIODO_RAPIDO = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

type FiltroSeveridade = "TODAS" | SeveridadeAlerta;

// Rótulos dos campos mais comuns dentro de `detalhes` (Json livre , cada
// tipo de alerta guarda um conjunto diferente, ver AntifraudeService e
// JornadaLegalService no backend). Campo não mapeado aqui aparece com a
// própria chave crua, sem quebrar nada.
const ROTULO_CAMPO_DETALHE: Record<string, string> = {
  registroAnteriorId: "Registro anterior (comparado)",
  registroAtualId: "Registro atual (gerou o alerta)",
  registroInicioId: "Registro de início",
  registroFimId: "Registro de fim",
  distanciaMetros: "Distância (m)",
  velocidadeKmh: "Velocidade calculada (km/h)",
  odometroAnterior: "Odômetro anterior (km)",
  odometroAtual: "Odômetro informado (km)",
  flags: "Sinais reportados pelo aparelho",
  deviceUuidUsado: "Aparelho usado",
  registroId: "Registro",
  horaRecebimentoServidor: "Horário de recebimento no servidor",
};

function formatarValorDetalhe(valor: unknown): string {
  if (Array.isArray(valor)) return valor.join(", ");
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    return new Date(valor).toLocaleString("pt-BR");
  }
  return String(valor);
}

/**
 * Visão agregada de alertas de jornada da empresa toda , antes só
 * existia por motorista (MotoristaDetailPage). Usa o mesmo endpoint
 * que já tinha tenant isolation corrigido (GET /alertas-jornada/empresa/minha).
 *
 * Rodada 322: sem "marcar visto" (um alerta podia passar batido). O único
 * caminho é tratar, um a um (críticos) ou coletivo (atenção/info), e os
 * não tratados vêm sempre primeiro. Rodada 25: cada alerta pode ser
 * "tratado" , anexa uma observação obrigatória de quem apurou (o que foi
 * encontrado: falso positivo do motor? precisou de correção via
 * Tratamento de Ponto? etc.) e traz o(s) registro(s) exato(s) que
 * geraram o alerta (registroGeradorId + o que estiver em `detalhes`),
 * pra não precisar adivinhar qual ponto está sendo questionado.
 */
export function AlertasJornadaPage() {
  const [alertas, setAlertas] = useState<AlertaJornada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroSeveridade, setFiltroSeveridade] =
    useState<FiltroSeveridade>("TODAS");
  const [filtroTratamento, setFiltroTratamento] =
    useState<FiltroTratamento>("TODOS");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  // Rodada 99 , pedido do usuário: trocar o filtro "Visualização" não
  // pode "piscar" a tela inteira trocando a lista por "Carregando…" ,
  // mesmo padrão já usado em AuditoriaPage.tsx/MotoristaDetailPage.tsx.
  // Só a carga INICIAL passa pela tela cheia.
  async function carregar(comCarregamentoTelaCheia = false) {
    if (comCarregamentoTelaCheia) setCarregando(true);
    setErro(null);
    try {
      const dados = await listAlertasByEmpresa(false);
      setAlertas(dados);
      setSelecionados((atual) =>
        atual.filter((id) =>
          dados.some((a) => a.id === id && alertaPodeTratarEmLote(a)),
        ),
      );
    } catch {
      setErro("Não foi possível carregar os alertas.");
    } finally {
      setCarregando(false);
    }
  }

  const primeiraCargaFeita = useRef(false);
  useEffect(() => {
    carregar(!primeiraCargaFeita.current);
    primeiraCargaFeita.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function aposTratar(mensagem?: string) {
    setExpandidoId(null);
    setAviso(mensagem ?? null);
    await carregar();
  }

  function alternarSelecao(id: string) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  const alertasFiltrados = useMemo(
    () =>
      alertas.filter(
        (a) =>
          filtroSeveridade === "TODAS" || a.severidade === filtroSeveridade,
      ),
    [alertas, filtroSeveridade],
  );
  const alertasFiltradosPorTratamento = useMemo(
    () => aplicarFiltroTratamento(alertasFiltrados, filtroTratamento),
    [alertasFiltrados, filtroTratamento],
  );

  // Rodada 108 , pedido do usuário: ordenar (mais recente/mais antigo),
  // filtro de período e paginação com popup dedicado em toda tabela de
  // listagem do painel (ver `useListaPaginada`). Esta lista agrega
  // alertas da empresa inteira , é justamente a que mais crescia sem
  // limite na tela antes desta rodada.
  const paginacao = useListaPaginada(
    alertasFiltradosPorTratamento,
    (a) => a.createdAt,
    // Rodada 322: não tratados sempre no topo, depois a ordem por data.
    { fixarNoTopo: (a) => !a.tratadoEm },
  );
  const idsSelecionaveisNaPagina = paginacao.itensExibidos
    .filter(alertaPodeTratarEmLote)
    .map((a) => a.id);
  const todosDaPaginaMarcados =
    idsSelecionaveisNaPagina.length > 0 &&
    idsSelecionaveisNaPagina.every((id) => selecionados.includes(id));

  // Rodada 324: os cards seguem o que está sendo buscado (período De/Até e
  // filtro de tratamento). A severidade não entra no filtro dos cards, porque
  // cada card já é uma severidade.
  const contagens = useMemo(() => {
    const base = { CRITICO: 0, ATENCAO: 0, INFO: 0 };
    const inicioMs = paginacao.dataInicio
      ? new Date(`${paginacao.dataInicio}T00:00:00`).getTime()
      : null;
    const fimMs = paginacao.dataFim
      ? new Date(`${paginacao.dataFim}T23:59:59`).getTime()
      : null;
    for (const a of aplicarFiltroTratamento(alertas, filtroTratamento)) {
      const t = new Date(a.createdAt).getTime();
      if (inicioMs !== null && t < inicioMs) continue;
      if (fimMs !== null && t > fimMs) continue;
      base[a.severidade]++;
    }
    return base;
  }, [alertas, filtroTratamento, paginacao.dataInicio, paginacao.dataFim]);

  return (
    <div>
      <h2>
        Alertas de jornada da empresa
        <DicaAoPassar label="Sobre os alertas de jornada da empresa">
          Todos os alertas gerados automaticamente pelo motor de conformidade
          legal (direção contínua, jornada de direção, tempo de espera) e pelo
          motor de integridade do registro, agregados de todos os motoristas da sua empresa.
          Um alerta nunca some sozinho, ele fica na lista até alguém apurar e{" "}
          <strong>tratar</strong> (anotar o que foi encontrado); o motor
          continua detectando cada nova ocorrência de forma independente,
          tratar um alerta antigo não afeta a próxima detecção.
        </DicaAoPassar>
      </h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: "8px 16px" }}>
          <strong style={{ color: "#b91c1c" }}>{contagens.CRITICO}</strong>{" "}
          crítico
        </div>
        <div className="card" style={{ padding: "8px 16px" }}>
          <strong style={{ color: "#b45309" }}>{contagens.ATENCAO}</strong>{" "}
          atenção
        </div>
        <div className="card" style={{ padding: "8px 16px" }}>
          <strong>{contagens.INFO}</strong> info
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label>
          Severidade:{" "}
          <select
            value={filtroSeveridade}
            onChange={(e) =>
              setFiltroSeveridade(e.target.value as FiltroSeveridade)
            }
          >
            <option value="TODAS">Todas</option>
            <option value="CRITICO">Crítico</option>
            <option value="ATENCAO">Atenção</option>
            <option value="INFO">Info</option>
          </select>
        </label>
        <FiltrosTratamento
          valor={filtroTratamento}
          onMudar={setFiltroTratamento}
        />
      </div>

      {erro && <p style={{ color: "#b91c1c" }}>{erro}</p>}
      {aviso && <p style={{ color: "#166534" }}>{aviso}</p>}
      <BarraTratamentoEmLote
        idsSelecionados={selecionados}
        onLimpar={() => setSelecionados([])}
        onConcluido={(msg) => {
          setSelecionados([]);
          return aposTratar(msg);
        }}
        onErro={setErro}
      />
      {carregando ? (
        <p>Carregando…</p>
      ) : (
        <div className="card">
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: "#000000" }}>
              Atalho de período:
            </span>
            {OPCOES_PERIODO_RAPIDO.map((o) => (
              <button
                key={o.dias}
                type="button"
                className={
                  paginacao.dataInicio === diasAtrasISO(o.dias) &&
                  paginacao.dataFim === dataLocalIso(new Date())
                    ? ""
                    : "secondary"
                }
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => {
                  paginacao.setDataInicio(diasAtrasISO(o.dias));
                  paginacao.setDataFim(dataLocalIso(new Date()));
                }}
              >
                {o.rotulo}
              </button>
            ))}
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12, marginLeft: 12 }}
              disabled={paginacao.itensFiltrados.length === 0}
              onClick={() =>
                baixarCsvTabela(
                  `alertas-de-jornada${paginacao.dataInicio ? `-${paginacao.dataInicio}` : ""}${paginacao.dataFim ? `-a-${paginacao.dataFim}` : ""}.xlsx`,
                  [
                    "Severidade",
                    "Motorista",
                    "Alerta",
                    "Janela início",
                    "Janela fim",
                    "Duração",
                    "Quando",
                    "Tratamento",
                  ],
                  paginacao.itensFiltrados.map((a) => [
                    a.severidade,
                    a.motorista?.nome ?? a.motoristaId,
                    renderizarHorarios(a.mensagem),
                    new Date(a.janelaInicio).toLocaleString("pt-BR"),
                    new Date(a.janelaFim).toLocaleString("pt-BR"),
                    minParaHoras(a.minutosAcumulados),
                    new Date(a.createdAt).toLocaleString("pt-BR"),
                    a.tratadoEm ? "Tratado" : "Pendente",
                  ]),
                  {
                    titulo: "Alertas de jornada",
                    subtitulo:
                      paginacao.dataInicio || paginacao.dataFim
                        ? `Período: ${paginacao.dataInicio || "início"} a ${paginacao.dataFim || "hoje"}`
                        : "Todos os períodos",
                  },
                )
              }
            >
              Baixar Excel ({paginacao.itensFiltrados.length})
            </button>
          </div>
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
              rotulo: "data do alerta",
            }}
            tituloPopup="Alertas de jornada"
          >
            <table>
              <thead>
                <tr>
                  <th title="Selecionar os alertas de atenção e info desta página para tratar juntos">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos os não críticos desta página"
                      disabled={idsSelecionaveisNaPagina.length === 0}
                      checked={todosDaPaginaMarcados}
                      onChange={(e) =>
                        setSelecionados((atual) =>
                          e.target.checked
                            ? [
                                ...new Set([
                                  ...atual,
                                  ...idsSelecionaveisNaPagina,
                                ]),
                              ]
                            : atual.filter(
                                (id) => !idsSelecionaveisNaPagina.includes(id),
                              ),
                        )
                      }
                    />
                  </th>
                  <th>Severidade</th>
                  <th>Motorista</th>
                  <th>Alerta</th>
                  <th>Janela</th>
                  <th>Duração</th>
                  <th>Quando</th>
                  <th>Tratamento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginacao.itensExibidos.map((a) => {
                  const detalhesEntradas = a.detalhes
                    ? Object.entries(a.detalhes)
                    : [];
                  const expandido = expandidoId === a.id;
                  return (
                    <Fragment key={a.id}>
                      <tr style={{ opacity: a.tratadoEm ? 0.6 : 1 }}>
                        <td>
                          {alertaPodeTratarEmLote(a) && (
                            <input
                              type="checkbox"
                              aria-label="Selecionar para tratar junto"
                              checked={selecionados.includes(a.id)}
                              onChange={() => alternarSelecao(a.id)}
                            />
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              color:
                                a.severidade === "CRITICO"
                                  ? "#b91c1c"
                                  : a.severidade === "ATENCAO"
                                    ? "#b45309"
                                    : "#000",
                              fontWeight: 600,
                            }}
                          >
                            {rotuloSeveridade(a.severidade)}
                          </span>
                        </td>
                        <td>
                          {a.motorista ? (
                            <Link
                              to={
                                a.tipo === "FOLGA_VENCIDA" ||
                                a.tipo === "FOLGA_URGENTE"
                                  ? "/pedidos-folga?secao=ranking"
                                  : `/motoristas/${a.motorista.id}?secao=alertas-jornada`
                              }
                            >
                              <span title={a.motorista.nome}>
                                {primeiroESegundoNome(a.motorista.nome)}
                              </span>
                            </Link>
                          ) : (
                            a.motoristaId
                          )}
                        </td>
                        <td>{renderizarHorarios(a.mensagem)}</td>
                        <td>
                          {new Date(a.janelaInicio).toLocaleString("pt-BR")} →{" "}
                          {new Date(a.janelaFim).toLocaleString("pt-BR")}
                        </td>
                        <td>{minParaHoras(a.minutosAcumulados)}</td>
                        <td>{new Date(a.createdAt).toLocaleString("pt-BR")}</td>
                        <td>
                          {a.tratadoEm ? (
                            <span style={{ color: "#166534", fontSize: 12 }}>
                              ✓ tratado em{" "}
                              {new Date(a.tratadoEm).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          ) : (
                            <span style={{ color: "#000000", fontSize: 12 }}>
                              pendente
                            </span>
                          )}
                        </td>
                        <td
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          <button
                            onClick={() =>
                              setExpandidoId(expandido ? null : a.id)
                            }
                          >
                            {expandido
                              ? "Fechar"
                              : a.tratadoEm
                                ? "Ver"
                                : "Tratar"}
                          </button>
                        </td>
                      </tr>
                      {expandido && (
                        <tr>
                          <td colSpan={9} style={{ background: "#f9fafb" }}>
                            <div style={{ padding: "12px 16px" }}>
                              <p style={{ margin: "0 0 8px", fontSize: 13 }}>
                                <strong>
                                  Registro que disparou este alerta:
                                </strong>{" "}
                                {a.registroGeradorId}
                                {a.motorista && (
                                  <>
                                    {" "}
                                    <Link
                                      to={
                                        a.tipo === "FOLGA_VENCIDA" ||
                                        a.tipo === "FOLGA_URGENTE"
                                          ? "/pedidos-folga?secao=ranking"
                                          : `/motoristas/${a.motorista.id}?secao=alertas-jornada`
                                      }
                                    >
                                      ver no histórico do motorista
                                    </Link>
                                  </>
                                )}
                              </p>
                              {detalhesEntradas.length > 0 && (
                                <table style={{ marginBottom: 12 }}>
                                  <tbody>
                                    {detalhesEntradas.map(([chave, valor]) => (
                                      <tr key={chave}>
                                        <td
                                          style={{
                                            fontWeight: 600,
                                            paddingRight: 12,
                                          }}
                                        >
                                          {ROTULO_CAMPO_DETALHE[chave] ??
                                            rotuloCampoDetalhe(chave)}
                                        </td>
                                        <td>{formatarValorDetalhe(valor)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {a.tratadoEm ? (
                                <div style={{ fontSize: 13 }}>
                                  <strong>Observação de quem tratou:</strong>{" "}
                                  {a.tratamentoObservacao}
                                  <div
                                    style={{ color: "#000000", marginTop: 4 }}
                                  >
                                    Tratado em{" "}
                                    {new Date(a.tratadoEm).toLocaleString(
                                      "pt-BR",
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <FormularioTratamentoAlerta
                                  alerta={a}
                                  onConcluido={() => aposTratar()}
                                  onErro={setErro}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {paginacao.itensExibidos.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ color: "#000000" }}>
                      Nenhum alerta encontrado com este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ControlesListaPaginada>
        </div>
      )}
    </div>
  );
}
