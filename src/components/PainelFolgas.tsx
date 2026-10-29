import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFolgaDashboard } from "../api/folgaDashboard";
import type {
  FolgaDashboard,
  ItemFolgaDashboard,
  PedidoAbertoDashboard,
  PedidoNegadoDashboard,
  FolgaNaoRealizadaDashboard,
} from "../api/folgaDashboard";
import {
  baixarCsvTabela,
  imprimirTabela,
  travarRolagemFundo,
} from "../utils/exportarTabelaModal";
import { RankingFolgas } from "./RankingFolgas";
import { RegrasDeFolga } from "./RegrasDeFolga";

const INTERVALO_ATUALIZACAO_MS = 30_000; // igual ao painel principal

type Indicador =
  | "deFolga"
  | "vencidas"
  | "marcadas"
  | "pedidos"
  | "negados"
  | "naoRealizadas";

function fmtDia(iso: string | null): string {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";
}

const CABECALHOS_MOTORISTA = [
  "Indicador",
  "Motorista",
  "Empresa",
  "CNPJ",
  "Regra de folga",
  "Dias trabalhados desde a última folga",
  "Dias para ter direito à folga",
  "Folgas vencidas",
  "Limite de folgas vencidas (atenção)",
  "Severidade do alerta",
  "Última folga",
  "Próxima folga marcada",
  "Folga até",
];

const ROTULO: Record<Indicador, string> = {
  deFolga: "Motoristas de folga hoje",
  vencidas: "Folgas vencidas",
  marcadas: "Folgas marcadas",
  pedidos: "Pedidos de folga em aberto",
  negados: "Pedidos de folga negados (últimos 90 dias)",
  naoRealizadas: "Folgas não realizadas: motorista trabalhou (últimos 90 dias)",
};

function linhaMotorista(rotulo: string, m: ItemFolgaDashboard): string[] {
  return [
    rotulo,
    m.nome,
    m.empresa,
    m.empresaCnpj,
    m.regraNome ?? "",
    String(m.diasTrabalhados),
    m.diasParaFolga === null ? "" : String(m.diasParaFolga),
    String(m.folgasVencidas),
    m.limiteFolgasVencidas === null ? "" : String(m.limiteFolgasVencidas),
    m.severidade === "CRITICO"
      ? m.urgente
        ? "Crítico (urgente)"
        : "Crítico"
      : m.severidade === "ATENCAO"
        ? "Atenção"
        : "",
    fmtDia(m.ultimaFolga),
    fmtDia(m.proximaFolga),
    fmtDia(m.folgaAte),
  ];
}

const CABECALHOS_PEDIDO = [
  "Motorista",
  "Primeiro dia pedido",
  "Último dia pedido",
  "Total de dias",
  "Motivo do motorista",
  "Pedido em",
];

function linhaPedido(p: PedidoAbertoDashboard): string[] {
  return [
    p.nome,
    fmtDia(p.dataInicio),
    fmtDia(p.dataFim),
    String(p.totalDias),
    p.observacao ?? "",
    new Date(p.createdAt).toLocaleString("pt-BR"),
  ];
}

const CABECALHOS_NEGADO = [
  "Motorista",
  "Primeiro dia pedido",
  "Último dia pedido",
  "Total de dias",
  "Motivo do motorista",
  "Motivo da negativa",
  "Negado por",
  "Negado em",
];

function linhaNegado(p: PedidoNegadoDashboard): string[] {
  return [
    p.nome,
    fmtDia(p.dataInicio),
    fmtDia(p.dataFim),
    String(p.totalDias),
    p.observacao ?? "",
    p.motivoDecisao ?? "",
    p.automatico ? "Automático (sem resposta)" : (p.decididoPor ?? ""),
    p.decididoEm ? new Date(p.decididoEm).toLocaleString("pt-BR") : "",
  ];
}

const CABECALHOS_NAO_REALIZADA = [
  "Motorista",
  "Dia da folga",
  "Situação",
  "Motivo da folga",
  "Registrado em",
];

function linhaNaoRealizada(f: FolgaNaoRealizadaDashboard): string[] {
  return [
    f.nome,
    fmtDia(f.data),
    "Folga não realizada: motorista trabalhou",
    f.motivo ?? "",
    f.registradoEm ? new Date(f.registradoEm).toLocaleString("pt-BR") : "",
  ];
}

