import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardTendenciaDetalhe } from "../api/dashboard";
import type {
  ChaveIndicadorTendencia,
  DashboardTendenciaDetalhe,
  DashboardTendenciaDia,
} from "../api/types";
import { minParaHoras } from "../utils/formatarDuracao";
import {
  baixarCsvTabela,
  imprimirTabela,
  travarRolagemFundo,
} from "../utils/exportarTabelaModal";

/**
 * "Evolução ao longo do tempo" , em vez de um gráfico único com todos
 * os indicadores misturados, quatro gráficos separados (um por
 * categoria: Alertas, Horas de direção/espera, Registros de ponto,
 * Risco de fraude), pedido explícito do usuário , cada categoria tem
 * sua própria escala, então misturar tudo num gráfico só distorcia a
 * leitura (ex.: horas de direção, na casa de dezenas, esmagavam
 * alertas, na casa de unidades). SVG puro, sem lib de gráfico, mesmo
 * estilo minimalista do resto do painel.
 *
 * Cada barra/ponto é clicável (drill-through, como no Power BI): abre
 * um modal com a lista real das ações daquele dia por trás do número
 * (quais registros, quais alertas, quais trechos de direção/espera) ,
 * ver DashboardController.tendenciaDetalhe / DashboardService.tendenciaDetalhe.
 */

interface DefinicaoIndicador {
  chave: ChaveIndicadorTendencia;
  rotulo: string;
  cor: string;
  sufixo?: string;
  // Rodada 113 — pedido do usuário: passar o mouse sobre o indicador
  // explica o que ele representa e quais alertas entram nele.
  descricao: string;
}

const IND_ALERTAS_CRITICO: DefinicaoIndicador = {
  chave: "alertasCritico",
  rotulo: "Alertas críticos",
  cor: "#b91c1c",
  descricao:
    "Severidade mais alta: o limite legal já foi ultrapassado (ex.: direção contínua, jornada de direção ou espera em carga/descarga acima do máximo). Exige ação imediata e pode gerar dossiê de cobrança.",
};
const IND_ALERTAS_ATENCAO: DefinicaoIndicador = {
  chave: "alertasAtencao",
  rotulo: "Alertas de atenção",
  cor: "#b45309",
  descricao:
    "Severidade intermediária: ainda não ultrapassou o limite legal, mas está perto dele, ou é um aviso que merece acompanhamento (ex.: descanso interjornada insuficiente, ociosidade suspeita durante a direção, tempo indefinido prolongado).",
};
const IND_ALERTAS_INFO: DefinicaoIndicador = {
  chave: "alertasInfo",
  rotulo: "Alertas informativos",
  cor: "#9ca3af",
  descricao:
    "Severidade mais baixa: um aviso antecipado, sem indicar risco nem proximidade de limite legal — só mantém o gestor informado do que já foi acumulado na jornada (ex.: horas de espera já somadas, ainda longe do limiar legal).",
};
const IND_RISCO_FRAUDE: DefinicaoIndicador = {
  chave: "riscoFraude",
  rotulo: "Risco de fraude",
  cor: "#7c3aed",
  descricao:
    "Alertas de integridade do aparelho/GPS — não são sobre a jornada em si, são sobre a confiabilidade do que foi registrado (ex.: localização falsificada/mock location, deslocamento fisicamente impossível, relógio do aparelho manipulado, odômetro regressivo).",
};
const IND_HORAS_DIRECAO: DefinicaoIndicador = {
  chave: "horasDirecao",
  rotulo: "Horas de direção",
  cor: "#2563eb",
  sufixo: "h",
  descricao: "Soma das horas em que o motorista esteve no estado \"Início de direção\" até o próximo evento, por dia.",
};
const IND_HORAS_ESPERA: DefinicaoIndicador = {
  chave: "horasEspera",
  rotulo: "Horas de espera",
  cor: "#f59e0b",
  sufixo: "h",
  descricao: "Soma das horas em espera de carga/descarga, por dia — é o tempo que conta pro limiar legal de 05:00 (ver alertas de espera).",
};
// Rodada 68 — jornada aberta sem etapa em aberto (nem direção, nem
// descanso, nem espera, nem "aguardando documentação").
const IND_HORAS_INDEFINIDO: DefinicaoIndicador = {
  chave: "horasIndefinido",
  rotulo: "Horas indefinidas",
  cor: "#ea580c",
  sufixo: "h",
  descricao:
    "Soma das horas em que a jornada está aberta sem nenhuma etapa escolhida (nem direção, nem descanso, nem espera, nem \"aguardando documentação\") — motorista precisa selecionar uma ação.",
};
const IND_REGISTROS: DefinicaoIndicador = {
  chave: "registros",
  rotulo: "Registros de ponto",
  cor: "#059669",
  descricao: "Quantos eventos (de qualquer tipo — início/fim de direção, descanso, espera etc.) foram batidos no dia, somando todos os motoristas.",
};

interface Categoria {
  chave: string;
  titulo: string;
  descricao: string;
  indicadores: DefinicaoIndicador[];
}

const CATEGORIAS: Categoria[] = [
  {
    chave: "alertas",
    titulo: "Alertas",
    descricao: "Volume de alertas por severidade, por dia.",
    indicadores: [IND_ALERTAS_CRITICO, IND_ALERTAS_ATENCAO, IND_ALERTAS_INFO],
  },
  {
    chave: "horas",
    titulo: "Horas de direção",
    descricao:
      "Horas somadas de direção, espera em carga/descarga e tempo indefinido (sem etapa escolhida), por dia.",
    indicadores: [IND_HORAS_DIRECAO, IND_HORAS_ESPERA, IND_HORAS_INDEFINIDO],
  },
  {
    chave: "registros",
    titulo: "Registros de ponto",
    descricao: "Quantos eventos foram batidos (de qualquer tipo) por dia.",
    indicadores: [IND_REGISTROS],
  },
  {
    chave: "fraude",
    titulo: "Risco de fraude",
    descricao:
      "Alertas de integridade/fraude (GPS impossível, relógio suspeito, odômetro regressivo etc.), por dia.",
    indicadores: [IND_RISCO_FRAUDE],
  },
];

const ALTURA = 224;
const LARGURA = 760;
const MARGEM_ESQUERDA = 36;
// Os rótulos de data no eixo X ficam inclinados (-40°); com pouca margem
// inferior a parte de baixo do texto passava do limite do viewBox e era
// cortada (o SVG recorta por padrão qualquer coisa fora do viewBox).
// Aumentando ALTURA/MARGEM_BAIXO junto sobra espaço de verdade pro texto
// rotacionado caber por completo.
const MARGEM_BAIXO = 46;
const MARGEM_TOPO = 10;

// Rodada 112 , pedido do usuário: mesma regra de horas/minutos dos
// cards (Rodada 61/63, `minParaHoras`) também nos gráficos de
// tendência, em vez de sempre mostrar hora decimal (ex.: "0.4h").
function formatarValorIndicador(
  ind: DefinicaoIndicador,
  valor: number,
): string {
  if (ind.sufixo === "h") return minParaHoras(valor * 60);
  return String(valor);
}