function CartaoFolga({
  titulo,
  valor,
  cor,
  subtitulo,
  pulsando,
  onClick,
  descricao,
}: {
  titulo: string;
  valor: number;
  cor?: string;
  subtitulo?: string;
  pulsando?: boolean;
  onClick: () => void;
  descricao: string;
}) {
  return (
    <div
      className={`card${pulsando ? " card-pulsando" : ""}`}
      title={`${descricao} (clique para ver os motoristas)`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{
        padding: "14px 18px",
        minWidth: 140,
        flex: "1 1 140px",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#000000",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: cor ?? "#000",
          lineHeight: 1.3,
        }}
      >
        {valor}
      </div>
      {subtitulo && (
        <div style={{ fontSize: 12, color: "#000000" }}>{subtitulo}</div>
      )}
    </div>
  );
}

function DetalheIndicador({
  indicador,
  dados,
  onFechar,
}: {
  indicador: Indicador;
  dados: FolgaDashboard;
  onFechar: () => void;
}) {
  useEffect(() => travarRolagemFundo(), []);
  const titulo = ROTULO[indicador];
  const motoristas: ItemFolgaDashboard[] =
    indicador === "deFolga"
      ? dados.deFolga
      : indicador === "vencidas"
        ? dados.vencidas
        : indicador === "marcadas"
          ? dados.marcadas
          : [];
  const ehPedido = indicador === "pedidos";
  const ehNegado = indicador === "negados";
  const ehNaoRealizada = indicador === "naoRealizadas";
  const cabecalhos = ehPedido
    ? CABECALHOS_PEDIDO
    : ehNegado
      ? CABECALHOS_NEGADO
      : ehNaoRealizada
        ? CABECALHOS_NAO_REALIZADA
        : CABECALHOS_MOTORISTA.slice(1);
  const linhas = ehPedido
    ? dados.pedidosEmAberto.map(linhaPedido)
    : ehNegado
      ? dados.pedidosNegados.map(linhaNegado)
      : ehNaoRealizada
        ? dados.naoRealizadas.map(linhaNaoRealizada)
        : motoristas.map((m) => linhaMotorista(titulo, m).slice(1));
  const vazio = linhas.length === 0;

  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "min(760px, 94vw)",
          maxHeight: "80vh",
          overflow: "auto",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <strong style={{ fontSize: 15 }}>
            {titulo} ({linhas.length})
          </strong>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              disabled={vazio}
              onClick={() =>
                void baixarCsvTabela(`${titulo}.xlsx`, cabecalhos, linhas, {
                  titulo,
                })
              }
            >
              Baixar Excel
            </button>
            <button
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              disabled={vazio}
              onClick={() => imprimirTabela(titulo, null, cabecalhos, linhas)}
            >
              Baixar PDF
            </button>
            <button
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={onFechar}
            >
              Fechar
            </button>
          </div>
        </div>

        {vazio && (
          <p style={{ fontSize: 13 }}>{ehNegado ? "Nenhum pedido negado no período." : ehNaoRealizada ? "Nenhuma folga não realizada no período." : "Nenhum motorista nessa condição agora."}</p>
        )}

        {!vazio && !ehPedido && !ehNegado && !ehNaoRealizada && (
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Empresa</th>
                <th>Dias trabalhados</th>
                {indicador === "vencidas" && <th>Folgas vencidas</th>}
                <th>Última folga</th>
                {indicador === "marcadas" && <th>Próxima folga</th>}
                {indicador === "deFolga" && <th>Folga até</th>}
              </tr>
            </thead>
            <tbody>
              {motoristas.map((m) => (
                <tr key={m.motoristaId}>
                  <td>
                    <Link to={`/motoristas/${m.motoristaId}`} onClick={onFechar}>
                      {m.nome}
                    </Link>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {m.empresa}
                    <div>{m.empresaCnpj}</div>
                  </td>
                  <td>
                    {m.diasTrabalhados}
                    {m.diasParaFolga !== null && ` de ${m.diasParaFolga}`}
                  </td>
                  {indicador === "vencidas" && (
                    <td
                      style={{
                        color: m.severidade === "CRITICO" ? "#b91c1c" : "#b45309",
                        fontWeight: 600,
                      }}
                    >
                      {m.urgente
                        ? "Urgente"
                        : `${m.folgasVencidas} (${m.severidade === "CRITICO" ? "crítico" : "atenção"})`}
                    </td>
                  )}
                  <td>{fmtDia(m.ultimaFolga) || "—"}</td>
                  {indicador === "marcadas" && <td>{fmtDia(m.proximaFolga)}</td>}
                  {indicador === "deFolga" && <td>{fmtDia(m.folgaAte)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!vazio && ehNegado && (
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Período</th>
                <th>Negativa</th>
                <th>Negado em</th>
              </tr>
            </thead>
            <tbody>
              {dados.pedidosNegados.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/motoristas/${p.motoristaId}`} onClick={onFechar}>
                      {p.nome}
                    </Link>
                  </td>
                  <td>
                    {fmtDia(p.dataInicio) === fmtDia(p.dataFim)
                      ? fmtDia(p.dataInicio)
                      : `${fmtDia(p.dataInicio)} a ${fmtDia(p.dataFim)}`}{" "}
                    ({p.totalDias} dia{p.totalDias === 1 ? "" : "s"})
                  </td>
                  <td>
                    {p.motivoDecisao || "—"}
                    <div style={{ fontSize: 11 }}>
                      {p.automatico
                        ? "Automático (sem resposta)"
                        : (p.decididoPor ?? "")}
                    </div>
                  </td>
                  <td>
                    {p.decididoEm
                      ? new Date(p.decididoEm).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!vazio && ehNaoRealizada && (
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Dia da folga</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {dados.naoRealizadas.map((f) => (
                <tr key={f.id} style={{ color: "#b91c1c", fontWeight: 600 }}>
                  <td>
                    <Link to={`/motoristas/${f.motoristaId}`} onClick={onFechar}>
                      {f.nome}
                    </Link>
                  </td>
                  <td>{fmtDia(f.data)}</td>
                  <td>Folga não realizada: motorista trabalhou</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!vazio && ehPedido && (
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Período</th>
                <th>Pedido em</th>
              </tr>
            </thead>
            <tbody>
              {dados.pedidosEmAberto.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/motoristas/${p.motoristaId}`} onClick={onFechar}>
                      {p.nome}
                    </Link>
                  </td>
                  <td>
                    {fmtDia(p.dataInicio) === fmtDia(p.dataFim)
                      ? fmtDia(p.dataInicio)
                      : `${fmtDia(p.dataInicio)} a ${fmtDia(p.dataFim)}`}{" "}
                    ({p.totalDias} dia{p.totalDias === 1 ? "" : "s"})
                  </td>
                  <td>{new Date(p.createdAt).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/**
 * Rodada 274 a 278: dashboard de folgas no topo de "Pedidos de folga". Mostra
 * quem está de folga, quem está com folga vencida, quem tem folga marcada e
 * quantos pedidos estão em aberto, pela REGRA DE FOLGA vinculada a cada CNPJ.
 * Atualiza sozinho e usa os mesmos cartões (e o pulsar de atenção) do painel
 * principal. Os alertas de folga vencida chegam como alertas de jornada
 * (atenção/crítico) e levam para esta tela.
 */
export function PainelFolgas({ versao = 0 }: { versao?: number }) {
  const [dados, setDados] = useState<FolgaDashboard | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<Indicador | null>(null);

  const carregar = useCallback(async () => {
    try {
      setDados(await getFolgaDashboard());
      setErro(null);
    } catch {
      setErro("Não foi possível carregar o dashboard de folgas.");
    }
  }, []);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => void carregar(), INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(t);
  }, [carregar]);

  // Recarrega quando a lista de pedidos abaixo muda (aprovar/negar).
  useEffect(() => {
    if (versao > 0) void carregar();
  }, [versao, carregar]);

  function baixarTudo() {
    if (!dados) return;
    // Rodada 499 (N124): pedidos, negados e nao realizadas tem colunas proprias no fim da
    // planilha ("Periodo do pedido ou data" e "Motivo da decisao"), sem cair nas colunas de motorista.
    const brancos = (n: number) => Array.from({ length: n }, () => "");
    const linhas: string[][] = [
      ...dados.deFolga.map((m) => linhaMotorista(ROTULO.deFolga, m)),
      ...dados.vencidas.map((m) => linhaMotorista(ROTULO.vencidas, m)),
      ...dados.marcadas.map((m) => linhaMotorista(ROTULO.marcadas, m)),
    ].map((l) => [...l, "", ""]);
    const negados = dados.pedidosNegados.map((p) => [
      ROTULO.negados,
      p.nome,
      ...brancos(CABECALHOS_MOTORISTA.length - 2),
      `${fmtDia(p.dataInicio)} a ${fmtDia(p.dataFim)}`,
      p.motivoDecisao ?? "",
    ]);
    const naoRealizadas = dados.naoRealizadas.map((f) => [
      ROTULO.naoRealizadas,
      f.nome,
      ...brancos(CABECALHOS_MOTORISTA.length - 2),
      fmtDia(f.data),
      "",
    ]);
    const pedidos = dados.pedidosEmAberto.map((p) => [
      ROTULO.pedidos,
      p.nome,
      ...brancos(CABECALHOS_MOTORISTA.length - 2),
      `${fmtDia(p.dataInicio)} a ${fmtDia(p.dataFim)}`,
      "",
    ]);
    void baixarCsvTabela(
      "dashboard-de-folgas.xlsx",
      [...CABECALHOS_MOTORISTA, "Período do pedido ou data", "Motivo da decisão"],
      [...linhas, ...pedidos, ...negados, ...naoRealizadas],
      {
        titulo: "Dashboard de folgas",
        campos: [
          ["Motoristas ativos", String(dados.totais.motoristasAtivos)],
          ["De folga hoje", String(dados.totais.deFolga)],
          ["Folgas vencidas", String(dados.totais.vencidas)],
          ["Em nível crítico", String(dados.totais.acimaDoLimite)],
          ["Urgentes (sem folga na janela de busca)", String(dados.totais.urgentes)],
          ["Folgas marcadas", String(dados.totais.marcadas)],
          ["Pedidos em aberto", String(dados.totais.pedidosEmAberto)],
          ["Pedidos negados (90 dias)", String(dados.totais.pedidosNegados)],
          ["Folgas não realizadas (90 dias)", String(dados.totais.naoRealizadas)],
          ["Em dia", String(dados.totais.emDia)],
          ["Sem regra vinculada ao CNPJ", String(dados.totais.semConfiguracao)],
        ],
      },
    );
  }

  if (erro) return <p className="error-text">{erro}</p>;
  if (!dados) return <p>Carregando dashboard de folgas...</p>;

  const t = dados.totais;
  const semRegra = dados.empresas.every((e) => e.regra === null);

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h2 style={{ margin: 0 }}>Dashboard de folgas</h2>
        <button
          type="button"
          className="secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          onClick={baixarTudo}
          data-tour="folgas-exportar"
        >
          Baixar tudo (Excel)
        </button>
      </div>

      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}
        data-tour="folgas-indicadores"
      >
        <CartaoFolga
          titulo="De folga hoje"
          valor={t.deFolga}
          cor="#15803d"
          subtitulo={`de ${t.motoristasAtivos} motoristas ativos`}
          onClick={() => setAberto("deFolga")}
          descricao="Motoristas com folga concedida para hoje"
        />
        <CartaoFolga
          titulo="Folgas vencidas"
          valor={t.vencidas}
          cor={t.vencidas > 0 ? "#b91c1c" : undefined}
          subtitulo={
            semRegra
              ? "vincule uma regra a um CNPJ"
              : t.acimaDoLimite > 0
                ? `${t.acimaDoLimite} crítico${t.acimaDoLimite === 1 ? "" : "s"}${t.urgentes > 0 ? ` (${t.urgentes} urgente${t.urgentes === 1 ? "" : "s"})` : ""}`
                : "em atenção"
          }
          pulsando={t.acimaDoLimite > 0}
          onClick={() => setAberto("vencidas")}
          descricao="Motoristas que passaram dos dias de trabalho da regra de folga do CNPJ sem tirar folga, ou sem nenhuma folga na janela de busca"
        />
        <CartaoFolga
          titulo="Folgas marcadas"
          valor={t.marcadas}
          cor="#1d4ed8"
          subtitulo="próximas folgas"
          onClick={() => setAberto("marcadas")}
          descricao="Motoristas com folga concedida em um dia futuro"
        />
        <CartaoFolga
          titulo="Pedidos em aberto"
          valor={t.pedidosEmAberto}
          cor={t.pedidosEmAberto > 0 ? "#b45309" : undefined}
          subtitulo="aguardando decisão"
          onClick={() => setAberto("pedidos")}
          descricao="Pedidos de folga dos motoristas esperando decisão do RH"
        />
        <CartaoFolga
          titulo="Pedidos negados"
          valor={t.pedidosNegados}
          cor={t.pedidosNegados > 0 ? "#b91c1c" : undefined}
          subtitulo="últimos 90 dias"
          onClick={() => setAberto("negados")}
          descricao="Pedidos de folga negados pelo RH ou automaticamente por falta de resposta"
        />
        <CartaoFolga
          titulo="Folgas não realizadas"
          valor={t.naoRealizadas}
          cor={t.naoRealizadas > 0 ? "#b91c1c" : undefined}
          subtitulo="motorista trabalhou (90 dias)"
          onClick={() => setAberto("naoRealizadas")}
          descricao="Folgas marcadas em que o motorista trabalhou; ficam registradas para o RH"
        />
      </div>

      <RegrasDeFolga empresas={dados.empresas} aoAlterar={() => void carregar()} />

      {t.semConfiguracao > 0 && !semRegra && (
        <p style={{ fontSize: 12 }}>
          {t.semConfiguracao} motorista(s) de CNPJ sem regra de folga ficam fora
          dos indicadores e dos alertas.
        </p>
      )}

      <RankingFolgas dados={dados} />

      {aberto && (
        <DetalheIndicador
          indicador={aberto}
          dados={dados}
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}