function formatarDiaCurto(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/**
 * Mostra só uma fração dos rótulos do eixo X pra não empilhar texto
 * quando há muitos dias , a quantidade de rótulos é calculada a partir
 * da largura de fato disponível no gráfico (`larguraUtil`), não de um
 * número fixo, senão em janelas maiores (30/60 dias) os rótulos ficavam
 * mais próximos entre si do que a largura do próprio texto ("20/09"),
 * sobrepondo um em cima do outro.
 * Antes, o último índice (`total - 1`) era sempre forçado no conjunto,
 * mesmo quando caía a 1 dia de distância do rótulo anterior já
 * escolhido pelo passo , exatamente o par colado ("20/09"/"21/09") que
 * aparecia sempre no fim do eixo. Agora só é adicionado quando sobra
 * espaço de verdade; caso contrário ele SUBSTITUI o anterior (nunca
 * fica sem nenhum rótulo no último dia, só não duplica perto dele).
 */
function indicesRotulos(total: number, larguraUtilPx: number): Set<number> {
  if (total <= 0) return new Set();
  // Rótulos inclinados (Rodada 60) ocupam menos espaço HORIZONTAL entre
  // si (o texto "desce" na diagonal em vez de disputar largura com o
  // vizinho), então cabem mais rótulos no mesmo espaço sem sobrepor.
  const LARGURA_MINIMA_POR_ROTULO_PX = 28;
  const maxRotulos = Math.max(
    2,
    Math.floor(larguraUtilPx / LARGURA_MINIMA_POR_ROTULO_PX),
  );
  const passo = Math.max(1, Math.ceil(total / maxRotulos));
  const indices = new Set<number>();
  for (let i = 0; i < total; i += passo) indices.add(i);
  const ultimo = total - 1;
  const anterior = Math.max(...indices);
  if (ultimo !== anterior) {
    if (ultimo - anterior >= passo / 2) {
      indices.add(ultimo);
    } else {
      indices.delete(anterior);
      indices.add(ultimo);
    }
  }
  return indices;
}

/** Regressão linear simples (mínimos quadrados) , devolve os valores previstos no primeiro e no último ponto, pra desenhar a reta de tendência. */
function linhaDeTendencia(
  valores: number[],
): { inicio: number; fim: number } | null {
  const n = valores.length;
  if (n < 2) return null;
  const xs = valores.map((_, i) => i);
  const mediaX = xs.reduce((a, b) => a + b, 0) / n;
  const mediaY = valores.reduce((a, b) => a + b, 0) / n;
  let numerador = 0;
  let denominador = 0;
  for (let i = 0; i < n; i++) {
    numerador += (xs[i] - mediaX) * (valores[i] - mediaY);
    denominador += (xs[i] - mediaX) ** 2;
  }
  if (denominador === 0) return { inicio: mediaY, fim: mediaY };
  const inclinacao = numerador / denominador;
  const intercepto = mediaY - inclinacao * mediaX;
  return { inicio: intercepto, fim: intercepto + inclinacao * (n - 1) };
}

export interface PontoClicado {
  dia: string;
  indicador: ChaveIndicadorTendencia;
  rotulo: string;
}

function BlocoGrafico({
  categoria,
  dados,
  tipoGrafico,
  onClickPonto,
}: {
  categoria: Categoria;
  dados: DashboardTendenciaDia[];
  tipoGrafico: "barras" | "linhas";
  onClickPonto: (ponto: PontoClicado) => void;
}) {
  const [selecionados, setSelecionados] = useState<
    Set<ChaveIndicadorTendencia>
  >(() => new Set(categoria.indicadores.map((i) => i.chave)));

  const indicadoresAtivos = useMemo(
    () => categoria.indicadores.filter((ind) => selecionados.has(ind.chave)),
    [categoria.indicadores, selecionados],
  );

  function alternarIndicador(chave: ChaveIndicadorTendencia) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });
  }

  const alturaUtil = ALTURA - MARGEM_TOPO - MARGEM_BAIXO;
  const larguraUtil = LARGURA - MARGEM_ESQUERDA;

  const maxValor = Math.max(
    1,
    ...dados.flatMap((d) => indicadoresAtivos.map((ind) => d[ind.chave])),
  );
  // Rodada 112 , o rótulo do topo do eixo Y segue a mesma regra dos
  // cards (abaixo de 60min mostra minutos, a partir de 60min mostra
  // horas) só quando a categoria é de duração (sufixo 'h'); nas outras
  // (Alertas, Registros, Risco de fraude) o número continua puro.
  const ehCategoriaDeHoras = categoria.indicadores.some(
    (ind) => ind.sufixo === "h",
  );

  const escalaY = (valor: number) => (valor / maxValor) * alturaUtil;
  const pontoX = (i: number) =>
    dados.length > 1
      ? MARGEM_ESQUERDA + (i * larguraUtil) / (dados.length - 1)
      : MARGEM_ESQUERDA;
  const pontoY = (valor: number) => MARGEM_TOPO + alturaUtil - escalaY(valor);
  const rotulos = indicesRotulos(dados.length, larguraUtil);

  const passoDia = larguraUtil / Math.max(1, dados.length);
  const larguraGrupo = passoDia * 0.7;
  const larguraBarra =
    indicadoresAtivos.length > 0 ? larguraGrupo / indicadoresAtivos.length : 0;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <strong>{categoria.titulo}</strong>
          <p
            style={{
              fontSize: 12,
              color: "#000000",
              marginTop: 4,
              marginBottom: 0,
              maxWidth: 480,
            }}
          >
            {categoria.descricao}
          </p>
        </div>
      </div>

      {categoria.indicadores.length > 1 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 14px",
            margin: "12px 0",
          }}
        >
          {categoria.indicadores.map((ind) => (
            <label
              key={ind.chave}
              // Rodada 113 — pedido do usuário: passar o mouse sobre o
              // indicador explica o que ele representa (tooltip nativo
              // do navegador, mesmo padrão já usado nos cards de
              // indicador — ver CartaoIndicador em PainelIndicadores.tsx).
              title={ind.descricao}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selecionados.has(ind.chave)}
                onChange={() => alternarIndicador(ind.chave)}
              />
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: ind.cor,
                }}
              />
              {ind.rotulo}
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  border: "1px solid #9ca3af",
                  color: "#9ca3af",
                  fontSize: 9,
                  lineHeight: 1,
                  cursor: "help",
                }}
              >
                ?
              </span>
            </label>
          ))}
        </div>
      )}

      {dados.length === 0 || indicadoresAtivos.length === 0 ? (
        <p style={{ fontSize: 13, color: "#000000", marginTop: 12 }}>
          {indicadoresAtivos.length === 0
            ? "Selecione ao menos um indicador."
            : "Sem dados no período."}
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          width="100%"
          role="img"
          aria-label={`Evolução de ${categoria.titulo.toLowerCase()} ao longo do tempo`}
          style={{ marginTop: 8, overflow: "visible" }}
        >
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1={MARGEM_ESQUERDA}
              x2={LARGURA}
              y1={MARGEM_TOPO + alturaUtil * (1 - f)}
              y2={MARGEM_TOPO + alturaUtil * (1 - f)}
              stroke="#eceef2"
            />
          ))}
          <text x={0} y={MARGEM_TOPO + 4} fontSize="10" fill="#000000">
            {ehCategoriaDeHoras ? minParaHoras(maxValor * 60) : maxValor}
          </text>
          <text x={0} y={ALTURA - MARGEM_BAIXO} fontSize="10" fill="#000000">
            0
          </text>

          {tipoGrafico === "barras" &&
            dados.map((d, i) => {
              const xGrupo =
                MARGEM_ESQUERDA + i * passoDia + (passoDia - larguraGrupo) / 2;
              return (
                <g key={d.dia}>
                  {indicadoresAtivos.map((ind, j) => {
                    const valor = d[ind.chave];
                    const x = xGrupo + j * larguraBarra;
                    const altura = escalaY(valor);
                    return altura > 0 ? (
                      <rect
                        key={ind.chave}
                        x={x}
                        y={MARGEM_TOPO + alturaUtil - altura}
                        width={larguraBarra * 0.85}
                        height={altura}
                        fill={ind.cor}
                        rx={1}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          onClickPonto({
                            dia: d.dia,
                            indicador: ind.chave,
                            rotulo: ind.rotulo,
                          })
                        }
                      >
                        <title>
                          {d.dia}: {ind.rotulo} ={" "}
                          {formatarValorIndicador(ind, valor)} (clique para ver
                          o detalhe)
                        </title>
                      </rect>
                    ) : null;
                  })}
                  {rotulos.has(i) && (
                    <text
                      x={xGrupo + larguraGrupo / 2}
                      y={ALTURA - 4}
                      fontSize="9"
                      fill="#000000"
                      textAnchor="end"
                      transform={`rotate(-40 ${xGrupo + larguraGrupo / 2} ${ALTURA - 4})`}
                    >
                      {formatarDiaCurto(d.dia)}
                    </text>
                  )}
                </g>
              );
            })}

          {tipoGrafico === "linhas" &&
            indicadoresAtivos.map((ind) => {
              const caminho = dados
                .map(
                  (d, i) =>
                    `${i === 0 ? "M" : "L"} ${pontoX(i)} ${pontoY(d[ind.chave])}`,
                )
                .join(" ");
              return (
                <g key={ind.chave}>
                  <path
                    d={caminho}
                    fill="none"
                    stroke={ind.cor}
                    strokeWidth={2}
                  />
                  {dados.map((d, i) => (
                    <circle
                      key={i}
                      cx={pontoX(i)}
                      cy={pontoY(d[ind.chave])}
                      r={3.5}
                      fill={ind.cor}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        onClickPonto({
                          dia: d.dia,
                          indicador: ind.chave,
                          rotulo: ind.rotulo,
                        })
                      }
                    >
                      <title>
                        {d.dia}: {ind.rotulo} ={" "}
                        {formatarValorIndicador(ind, d[ind.chave])} (clique para
                        ver o detalhe)
                      </title>
                    </circle>
                  ))}
                </g>
              );
            })}

          {tipoGrafico === "linhas" &&
            dados.length > 0 &&
            rotulos.size > 0 &&
            Array.from(rotulos).map((i) => (
              <text
                key={i}
                x={pontoX(i)}
                y={ALTURA - 4}
                fontSize="9"
                fill="#000000"
                textAnchor="end"
                transform={`rotate(-40 ${pontoX(i)} ${ALTURA - 4})`}
              >
                {formatarDiaCurto(dados[i].dia)}
              </text>
            ))}

          {/* Linha de tendência (regressão linear) de cada indicador ativo, sempre sobreposta , em barras e em linhas. */}
          {indicadoresAtivos.map((ind) => {
            const tendencia = linhaDeTendencia(dados.map((d) => d[ind.chave]));
            if (!tendencia) return null;
            return (
              <line
                key={`tendencia-${ind.chave}`}
                x1={pontoX(0)}
                y1={pontoY(tendencia.inicio)}
                x2={pontoX(dados.length - 1)}
                y2={pontoY(tendencia.fim)}
                stroke={ind.cor}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                opacity={0.7}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}

const ROTULO_SEVERIDADE_COR: Record<string, string> = {
  CRITICO: "#b91c1c",
  ATENCAO: "#b45309",
  INFO: "#9ca3af",
};

/** Modal de drill-through: mostra a lista real de ações (registros, alertas ou trechos de direção/espera) por trás do ponto clicado no gráfico. */
export function ModalDetalheTendencia({
  ponto,
  onFechar,
}: {
  ponto: PontoClicado;
  onFechar: () => void;
}) {
  const [dados, setDados] = useState<DashboardTendenciaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    getDashboardTendenciaDetalhe(ponto.dia, ponto.indicador)
      .then((r) => {
        if (!cancelado) setDados(r);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar o detalhe agora.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [ponto.dia, ponto.indicador]);

  // Pedido do usuário: travar a rolagem da tela de trás enquanto o popup
  // estiver aberto (o clique de fora já era bloqueado).
  useEffect(() => travarRolagemFundo(), []);

  const dataFormatada = new Date(`${ponto.dia}T00:00:00`).toLocaleDateString(
    "pt-BR",
  );

  // Pedido do usuário: poder baixar (CSV) ou imprimir os dados deste
  // popup. Monta cabeçalho/linhas a partir do mesmo `dados.itens` já
  // carregado na tela, sem chamada nova ao backend.
  let cabecalhosExportacao: string[] = [];
  let linhasExportacao: string[][] = [];
  if (dados?.tipo === "registros") {
    cabecalhosExportacao = ["Motorista", "Evento", "Quando"];
    linhasExportacao = dados.itens.map((r) => [
      r.nome,
      r.tipoEvento,
      new Date(r.timestampEvento).toLocaleString("pt-BR"),
    ]);
  } else if (dados?.tipo === "alertas") {
    cabecalhosExportacao = ["Motorista", "Alerta", "Quando"];
    linhasExportacao = dados.itens.map((a) => [
      a.nome,
      a.tipo,
      new Date(a.createdAt).toLocaleString("pt-BR"),
    ]);
  } else if (dados?.tipo === "trechos") {
    cabecalhosExportacao = ["Motorista", "Início", "Fim", "Duração"];
    linhasExportacao = dados.itens.map((t) => [
      t.nome,
      new Date(t.inicio).toLocaleString("pt-BR"),
      new Date(t.fim).toLocaleString("pt-BR"),
      minParaHoras(t.minutos),
    ]);
  }
  const temDadosParaExportar = linhasExportacao.length > 0;

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
          width: "min(640px, 92vw)",
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
            marginBottom: 4,
          }}
        >
          <strong style={{ fontSize: 15 }}>{ponto.rotulo}</strong>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              disabled={!temDadosParaExportar}
              onClick={() =>
                baixarCsvTabela(
                  `${ponto.rotulo}-${ponto.dia}.csv`,
                  cabecalhosExportacao,
                  linhasExportacao,
                )
              }
            >
              Baixar CSV
            </button>
            <button
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              disabled={!temDadosParaExportar}
              onClick={() =>
                imprimirTabela(
                  ponto.rotulo,
                  dataFormatada,
                  cabecalhosExportacao,
                  linhasExportacao,
                )
              }
            >
              Imprimir
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
        <p
          style={{
            fontSize: 12,
            color: "#000000",
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          {dataFormatada}
        </p>

        {carregando && (
          <p style={{ fontSize: 13, color: "#000000" }}>Carregando…</p>
        )}
        {erro && <p style={{ fontSize: 13, color: "#b91c1c" }}>{erro}</p>}

        {!carregando && !erro && dados && dados.itens.length === 0 && (
          <p style={{ fontSize: 13, color: "#000000" }}>
            Nenhum registro nesse dia para este indicador.
          </p>
        )}

        {!carregando &&
          !erro &&
          dados?.tipo === "registros" &&
          dados.itens.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Evento</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((r) => (
                  <tr key={r.registroId}>
                    <td>
                      <Link
                        to={`/motoristas/${r.motoristaId}`}
                        onClick={onFechar}
                      >
                        {r.nome}
                      </Link>
                    </td>
                    <td style={{ fontSize: 12 }}>{r.tipoEvento}</td>
                    <td style={{ fontSize: 12, color: "#000000" }}>
                      {new Date(r.timestampEvento).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        {!carregando &&
          !erro &&
          dados?.tipo === "alertas" &&
          dados.itens.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Alerta</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((a) => (
                  <tr key={a.alertaId}>
                    <td>
                      <Link
                        to={`/motoristas/${a.motoristaId}`}
                        onClick={onFechar}
                      >
                        {a.nome}
                      </Link>
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        color: ROTULO_SEVERIDADE_COR[a.severidade] ?? "#111827",
                      }}
                    >
                      {a.tipo}
                    </td>
                    <td style={{ fontSize: 12, color: "#000000" }}>
                      {new Date(a.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        {!carregando &&
          !erro &&
          dados?.tipo === "trechos" &&
          dados.itens.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Duração</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((t, i) => (
                  <tr key={`${t.motoristaId}-${i}`}>
                    <td>
                      <Link
                        to={`/motoristas/${t.motoristaId}`}
                        onClick={onFechar}
                      >
                        {t.nome}
                      </Link>
                    </td>
                    <td style={{ fontSize: 12, color: "#000000" }}>
                      {new Date(t.inicio).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ fontSize: 12, color: "#000000" }}>
                      {new Date(t.fim).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>
                      {minParaHoras(t.minutos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

// Rodada 101 , pedido do usuário: a Rodada 100 minimizou os gráficos do
// Painel de indicadores (PainelIndicadores.tsx, dentro de "Indicadores"),
// mas essa é uma seção DIFERENTE , "Evolução ao longo do tempo" fica no
// Painel da operação (DashboardPage.tsx), componente próprio
// (GraficoTendencia). Mesma ideia, chave de persistência própria.
const CHAVE_GRAFICOS_TENDENCIA_MINIMIZADOS =
  "fvfhorus.tendenciaGraficosMinimizados";

export function GraficoTendencia({
  dados,
}: {
  dados: DashboardTendenciaDia[];
}) {
  const [tipoGrafico, setTipoGrafico] = useState<"barras" | "linhas">("barras");
  const [pontoAberto, setPontoAberto] = useState<PontoClicado | null>(null);
  const [minimizado, setMinimizado] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_GRAFICOS_TENDENCIA_MINIMIZADOS) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_GRAFICOS_TENDENCIA_MINIMIZADOS,
        minimizado ? "1" : "0",
      );
    } catch {
      // localStorage indisponível (modo privado, etc.) , só não persiste a preferência.
    }
  }, [minimizado]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <strong style={{ fontSize: 16 }}>Evolução ao longo do tempo</strong>
          <p
            style={{
              fontSize: 12,
              color: "#000000",
              marginTop: 4,
              marginBottom: 0,
              maxWidth: 560,
            }}
          >
            A linha pontilhada de cada indicador é a tendência (regressão
            linear) no período, mostrando se está subindo ou descendo. É o sinal
            de que as ações tomadas (treinamento, ajuste de escala, cobrança de
            tempo de espera) estão ou não funcionando. Clique numa barra ou
            ponto pra ver as ações que compõem aquele número naquele dia.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!minimizado && (
            <>
              <button
                className={tipoGrafico === "barras" ? "" : "secondary"}
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => setTipoGrafico("barras")}
              >
                Colunas
              </button>
              <button
                className={tipoGrafico === "linhas" ? "" : "secondary"}
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => setTipoGrafico("linhas")}
              >
                Linhas
              </button>
            </>
          )}
          <button
            className="secondary"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={() => setMinimizado((atual) => !atual)}
          >
            {minimizado ? "Mostrar gráficos" : "Minimizar gráficos"}
          </button>
        </div>
      </div>

      {minimizado ? (
        <p style={{ fontSize: 13, color: "#000000" }}>
          Gráficos ocultos. Clique em "Mostrar gráficos" pra ver a evolução de
          alertas, horas e risco de fraude ao longo do período.
        </p>
      ) : (
        <>
          {CATEGORIAS.map((categoria) => (
            <BlocoGrafico
              key={categoria.chave}
              categoria={categoria}
              dados={dados}
              tipoGrafico={tipoGrafico}
              onClickPonto={setPontoAberto}
            />
          ))}
        </>
      )}

      {pontoAberto && (
        <ModalDetalheTendencia
          ponto={pontoAberto}
          onFechar={() => setPontoAberto(null)}
        />
      )}
    </div>
  );
}
